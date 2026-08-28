import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  ListModel, 
  ListItemModel, 
  PermissionRole, 
  GROCERY_STORES, 
  GroceryStore,
  SharedMember
} from '../types';
import { 
  subscribeListItems, 
  addListItem, 
  toggleListItem, 
  deleteListItem, 
  reorderListItem,
  reorderAllListItems,
  clearCompletedItems,
  getUserPermission,
  updateList,
  updateListItem,
  parseNaturalTaskInput
} from '../services/listService';
import { parseItemInput } from '../utils/groceryCategorizer';
import { useAuth, getAvatarColor, getInitials } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCalendar } from '../context/CalendarContext';
import { ItemDetailsModal } from './ItemDetailsModal';
import { ActivityDrawer } from './ActivityDrawer';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import { 
  ArrowLeft, 
  Plus, 
  Share2, 
  Activity, 
  CheckCircle, 
  Circle, 
  Trash2, 
  MoreVertical, 
  Filter, 
  Search, 
  Sparkles, 
  Eye, 
  Edit3, 
  Shield, 
  Copy, 
  Check, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Tag,
  Hash,
  Layers,
  AlertCircle,
  MapPin,
  Clock,
  DollarSign,
  CalendarPlus,
  Mic,
  MicOff,
  Store,
  ArrowUp,
  ArrowDown,
  GripVertical
} from 'lucide-react';

interface ListViewProps {
  list: ListModel;
  onBack: () => void;
  onOpenShare: (list: ListModel) => void;
}

