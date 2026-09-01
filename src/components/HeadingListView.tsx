import React, { useState, useMemo } from 'react';
import { ListItemModel, ListModel, HeadingKey, getListHeading } from '../types';
import { 
  toggleListItem, 
  deleteListItem, 
  addListItem, 
  createList, 
  updateList,
  deleteList,
  moveItemToList, 
  getLocalItems 
} from '../services/listService';
import { parseItemInput, isSpecificStore } from '../utils/groceryCategorizer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import { useCustomHeadings } from '../context/CustomHeadingsContext';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Mic, 
  Camera,
  Calendar as CalendarIcon, 
  Edit3, 
  MapPin, 
  MoveRight, 
  Pencil,
  Check,
  X
} from 'lucide-react';

interface SingleListSectionProps {
  list?: ListModel;
  heading: HeadingKey;
  headingLabel?: string;
  defaultTitle: string;
  isFirstList: boolean;
  canDeleteList: boolean;
  isCustomHeading: boolean;
  allLists: ListModel[];
  listItems: ListItemModel[];
  onSelectItem: (item: ListItemModel, list: ListModel) => void;
  onDeleteCustomHeading?: (headingId: string) => void;
  onEnsureListCreated: (initialItemTitle: string) => Promise<string>;
  onOpenOcr?: (listId?: string) => void;
}

