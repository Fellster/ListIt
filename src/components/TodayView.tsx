import React, { useState, useMemo } from 'react';
import { ListItemModel, ListModel } from '../types';
import { 
  toggleListItem, 
  deleteListItem,
  addListItem,
  createList,
  moveItemToList
} from '../services/listService';
import { parseItemInput, isSpecificStore } from '../utils/groceryCategorizer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2,
  Mic,
  Calendar as CalendarIcon,
  Edit3,
  MapPin,
  MoveRight,
  Camera,
  Sparkles
} from 'lucide-react';

interface TodayViewProps {
  lists: ListModel[];
  allTodayItems: ListItemModel[];
  onSelectItem: (item: ListItemModel, list: ListModel) => void;
  onOpenList: (list: ListModel) => void;
  onOpenCreateList: () => void;
  onOpenAddToList?: (defaultListId?: string) => void;
  onOpenViewList?: () => void;
  onOpenOcr?: (defaultListId?: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  lists,
  allTodayItems,
  onSelectItem,
  onOpenList,
  onOpenOcr,
}) => {
  const { user, userProfile } = useAuth();
  const { activeAccent } = useTheme();
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  const {
    isListening,
    startListening,
    stopListening,
  } = useSpeechRecognition((text) => {
    setNewItemTitle(text);
  });

  const currentUser = {
    email: (userProfile?.email || user?.email || 'keithfell1@gmail.com').toLowerCase(),
    displayName: userProfile?.displayName || user?.displayName || 'Keith Fell',
    uid: user?.uid || userProfile?.uid || 'user_keithfell1_gmail_com'
  };

  const handleTransferToList = async (e: React.MouseEvent, item: ListItemModel, targetListId: string) => {
    e.stopPropagation();
    setMovingItemId(null);
    if (!item.listId || targetListId === item.listId) return;

    try {
      await moveItemToList(
        item.listId,
        targetListId,
        {
          ...item,
          isForToday: false,
          dueDate: undefined,
        },
        currentUser
      );
    } catch (err) {
      console.error('Error moving item to list:', err);
    }
  };

  // Find or determine default target list for today tasks (dedicated Today list first)
  const defaultList = useMemo(() => {
    return lists.find((l) => l.title.toLowerCase() === 'today' || l.title.toLowerCase() === "today's list") 
      || lists.find((l) => l.type === 'todo')
      || lists[0];
  }, [lists]);

  // Handle Quick Add for Today
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdding) return;
    if (!newItemTitle.trim()) {
      const inputEl = document.getElementById('today-view-input');
      if (inputEl) inputEl.focus();
      return;
    }

    setIsAdding(true);
    try {
      let targetListId = defaultList?.id;
      const existingToday = lists.find((l) => l.title.toLowerCase() === 'today' || l.title.toLowerCase() === "today's list");
      
      if (existingToday) {
        targetListId = existingToday.id;
      } else {
        targetListId = await createList({
          title: "Today",
          description: "Daily reminders and tasks to do today",
          type: 'todo',
          color: 'emerald',
          icon: 'calendar'
        }, currentUser);
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const parsed = parseItemInput(newItemTitle.trim());
      const specificStore = parsed.store && isSpecificStore(parsed.store) ? parsed.store : undefined;

      await addListItem(
        targetListId,
        {
          title: parsed.title,
          quantity: parsed.quantity > 1 ? parsed.quantity : undefined,
          unit: parsed.quantity > 1 ? parsed.unit : undefined,
          store: specificStore,
          category: specificStore,
          dueDate: todayStr,
          isForToday: true,
          priority: 'medium',
          order: allTodayItems.length,
        },
        {
          email: currentUser.email,
          displayName: currentUser.displayName,
        }
      );

      setNewItemTitle('');
    } catch (err) {
      console.error('Error adding today item:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Item completion toggle with confetti
  const handleToggle = async (item: ListItemModel) => {
    const willComplete = !item.completed;
    if (willComplete) {
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#10b981', '#3b82f6', '#f59e0b']
        });
      } catch (e) {
        // ignore
      }
    }

    await toggleListItem(item.listId, item.id, item.completed, currentUser, item.title);
  };

  const handleDelete = async (e: React.MouseEvent, item: ListItemModel) => {
    e.stopPropagation();
    await deleteListItem(
      item.listId,
      item.id,
      item.completed,
      item.title,
      {
        email: currentUser.email,
        displayName: currentUser.displayName
      }
    );
  };

  // Items for today (pending items first, completed items below)
  const sortedItems = useMemo(() => {
    return [...allTodayItems].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return 0;
    });
  }, [allTodayItems]);

  const todayDateFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    }).format(new Date());
  }, []);

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4 flex-1">
      {/* Clean Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" style={{ color: activeAccent.primary }} />
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Today
          </h1>
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {todayDateFormatted}
        </span>
      </div>

      {/* Quick Add Item Bar */}
      {defaultList && (
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              id="today-view-input"
              type="text"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder={
                isListening
                  ? '🎙️ Listening... Speak now!'
                  : 'Add an item for today...'
              }
              className={`w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition shadow-2xs ${
                isListening
                  ? 'border-rose-400 bg-rose-50/30 text-rose-900 animate-pulse'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
              style={{ borderColor: newItemTitle.trim() ? activeAccent.primary : undefined }}
            />
            <button
              type="button"
              onClick={() => (isListening ? stopListening() : startListening())}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition ${
                isListening
                  ? 'text-rose-600 bg-rose-100 dark:bg-rose-950/50 animate-bounce'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title={isListening ? 'Stop recording' : 'Dictate with voice'}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {onOpenOcr && (
            <button
              type="button"
              id="btn-camera-ocr-today"
              onClick={() => onOpenOcr(defaultList.id)}
              className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition shadow-2xs shrink-0 flex items-center gap-1 cursor-pointer"
              title="Take picture & OCR scan items into Today"
            >
              <Camera className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Camera</span>
            </button>
          )}

          <button
            type="submit"
            id="btn-add-item-today"
            className="px-4 py-2.5 text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer hover:brightness-110 active:scale-95"
            style={{ backgroundColor: activeAccent.primary }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </form>
      )}

      {/* Actual List of Items */}
      {sortedItems.length === 0 ? (
        <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No items on your list for today
          </p>
          <p className="text-xs">Type in the box above to add your first item.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/80 shadow-2xs overflow-hidden">
          {sortedItems.map((item) => {
            const parentList = lists.find((l) => l.id === item.listId) || defaultList || lists[0];

            return (
              <div
                key={item.id}
                onClick={() => parentList && onSelectItem(item, parentList)}
                className={`p-3.5 flex items-center justify-between gap-3 transition cursor-pointer group ${
                  item.completed
                    ? 'bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500'
                    : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50 text-slate-900 dark:text-slate-100'
                }`}
              >
                {/* Checkbox & Item Info on the same line */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(item);
                    }}
                    className="transition shrink-0"
                    style={{ color: activeAccent.primary }}
                  >
                    {item.completed ? (
                      <CheckCircle2 
                        className="w-5 h-5" 
                        style={{ color: activeAccent.primary, fill: activeAccent.light }} 
                      />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 hover:text-slate-600 stroke-[2]" />
                    )}
                  </button>

                  <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                    <span
                      className={`text-sm font-semibold leading-tight break-words ${
                        item.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                      }`}
                    >
                      {item.title}
                    </span>

                    {/* Quantity */}
                    {item.quantity && (
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md shrink-0 border border-slate-200/60 dark:border-slate-700">
                        {item.quantity} {item.unit || ''}
                      </span>
                    )}

                    {/* Store badge if specifically set */}
                    {item.store && isSpecificStore(item.store) && (
                      <span 
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border shrink-0 flex items-center gap-0.5"
                        style={{ 
                          backgroundColor: activeAccent.light, 
                          color: activeAccent.text, 
                          borderColor: activeAccent.border 
                        }}
                      >
                        <MapPin className="w-2.5 h-2.5" style={{ color: activeAccent.primary }} />
                        <span>{item.store}</span>
                      </span>
                    )}

                    {/* Edit button to bring up Task Editor */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (parentList) onSelectItem(item, parentList);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition inline-flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700"
                      title="Edit task (What, Where, When)"
                      aria-label="Edit task"
                    >
                      <Edit3 className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Right: Move & Delete Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {lists.filter((l) => l.id !== item.listId).length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingItemId(movingItemId === item.id ? null : item.id);
                        }}
                        className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-[11px] font-bold flex items-center gap-1 border border-slate-200/60 dark:border-slate-700"
                        title="Move item to another list"
                      >
                        <MoveRight className="w-3 h-3" style={{ color: activeAccent.primary }} />
                        <span className="hidden sm:inline">Move</span>
                      </button>

                      {movingItemId === item.id && (
                        <div 
                          className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                            Move to list:
                          </div>
                          {lists
                            .filter((l) => l.id !== item.listId)
                            .map((target) => (
                              <button
                                key={target.id}
                                type="button"
                                onClick={(e) => handleTransferToList(e, item, target.id)}
                                className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition truncate"
                              >
                                <span className="text-sm">{target.type === 'grocery' ? '🛒' : '📝'}</span>
                                <span className="truncate">{target.title}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, item)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition shrink-0 opacity-80 group-hover:opacity-100"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
