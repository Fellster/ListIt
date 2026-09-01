import React, { useState, useEffect, useMemo } from 'react';
import { ListItemModel, ListModel, GROCERY_STORES, getListHeading } from '../types';
import { 
  updateListItem, 
  deleteListItem, 
  moveItemToList, 
  createList,
  subscribeUserLists,
  getLocalLists 
} from '../services/listService';
import { isSpecificStore } from '../utils/groceryCategorizer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import { 
  X, 
  Trash2, 
  Save, 
  MapPin, 
  Calendar, 
  Clock, 
  Mic, 
  AlertCircle,
  ExternalLink,
  ArrowRightLeft,
  CalendarCheck,
  ShoppingCart,
  Home,
  FolderOpen,
  ArrowRight,
  Check,
  Sparkles
} from 'lucide-react';

interface ItemDetailsModalProps {
  list: ListModel;
  item: ListItemModel | null;
  isOpen: boolean;
  onClose: () => void;
  canEdit: boolean;
  lists?: ListModel[];
}

interface ItemDetailsModalContentProps {
  list: ListModel;
  item: ListItemModel;
  onClose: () => void;
  canEdit: boolean;
  lists?: ListModel[];
}

type DestinationHeading = 'today' | 'grocery' | 'home' | 'other';

const ItemDetailsModalContent: React.FC<ItemDetailsModalContentProps> = ({
  list,
  item,
  onClose,
  canEdit,
  lists: providedLists,
}) => {
  const { userProfile, user } = useAuth();
  const { activeAccent } = useTheme();

  // All available lists
  const [allLists, setAllLists] = useState<ListModel[]>(() => {
    if (providedLists && providedLists.length > 0) return providedLists;
    return getLocalLists();
  });

  useEffect(() => {
    if (providedLists && providedLists.length > 0) {
      setAllLists(providedLists);
      return;
    }
    const currentUserId = user?.uid || userProfile?.uid || 'user_keithfell1_gmail_com';
    const currentUserEmail = (userProfile?.email || user?.email || 'keithfell1@gmail.com').toLowerCase();
    const unsubscribe = subscribeUserLists(currentUserId, currentUserEmail, (fetched) => {
      setAllLists(fetched);
    });
    return () => unsubscribe();
  }, [providedLists, user, userProfile]);

  // 1. What
  const [what, setWhat] = useState(item.title || '');
  
  // 2. Where
  const [where, setWhere] = useState(() => {
    const raw = item.location || item.store || item.category || '';
    return isSpecificStore(raw) ? raw : '';
  });

  // 3. When
  const [whenDate, setWhenDate] = useState(item.dueDate || '');
  const [whenTime, setWhenTime] = useState(item.timeScheduled || '');

  // Move Task To Destination Heading & Sub-list
  const currentHeading = getListHeading(list);
  const [targetHeading, setTargetHeading] = useState<DestinationHeading>(currentHeading);

  // Lists categorized by heading
  const todayLists = useMemo(() => allLists.filter((l) => getListHeading(l) === 'today'), [allLists]);
  const groceryLists = useMemo(() => allLists.filter((l) => getListHeading(l) === 'grocery'), [allLists]);
  const homeLists = useMemo(() => allLists.filter((l) => getListHeading(l) === 'home'), [allLists]);
  const otherLists = useMemo(() => allLists.filter((l) => getListHeading(l) === 'other'), [allLists]);

  const [selectedTodayListId, setSelectedTodayListId] = useState<string>(() => {
    if (currentHeading === 'today') return list.id;
    return todayLists[0]?.id || '';
  });

  const [selectedGroceryListId, setSelectedGroceryListId] = useState<string>(() => {
    if (currentHeading === 'grocery') return list.id;
    return groceryLists[0]?.id || '';
  });

  const [selectedHomeListId, setSelectedHomeListId] = useState<string>(() => {
    if (currentHeading === 'home') return list.id;
    return homeLists[0]?.id || '';
  });

  const [selectedOtherListId, setSelectedOtherListId] = useState<string>(() => {
    if (currentHeading === 'other') return list.id;
    return otherLists[0]?.id || '';
  });

  // Keep selections synced
  useEffect(() => {
    if (todayLists.length > 0 && !todayLists.some((l) => l.id === selectedTodayListId)) {
      setSelectedTodayListId(todayLists[0].id);
    }
    if (groceryLists.length > 0 && !groceryLists.some((l) => l.id === selectedGroceryListId)) {
      setSelectedGroceryListId(groceryLists[0].id);
    }
    if (homeLists.length > 0 && !homeLists.some((l) => l.id === selectedHomeListId)) {
      setSelectedHomeListId(homeLists[0].id);
    }
    if (otherLists.length > 0 && !otherLists.some((l) => l.id === selectedOtherListId)) {
      setSelectedOtherListId(otherLists[0].id);
    }
  }, [todayLists, groceryLists, homeLists, otherLists, selectedTodayListId, selectedGroceryListId, selectedHomeListId, selectedOtherListId]);

  const [loading, setLoading] = useState(false);
  const [moveStatus, setMoveStatus] = useState<string | null>(null);
  const [activeVoiceField, setActiveVoiceField] = useState<'what' | 'where' | 'whenTime' | null>(null);

  const {
    isListening,
    startListening,
    stopListening,
  } = useSpeechRecognition((finalText) => {
    if (activeVoiceField === 'what') {
      setWhat(finalText);
    } else if (activeVoiceField === 'where') {
      setWhere(finalText);
    } else if (activeVoiceField === 'whenTime') {
      setWhenTime(finalText);
    }
    setActiveVoiceField(null);
  });

  const handleStartVoice = (field: 'what' | 'where' | 'whenTime') => {
    if (!canEdit) return;
    if (isListening && activeVoiceField === field) {
      stopListening();
      setActiveVoiceField(null);
    } else {
      setActiveVoiceField(field);
      startListening({ continuous: false });
    }
  };

  // Helper to resolve destination targetListId and targetListName
  const resolveTargetList = async (
    heading: DestinationHeading,
    chosenSubListId?: string
  ): Promise<{ targetListId: string; targetListName: string }> => {
    const userMeta = {
      uid: user?.uid || userProfile?.uid || 'user_keithfell1_gmail_com',
      email: (userProfile?.email || user?.email || 'keithfell1@gmail.com').toLowerCase(),
      displayName: userProfile?.displayName || user?.displayName || 'Keith Fell',
    };

    if (heading === 'today') {
      const explicitId = chosenSubListId || selectedTodayListId;
      const matched = todayLists.find((l) => l.id === explicitId);
      if (matched) return { targetListId: matched.id, targetListName: matched.title };
      if (todayLists.length > 0) return { targetListId: todayLists[0].id, targetListName: todayLists[0].title };
      
      const newId = await createList({
        title: "Today",
        description: "Daily reminders and tasks to do today",
        type: 'todo',
        heading: 'today',
        color: 'emerald',
        icon: 'calendar'
      }, userMeta);
      return { targetListId: newId, targetListName: "Today" };
    }

    if (heading === 'grocery') {
      const explicitId = chosenSubListId || selectedGroceryListId;
      const matched = groceryLists.find((l) => l.id === explicitId);
      if (matched) return { targetListId: matched.id, targetListName: matched.title };
      if (groceryLists.length > 0) return { targetListId: groceryLists[0].id, targetListName: groceryLists[0].title };

      const newId = await createList({
        title: "Grocery List",
        description: "Shopping list tagged by store",
        type: 'grocery',
        heading: 'grocery',
        color: 'emerald',
        icon: 'shopping-cart'
      }, userMeta);
      return { targetListId: newId, targetListName: "Grocery List" };
    }

    if (heading === 'home') {
      const explicitId = chosenSubListId || selectedHomeListId;
      const matched = homeLists.find((l) => l.id === explicitId);
      if (matched) return { targetListId: matched.id, targetListName: matched.title };
      if (homeLists.length > 0) return { targetListId: homeLists[0].id, targetListName: homeLists[0].title };

      const newId = await createList({
        title: "Home",
        description: "Household chores, repairs, organization, and home maintenance",
        type: 'todo',
        heading: 'home',
        color: 'amber',
        icon: 'home'
      }, userMeta);
      return { targetListId: newId, targetListName: "Home" };
    }

    // Heading is 'other'
    const explicitId = chosenSubListId || selectedOtherListId;
    const matched = otherLists.find((l) => l.id === explicitId);
    if (matched) {
      return { targetListId: matched.id, targetListName: matched.title };
    }
    if (otherLists.length > 0) {
      return { targetListId: otherLists[0].id, targetListName: otherLists[0].title };
    }

    return { targetListId: list.id, targetListName: list.title };
  };

  // Helper to execute move or save
  const executeMoveOrSave = async (heading: DestinationHeading, chosenSubListId?: string) => {
    if (!canEdit) return;
    if (isListening) stopListening();
    if (!what.trim()) return;

    // Immediately close the task editor modal without waiting for background sync
    onClose();

    try {
      const userMeta = {
        uid: user?.uid || userProfile?.uid || 'user_keithfell1_gmail_com',
        email: (userProfile?.email || user?.email || 'keithfell1@gmail.com').toLowerCase(),
        displayName: userProfile?.displayName || user?.displayName || 'Keith Fell',
      };

      const todayStr = new Date().toISOString().split('T')[0];
      const isMovingToToday = heading === 'today';
      const cleanWhere = (where.trim() && isSpecificStore(where.trim())) ? where.trim() : undefined;

      // When moving out of the today heading to another heading (e.g. Grocery, Home, Other):
      // - isForToday becomes false
      // - dueDate is cleared if it was only set to today's date (or if moving out of Today list without a deliberate different date)
      let finalDueDate: string | undefined = whenDate ? whenDate.trim() : undefined;
      if (isMovingToToday) {
        finalDueDate = whenDate ? whenDate.trim() : todayStr;
      } else {
        // Moving away from Today: do not retain today's date automatically
        if (whenDate === todayStr || (!whenDate && (item.isForToday || currentHeading === 'today'))) {
          finalDueDate = undefined;
        }
      }

      const updatedFields: Partial<ListItemModel> = {
        title: what.trim(),
        location: cleanWhere,
        store: cleanWhere,
        category: cleanWhere,
        dueDate: finalDueDate,
        timeScheduled: isMovingToToday ? (whenTime.trim() || undefined) : undefined,
        isForToday: isMovingToToday,
      };

      const { targetListId, targetListName } = await resolveTargetList(heading, chosenSubListId);
      const actualSourceListId = item.listId || list.id;

      if (targetListId && targetListId !== actualSourceListId) {
        await moveItemToList(
          actualSourceListId,
          targetListId,
          {
            ...item,
            ...updatedFields,
          },
          userMeta,
          targetListName
        );
      } else {
        await updateListItem(actualSourceListId, item.id, updatedFields);
      }
    } catch (err) {
      console.error('Error saving or moving item:', err);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSubListId =
      targetHeading === 'today' ? selectedTodayListId :
      targetHeading === 'grocery' ? selectedGroceryListId :
      targetHeading === 'home' ? selectedHomeListId : selectedOtherListId;
    await executeMoveOrSave(targetHeading, targetSubListId);
  };

  const handleDelete = () => {
    if (!canEdit) return;
    if (isListening) stopListening();
    if (confirm(`Delete "${item.title}"?`)) {
      onClose();
      deleteListItem(item.listId || list.id, item.id, item.completed, item.title, {
        email: (userProfile?.email || user?.email || 'keithfell1@gmail.com').toLowerCase(),
        displayName: userProfile?.displayName || user?.displayName || 'Keith Fell',
      }).catch((err) => console.error('Error deleting item:', err));
    }
  };

  // Get current target label for clear UX
  const getTargetDisplayName = () => {
    if (targetHeading === 'today') {
      const found = todayLists.find((l) => l.id === selectedTodayListId);
      return found ? found.title : 'Today';
    }
    if (targetHeading === 'grocery') {
      const found = groceryLists.find((l) => l.id === selectedGroceryListId);
      return found ? found.title : 'Grocery';
    }
    if (targetHeading === 'home') {
      const found = homeLists.find((l) => l.id === selectedHomeListId);
      return found ? found.title : 'Home';
    }
    if (targetHeading === 'other') {
      const found = otherLists.find((l) => l.id === selectedOtherListId);
      return found ? found.title : 'Other List';
    }
    return list.title;
  };

  const isDifferentFromCurrent = () => {
    const actualSourceListId = item.listId || list.id;
    if (targetHeading === 'today') {
      return getListHeading(list) !== 'today' || (selectedTodayListId ? selectedTodayListId !== actualSourceListId : false);
    }
    if (targetHeading === 'grocery') {
      return getListHeading(list) !== 'grocery' || (selectedGroceryListId ? selectedGroceryListId !== actualSourceListId : false);
    }
    if (targetHeading === 'home') {
      return getListHeading(list) !== 'home' || (selectedHomeListId ? selectedHomeListId !== actualSourceListId : false);
    }
    if (targetHeading === 'other') return selectedOtherListId !== actualSourceListId;
    return false;
  };

  // Handle direct click on destination heading
  const handleDestinationClick = async (dest: DestinationHeading) => {
    setTargetHeading(dest);
    const targetSubListId =
      dest === 'today' ? selectedTodayListId :
      dest === 'grocery' ? selectedGroceryListId :
      dest === 'home' ? selectedHomeListId : selectedOtherListId;

    if (dest !== currentHeading) {
      if (
        (dest === 'today' && todayLists.length <= 1) ||
        (dest === 'grocery' && groceryLists.length <= 1) ||
        (dest === 'home' && homeLists.length <= 1)
      ) {
        await executeMoveOrSave(dest, targetSubListId);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
              Edit Task
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700/70 px-2 py-0.5 rounded-full">
              in {list.title}
            </span>
            {!canEdit && (
              <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-medium">
                View Only
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (isListening) stopListening();
              onClose();
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {!canEdit && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>You have view-only access. Item details cannot be edited without editor permission.</span>
            </div>
          )}

          {/* 1. What */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold"
                  style={{
                    backgroundColor: activeAccent.light,
                    color: activeAccent.text
                  }}
                >
                  1
                </span>
                <span>What</span>
              </label>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleStartVoice('what')}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                    isListening && activeVoiceField === 'what'
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Dictate with voice"
                >
                  <Mic className="w-3 h-3" />
                  <span>{isListening && activeVoiceField === 'what' ? 'Listening...' : 'Voice'}</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                required
                disabled={!canEdit || loading}
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                placeholder="What needs to be done..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2"
              />
            </div>
          </div>

          {/* 2. Where */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold"
                  style={{
                    backgroundColor: activeAccent.light,
                    color: activeAccent.text
                  }}
                >
                  2
                </span>
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Where</span>
              </label>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleStartVoice('where')}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                      isListening && activeVoiceField === 'where'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Dictate location"
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isListening && activeVoiceField === 'where' ? 'Listening...' : 'Voice'}</span>
                  </button>
                )}
                {where && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] hover:underline flex items-center gap-0.5 font-medium"
                    style={{ color: activeAccent.primary }}
                  >
                    <span>Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                list="location-store-suggestions"
                disabled={!canEdit || loading}
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                placeholder="Store, place, or address (e.g. Trader Joe's, Home, Office)..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2"
              />
              <datalist id="location-store-suggestions">
                {GROCERY_STORES.map((storeOption) => (
                  <option key={storeOption.id} value={storeOption.name} />
                ))}
                <option value="Home" />
                <option value="Office" />
                <option value="Online" />
              </datalist>
            </div>
          </div>

          {/* 3. When */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span 
                className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold"
                style={{
                  backgroundColor: activeAccent.light,
                  color: activeAccent.text
                }}
              >
                3
              </span>
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>When</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  disabled={!canEdit || loading}
                  value={whenDate}
                  onChange={(e) => setWhenDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2"
                />
              </div>

              {/* Time */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-500" />
                    <span>Time</span>
                  </label>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleStartVoice('whenTime')}
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded flex items-center gap-0.5 transition ${
                        isListening && activeVoiceField === 'whenTime'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'text-slate-400 hover:text-rose-600'
                      }`}
                      title="Dictate time"
                    >
                      <Mic className="w-2.5 h-2.5" />
                      <span>{isListening && activeVoiceField === 'whenTime' ? 'Listening...' : 'Voice'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  disabled={!canEdit || loading}
                  value={whenTime}
                  onChange={(e) => setWhenTime(e.target.value)}
                  placeholder="e.g. 10:00 AM, 3:30 PM"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2"
                />
              </div>
            </div>
          </div>

          {/* Move Task To Section */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5" style={{ color: activeAccent.primary }} />
                <span>Move Task To</span>
              </label>

              {isDifferentFromCurrent() && (
                <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: activeAccent.primary }}>
                  <Check className="w-3 h-3" />
                  Target: {getTargetDisplayName()}
                </span>
              )}
            </div>

            {/* 4 Heading Options: Today, Grocery, Home, Other */}
            <div className="grid grid-cols-4 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
              {/* Today */}
              <button
                type="button"
                disabled={!canEdit || loading}
                onClick={() => handleDestinationClick('today')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition relative ${
                  currentHeading === 'today'
                    ? 'bg-white dark:bg-slate-900 shadow-xs ring-2'
                    : targetHeading === 'today'
                    ? 'text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
                style={{
                  ...(currentHeading === 'today' ? { color: activeAccent.text, borderColor: activeAccent.primary } : {}),
                  ...(targetHeading === 'today' && currentHeading !== 'today' ? { backgroundColor: activeAccent.primary } : {})
                }}
                title={currentHeading === 'today' ? 'Currently in Today' : 'Click to move task to Today list'}
              >
                <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Today</span>
                {currentHeading === 'today' && (
                  <span 
                    className="text-[9px] px-1 py-0.2 rounded font-extrabold hidden sm:inline"
                    style={{ backgroundColor: activeAccent.light, color: activeAccent.text }}
                  >
                    Current
                  </span>
                )}
              </button>

              {/* Grocery */}
              <button
                type="button"
                disabled={!canEdit || loading}
                onClick={() => handleDestinationClick('grocery')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition relative ${
                  currentHeading === 'grocery'
                    ? 'bg-white dark:bg-slate-900 shadow-xs ring-2'
                    : targetHeading === 'grocery'
                    ? 'text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
                style={{
                  ...(currentHeading === 'grocery' ? { color: activeAccent.text, borderColor: activeAccent.primary } : {}),
                  ...(targetHeading === 'grocery' && currentHeading !== 'grocery' ? { backgroundColor: activeAccent.primary } : {})
                }}
                title={currentHeading === 'grocery' ? 'Currently in Grocery' : 'Click to move task to Grocery list'}
              >
                <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Grocery</span>
                {currentHeading === 'grocery' && (
                  <span 
                    className="text-[9px] px-1 py-0.2 rounded font-extrabold hidden sm:inline"
                    style={{ backgroundColor: activeAccent.light, color: activeAccent.text }}
                  >
                    Current
                  </span>
                )}
              </button>

              {/* Home */}
              <button
                type="button"
                disabled={!canEdit || loading}
                onClick={() => handleDestinationClick('home')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition relative ${
                  currentHeading === 'home'
                    ? 'bg-white dark:bg-slate-900 shadow-xs ring-2'
                    : targetHeading === 'home'
                    ? 'text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
                style={{
                  ...(currentHeading === 'home' ? { color: activeAccent.text, borderColor: activeAccent.primary } : {}),
                  ...(targetHeading === 'home' && currentHeading !== 'home' ? { backgroundColor: activeAccent.primary } : {})
                }}
                title={currentHeading === 'home' ? 'Currently in Home' : 'Click to move task to Home list'}
              >
                <Home className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Home</span>
                {currentHeading === 'home' && (
                  <span 
                    className="text-[9px] px-1 py-0.2 rounded font-extrabold hidden sm:inline"
                    style={{ backgroundColor: activeAccent.light, color: activeAccent.text }}
                  >
                    Current
                  </span>
                )}
              </button>

              {/* Other */}
              <button
                type="button"
                disabled={!canEdit || loading}
                onClick={() => {
                  setTargetHeading('other');
                  if (!selectedOtherListId && otherLists.length > 0) {
                    setSelectedOtherListId(otherLists[0].id);
                  }
                }}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition relative ${
                  currentHeading === 'other'
                    ? 'bg-white dark:bg-slate-900 shadow-xs ring-2'
                    : targetHeading === 'other'
                    ? 'text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
                style={{
                  ...(currentHeading === 'other' ? { color: activeAccent.text, borderColor: activeAccent.primary } : {}),
                  ...(targetHeading === 'other' && currentHeading !== 'other' ? { backgroundColor: activeAccent.primary } : {})
                }}
                title="Choose custom list under Other"
              >
                <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Other</span>
                {currentHeading === 'other' && (
                  <span 
                    className="text-[9px] px-1 py-0.2 rounded font-extrabold hidden sm:inline"
                    style={{ backgroundColor: activeAccent.light, color: activeAccent.text }}
                  >
                    Current
                  </span>
                )}
              </button>
            </div>

            {/* Sub-list selector when selected heading has multiple lists or when other is selected */}
            {targetHeading === 'today' && todayLists.length > 1 && (
              <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-150 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Select destination Today list:
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedTodayListId}
                    onChange={(e) => setSelectedTodayListId(e.target.value)}
                    disabled={!canEdit || loading}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {todayLists.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={loading || !selectedTodayListId || selectedTodayListId === (item.listId || list.id)}
                    onClick={() => executeMoveOrSave('today', selectedTodayListId)}
                    className="px-3.5 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    style={{ backgroundColor: activeAccent.primary }}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Move</span>
                  </button>
                </div>
              </div>
            )}

            {targetHeading === 'grocery' && groceryLists.length > 1 && (
              <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-150 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Select destination Grocery list:
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedGroceryListId}
                    onChange={(e) => setSelectedGroceryListId(e.target.value)}
                    disabled={!canEdit || loading}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2"
                  >
                    {groceryLists.map((gl) => (
                      <option key={gl.id} value={gl.id}>
                        {gl.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={loading || !selectedGroceryListId || selectedGroceryListId === (item.listId || list.id)}
                    onClick={() => executeMoveOrSave('grocery', selectedGroceryListId)}
                    className="px-3.5 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    style={{ backgroundColor: activeAccent.primary }}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Move</span>
                  </button>
                </div>
              </div>
            )}

            {targetHeading === 'home' && homeLists.length > 1 && (
              <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-150 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Select destination Home list:
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedHomeListId}
                    onChange={(e) => setSelectedHomeListId(e.target.value)}
                    disabled={!canEdit || loading}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2"
                  >
                    {homeLists.map((hl) => (
                      <option key={hl.id} value={hl.id}>
                        {hl.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={loading || !selectedHomeListId || selectedHomeListId === (item.listId || list.id)}
                    onClick={() => executeMoveOrSave('home', selectedHomeListId)}
                    className="px-3.5 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    style={{ backgroundColor: activeAccent.primary }}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Move</span>
                  </button>
                </div>
              </div>
            )}

            {/* If Other is chosen, show choices of custom lists under Other */}
            {targetHeading === 'other' && (
              <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-150 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Select destination list under Other:
                </label>
                {otherLists.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedOtherListId}
                      onChange={(e) => {
                        setSelectedOtherListId(e.target.value);
                      }}
                      disabled={!canEdit || loading}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2"
                    >
                      {otherLists.map((ol) => (
                        <option key={ol.id} value={ol.id}>
                          {ol.title} {ol.type === 'grocery' ? '(Grocery List)' : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={loading || !selectedOtherListId || selectedOtherListId === (item.listId || list.id)}
                      onClick={() => executeMoveOrSave('other', selectedOtherListId)}
                      className="px-3.5 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      style={{ backgroundColor: activeAccent.primary }}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Move</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-400 italic py-2 bg-slate-50 dark:bg-slate-800/60 px-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    No custom lists created under Other yet.
                  </div>
                )}
              </div>
            )}

            {/* Quick Action Button: Move directly right now if different */}
            {canEdit && isDifferentFromCurrent() && (
              <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  disabled={loading || !what.trim()}
                  onClick={() => {
                    const targetSubListId =
                      targetHeading === 'today' ? selectedTodayListId :
                      targetHeading === 'grocery' ? selectedGroceryListId :
                      targetHeading === 'home' ? selectedHomeListId : selectedOtherListId;
                    executeMoveOrSave(targetHeading, targetSubListId);
                  }}
                  className="w-full py-2.5 px-4 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2"
                  style={{ backgroundColor: activeAccent.primary }}
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>
                    {loading ? (moveStatus || 'Moving task...') : `Move Task to ${getTargetDisplayName()} Now`}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
            {canEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  if (isListening) stopListening();
                  onClose();
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                {canEdit ? 'Cancel' : 'Close'}
              </button>

              {canEdit && (
                <button
                  type="submit"
                  disabled={loading || !what.trim()}
                  className="px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                  style={{ backgroundColor: activeAccent.primary }}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {loading 
                      ? (moveStatus || 'Saving...') 
                      : (isDifferentFromCurrent() ? `Move & Save Changes` : 'Save Changes')}
                  </span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  list,
  item,
  isOpen,
  onClose,
  canEdit,
  lists,
}) => {
  if (!isOpen || !item) return null;

  return (
    <ItemDetailsModalContent
      key={item.id}
      list={list}
      item={item}
      onClose={onClose}
      canEdit={canEdit}
      lists={lists}
    />
  );
};