const SingleListSection: React.FC<SingleListSectionProps> = ({
  list,
  heading,
  headingLabel,
  defaultTitle,
  isFirstList,
  canDeleteList,
  isCustomHeading,
  allLists,
  listItems,
  onSelectItem,
  onDeleteCustomHeading,
  onEnsureListCreated,
  onOpenOcr,
}) => {
  const { user, userProfile } = useAuth();
  const { activeAccent } = useTheme();
  const { customHeadings } = useCustomHeadings();

  const [newItemTitle, setNewItemTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(list?.title || defaultTitle);

  const customHeadingObj = customHeadings.find((h) => h.id === heading);

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

  const listDisplayTitle = list?.title || defaultTitle;

  const sortedItems = useMemo(() => {
    return [...listItems].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return (a.order || 0) - (b.order || 0);
    });
  }, [listItems]);

  const handleCameraOcr = async () => {
    if (!onOpenOcr) return;
    let resolvedListId = list?.id;
    if (!resolvedListId) {
      resolvedListId = await onEnsureListCreated("New scan");
    }
    onOpenOcr(resolvedListId);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdding) return;
    if (!newItemTitle.trim()) {
      const inputEl = document.getElementById(`list-input-${list?.id || heading}`);
      if (inputEl) inputEl.focus();
      return;
    }

    setIsAdding(true);
    try {
      let resolvedListId = list?.id;

      if (!resolvedListId) {
        resolvedListId = await onEnsureListCreated(newItemTitle.trim());
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const parsed = parseItemInput(newItemTitle.trim());
      const specificStore = parsed.store && isSpecificStore(parsed.store) ? parsed.store : undefined;

      await addListItem(
        resolvedListId,
        {
          title: parsed.title,
          quantity: parsed.quantity > 1 ? parsed.quantity : undefined,
          unit: parsed.quantity > 1 ? parsed.unit : undefined,
          store: specificStore,
          category: specificStore,
          dueDate: heading === 'today' ? todayStr : undefined,
          isForToday: heading === 'today',
          priority: 'medium',
          order: listItems.length,
        },
        {
          email: currentUser.email,
          displayName: currentUser.displayName,
        }
      );

      setNewItemTitle('');
    } catch (err) {
      console.error('Error adding item to list:', err);
    } finally {
      setIsAdding(false);
    }
  };

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

  const handleDeleteItem = async (e: React.MouseEvent, item: ListItemModel) => {
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
          isForToday: targetListId === 'today' || heading === 'today' ? false : item.isForToday,
        },
        currentUser
      );
    } catch (err) {
      console.error('Error moving item to list:', err);
    }
  };

  const handleRenameList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!list?.id || !titleInput.trim()) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateList(list.id, { title: titleInput.trim() });
    } catch (err) {
      console.error('Error renaming list:', err);
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleDeleteListConfirmed = async () => {
    setIsConfirmingDelete(false);
    if (isFirstList && isCustomHeading && onDeleteCustomHeading) {
      onDeleteCustomHeading(heading);
      return;
    }
    if (list?.id) {
      try {
        await deleteList(list.id);
      } catch (err) {
        console.error('Error deleting list:', err);
      }
    }
  };

  const todayDateFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    }).format(new Date());
  }, []);

  return (
    <div className="space-y-4">
      {/* Header for this specific list */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          {isEditingTitle ? (
            <form onSubmit={handleRenameList} className="flex items-center gap-1.5">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                autoFocus
                className="px-2.5 py-1 text-lg font-extrabold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                style={{ borderColor: activeAccent.primary }}
              />
              <button
                type="submit"
                className="p-1.5 text-white rounded-lg shadow-2xs"
                style={{ backgroundColor: activeAccent.primary }}
                title="Save title"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitleInput(list?.title || defaultTitle);
                  setIsEditingTitle(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {listDisplayTitle}
              </h2>

              {list?.id && (
                <button
                  type="button"
                  onClick={() => {
                    setTitleInput(listDisplayTitle);
                    setIsEditingTitle(true);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition"
                  title="Rename list"
                  aria-label="Rename list"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Delete List Badge */}
          {canDeleteList && (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 rounded-full transition shadow-2xs cursor-pointer ml-1.5"
              title="Delete this list"
              aria-label="Delete this list"
            >
              <Trash2 className="w-3 h-3 text-rose-500" />
              <span>Delete List</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {heading === 'today' && isFirstList ? (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {todayDateFormatted}
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {listItems.length} {listItems.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
      </div>

      {/* Quick Add Bar for this list */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id={`list-input-${list?.id || heading}`}
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder={
              isListening
                ? '🎙️ Listening... Speak now!'
                : `Add an item to ${listDisplayTitle.toLowerCase()}...`
            }
            className={`w-full pl-3.5 pr-20 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition shadow-2xs ${
              isListening
                ? 'border-rose-400 bg-rose-50/30 text-rose-900 animate-pulse'
                : 'border-slate-200 dark:border-slate-800'
            }`}
            style={{ borderColor: newItemTitle.trim() ? activeAccent.primary : undefined }}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {onOpenOcr && (
              <button
                type="button"
                id={`btn-camera-ocr-${list?.id || heading}`}
                onClick={handleCameraOcr}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Scan items with Camera OCR"
                aria-label="Scan items with Camera OCR"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => (isListening ? stopListening() : startListening())}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isListening
                  ? 'text-rose-600 bg-rose-100 dark:bg-rose-950/50 animate-bounce'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isListening ? 'Stop recording' : 'Dictate with voice'}
              aria-label={isListening ? 'Stop recording' : 'Dictate with voice'}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          id={`btn-add-item-${list?.id || heading}`}
          className="px-4 py-2.5 text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer hover:brightness-110 active:scale-95"
          style={{ backgroundColor: activeAccent.primary }}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add</span>
        </button>
      </form>

      {/* Items list for this specific list */}
      {sortedItems.length === 0 ? (
        <div className="py-8 text-center text-slate-400 dark:text-slate-500 space-y-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No items on {listDisplayTitle.toLowerCase()} yet
          </p>
          <p className="text-xs">Type in the box above to add your first item.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/80 shadow-2xs overflow-hidden">
          {sortedItems.map((item) => {
            const parentList = list || allLists.find((l) => l.id === item.listId) || allLists[0];

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

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (parentList) onSelectItem(item, parentList);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition inline-flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700"
                      title="Edit item (What, Where, When)"
                      aria-label="Edit item"
                    >
                      <Edit3 className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Right: Move & Delete Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {allLists.filter((l) => l.id !== item.listId).length > 0 && (
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
                          {allLists
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
                    onClick={(e) => handleDeleteItem(e, item)}
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

      {/* Delete List Confirmation Modal */}
      {isConfirmingDelete && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsConfirmingDelete(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Delete "{listDisplayTitle}" list?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isFirstList && isCustomHeading
                    ? 'This will delete this custom list from your navigation. Any existing items and lists will remain safely saved in "Other".'
                    : 'This will permanently delete this list and all its tasks.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteListConfirmed}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete List</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface HeadingListViewProps {
  heading: HeadingKey;
  headingLabel?: string;
  lists: ListModel[];
  allLists: ListModel[];
  listItemsMap: Record<string, ListItemModel[]>;
  onSelectItem: (item: ListItemModel, list: ListModel) => void;
  onOpenList?: (list: ListModel) => void;
  onDeleteCustomHeading?: (headingId: string) => void;
  onCreateList?: (title: string, heading: HeadingKey) => void;
  onOpenOcr?: (listId?: string) => void;
}

export const HeadingListView: React.FC<HeadingListViewProps> = ({
  heading,
  headingLabel,
  lists,
  allLists,
  listItemsMap,
  onSelectItem,
  onDeleteCustomHeading,
  onCreateList,
  onOpenOcr,
}) => {
  const { user, userProfile } = useAuth();
  const { activeAccent } = useTheme();
  const { customHeadings } = useCustomHeadings();

  const [isAddingNewList, setIsAddingNewList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [isCreatingListLoading, setIsCreatingListLoading] = useState(false);

  const customHeadingObj = customHeadings.find((h) => h.id === heading);
  const isCustomHeading = !!customHeadingObj;

  const displayTitle = useMemo(() => {
    if (heading === 'today') return "Today";
    if (heading === 'home') return "Home";
    if (heading === 'other') return "Other";
    if (heading === 'grocery') return "Grocery";
    if (headingLabel) return headingLabel;
    if (customHeadingObj) return customHeadingObj.label;
    if (typeof heading === 'string' && heading) {
      return heading.charAt(0).toUpperCase() + heading.slice(1);
    }
    return 'List';
  }, [heading, headingLabel, customHeadingObj]);

  const currentUser = {
    email: (userProfile?.email || user?.email || 'keithfell1@gmail.com').toLowerCase(),
    displayName: userProfile?.displayName || user?.displayName || 'Keith Fell',
    uid: user?.uid || userProfile?.uid || 'user_keithfell1_gmail_com'
  };

  // Find all distinct lists that belong to this heading, keeping the original list first and placing new lists underneath
  const headingLists = useMemo(() => {
    const matching = allLists.filter((l) => getListHeading(l) === heading || l.heading === heading);
    const source = matching.length > 0 ? matching : (lists && lists.length > 0 ? lists : []);
    if (source.length === 0) return [];

    return [...source].sort((a, b) => {
      // 1. Check if one matches default heading display title exactly (primary original list)
      const primaryTitle = displayTitle.toLowerCase().trim();
      const aIsPrimary = a.title.toLowerCase().trim() === primaryTitle;
      const bIsPrimary = b.title.toLowerCase().trim() === primaryTitle;
      if (aIsPrimary && !bIsPrimary) return -1;
      if (!aIsPrimary && bIsPrimary) return 1;

      // 2. Chronological creation order (oldest/original list first, new lists underneath)
      const getCreatedTime = (list: ListModel) => {
        if (list.createdAt?.toMillis) return list.createdAt.toMillis();
        if (typeof list.createdAt === 'string') {
          const t = new Date(list.createdAt).getTime();
          if (!isNaN(t)) return t;
        }
        return 0;
      };
      return getCreatedTime(a) - getCreatedTime(b);
    });
  }, [allLists, lists, heading, displayTitle]);

  const handleEnsureFirstListCreated = async (initialItemTitle: string): Promise<string> => {
    const listLabel = headingLabel || customHeadingObj?.label || (heading.charAt(0).toUpperCase() + heading.slice(1));
    const color = heading === 'home' ? 'amber' : heading === 'today' ? 'emerald' : 'indigo';
    const icon = heading === 'home' ? 'home' : heading === 'today' ? 'calendar' : 'list';

    return await createList({
      title: listLabel,
      description: `${listLabel} list`,
      type: 'todo',
      heading: heading,
      color,
      icon,
    }, currentUser);
  };

  const handleCreateNewListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || isCreatingListLoading) return;

    setIsCreatingListLoading(true);
    try {
      if (onCreateList) {
        onCreateList(newListTitle.trim(), heading);
      } else {
        const color = heading === 'home' ? 'amber' : heading === 'today' ? 'emerald' : 'indigo';
        const icon = heading === 'home' ? 'home' : heading === 'today' ? 'calendar' : 'list';
        await createList({
          title: newListTitle.trim(),
          description: `${newListTitle.trim()} list under ${displayTitle}`,
          type: 'todo',
          heading: heading,
          color,
          icon,
        }, currentUser);
      }
      setNewListTitle('');
      setIsAddingNewList(false);
    } catch (err) {
      console.error('Error creating new list under heading:', err);
    } finally {
      setIsCreatingListLoading(false);
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8 flex-1">
      {headingLists.length === 0 ? (
        /* If no list has been created yet under this heading, display 1 default section */
        <SingleListSection
          heading={heading}
          headingLabel={headingLabel}
          defaultTitle={displayTitle}
          isFirstList={true}
          canDeleteList={isCustomHeading}
          isCustomHeading={isCustomHeading}
          allLists={allLists}
          listItems={[]}
          onSelectItem={onSelectItem}
          onDeleteCustomHeading={onDeleteCustomHeading}
          onEnsureListCreated={handleEnsureFirstListCreated}
          onOpenOcr={onOpenOcr}
        />
      ) : (
        /* Render each list under this heading underneath each other, separated by a thin simple line */
        headingLists.map((l, index) => {
          const rawItems = (listItemsMap[l.id] as ListItemModel[] | undefined) || getLocalItems(l.id) || [];
          let itemsForThisList = [...rawItems];

          // If this is the primary today list, also include any global tasks tagged for today
          if (heading === 'today' && index === 0) {
            Object.entries(listItemsMap).forEach(([otherListId, otherItems]) => {
              if (otherListId === l.id) return;
              const typedItems = (otherItems as ListItemModel[] | undefined) || [];
              typedItems.forEach((item) => {
                if (item.isForToday === true && !itemsForThisList.some((existing) => existing.id === item.id)) {
                  itemsForThisList.push({ ...item, listId: otherListId });
                }
              });
            });
          }

          return (
            <React.Fragment key={l.id}>
              {index > 0 && (
                /* Thin simple line separating the lists */
                <div className="border-t border-slate-200 dark:border-slate-800 my-8" />
              )}

              <SingleListSection
                list={l}
                heading={heading}
                headingLabel={headingLabel}
                defaultTitle={index === 0 ? displayTitle : l.title}
                isFirstList={index === 0}
                canDeleteList={index > 0 || isCustomHeading}
                isCustomHeading={isCustomHeading && index === 0}
                allLists={allLists}
                listItems={itemsForThisList}
                onSelectItem={onSelectItem}
                onDeleteCustomHeading={onDeleteCustomHeading}
                onEnsureListCreated={handleEnsureFirstListCreated}
                onOpenOcr={onOpenOcr}
              />
            </React.Fragment>
          );
        })
      )}

      {/* Thin line separating bottom action */}
      <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
        {!isAddingNewList ? (
          <button
            type="button"
            id={`btn-add-another-list-${heading}`}
            onClick={() => setIsAddingNewList(true)}
            className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center gap-2 text-xs sm:text-sm font-bold bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" style={{ color: activeAccent.primary }} />
            <span>+ New List under {displayTitle}</span>
          </button>
        ) : (
          <form 
            onSubmit={handleCreateNewListSubmit}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Create New List Under {displayTitle}
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNewList(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                placeholder={`Enter new list title (e.g. Afternoon Errands, Project Tasks)...`}
                autoFocus
                className="flex-1 px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                style={{ borderColor: newListTitle.trim() ? activeAccent.primary : undefined }}
              />
              <button
                type="submit"
                disabled={!newListTitle.trim() || isCreatingListLoading}
                className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: activeAccent.primary }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add List</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
