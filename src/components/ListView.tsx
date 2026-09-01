import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  ListModel, 
  ListItemModel, 
  PermissionRole, 
} from '../types';
import { 
  subscribeListItems, 
  addListItem, 
  toggleListItem, 
  deleteListItem, 
  deleteList,
  reorderListItem,
  moveItemToList,
  getUserPermission,
  parseNaturalTaskInput
} from '../services/listService';
import { parseItemInput, isSpecificStore } from '../utils/groceryCategorizer';
import { useAuth } from '../context/AuthContext';
import { ItemDetailsModal } from './ItemDetailsModal';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import { ListIcon } from '../utils/iconUtils';
import { 
  ArrowLeft, 
  Plus, 
  Share2, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Mic,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Edit3,
  MapPin,
  MoveRight,
  Camera,
  Sparkles
} from 'lucide-react';

interface ListViewProps {
  list: ListModel;
  onBack: () => void;
  onOpenShare: (list: ListModel) => void;
  lists?: ListModel[];
  onOpenOcr?: (listId: string) => void;
}

export const ListView: React.FC<ListViewProps> = ({ list, onBack, onOpenShare, lists, onOpenOcr }) => {
  const { user, userProfile } = useAuth();
  const [items, setItems] = useState<ListItemModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputTitle, setInputTitle] = useState('');
  const [adding, setAdding] = useState(false);

  // Item details modal
  const [selectedItem, setSelectedItem] = useState<ListItemModel | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  const currentUser = {
    uid: user?.uid || userProfile?.uid || 'user_keithfell1_gmail_com',
    email: (userProfile?.email || user?.email || 'keithfell1@gmail.com').toLowerCase(),
    displayName: userProfile?.displayName || user?.displayName || 'Keith Fell',
  };

  const role: PermissionRole = getUserPermission(list, currentUser);
  const isOwner = role === 'owner';
  const canEdit = role === 'owner' || role === 'editor';
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const otherLists = (lists || []).filter((l) => l.id !== list.id);

  const handleTransferToList = async (e: React.MouseEvent, item: ListItemModel, targetListId: string) => {
    e.stopPropagation();
    setMovingItemId(null);
    if (targetListId === list.id) return;

    try {
      await moveItemToList(list.id, targetListId, item, currentUser);
    } catch (err) {
      console.error('Error moving item:', err);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteList(list.id);
      onBack();
    } catch (err) {
      console.error('Error deleting list:', err);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const {
    isListening,
    startListening,
    stopListening,
  } = useSpeechRecognition((text) => {
    setInputTitle(text);
  });

  // Real-time items subscription
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeListItems(
      list.id,
      (updatedItems) => {
        setItems(updatedItems);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching items:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [list.id]);

  // Handle item quick add
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || adding) return;
    if (!inputTitle.trim()) {
      const inputEl = document.getElementById(`list-view-input-${list.id}`);
      if (inputEl) inputEl.focus();
      return;
    }

    setAdding(true);
    try {
      const natural = parseNaturalTaskInput(inputTitle);
      const groceryParsed = parseItemInput(natural.cleanTitle);
      const rawStore = natural.location || groceryParsed.store;
      const assignedStore = rawStore && isSpecificStore(rawStore) ? rawStore : undefined;

      await addListItem(
        list.id,
        {
          title: list.type === 'grocery' ? groceryParsed.title : natural.cleanTitle,
          quantity: natural.quantity || (list.type === 'grocery' && groceryParsed.quantity > 1 ? groceryParsed.quantity : undefined),
          unit: natural.unit || (list.type === 'grocery' && groceryParsed.quantity > 1 ? groceryParsed.unit : undefined),
          store: assignedStore,
          category: assignedStore,
          priority: natural.priority || 'medium',
          order: items.length,
        },
        {
          email: currentUser.email,
          displayName: userProfile?.displayName || user?.displayName || 'User',
        }
      );

      setInputTitle('');
    } catch (err) {
      console.error('Error adding item:', err);
    } finally {
      setAdding(false);
    }
  };

  // Toggle complete
  const handleToggle = async (item: ListItemModel) => {
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
            colors: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b'],
          });
        }
      }
    } catch (err) {
      console.error('Error toggling item:', err);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: ListItemModel) => {
    e.stopPropagation();
    if (!canEdit) return;

    try {
      await deleteListItem(list.id, item.id, item.completed, item.title, {
        email: currentUser.email,
        displayName: userProfile?.displayName || user?.displayName || 'User',
      });
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleMoveItem = async (e: React.MouseEvent, item: ListItemModel, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (!canEdit) return;
    try {
      await reorderListItem(list.id, item.id, direction);
    } catch (err) {
      console.error('Error moving item:', err);
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4 flex-1">
      {/* Clean Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-6 h-6 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200">
            <ListIcon icon={list.icon} type={list.type} className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white truncate">
            {list.title}
          </h1>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">
            ({items.length})
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
              title="Delete list"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Camera OCR Scan Button */}
          {onOpenOcr && (
            <button
              type="button"
              onClick={() => onOpenOcr(list.id)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Scan handwritten notes or receipt with Camera"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Camera OCR</span>
            </button>
          )}

          {/* Share Button */}
          <button
            type="button"
            onClick={() => onOpenShare(list)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition shadow-2xs"
            title="Share list"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Quick Add Bar */}
      {canEdit && (
        <form onSubmit={handleAddItem} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              id={`list-view-input-${list.id}`}
              type="text"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              placeholder={
                isListening
                  ? '🎙️ Listening... Speak now!'
                  : list.type === 'grocery'
                  ? 'Add grocery item (e.g. 3 lbs apples, Milk, Bread @Costco)...'
                  : 'Add item to this list...'
              }
              className={`w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-2xs ${
                isListening
                  ? 'border-rose-400 bg-rose-50/30 text-rose-900 animate-pulse'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
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

          {/* Camera OCR button */}
          {onOpenOcr && (
            <button
              type="button"
              id={`btn-camera-ocr-listview-${list.id}`}
              onClick={() => onOpenOcr(list.id)}
              className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition shadow-2xs shrink-0 flex items-center gap-1 cursor-pointer"
              title="Take picture & OCR scan items to list"
            >
              <Camera className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Camera</span>
            </button>
          )}

          <button
            type="submit"
            id={`btn-add-item-listview-${list.id}`}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </form>
      )}

      {/* Actual List of Items */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Loading list...
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No items in this list yet
          </p>
          <p className="text-xs">
            {canEdit ? 'Type in the box above to add your first item.' : 'This list is empty.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/80 shadow-2xs overflow-hidden">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedItem(item);
                setIsDetailsOpen(true);
              }}
              className={`p-3.5 flex items-center justify-between gap-3 transition cursor-pointer group ${
                item.completed
                  ? 'bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500'
                  : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50 text-slate-900 dark:text-slate-100'
              }`}
            >
              {/* Checkbox & Info on the same line */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(item);
                  }}
                  className="text-slate-400 hover:text-emerald-600 transition shrink-0"
                >
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/40" />
                  ) : (
                    <Circle className="w-5 h-5 hover:stroke-emerald-600 stroke-[2]" />
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

                  {/* Quantity badge */}
                  {item.quantity && (
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md shrink-0 border border-slate-200/60 dark:border-slate-700">
                      {item.quantity} {item.unit || ''}
                    </span>
                  )}

                  {/* Store / Location Badge if specifically present */}
                  {(() => {
                    const displayStore = isSpecificStore(item.store) ? item.store : isSpecificStore(item.location) ? item.location : isSpecificStore(item.category) ? item.category : undefined;
                    if (!displayStore) return null;
                    return (
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800 shrink-0 flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{displayStore}</span>
                      </span>
                    );
                  })()}

                  {/* Edit Button to bring up Task Editor */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                        setIsDetailsOpen(true);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition inline-flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700"
                      title="Edit task (What, Where, When)"
                      aria-label="Edit task"
                    >
                      <Edit3 className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    </button>
                  )}

                  {/* Priority Tag (only if high or urgent) */}
                  {item.priority === 'urgent' && !item.completed && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 rounded shrink-0">
                      Urgent
                    </span>
                  )}
                  {item.priority === 'high' && !item.completed && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded shrink-0">
                      High
                    </span>
                  )}
                </div>
              </div>

              {/* Right Action buttons */}
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => handleMoveItem(e, item, 'up')}
                    className="p-1 text-slate-300 hover:text-slate-700 dark:hover:text-slate-200 rounded transition"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleMoveItem(e, item, 'down')}
                    className="p-1 text-slate-300 hover:text-slate-700 dark:hover:text-slate-200 rounded transition"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Transfer to another list dropdown */}
                  {otherLists.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingItemId(movingItemId === item.id ? null : item.id);
                        }}
                        className="px-2 py-0.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition text-[11px] font-bold flex items-center gap-1 border border-slate-200/60 dark:border-slate-700"
                        title="Move to another list"
                      >
                        <MoveRight className="w-3 h-3 text-indigo-500" />
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
                          {otherLists.map((target) => (
                            <button
                              key={target.id}
                              type="button"
                              onClick={(e) => handleTransferToList(e, item, target.id)}
                              className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-800 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 flex items-center gap-2 transition truncate"
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
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Item Details Modal */}
      <ItemDetailsModal
        list={list}
        item={selectedItem}
        isOpen={isDetailsOpen}
        lists={lists}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedItem(null);
        }}
        canEdit={canEdit}
      />

      {/* Delete List Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          onClick={() => setShowDeleteConfirm(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200/60 dark:border-rose-800">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete List</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white">"{list.title}"</strong> and all its {items.length} items?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete List</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
