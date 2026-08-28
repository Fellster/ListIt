import React, { useState, useEffect } from 'react';
import { ListModel, ListItemModel, PermissionRole, SharedMember, GROCERY_STORES } from '../types';
import { 
  getUserPermission, 
  updateList, 
  deleteList, 
  subscribeListItems, 
  toggleListItem, 
  deleteListItem, 
  reorderListItem, 
  moveItemToList, 
  addListItem,
  parseNaturalTaskInput 
} from '../services/listService';
import { parseItemInput } from '../utils/groceryCategorizer';
import { useAuth, getAvatarColor, getInitials } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import confetti from 'canvas-confetti';
import { 
  Users, 
  Pin, 
  MoreVertical, 
  Share2, 
  Trash2, 
  Check, 
  Eye, 
  Edit3, 
  Shield, 
  ShoppingCart, 
  ListTodo, 
  CheckSquare, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  MoveRight, 
  Store, 
  MapPin, 
  Clock, 
  DollarSign, 
  Mic, 
  MicOff,
  Filter,
  Calendar
} from 'lucide-react';

interface ListCardProps {
  list: ListModel;
  allLists?: ListModel[];
  onSelectItem?: (item: ListItemModel, list: ListModel) => void;
  onSelect?: (list: ListModel) => void;
  onOpenShare: (list: ListModel) => void;
}