export const ListView: React.FC<ListViewProps> = ({ list, onBack, onOpenShare }) => {
  const { user, userProfile } = useAuth();
  const { activeAccent } = useTheme();
  const { isConnected: isGcalConnected, syncTaskToCalendar } = useCalendar();
  const [items, setItems] = useState<ListItemModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Add State
  const [inputTitle, setInputTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    list.type === 'grocery' ? "Trader Joe's" : 'Other Store'
  );
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [adding, setAdding] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [groupByCategory, setGroupByCategory] = useState(list.type === 'grocery');

  // Modals & Drawers
  const [selectedItem, setSelectedItem] = useState<ListItemModel | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Drag-and-Drop Reordering State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  const currentUser = {
    uid: user?.uid || '',
    email: (userProfile?.email || user?.email || '').toLowerCase(),
  };

  const role: PermissionRole = getUserPermission(list, currentUser);
  const canEdit = role === 'owner' || role === 'editor';
  const isOwner = role === 'owner';

  const {
    isSupported: isVoiceSupported,
    isListening: isQuickMicListening,
    startListening: startQuickMic,
    stopListening: stopQuickMic,
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

  // Handle item quick add with natural language parsing
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim() || !canEdit || adding) return;

    setAdding(true);
    try {
      const natural = parseNaturalTaskInput(inputTitle);
      const groceryParsed = parseItemInput(natural.cleanTitle, selectedCategory);
      const chosenStore = list.type === 'grocery' ? (groceryParsed.store || groceryParsed.category || selectedCategory) : selectedCategory;

      await addListItem(
        list.id,
        {
          title: list.type === 'grocery' ? groceryParsed.title : natural.cleanTitle,
          category: chosenStore,
          store: chosenStore,
          quantity: natural.quantity || groceryParsed.quantity,
          unit: natural.unit || groceryParsed.unit,
          priority: natural.priority || selectedPriority,
          location: natural.location,
          timeScheduled: natural.timeScheduled,
          estimatedPrice: natural.estimatedPrice,
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

  const handleMoveItem = async (e: React.MouseEvent, item: ListItemModel, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (!canEdit) return;
    try {
      await reorderListItem(list.id, item.id, direction);
    } catch (err) {
      console.error('Error moving item:', err);
    }
  };

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, item: ListItemModel) => {
    if (!canEdit) return;
    setDraggedItemId(item.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    setDragOverPosition(null);
    setDragOverGroup(null);
  };

  const handleDragOverItem = (e: React.DragEvent, targetItem: ListItemModel, groupName?: string) => {
    if (!canEdit || !draggedItemId || draggedItemId === targetItem.id) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isBelow = relativeY > rect.height / 2;
    const position = isBelow ? 'below' : 'above';

    if (dragOverItemId !== targetItem.id || dragOverPosition !== position) {
      setDragOverItemId(targetItem.id);
      setDragOverPosition(position);
      if (groupName) setDragOverGroup(groupName);
    }
  };

  const handleDragLeaveItem = (e: React.DragEvent, targetItem: ListItemModel) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    if (dragOverItemId === targetItem.id) {
      setDragOverItemId(null);
      setDragOverPosition(null);
    }
  };

  const handleDropOnItem = async (e: React.DragEvent, targetItem: ListItemModel, targetGroup?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canEdit || !draggedItemId || draggedItemId === targetItem.id) {
      handleDragEnd();
      return;
    }

    const currentItems = [...items];
    const draggedIdx = currentItems.findIndex((it) => it.id === draggedItemId);
    const targetIdx = currentItems.findIndex((it) => it.id === targetItem.id);

    if (draggedIdx === -1 || targetIdx === -1) {
      handleDragEnd();
      return;
    }

    const [draggedItem] = currentItems.splice(draggedIdx, 1);
    
    // If dropping into a specific store group, update its store & category
    if (targetGroup && targetGroup !== 'All Items' && list.type === 'grocery') {
      draggedItem.store = targetGroup;
      draggedItem.category = targetGroup;
    }

    const newTargetIdx = currentItems.findIndex((it) => it.id === targetItem.id);
    const insertIdx = dragOverPosition === 'below' ? newTargetIdx + 1 : newTargetIdx;

    currentItems.splice(insertIdx, 0, draggedItem);

    // Update state immediately
    setItems(currentItems);
    handleDragEnd();

    // Persist reorder sequence
    try {
      await reorderAllListItems(list.id, currentItems);
    } catch (err) {
      console.error('Error saving reordered items:', err);
    }
  };

  const handleDragOverGroupHeader = (e: React.DragEvent, groupName: string) => {
    if (!canEdit || !draggedItemId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverGroup !== groupName) {
      setDragOverGroup(groupName);
    }
  };

  const handleDropOnGroupHeader = async (e: React.DragEvent, targetGroup: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canEdit || !draggedItemId) {
      handleDragEnd();
      return;
    }

    const currentItems = [...items];
    const draggedIdx = currentItems.findIndex((it) => it.id === draggedItemId);
    if (draggedIdx === -1) {
      handleDragEnd();
      return;
    }

    const [draggedItem] = currentItems.splice(draggedIdx, 1);
    if (targetGroup && targetGroup !== 'All Items' && list.type === 'grocery') {
      draggedItem.store = targetGroup;
      draggedItem.category = targetGroup;
    }

    const firstGroupIdx = currentItems.findIndex((it) => (it.store || it.category) === targetGroup);
    if (firstGroupIdx !== -1) {
      currentItems.splice(firstGroupIdx, 0, draggedItem);
    } else {
      currentItems.unshift(draggedItem);
    }

    setItems(currentItems);
    handleDragEnd();

    try {
      await reorderAllListItems(list.id, currentItems);
    } catch (err) {
      console.error('Error saving reordered items to group:', err);
    }
  };

  // Toggle complete with sound / confetti
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
        // Check if all items are now completed
        const uncompletedCount = items.filter((i) => !i.completed && i.id !== item.id).length;
        if (uncompletedCount === 0 && items.length > 0) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
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

  const handleClearCompleted = async () => {
    if (!canEdit) return;
    const completedItems = items.filter((i) => i.completed);
    if (completedItems.length === 0) return;

    if (confirm(`Clear all ${completedItems.length} completed items?`)) {
      await clearCompletedItems(list.id, {
        email: currentUser.email,
        displayName: userProfile?.displayName || user?.displayName || 'User',
      });
    }
  };

  const handleCopyText = () => {
    const active = items.filter((i) => !i.completed).map((i) => `[ ] ${i.quantity ? `${i.quantity} ${i.unit || ''} ` : ''}${i.title}`);
    const done = items.filter((i) => i.completed).map((i) => `[x] ${i.title}`);
    const text = `${list.icon || '📝'} ${list.title}\n\nRemaining (${active.length}):\n${active.join('\n')}\n\nCompleted (${done.length}):\n${done.join('\n')}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    });
  };

  // Filtering
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'active' && item.completed) return false;
    if (statusFilter === 'completed' && !item.completed) return false;

    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

    return true;
  });

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.completed).length;
  const sharedMembers = Object.values(list.sharedWith || {}) as SharedMember[];

  // Group items by store if enabled
  const groupedCategories: Record<string, ListItemModel[]> = React.useMemo(() => {
    if (!groupByCategory) return { 'All Items': filteredItems };

    const map: Record<string, ListItemModel[]> = {};
    filteredItems.forEach((item) => {
      const storeName = item.store || item.category || 'Other Store';
      if (!map[storeName]) map[storeName] = [];
      map[storeName].push(item);
    });
    return map;
  }, [filteredItems, groupByCategory]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      {/* Top App Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          {/* Back button & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition shrink-0"
              title="Back to All Lists"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                {list.icon || (list.type === 'grocery' ? '🛒' : '📝')}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 truncate">
                    {list.title}
                  </h1>
                  {role === 'owner' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md flex items-center gap-1 shrink-0">
                      <Shield className="w-2.5 h-2.5" /> Owner
                    </span>
                  ) : role === 'editor' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md flex items-center gap-1 shrink-0">
                      <Edit3 className="w-2.5 h-2.5" /> Editor
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-md flex items-center gap-1 shrink-0">
                      <Eye className="w-2.5 h-2.5" /> View Only
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 truncate">
                  <span>{list.type === 'grocery' ? 'Grocery Shopping' : list.type === 'todo' ? 'To-Do Tasks' : 'Checklist'}</span>
                  <span>•</span>
                  <span>{totalItems} {totalItems === 1 ? 'item' : 'items'} ({completedItems} checked)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right actions: Collaborators, Share, Activity */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Share / Manage Access Button */}
            <button
              type="button"
              onClick={() => onOpenShare(list)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-semibold shadow-2xs transition"
              title="Manage sharing & permissions"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share ({sharedMembers.length + 1})</span>
              <span className="sm:hidden">{sharedMembers.length + 1}</span>
            </button>

            {/* Live Activity Button */}
            <button
              type="button"
              onClick={() => setIsActivityOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition relative"
              title="View live sync activity"
            >
              <Activity className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 animate-pulse" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Viewer Banner if View-Only */}
        {!canEdit && (
          <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-xs text-sky-800">
              <Eye className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                <strong>View-Only Access:</strong> You are viewing this list live in real-time. Contact the owner ({list.ownerEmail}) to request edit permissions.
              </span>
            </div>
          </div>
        )}

        {/* Quick Stats (No percentages) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">
              {completedItems === totalItems && totalItems > 0
                ? 'All Completed! 🎉'
                : `${completedItems} of ${totalItems} items completed`}
            </span>
            {completedItems === totalItems && totalItems > 0 && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                Finished
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {totalItems - completedItems} remaining
          </span>
        </div>

        {/* Quick Add Bar (Enabled for Owners & Editors) */}
        {canEdit ? (
          <form onSubmit={handleAddItem} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  placeholder={
                    isQuickMicListening
                      ? '🎙️ Listening... Speak now!'
                      : list.type === 'grocery'
                      ? 'Add item: e.g. "3 lbs organic apples" or "2 cartons milk"'
                      : 'Add task: e.g. "Review quarterly slides"'
                  }
                  className={`w-full pl-3.5 pr-16 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition ${
                    isQuickMicListening
                      ? 'border-rose-400 bg-rose-50/40 text-rose-900 placeholder:text-rose-600 animate-pulse'
                      : 'border-slate-200'
                  }`}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {inputTitle && (
                    <button
                      type="button"
                      onClick={() => setInputTitle('')}
                      className="p-1 text-slate-400 hover:text-slate-600 text-xs"
                      title="Clear text"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (isQuickMicListening) {
                        stopQuickMic();
                      } else {
                        startQuickMic();
                      }
                    }}
                    className={`p-1.5 rounded-lg transition ${
                      isQuickMicListening
                        ? 'text-rose-600 bg-rose-100 animate-bounce'
                        : 'text-slate-400 hover:text-rose-500 hover:bg-slate-200/50'
                    }`}
                    title={isQuickMicListening ? 'Stop voice recording' : 'Dictate with microphone'}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={adding || !inputTitle.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Item</span>
              </button>
            </div>

            {/* Quick Store / Priority chips */}
            {list.type === 'grocery' ? (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
                  <Store className="w-3 h-3 text-emerald-500" />
                  <span>Store:</span>
                </span>
                {GROCERY_STORES.slice(0, 7).map((storeName) => (
                  <button
                    key={storeName}
                    type="button"
                    onClick={() => setSelectedCategory(storeName)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${
                      selectedCategory === storeName
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {storeName}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[11px] font-semibold text-slate-400">Priority:</span>
                <button
                  type="button"
                  onClick={() => setSelectedPriority('high')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                    selectedPriority === 'high'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🔴 High
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPriority('medium')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                    selectedPriority === 'medium'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🟡 Medium
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPriority('low')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                    selectedPriority === 'low'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🟢 Low
                </button>
              </div>
            )}
          </form>
        ) : null}

        {/* Toolbar: Search, Filters, Grouping, Batch actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              All ({totalItems})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'active' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Active ({totalItems - completedItems})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'completed' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Completed ({completedItems})
            </button>
          </div>

          {/* Right Tools: Search input & Grouping Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {list.type === 'grocery' && (
              <button
                type="button"
                onClick={() => setGroupByCategory(!groupByCategory)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
                  groupByCategory
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Toggle Store grouping"
              >
                <Store className="w-3.5 h-3.5" />
                <span>{groupByCategory ? 'Grouped by Store' : 'Group by Store'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyText}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition"
              title="Copy list as text"
            >
              {copiedNotification ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {canEdit && completedItems > 0 && (
              <button
                type="button"
                onClick={handleClearCompleted}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition flex items-center gap-1"
                title="Clear completed items"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Done</span>
              </button>
            )}
          </div>
        </div>

        {/* Item List Display */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Loading items in real-time...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 bg-white border border-slate-200/80 rounded-2xl text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-2xl">
              {list.icon || '📝'}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">No items found</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {searchQuery
                  ? 'Try adjusting your search query or filters.'
                  : canEdit
                  ? 'Add your first item using the input above!'
                  : 'This list currently has no items.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedCategories).map(([groupTitle, categoryItems]) => {
              if (categoryItems.length === 0) return null;

              return (
                <div key={groupTitle} className="space-y-2">
                  {groupByCategory && (
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{groupTitle}</span>
                        <span className="text-[10px] text-slate-400">({categoryItems.length})</span>
                      </h3>
                    </div>
                  )}

                  <div 
                    className={`bg-white border rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-2xs transition-colors ${
                      dragOverGroup === groupTitle && draggedItemId
                        ? 'border-emerald-400 ring-2 ring-emerald-400/20'
                        : 'border-slate-200/80'
                    }`}
                    onDragOver={(e) => handleDragOverGroupHeader(e, groupTitle)}
                    onDrop={(e) => handleDropOnGroupHeader(e, groupTitle)}
                  >
                    {categoryItems.map((item) => {
                      const isDragging = draggedItemId === item.id;
                      const isDragTarget = dragOverItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          draggable={canEdit}
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOverItem(e, item, groupTitle)}
                          onDragLeave={(e) => handleDragLeaveItem(e, item)}
                          onDrop={(e) => handleDropOnItem(e, item, groupTitle)}
                          onClick={() => {
                            setSelectedItem(item);
                            setIsDetailsOpen(true);
                          }}
                          className={`relative p-3.5 flex items-center justify-between gap-2.5 transition cursor-pointer select-none group ${
                            isDragging
                              ? 'opacity-40 bg-emerald-50/70 dark:bg-emerald-950/30 border-dashed border-emerald-400'
                              : isDragTarget
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                              : item.completed
                              ? 'bg-slate-50/40 text-slate-400 hover:bg-slate-50/80'
                              : 'text-slate-800 hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Top drop target insertion bar */}
                          {isDragTarget && dragOverPosition === 'above' && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 z-20 flex items-center shadow-xs">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 -ml-1 border border-white" />
                            </div>
                          )}
                          {/* Bottom drop target insertion bar */}
                          {isDragTarget && dragOverPosition === 'below' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 z-20 flex items-center shadow-xs">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 -ml-1 border border-white" />
                            </div>
                          )}

                          {/* Left: Drag Handle (when canEdit), Checkbox & title */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Grip / Drag Handle */}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 -ml-1 text-slate-300 group-hover:text-slate-500 active:text-emerald-600 cursor-grab active:cursor-grabbing transition rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0"
                                title="Drag to reorder priority"
                              >
                                <GripVertical className="w-4 h-4" />
                              </button>
                            )}

                            {/* Checkbox */}
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggle(item);
                              }}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 ${
                                item.completed
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : canEdit
                                  ? 'border-2 border-slate-300 hover:border-emerald-500 text-transparent'
                                  : 'border-2 border-slate-200 opacity-60'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-sm font-medium break-words ${
                                    item.completed
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : 'text-slate-900 dark:text-white font-semibold'
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

                                {/* Store Tag Badge placed right after the item name/quantity */}
                                {(item.store || (list.type === 'grocery' && item.category)) && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                                    <Store className="w-3 h-3 text-emerald-600" />
                                    <span>{item.store || item.category}</span>
                                  </span>
                                )}

                                {/* Priority badge */}
                                {item.priority === 'urgent' && !item.completed && (
                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 rounded shrink-0">
                                    🚨 Urgent
                                  </span>
                                )}
                                {item.priority === 'high' && !item.completed && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded shrink-0">
                                    High
                                  </span>
                                )}

                                {/* Location */}
                                {item.location && (
                                  <span className="text-[10px] font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                    <MapPin className="w-2.5 h-2.5 text-rose-500" />
                                    <span>{item.location}</span>
                                  </span>
                                )}

                                {/* Scheduled Time */}
                                {item.timeScheduled && (
                                  <span className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                    <Clock className="w-2.5 h-2.5 text-indigo-500" />
                                    <span>{item.timeScheduled}</span>
                                  </span>
                                )}

                                {/* Price */}
                                {item.estimatedPrice !== undefined && item.estimatedPrice > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                                    <DollarSign className="w-2.5 h-2.5 text-emerald-500" />
                                    <span>{item.estimatedPrice.toFixed(2)}</span>
                                  </span>
                                )}

                                {/* Due date badge */}
                                {item.dueDate && (
                                  <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                    <Calendar className="w-2.5 h-2.5" />
                                    {item.dueDate}
                                  </span>
                                )}
                              </div>

                              {/* Custom factors */}
                              {item.customFactors && item.customFactors.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.customFactors.map((f) => (
                                    <span key={f.id} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                      <strong>{f.label}:</strong> {f.value}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {item.notes && (
                                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: GCal sync badge, Reorder buttons, delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.googleCalendarEventId && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full font-bold">
                                📅 GCal
                              </span>
                            )}

                            {canEdit && (
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => handleMoveItem(e, item, 'up')}
                                  className="p-1 text-slate-300 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                                  title="Move item up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleMoveItem(e, item, 'down')}
                                  className="p-1 text-slate-300 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                                  title="Move item down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteItem(e, item)}
                                  className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
        )}
      </div>

      {/* Item Details Modal */}
      <ItemDetailsModal
        list={list}
        item={selectedItem}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedItem(null);
        }}
        canEdit={canEdit}
      />

      {/* Activity Drawer */}
      <ActivityDrawer
        listId={list.id}
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />
    </div>
  );
};
