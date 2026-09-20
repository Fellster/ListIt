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
import { useCustomHeadings } from '../context/CustomHeadingsContext';
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
  Folder,
  ArrowRight,
  Check,
  Sparkles,
  FileText
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

const ItemDetailsModalContent: React.FC<ItemDetailsModalContentProps> = ({
  list,
  item,
  onClose,
  canEdit,
  lists: providedLists,
}) => {
  const { userProfile, user } = useAuth();
  const { activeAccent } = useTheme();
  const { customHeadings } = useCustomHeadings();

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
    const currentUserId = user?.uid || userProfile?.uid || '';
    const currentUserEmail = (userProfile?.email || user?.email || '').toLowerCase().trim();
    const unsubscribe = subscribeUserLists(currentUserId, currentUserEmail, (fetched) => {
      setAllLists(fetched);
    });
    return () => unsubscribe();
  }, [providedLists, user, userProfile]);

  // 1. What
  const [what, setWhat] = useState(item.title || '');

  // Notes & Details
  const [notes, setNotes] = useState(item.notes || '');
  
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
  const [targetHeading, setTargetHeading] = useState<string>(currentHeading);

  // Available heading options: Today, Grocery, and any custom headings created by user
  const headingOptions = useMemo(() => {
    const opts: Array<{ id: string; label: string; iconType: 'today' | 'grocery' | 'custom' }> = [
      { id: 'today', label: 'Today', iconType: 'today' },
      { id: 'grocery', label: 'Grocery', iconType: 'grocery' },
    ];
    customHeadings.forEach((ch) => {
      opts.push({ id: ch.id, label: ch.label, iconType: 'custom' });
    });
    if (currentHeading && !opts.some((o) => o.id === currentHeading)) {
      opts.push({ 
        id: currentHeading, 
        label: currentHeading.charAt(0).toUpperCase() + currentHeading.slice(1), 
        iconType: 'custom' 
      });
    }
    return opts;
  }, [customHeadings, currentHeading]);

  // Selected sub-list under target heading
  const [selectedSubListId, setSelectedSubListId] = useState<string>(() => {
    return item.listId || list.id;
  });

  // Lists matching target heading
  const targetHeadingLists = useMemo(() => {
    return allLists.filter((l) => getListHeading(l) === targetHeading);
  }, [allLists, targetHeading]);

  // Keep target sub-list synced when target heading or list items change
  useEffect(() => {
    const listsForHeading = allLists.filter((l) => getListHeading(l) === targetHeading);
    if (targetHeading === currentHeading) {
      setSelectedSubListId(item.listId || list.id);
    } else if (listsForHeading.length > 0) {
      if (!listsForHeading.some((l) => l.id === selectedSubListId)) {
        setSelectedSubListId(listsForHeading[0].id);
      }
    } else {
      setSelectedSubListId('');
    }
  }, [targetHeading, allLists, currentHeading, list.id, item.listId]);

  const [loading, setLoading] = useState(false);
  const [moveStatus, setMoveStatus] = useState<string | null>(null);
  const [activeVoiceField, setActiveVoiceField] = useState<'what' | 'notes' | 'where' | 'whenTime' | null>(null);

  const {
    isListening,
    startListening,
    stopListening,
  } = useSpeechRecognition((finalText) => {
    if (activeVoiceField === 'what') {
      setWhat(finalText);
    } else if (activeVoiceField === 'notes') {
      setNotes(finalText);
    } else if (activeVoiceField === 'where') {
      setWhere(finalText);
    } else if (activeVoiceField === 'whenTime') {
      setWhenTime(finalText);
    }
    setActiveVoiceField(null);
  });

  const handleStartVoice = (field: 'what' | 'notes' | 'where' | 'whenTime') => {
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
    heading: string,
    chosenSubListId?: string
  ): Promise<{ targetListId: string; targetListName: string }> => {
    const userMeta = {
      uid: user?.uid || userProfile?.uid || '',
      email: (userProfile?.email || user?.email || '').toLowerCase().trim(),
      displayName: userProfile?.displayName || user?.displayName || 'User',
    };

    const headingLists = allLists.filter((l) => getListHeading(l) === heading);
    const explicitId = chosenSubListId || selectedSubListId;
    const matched = headingLists.find((l) => l.id === explicitId);
    if (matched) return { targetListId: matched.id, targetListName: matched.title };
    if (headingLists.length > 0) return { targetListId: headingLists[0].id, targetListName: headingLists[0].title };

    if (heading === 'today') {
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

    // Custom heading created by user
    const customMatch = customHeadings.find((h) => h.id === heading);
    const headingLabel = customMatch ? customMatch.label : (heading.charAt(0).toUpperCase() + heading.slice(1));
    const newId = await createList({
      title: headingLabel,
      type: 'todo',
      heading: heading,
      color: 'indigo',
      icon: 'list'
    }, userMeta);
    return { targetListId: newId, targetListName: headingLabel };
  };

  // Helper to execute move or save
  const executeMoveOrSave = async (heading: string, chosenSubListId?: string) => {
    if (!canEdit) return;
    if (isListening) stopListening();
    if (!what.trim()) return;

    // Immediately close the task editor modal without waiting for background sync
    onClose();

    try {
      const userMeta = {
        uid: user?.uid || userProfile?.uid || '',
        email: (userProfile?.email || user?.email || '').toLowerCase().trim(),
        displayName: userProfile?.displayName || user?.displayName || 'User',
      };

      const todayStr = new Date().toISOString().split('T')[0];
      const isMovingToToday = heading === 'today';
      const cleanWhere = (where.trim() && isSpecificStore(where.trim())) ? where.trim() : undefined;

      // When moving out of the today heading to another heading (e.g. Grocery, Work, etc.):
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
        notes: notes.trim() || undefined,
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
    await executeMoveOrSave(targetHeading, selectedSubListId);
  };

  const handleDelete = () => {
    if (!canEdit) return;
    if (isListening) stopListening();
    if (confirm(`Delete "${item.title}"?`)) {
      onClose();
      deleteListItem(item.listId || list.id, item.id, item.completed, item.title, {
        email: (userProfile?.email || user?.email || '').toLowerCase().trim(),
        displayName: userProfile?.displayName || user?.displayName || 'User',
      }).catch((err) => console.error('Error deleting item:', err));
    }
  };

  // Get current target label for clear UX
  const getTargetDisplayName = () => {
    const headingLists = allLists.filter((l) => getListHeading(l) === targetHeading);
    const found = headingLists.find((l) => l.id === selectedSubListId);
    if (found) return found.title;

    if (targetHeading === 'today') return 'Today';
    if (targetHeading === 'grocery') return 'Grocery';
    const customMatch = customHeadings.find((h) => h.id === targetHeading);
    return customMatch ? customMatch.label : targetHeading;
  };

  const isDifferentFromCurrent = () => {
    const actualSourceListId = item.listId || list.id;
    if (targetHeading !== currentHeading) return true;
    if (selectedSubListId && selectedSubListId !== actualSourceListId) return true;
    return false;
  };

  // Handle direct click on destination heading
  const handleDestinationClick = async (dest: string) => {
    setTargetHeading(dest);
    const headingLists = allLists.filter((l) => getListHeading(l) === dest);
    const nextSubListId = headingLists.some((l) => l.id === selectedSubListId)
      ? selectedSubListId
      : (headingLists[0]?.id || '');
    setSelectedSubListId(nextSubListId);

    if (dest !== currentHeading && headingLists.length <= 1) {
      await executeMoveOrSave(dest, nextSubListId);
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

          {/* Notes & Details */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Notes & Details</span>
              </label>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleStartVoice('notes')}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                    isListening && activeVoiceField === 'notes'
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Dictate notes & details"
                >
                  <Mic className="w-3 h-3" />
                  <span>{isListening && activeVoiceField === 'notes' ? 'Listening...' : 'Voice'}</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                disabled={!canEdit || loading}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2"
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

            {/* Heading Options */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
              {headingOptions.map((opt) => {
                const isCurrent = currentHeading === opt.id;
                const isSelected = targetHeading === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!canEdit || loading}
                    onClick={() => handleDestinationClick(opt.id)}
                    className={`flex-1 min-w-[75px] py-2 px-2 text-center rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition relative cursor-pointer ${
                      isCurrent
                        ? 'bg-white dark:bg-slate-900 shadow-xs ring-2'
                        : isSelected
                        ? 'text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                    }`}
                    style={{
                      ...(isCurrent ? { color: activeAccent.text, borderColor: activeAccent.primary } : {}),
                      ...(isSelected && !isCurrent ? { backgroundColor: activeAccent.primary } : {})
                    }}
                    title={isCurrent ? `Currently in ${opt.label}` : `Click to move task to ${opt.label}`}
                  >
                    {opt.iconType === 'today' ? (
                      <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                    ) : opt.iconType === 'grocery' ? (
                      <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate">{opt.label}</span>
                    {isCurrent && (
                      <span 
                        className="text-[9px] px-1 py-0.2 rounded font-extrabold hidden sm:inline"
                        style={{ backgroundColor: activeAccent.light, color: activeAccent.text }}
                      >
                        Current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sub-list selector when selected heading has multiple lists */}
            {targetHeadingLists.length > 1 && (
              <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-150 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Select destination {headingOptions.find((h) => h.id === targetHeading)?.label || 'List'}:
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedSubListId}
                    onChange={(e) => setSelectedSubListId(e.target.value)}
                    disabled={!canEdit || loading}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2"
                  >
                    {targetHeadingLists.map((hl) => (
                      <option key={hl.id} value={hl.id}>
                        {hl.title} {hl.id === (item.listId || list.id) ? '(Current list)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={loading || !selectedSubListId || selectedSubListId === (item.listId || list.id)}
                    onClick={() => executeMoveOrSave(targetHeading, selectedSubListId)}
                    className="px-3.5 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                    style={{ backgroundColor: activeAccent.primary }}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Move</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Action Button: Move directly right now if different */}
            {canEdit && isDifferentFromCurrent() && (
              <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  disabled={loading || !what.trim()}
                  onClick={() => executeMoveOrSave(targetHeading, selectedSubListId)}
                  className="w-full py-2.5 px-4 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
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