export const ListCard: React.FC<ListCardProps> = ({ 
  list, 
  allLists = [], 
  onSelectItem, 
  onSelect, 
  onOpenShare 
}) => {
  const { user, userProfile } = useAuth();
  const { activeAccent } = useTheme();
  const [items, setItems] = useState<ListItemModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [groupByStore, setGroupByStore] = useState<boolean>(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  // Quick inline add on list card
  const [quickInput, setQuickInput] = useState('');
  const [quickStore, setQuickStore] = useState<string>(list.type === 'grocery' ? "Trader Joe's" : '');
  const [isAdding, setIsAdding] = useState(false);

  const currentUser = {
    uid: user?.uid || '',
    email: (userProfile?.email || user?.email || '').toLowerCase(),
  };

  const role: PermissionRole = getUserPermission(list, currentUser);
  const isOwner = role === 'owner';
  const canEdit = role === 'owner' || role === 'editor';

  const {
    isSupported: isVoiceSupported,
    isListening: isMicListening,
    startListening,
    stopListening,
  } = useSpeechRecognition((text) => {
    setQuickInput(text);
  });

  // Real-time subscription to items for this list
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeListItems(
      list.id,
      (updatedItems) => {
        setItems(updatedItems);
        setLoading(false);
      },
      (err) => {
        console.warn(`Error loading items for list ${list.id}:`, err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [list.id]);

  const total = items.length;
  const completed = items.filter((i) => i.completed).length;
  const sharedMembers = Object.values(list.sharedWith || {}) as SharedMember[];

  // Available unique stores in this list
  const availableStores = React.useMemo(() => {
    const storesSet = new Set<string>();
    items.forEach((it) => {
      const s = it.store || it.category || (it.location ? it.location : '');
      if (s) storesSet.add(s);
    });
    return Array.from(storesSet);
  }, [items]);

  // Filtered items
  const displayItems = React.useMemo(() => {
    if (storeFilter === 'all') return items;
    return items.filter((it) => {
      const itStore = it.store || it.category || it.location;
      return itStore === storeFilter;
    });
  }, [items, storeFilter]);

  // Grouped by store mapping
  const groupedStoreMap = React.useMemo(() => {
    if (!groupByStore) return null;
    const map: Record<string, ListItemModel[]> = {};
    displayItems.forEach((item) => {
      const store = item.store || item.category || (list.type === 'grocery' ? item.location : undefined) || 'Other Store';
      if (!map[store]) map[store] = [];
      map[store].push(item);
    });
    return map;
  }, [displayItems, groupByStore, list.type]);

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateList(list.id, { isPinned: !list.isPinned });
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const handleDeleteList = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (!isOwner) {
      alert('Only the list owner can delete this list.');
      return;
    }
    if (confirm(`Are you sure you want to delete "${list.title}"?`)) {
      await deleteList(list.id);
    }
  };

  // Toggle item completed
  const handleToggleItem = async (e: React.MouseEvent, item: ListItemModel) => {
    e.stopPropagation();
    if (!canEdit) return;

    const willBeCompleted = !item.completed;
    try {
      await toggleListItem(
        list.id,
        item.id,
        item.completed,
        {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: userProfile?.displayName || user?.displayName || 'User',
        },
        item.title
      );

      if (willBeCompleted) {
        const uncompletedCount = items.filter((i) => !i.completed && i.id !== item.id).length;
        if (uncompletedCount === 0 && items.length > 0) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#10b981', '#3b82f6', '#f59e0b'],
          });
        }
      }
    } catch (err) {
      console.error('Error toggling item:', err);
    }
  };

  // Reorder / move item Up or Down
  const handleMoveItem = async (e: React.MouseEvent, item: ListItemModel, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (!canEdit) return;
    try {
      await reorderListItem(list.id, item.id, direction);
    } catch (err) {
      console.error('Error reordering item:', err);
    }
  };

  // Move item to another list
  const handleTransferToList = async (e: React.MouseEvent, item: ListItemModel, targetListId: string) => {
    e.stopPropagation();
    setMovingItemId(null);
    if (!canEdit || targetListId === list.id) return;

    try {
      await moveItemToList(
        list.id,
        targetListId,
        item,
        {
          email: currentUser.email,
          displayName: userProfile?.displayName || user?.displayName || 'User',
        }
      );
    } catch (err) {
      console.error('Error moving item to list:', err);
    }
  };

  // Eliminate / Delete item directly
  const handleEliminateItem = async (e: React.MouseEvent, item: ListItemModel) => {
    e.stopPropagation();
    if (!canEdit) return;

    try {
      await deleteListItem(
        list.id,
        item.id,
        item.completed,
        item.title,
        {
          email: currentUser.email,
          displayName: userProfile?.displayName || user?.displayName || 'User',
        }
      );
    } catch (err) {
      console.error('Error eliminating item:', err);
    }
  };

  // Quick inline add item
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim() || !canEdit || isAdding) return;

    setIsAdding(true);
    try {
      const natural = parseNaturalTaskInput(quickInput);
      const groceryParsed = parseItemInput(natural.cleanTitle, quickStore || "Trader Joe's");
      const assignedStore = list.type === 'grocery' 
        ? (natural.location || groceryParsed.store || quickStore || "Trader Joe's")
        : (natural.location || quickStore || undefined);

      await addListItem(
        list.id,
        {
          title: list.type === 'grocery' ? groceryParsed.title : natural.cleanTitle,
          store: assignedStore,
          category: assignedStore,
          quantity: natural.quantity || groceryParsed.quantity,
          unit: natural.unit || groceryParsed.unit,
          priority: natural.priority || 'medium',
          location: natural.location || (list.type === 'grocery' ? assignedStore : undefined),
          timeScheduled: natural.timeScheduled,
          estimatedPrice: natural.estimatedPrice,
          order: items.length,
        },
        {
          email: currentUser.email,
          displayName: userProfile?.displayName || user?.displayName || 'User',
        }
      );

      setQuickInput('');
    } catch (err) {
      console.error('Error adding item directly to card:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const getRoleBadge = () => {
    if (isOwner) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-md flex items-center gap-1">
          <Shield className="w-2.5 h-2.5" /> Owner
        </span>
      );
    }
    if (role === 'editor') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-md flex items-center gap-1">
          <Edit3 className="w-2.5 h-2.5" /> Editor
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200/80 rounded-md flex items-center gap-1">
        <Eye className="w-2.5 h-2.5" /> Viewer
      </span>
    );
  };

  const getTypeBadge = () => {
    switch (list.type) {
      case 'grocery':
        return (
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800">
            <ShoppingCart className="w-2.5 h-2.5" /> Grocery
          </span>
        );
      case 'todo':
        return (
          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300 px-2 py-0.5 rounded-md flex items-center gap-1 border border-indigo-200/60 dark:border-indigo-800">
            <ListTodo className="w-2.5 h-2.5" /> Tasks
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-300 px-2 py-0.5 rounded-md flex items-center gap-1 border border-violet-200/60 dark:border-violet-800">
            <CheckSquare className="w-2.5 h-2.5" /> Checklist
          </span>
        );
    }
  };

  const otherLists = allLists.filter((l) => l.id !== list.id);

  return (
    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0 border border-slate-200/70 dark:border-slate-700">
              {list.icon || (list.type === 'grocery' ? '🛒' : '📝')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 
                  className="font-bold text-slate-900 dark:text-white text-base truncate"
                  title={list.title}
                >
                  {list.title}
                </h3>
                {list.isPinned && (
                  <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {getTypeBadge()}
                {getRoleBadge()}
              </div>
            </div>
          </div>

          {/* Actions & Menu */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onOpenShare(list)}
              className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Share list"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-20 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onOpenShare(list);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Share & Permissions</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTogglePin}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Pin className="w-3.5 h-3.5 text-amber-500" />
                    <span>{list.isPinned ? 'Unpin list' : 'Pin to top'}</span>
                  </button>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={handleDeleteList}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 mt-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete list</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {list.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2.5">
            {list.description}
          </p>
        )}

        {/* Clean Items Status Count & Group by Store Toggle */}
        <div className="flex items-center justify-between gap-2 text-xs py-1.5 border-t border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium flex-wrap">
          <div className="flex items-center gap-2">
            <span>
              {total === 0
                ? 'No items yet'
                : `${completed} of ${total} completed`}
            </span>

            {/* Group by Store Toggle Button */}
            {(list.type === 'grocery' || availableStores.length > 0) && (
              <button
                type="button"
                onClick={() => setGroupByStore(!groupByStore)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition shadow-2xs ${
                  groupByStore
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title="Toggle grouping items by store"
              >
                <Store className="w-3 h-3" />
                <span>{groupByStore ? 'Grouped by Store' : 'Group by Store'}</span>
              </button>
            )}
          </div>

          {/* Store Filter Pills if multiple stores present */}
          {availableStores.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-xs">
              <button
                type="button"
                onClick={() => setStoreFilter('all')}
                className={`text-[10px] px-2 py-0.5 rounded font-semibold transition ${
                  storeFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                All Stores
              </button>
              {availableStores.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStoreFilter(st)}
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold transition whitespace-nowrap ${
                    storeFilter === st
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FULL ITEMS DISPLAY: All items shown right on the card */}
      <div className="my-3 space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading items...</div>
        ) : displayItems.length === 0 ? (
          <div className="py-5 text-center text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            {storeFilter !== 'all' ? `No items for ${storeFilter}` : 'No items on this list yet. Add one below!'}
          </div>
        ) : groupByStore && groupedStoreMap ? (
          /* GROUPED BY STORE VIEW */
          <div className="space-y-3">
            {Object.entries(groupedStoreMap).map(([storeName, itemsList]) => {
              const storeItems = itemsList as ListItemModel[];
              return (
              <div key={storeName} className="space-y-1.5">
                {/* Store Section Header */}
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{storeName}</span>
                    <span className="text-[10px] font-normal text-slate-400">({storeItems.length})</span>
                  </div>
                </div>

                {/* Items in this store */}
                <div className="space-y-1 pl-1">
                  {storeItems.map((item, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === storeItems.length - 1;
                    const itemStore = item.store || item.category || (list.type === 'grocery' ? item.location : undefined);

                    return (
                      <div
                        key={item.id}
                        className={`group p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2 text-xs ${
                          item.completed
                            ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800 opacity-65'
                            : 'bg-white dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-2xs'
                        }`}
                      >
                        {/* Left: Checkbox & Item Info */}
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={(e) => handleToggleItem(e, item)}
                            className={`mt-0.5 w-4.5 h-4.5 rounded-md flex items-center justify-center transition shrink-0 ${
                              item.completed
                                ? 'bg-emerald-600 text-white'
                                : canEdit
                                ? 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 text-transparent'
                                : 'border-2 border-slate-200 opacity-50'
                            }`}
                            title={item.completed ? 'Mark as uncompleted' : 'Cross off item'}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>

                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => onSelectItem && onSelectItem(item, list)}
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`font-semibold break-words leading-tight ${
                                  item.completed
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {item.title}
                              </span>

                              {/* Quantity */}
                              {item.quantity && item.quantity > 1 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-200/60 dark:border-slate-600">
                                  {item.quantity} {item.unit || ''}
                                </span>
                              )}

                              {/* Store Tag Badge right after the item */}
                              {itemStore && (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded flex items-center gap-0.5 border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                                  <Store className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>{itemStore}</span>
                                </span>
                              )}

                              {/* Priority tag */}
                              {item.priority === 'urgent' && !item.completed && (
                                <span className="text-[9px] font-extrabold px-1 py-0.2 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 rounded">
                                  Urgent
                                </span>
                              )}
                              {item.priority === 'high' && !item.completed && (
                                <span className="text-[9px] font-bold px-1 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded">
                                  High
                                </span>
                              )}

                              {/* Price */}
                              {item.estimatedPrice !== undefined && item.estimatedPrice > 0 && (
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                  <DollarSign className="w-2.5 h-2.5 text-emerald-500" />
                                  <span>{item.estimatedPrice.toFixed(2)}</span>
                                </span>
                              )}
                            </div>

                            {item.notes && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right Controls: Move Up/Down, Transfer List, Eliminate */}
                        <div className="flex items-center gap-0.5 shrink-0 opacity-85 group-hover:opacity-100 transition">
                          {canEdit && (
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={(e) => handleMoveItem(e, item, 'up')}
                              className={`p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition ${
                                isFirst ? 'opacity-20 cursor-not-allowed' : ''
                              }`}
                              title="Move item up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canEdit && (
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={(e) => handleMoveItem(e, item, 'down')}
                              className={`p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition ${
                                isLast ? 'opacity-20 cursor-not-allowed' : ''
                              }`}
                              title="Move item down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canEdit && otherLists.length > 0 && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMovingItemId(movingItemId === item.id ? null : item.id);
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition"
                                title="Move to another list"
                              >
                                <MoveRight className="w-3.5 h-3.5" />
                              </button>

                              {movingItemId === item.id && (
                                <div 
                                  className="absolute right-0 bottom-full mb-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-30 animate-in fade-in"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Move to list:
                                  </div>
                                  {otherLists.map((target) => (
                                    <button
                                      key={target.id}
                                      type="button"
                                      onClick={(e) => handleTransferToList(e, item, target.id)}
                                      className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 truncate"
                                    >
                                      <span>{target.type === 'grocery' ? '🛒' : '📝'}</span>
                                      <span className="truncate">{target.title}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => handleEliminateItem(e, item)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                              title="Eliminate item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
        ) : (
          /* FLAT SEQUENTIAL VIEW */
          displayItems.map((item, index) => {
            const itemStore = item.store || item.category || (list.type === 'grocery' ? item.location : undefined);
            const isFirst = index === 0;
            const isLast = index === displayItems.length - 1;

            return (
              <div
                key={item.id}
                className={`group p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2 text-xs ${
                  item.completed
                    ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800 opacity-65'
                    : 'bg-white dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-2xs'
                }`}
              >
                {/* Left: Checkbox & Item Info */}
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  {/* Cross-off Checkbox */}
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={(e) => handleToggleItem(e, item)}
                    className={`mt-0.5 w-4.5 h-4.5 rounded-md flex items-center justify-center transition shrink-0 ${
                      item.completed
                        ? 'bg-emerald-600 text-white'
                        : canEdit
                        ? 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 text-transparent'
                        : 'border-2 border-slate-200 opacity-50'
                    }`}
                    title={item.completed ? 'Mark as uncompleted' : 'Cross off item'}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </button>

                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onSelectItem && onSelectItem(item, list)}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`font-semibold break-words leading-tight ${
                          item.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {item.title}
                      </span>

                      {/* Quantity */}
                      {item.quantity && item.quantity > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-200/60 dark:border-slate-600">
                          {item.quantity} {item.unit || ''}
                        </span>
                      )}

                      {/* Store Badge Tagged Right After the Item */}
                      {itemStore && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded flex items-center gap-0.5 border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                          <Store className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{itemStore}</span>
                        </span>
                      )}

                      {/* Priority tag */}
                      {item.priority === 'urgent' && !item.completed && (
                        <span className="text-[9px] font-extrabold px-1 py-0.2 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 rounded">
                          Urgent
                        </span>
                      )}
                      {item.priority === 'high' && !item.completed && (
                        <span className="text-[9px] font-bold px-1 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded">
                          High
                        </span>
                      )}

                      {/* Price */}
                      {item.estimatedPrice !== undefined && item.estimatedPrice > 0 && (
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <DollarSign className="w-2.5 h-2.5 text-emerald-500" />
                          <span>{item.estimatedPrice.toFixed(2)}</span>
                        </span>
                      )}

                      {/* Time */}
                      {item.timeScheduled && (
                        <span className="text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5 text-indigo-500" />
                          <span>{item.timeScheduled}</span>
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Controls: Move Up/Down, Transfer List, Eliminate */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-85 group-hover:opacity-100 transition">
                  {/* Move Up Button */}
                  {canEdit && (
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={(e) => handleMoveItem(e, item, 'up')}
                      className={`p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition ${
                        isFirst ? 'opacity-20 cursor-not-allowed' : ''
                      }`}
                      title="Move item up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Move Down Button */}
                  {canEdit && (
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={(e) => handleMoveItem(e, item, 'down')}
                      className={`p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition ${
                        isLast ? 'opacity-20 cursor-not-allowed' : ''
                      }`}
                      title="Move item down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Transfer to another list dropdown */}
                  {canEdit && otherLists.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingItemId(movingItemId === item.id ? null : item.id);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition"
                        title="Move to another list"
                      >
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>

                      {movingItemId === item.id && (
                        <div 
                          className="absolute right-0 bottom-full mb-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-30 animate-in fade-in"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Move to list:
                          </div>
                          {otherLists.map((target) => (
                            <button
                              key={target.id}
                              type="button"
                              onClick={(e) => handleTransferToList(e, item, target.id)}
                              className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 truncate"
                            >
                              <span>{target.type === 'grocery' ? '🛒' : '📝'}</span>
                              <span className="truncate">{target.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Eliminate / Delete Item Button */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => handleEliminateItem(e, item)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                      title="Eliminate item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* BOTTOM SECTION: Inline Quick Add Row + Members Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
        {/* Quick Add Form on the List Card */}
        {canEdit && (
          <form onSubmit={handleQuickAdd} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder={
                    isMicListening
                      ? '🎙️ Listening...'
                      : list.type === 'grocery'
                      ? 'Add item: e.g. "2 lbs apples @Trader Joe\'s"'
                      : 'Add item to this list...'
                  }
                  className={`w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isMicListening
                      ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (isMicListening) stopListening();
                    else startListening();
                  }}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition ${
                    isMicListening ? 'text-rose-600 bg-rose-100' : 'text-slate-400 hover:text-rose-500'
                  }`}
                  title="Voice dictation"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="submit"
                disabled={isAdding || !quickInput.trim()}
                className="px-3 py-1.5 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1 shrink-0 disabled:opacity-40"
                style={{ backgroundColor: activeAccent.primary }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Quick Store Selector for Grocery */}
            {list.type === 'grocery' && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px]">
                <span className="text-slate-400 font-semibold shrink-0">Store:</span>
                {GROCERY_STORES.slice(0, 5).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setQuickStore(st)}
                    className={`px-2 py-0.5 rounded transition whitespace-nowrap ${
                      quickStore === st
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </form>
        )}

        {/* Collaborators & Details Link */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div
            onClick={() => onOpenShare(list)}
            className="flex items-center -space-x-1.5 hover:opacity-90 transition p-0.5 rounded-lg cursor-pointer"
            title="Manage shared members"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] border-2 border-white dark:border-slate-800 shadow-2xs ${getAvatarColor(
                list.ownerEmail
              )}`}
              title={`Owner: ${list.ownerName || list.ownerEmail}`}
            >
              {getInitials(list.ownerName || list.ownerEmail)}
            </div>

            {sharedMembers.slice(0, 3).map((m) => (
              <div
                key={m.email}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] border-2 border-white dark:border-slate-800 shadow-2xs ${getAvatarColor(
                  m.email
                )}`}
                title={`${m.name || m.email} (${m.role === 'editor' ? 'Editor' : 'Viewer'})`}
              >
                {getInitials(m.name || m.email)}
              </div>
            ))}

            {sharedMembers.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-800">
                +{sharedMembers.length - 3}
              </div>
            )}

            <span className="text-[11px] text-slate-400 font-medium ml-2.5 flex items-center gap-1 hover:text-emerald-600">
              <Users className="w-3 h-3" />
              {sharedMembers.length + 1}
            </span>
          </div>

          {onSelect && (
            <button
              type="button"
              onClick={() => onSelect(list)}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition flex items-center gap-1"
            >
              <span>Full Board</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
