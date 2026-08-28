import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CalendarProvider } from './context/CalendarContext';
import { ListModel, ListItemModel } from './types';
import { 
  subscribeUserLists, 
  subscribeListItems, 
  ensureDefaultUserLists 
} from './services/listService';
import { Navbar } from './components/Navbar';
import { TodayView } from './components/TodayView';
import { ListCard } from './components/ListCard';
import { ListView } from './components/ListView';
import { CalendarAgendaView } from './components/CalendarAgendaView';
import { CustomizationModal } from './components/CustomizationModal';
import { ItemDetailsModal } from './components/ItemDetailsModal';
import { CreateListModal } from './components/CreateListModal';
import { AddToListModal } from './components/AddToListModal';
import { ViewListModal } from './components/ViewListModal';
import { ShareModal } from './components/ShareModal';
import { AuthModal } from './components/AuthModal';
import { 
  Plus, 
  ShoppingCart, 
  ListTodo, 
  Search, 
  Sparkles, 
  Users, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  FolderOpen,
  Palette
} from 'lucide-react';

function MainAppContent() {
  const { user, userProfile, loading: authLoading, signInAsDemoUser } = useAuth();
  const { theme, activeAccent } = useTheme();

  // Navigation tab: Default to 'today' as requested by user ("The first Page should be a to do list for today")
  const [currentTab, setCurrentTab] = useState<'today' | 'lists' | 'calendar'>('today');

  // Lists state
  const [lists, setLists] = useState<ListModel[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [selectedList, setSelectedList] = useState<ListModel | null>(null);

  // Aggregated items for Today
  const [listItemsMap, setListItemsMap] = useState<Record<string, ListItemModel[]>>({});

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddToListOpen, setIsAddToListOpen] = useState(false);
  const [isViewListOpen, setIsViewListOpen] = useState(false);
  const [addToListTargetId, setAddToListTargetId] = useState<string | undefined>(undefined);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [shareTargetList, setShareTargetList] = useState<ListModel | null>(null);

  // Item modal for editing from TodayView or CalendarAgendaView
  const [inspectingItem, setInspectingItem] = useState<{ item: ListItemModel; list: ListModel } | null>(null);

  // Filters & Search for All Lists view
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'grocery' | 'todo' | 'shared' | 'owned'>('all');

  // Active User Identifiers
  const activeUid = user?.uid || userProfile?.uid || 'user_keithfell1_gmail_com';
  const currentEmail = (userProfile?.email || user?.email || 'keithfell1@gmail.com').toLowerCase();
  const currentDisplayName = userProfile?.displayName || user?.displayName || 'Keith Fell';

  // Real-time subscription to lists
  useEffect(() => {
    setLoadingLists(true);

    const unsubscribe = subscribeUserLists(
      activeUid,
      currentEmail,
      async (fetchedLists) => {
        if (fetchedLists.length === 0) {
          try {
            const defaults = await ensureDefaultUserLists({
              uid: activeUid,
              email: currentEmail,
              displayName: currentDisplayName
            });
            setLists(defaults);
          } catch (e) {
            setLists(fetchedLists);
          }
        } else {
          setLists(fetchedLists);
        }
        setLoadingLists(false);

        // Keep selected list updated if currently viewing it
        if (selectedList) {
          const updated = fetchedLists.find((l) => l.id === selectedList.id);
          if (updated) setSelectedList(updated);
        }
      },
      (err) => {
        console.info('Subscription notice:', err?.message || err);
        setLoadingLists(false);
      }
    );

    return () => unsubscribe();
  }, [activeUid, currentEmail, currentDisplayName]);

  // Subscribe to items in all active user lists to feed Today view in real-time
  useEffect(() => {
    if (lists.length === 0) {
      setListItemsMap({});
      return;
    }

    const unsubs = lists.map((list) => {
      return subscribeListItems(
        list.id,
        (items) => {
          setListItemsMap((prev) => ({
            ...prev,
            [list.id]: items
          }));
        },
        (err) => console.warn(`Error subscribing to items for list ${list.id}:`, err)
      );
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [lists]);

  // Aggregate all today items across lists
  const allTodayItems = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const items: ListItemModel[] = [];

    Object.entries(listItemsMap).forEach(([listId, listItems]) => {
      const parentList = lists.find((l) => l.id === listId);
      const isDailyFocusList = parentList?.isDailyFocus || parentList?.title.toLowerCase().includes('today') || parentList?.title.toLowerCase().includes('daily');

      (listItems as ListItemModel[] || []).forEach((item) => {
        // If it's flagged for today, or due today, or part of the daily focus list
        if (item.isForToday || item.dueDate === todayStr || isDailyFocusList) {
          items.push(item);
        }
      });
    });

    return items;
  }, [listItemsMap, lists]);

  // Check URL query parameters for direct list sharing: `?listId=xyz`
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlListId = params.get('listId');
    if (urlListId && lists.length > 0) {
      const match = lists.find((l) => l.id === urlListId);
      if (match) {
        setSelectedList(match);
      }
    }
  }, [lists]);

  // Filtered lists for the All Lists tab
  const filteredLists = lists.filter((list) => {
    const matchesSearch =
      list.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (list.description && list.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (categoryFilter === 'grocery') return list.type === 'grocery';
    if (categoryFilter === 'todo') return list.type === 'todo';
    if (categoryFilter === 'owned') return list.ownerEmail.toLowerCase() === currentEmail || list.ownerId === activeUid;
    if (categoryFilter === 'shared') return list.ownerEmail.toLowerCase() !== currentEmail && list.ownerId !== activeUid;

    return true;
  });

  const ownedCount = lists.filter((l) => l.ownerEmail.toLowerCase() === currentEmail || l.ownerId === activeUid).length;
  const sharedCount = lists.filter((l) => l.ownerEmail.toLowerCase() !== currentEmail && l.ownerId !== activeUid).length;

  return (
    <div 
      className={`min-h-screen flex flex-col antialiased transition-colors ${
        theme.isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* Top Navbar with tabs & action buttons underneath */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedList(null);
          setCurrentTab(tab);
        }}
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenAddToList={() => {
          setAddToListTargetId(lists[0]?.id);
          setIsAddToListOpen(true);
        }}
        onOpenViewList={() => setIsViewListOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenThemeModal={() => setIsThemeOpen(true)}
      />

      {/* Main Content Router */}
      {selectedList ? (
        <ListView
          list={selectedList}
          onBack={() => {
            setSelectedList(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('listId');
            window.history.replaceState({}, '', url.toString());
          }}
          onOpenShare={(list) => setShareTargetList(list)}
        />
      ) : currentTab === 'today' ? (
        /* FIRST PAGE: To-Do List For Today */
        <TodayView
          lists={lists}
          allTodayItems={allTodayItems}
          onSelectItem={(item, list) => setInspectingItem({ item, list })}
          onOpenList={(list) => setSelectedList(list)}
          onOpenCreateList={() => setIsCreateOpen(true)}
          onOpenAddToList={(defaultListId) => {
            setAddToListTargetId(defaultListId);
            setIsAddToListOpen(true);
          }}
          onOpenViewList={() => setIsViewListOpen(true)}
        />
      ) : currentTab === 'calendar' ? (
        /* GOOGLE CALENDAR TIME-BLOCKED SCHEDULE VIEW */
        <CalendarAgendaView
          lists={lists}
          allTodayItems={allTodayItems}
          onOpenItemModal={(item, list) => setInspectingItem({ item, list })}
        />
      ) : (
        /* ALL LISTS & GROCERY BOARD VIEW */
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
          {/* Header Banner - Clean Minimalist Light/Dark Adaptive */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <FolderOpen className="w-3.5 h-3.5" style={{ color: activeAccent.primary }} />
                <span>Workspaces & Grocery Lists</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                All Lists
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Organize grocery runs, department aisles, and shared checklists
              </p>
            </div>
          </div>

          {/* Search, Filter Tabs */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                    categoryFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  All Lists ({lists.length})
                </button>

                <button
                  type="button"
                  onClick={() => setCategoryFilter('grocery')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                    categoryFilter === 'grocery'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Grocery Lists</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategoryFilter('todo')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                    categoryFilter === 'todo'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>To-Do Tasks</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategoryFilter('shared')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                    categoryFilter === 'shared'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Shared with Me ({sharedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategoryFilter('owned')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                    categoryFilter === 'owned'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  My Lists ({ownedCount})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search all lists..."
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* List Cards Grid */}
          {loadingLists ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredLists.length === 0 ? (
            <div className="py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center p-8 max-w-lg mx-auto space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-3xl mx-auto text-emerald-600">
                🛒
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {searchQuery ? 'No matching lists found' : 'No lists created yet'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try searching with a different keyword or switch filter tabs.'
                    : 'Create your first grocery shopping list or task checklist, then share it with family, roommates, or team members!'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="px-5 py-2.5 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md transition inline-flex items-center gap-2"
                  style={{ backgroundColor: activeAccent.primary }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First List</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredLists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  onSelect={(l) => {
                    setSelectedList(l);
                    const url = new URL(window.location.href);
                    url.searchParams.set('listId', l.id);
                    window.history.pushState({}, '', url.toString());
                  }}
                  onOpenShare={(l) => setShareTargetList(l)}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {/* Item Details / Factor Editor Modal */}
      {inspectingItem && (
        <ItemDetailsModal
          list={inspectingItem.list}
          item={inspectingItem.item}
          isOpen={!!inspectingItem}
          onClose={() => setInspectingItem(null)}
          canEdit={true}
        />
      )}

      {/* Theme Customization Studio Modal */}
      <CustomizationModal
        isOpen={isThemeOpen}
        onClose={() => setIsThemeOpen(false)}
      />

      {/* Create List Modal */}
      <CreateListModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onListCreated={(newListId) => {
          const match = lists.find((l) => l.id === newListId);
          if (match) setSelectedList(match);
        }}
      />

      {/* Add on to List Modal */}
      <AddToListModal
        isOpen={isAddToListOpen}
        onClose={() => setIsAddToListOpen(false)}
        lists={lists}
        defaultListId={addToListTargetId}
      />

      {/* View List Modal */}
      <ViewListModal
        isOpen={isViewListOpen}
        onClose={() => setIsViewListOpen(false)}
        lists={lists}
        onSelectList={(list) => {
          setSelectedList(list);
          setIsViewListOpen(false);
        }}
        onCreateNewList={() => {
          setIsViewListOpen(false);
          setIsCreateOpen(true);
        }}
      />

      {/* Share / Permissions Modal */}
      {shareTargetList && (
        <ShareModal
          list={shareTargetList}
          isOpen={!!shareTargetList}
          onClose={() => setShareTargetList(null)}
        />
      )}

      {/* Auth / Account Switcher Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CalendarProvider>
          <MainAppContent />
        </CalendarProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
