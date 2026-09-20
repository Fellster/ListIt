import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CalendarProvider } from './context/CalendarContext';
import { CustomHeadingsProvider, useCustomHeadings } from './context/CustomHeadingsContext';
import { ListModel, ListItemModel, HeadingKey, getListHeading, ListInvitation } from './types';
import { 
  subscribeUserLists, 
  subscribeListItems, 
  ensureDefaultUserLists,
  ensureStarterItemsIfEmpty,
  createList,
  subscribeUserPendingInvitations,
  getInvitationById,
  getListById,
  getUserPermission,
  isUserAuthorizedForList
} from './services/listService';
import { Navbar, ActiveNavKey } from './components/Navbar';
import { TodayView } from './components/TodayView';
import { HeadingListView } from './components/HeadingListView';
import { HeadingDirectoryView } from './components/HeadingDirectoryView';
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
import { CameraOcrModal } from './components/CameraOcrModal';
import { InvitationsModal } from './components/InvitationsModal';

function MainAppContent() {
  const { user, userProfile, loading: authLoading, signInAsDemoUser } = useAuth();
  const { theme, activeAccent, bgThemeClass } = useTheme();
  const { customHeadings, removeCustomHeading } = useCustomHeadings();

  // Navigation tab: Default to 'today' as requested by user ("The first Page should be a to do list for today")
  const [currentTab, setCurrentTab] = useState<ActiveNavKey>('today');

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
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [ocrTargetListId, setOcrTargetListId] = useState<string | undefined>(undefined);
  const [addToListTargetId, setAddToListTargetId] = useState<string | undefined>(undefined);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [shareTargetList, setShareTargetList] = useState<ListModel | null>(null);

  // Invitations system state
  const [pendingInvitations, setPendingInvitations] = useState<ListInvitation[]>([]);
  const [isInvitationsModalOpen, setIsInvitationsModalOpen] = useState(false);
  const [directInvitation, setDirectInvitation] = useState<ListInvitation | null>(null);

  // Item modal for editing from TodayView or CalendarAgendaView
  const [inspectingItem, setInspectingItem] = useState<{ item: ListItemModel; list: ListModel } | null>(null);

  // Filters & Search for All Lists view
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'grocery' | 'todo' | 'shared' | 'owned'>('all');

  // Active User Identifiers
  const activeUid = user?.uid || userProfile?.uid || '';
  const currentEmail = (userProfile?.email || user?.email || '').toLowerCase().trim();
  const currentDisplayName = userProfile?.displayName || user?.displayName || (currentEmail ? currentEmail.split('@')[0] : 'User');
  const isAuthenticated = !!(user || userProfile);

  // Sharing banner notifications
  const [shareAccessMessage, setShareAccessMessage] = useState<{
    type: 'error' | 'info';
    text: string;
  } | null>(null);

  // Clear selected list and reset if user logs out
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      if (selectedList) {
        setSelectedList(null);
        const url = new URL(window.location.href);
        url.searchParams.delete('listId');
        window.history.replaceState({}, '', url.toString());
      }
      setLists([]);
      setListItemsMap({});
    }
  }, [isAuthenticated, authLoading]);

  // Real-time subscription to lists
  useEffect(() => {
    if (!isAuthenticated || !activeUid) {
      setLists([]);
      setLoadingLists(false);
      return;
    }

    setLoadingLists(true);

    const unsubscribe = subscribeUserLists(
      activeUid,
      currentEmail,
      async (fetchedLists) => {
        const cleanLists = fetchedLists.filter((l) => !l.title.toLowerCase().includes('focus'));
        const isInitialized = localStorage.getItem(`listit_initialized_${activeUid}`);
        if (cleanLists.length === 0 && !isInitialized) {
          try {
            const defaults = await ensureDefaultUserLists({
              uid: activeUid,
              email: currentEmail,
              displayName: currentDisplayName
            });
            const validDefaults = defaults.filter((l) => !l.title.toLowerCase().includes('focus'));
            setLists(validDefaults);
            localStorage.setItem(`listit_initialized_${activeUid}`, 'true');
            await ensureStarterItemsIfEmpty(validDefaults, {
              email: currentEmail,
              displayName: currentDisplayName
            });
          } catch (e) {
            setLists(cleanLists);
          }
        } else {
          setLists(cleanLists);
          if (cleanLists.length > 0) {
            ensureStarterItemsIfEmpty(cleanLists, {
              email: currentEmail,
              displayName: currentDisplayName
            }).catch((err) => console.info('Starter items check notice:', err));
          }
        }
        setLoadingLists(false);

        // Keep selected list updated if currently viewing it
        if (selectedList) {
          const updated = cleanLists.find((l) => l.id === selectedList.id);
          if (updated) setSelectedList(updated);
        }
      },
      (err) => {
        console.info('Subscription notice:', err?.message || err);
        setLoadingLists(false);
      }
    );

    return () => unsubscribe();
  }, [activeUid, currentEmail, currentDisplayName, isAuthenticated]);

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
      if (!parentList || parentList.title.toLowerCase().includes('focus')) return;

      const isFromTodayList = getListHeading(parentList) === 'today' || parentList.title.toLowerCase() === 'today' || parentList.title.toLowerCase() === "today's list";

      (listItems as ListItemModel[] || []).forEach((item) => {
        // Include items if they belong to the dedicated Today list or are explicitly marked for today
        if (isFromTodayList) {
          items.push({ ...item, listId });
        } else if (item.isForToday === true) {
          items.push({ ...item, listId });
        }
      });
    });

    return items;
  }, [listItemsMap, lists]);

  // Check URL query parameters for direct list sharing: `?listId=xyz` or invitation: `?inviteId=xyz`
  useEffect(() => {
    if (authLoading) return;

    const params = new URLSearchParams(window.location.search);
    const urlListId = params.get('listId');

    if (urlListId) {
      // If this list is already selected and open, no need to reload
      if (selectedList?.id === urlListId) {
        return;
      }

      // 1. If unauthenticated, prompt sign in and preserve ?listId in URL
      if (!isAuthenticated) {
        setIsAuthOpen(true);
        setShareAccessMessage({
          type: 'info',
          text: 'Please sign in or create an account to view this shared list.',
        });
        return;
      }

      // 2. If authenticated, check if already loaded or fetch from Firestore
      const match = lists.find((l) => l.id === urlListId);
      if (match) {
        const isAuthorized = isUserAuthorizedForList(match, { uid: activeUid, email: currentEmail });

        if (isAuthorized) {
          setSelectedList(match);
          setShareAccessMessage(null);
        } else {
          setShareAccessMessage({
            type: 'error',
            text: `Access Denied: You do not have permission to view "${match.title}". Ask the owner to share it with ${currentEmail}.`,
          });
        }
      } else {
        // Fetch securely from Firestore
        getListById(urlListId)
          .then((fetched) => {
            if (!fetched) {
              setShareAccessMessage({
                type: 'error',
                text: 'The shared list could not be found or has been deleted.',
              });
              return;
            }

            const isAuthorized = isUserAuthorizedForList(fetched, { uid: activeUid, email: currentEmail });

            if (isAuthorized) {
              setSelectedList(fetched);
              setLists((prev) => (prev.some((l) => l.id === fetched.id) ? prev : [fetched, ...prev]));
              setShareAccessMessage(null);
            } else {
              setShareAccessMessage({
                type: 'error',
                text: `Access Denied: You (${currentEmail}) do not have permission to view this list. Ask the owner to invite your email.`,
              });
            }
          })
          .catch((err) => {
            console.error('Error fetching shared list:', err);
            setShareAccessMessage({
              type: 'error',
              text: `Access Denied: You do not have permission to access this list. Ask the owner to invite ${currentEmail}.`,
            });
          });
      }
    }

    const urlInviteId = params.get('inviteId');
    if (urlInviteId) {
      if (!isAuthenticated) {
        setIsAuthOpen(true);
        return;
      }
      getInvitationById(urlInviteId).then((inv) => {
        if (inv) {
          setDirectInvitation(inv);
          setIsInvitationsModalOpen(true);
        }
      }).catch((err) => console.warn('Could not retrieve invite:', err));
    }
  }, [lists, authLoading, isAuthenticated, activeUid, currentEmail, selectedList?.id]);

  // Real-time subscription to current user's pending invitations
  useEffect(() => {
    if (!currentEmail) {
      setPendingInvitations([]);
      return;
    }

    const unsub = subscribeUserPendingInvitations(currentEmail, (invs) => {
      setPendingInvitations(invs);
    });

    return () => unsub();
  }, [currentEmail]);

  // Group lists by Heading
  const todayLists = useMemo(() => lists.filter((l) => getListHeading(l) === 'today'), [lists]);
  const groceryLists = useMemo(() => lists.filter((l) => getListHeading(l) === 'grocery'), [lists]);

  // Active navigation key
  const activeNav = useMemo<ActiveNavKey>(() => {
    if (selectedList) {
      return getListHeading(selectedList);
    }
    return currentTab;
  }, [selectedList, currentTab]);

  const handleNavigate = (key: ActiveNavKey) => {
    setSelectedList(null);
    setCurrentTab(key);
    const url = new URL(window.location.href);
    url.searchParams.delete('listId');
    window.history.replaceState({}, '', url.toString());
  };

  const handleQuickCreateList = async (title: string, targetHeading?: ActiveNavKey) => {
    if (!title.trim()) return;
    const headingKey: HeadingKey = (targetHeading && targetHeading !== 'calendar')
      ? (targetHeading as HeadingKey)
      : (currentTab !== 'calendar' ? (currentTab as HeadingKey) : 'today');

    const listType: 'grocery' | 'todo' = headingKey === 'grocery' ? 'grocery' : 'todo';
    const color = headingKey === 'grocery' ? 'emerald' : headingKey === 'today' ? 'emerald' : 'indigo';
    const icon = headingKey === 'grocery' ? '🛒' : headingKey === 'today' ? 'calendar' : 'list';

    const newId = await createList(
      {
        title: title.trim(),
        type: listType,
        heading: headingKey,
        color,
        icon,
      },
      { uid: activeUid, email: currentEmail, displayName: currentDisplayName }
    );

    const createdList: ListModel = {
      id: newId,
      title: title.trim(),
      type: listType,
      heading: headingKey,
      color,
      icon,
      ownerId: activeUid,
      ownerEmail: currentEmail,
      ownerName: currentDisplayName,
      sharedWith: {},
      memberEmails: [currentEmail],
      members: [activeUid],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (headingKey === 'grocery') {
      setSelectedList(createdList);
    } else {
      setSelectedList(null);
      setCurrentTab(headingKey);
    }
  };

  const handleOpenOcr = (targetListId?: string) => {
    let resolvedId = targetListId;
    if (!resolvedId) {
      if (selectedList) {
        resolvedId = selectedList.id;
      } else if (currentTab === 'today') {
        resolvedId = todayLists[0]?.id;
      } else if (currentTab === 'grocery') {
        resolvedId = groceryLists[0]?.id;
      } else {
        const customMatch = lists.find((l) => getListHeading(l) === currentTab);
        if (customMatch) resolvedId = customMatch.id;
      }
    }
    setOcrTargetListId(resolvedId || lists[0]?.id);
    setIsOcrOpen(true);
  };

  const handleDeleteCustomHeading = (headingId: string) => {
    removeCustomHeading(headingId);
    if (currentTab === headingId) {
      setCurrentTab('other');
    }
  };

  const handleOpenList = (list: ListModel) => {
    setSelectedList(list);
    const url = new URL(window.location.href);
    url.searchParams.set('listId', list.id);
    window.history.pushState({}, '', url.toString());
  };

  const handleBackFromList = () => {
    setSelectedList(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('listId');
    window.history.pushState({}, '', url.toString());
  };

  // Get active custom heading if currently viewing one
  const activeCustomHeading = customHeadings.find((h) => h.id === currentTab);
  const currentCustomHeadingLists = useMemo(() => {
    if (!activeCustomHeading) return [];
    return lists.filter((l) => getListHeading(l) === activeCustomHeading.id);
  }, [lists, activeCustomHeading]);

  return (
    <div 
      id="app-root-wrapper"
      className={`min-h-screen flex flex-col antialiased transition-colors ${bgThemeClass} ${
        theme.isDarkMode ? 'dark text-slate-100' : 'text-slate-900'
      }`}
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* Top Navbar with dynamic headings top line & new list second line */}
      <Navbar
        activeNav={activeNav}
        onNavigate={handleNavigate}
        onQuickCreateList={handleQuickCreateList}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenThemeModal={() => setIsThemeOpen(true)}
        onOpenOcr={() => handleOpenOcr(selectedList?.id)}
        pendingInvitationsCount={pendingInvitations.length}
        onOpenInvitations={() => setIsInvitationsModalOpen(true)}
      />

      {/* Share access message / notification banner */}
      {shareAccessMessage && (
        <div className="max-w-4xl w-full mx-auto px-4 pt-3 pb-1">
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium shadow-xs ${
              shareAccessMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {shareAccessMessage.type === 'error' ? 'Notice:' : 'Shared List:'}
              </span>
              <span>{shareAccessMessage.text}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Sign In
                </button>
              )}
              <button
                type="button"
                onClick={() => setShareAccessMessage(null)}
                className="px-2 py-1 hover:opacity-75 cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Router */}
      {selectedList ? (
        <ListView
          list={selectedList}
          lists={lists}
          onBack={handleBackFromList}
          onOpenShare={(list) => setShareTargetList(list)}
          onOpenOcr={(listId) => handleOpenOcr(listId)}
        />
      ) : currentTab === 'today' ? (
        /* FIRST PAGE: To-Do List For Today */
        <HeadingListView
          heading="today"
          lists={todayLists}
          allLists={lists}
          listItemsMap={listItemsMap}
          onSelectItem={(item, list) => setInspectingItem({ item, list })}
          onOpenList={handleOpenList}
          onCreateList={(title, heading) => handleQuickCreateList(title, heading)}
          onOpenOcr={(listId) => handleOpenOcr(listId)}
        />
      ) : currentTab === 'grocery' ? (
        /* GROCERY LISTS DIRECTORY */
        <HeadingDirectoryView
          heading="grocery"
          lists={groceryLists}
          allLists={lists}
          loading={loadingLists}
          onSelectList={handleOpenList}
          onSelectItem={(item, l) => setInspectingItem({ item, list: l })}
          onOpenShare={(l) => setShareTargetList(l)}
          onCreateList={(title, heading) => handleQuickCreateList(title, heading)}
          onOpenOcr={(listId) => handleOpenOcr(listId)}
        />
      ) : activeCustomHeading ? (
        /* CUSTOM HEADING LIST: Same look and work as under Today */
        <HeadingListView
          heading={activeCustomHeading.id}
          headingLabel={activeCustomHeading.label}
          lists={currentCustomHeadingLists}
          allLists={lists}
          listItemsMap={listItemsMap}
          onSelectItem={(item, list) => setInspectingItem({ item, list })}
          onOpenList={handleOpenList}
          onDeleteCustomHeading={handleDeleteCustomHeading}
          onCreateList={(title, heading) => handleQuickCreateList(title, heading)}
          onOpenOcr={(listId) => handleOpenOcr(listId)}
        />
      ) : (
        /* Fallback to Today Lists */
        <HeadingListView
          heading="today"
          lists={todayLists}
          allLists={lists}
          listItemsMap={listItemsMap}
          onSelectItem={(item, list) => setInspectingItem({ item, list })}
          onOpenList={handleOpenList}
          onCreateList={(title, heading) => handleQuickCreateList(title, heading)}
          onOpenOcr={(listId) => handleOpenOcr(listId)}
        />
      )}

      {/* Item Details / Factor Editor Modal */}
      {inspectingItem && (
        <ItemDetailsModal
          list={inspectingItem.list}
          item={inspectingItem.item}
          lists={lists}
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
        onOpenOcr={(defaultListId) => handleOpenOcr(defaultListId)}
      />

      {/* Camera OCR Scanner Modal */}
      <CameraOcrModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        lists={lists}
        defaultListId={ocrTargetListId || selectedList?.id}
        onSuccess={(count, targetList) => {
          if (selectedList?.id !== targetList.id) {
            setSelectedList(targetList);
          }
        }}
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
          list={lists.find((l) => l.id === shareTargetList.id) || shareTargetList}
          isOpen={!!shareTargetList}
          onClose={() => setShareTargetList(null)}
          onListUpdated={(updatedList) => {
            setShareTargetList(updatedList);
            setLists((prev) => prev.map((l) => (l.id === updatedList.id ? updatedList : l)));
            if (selectedList?.id === updatedList.id) {
              setSelectedList(updatedList);
            }
          }}
        />
      )}

      {/* Auth / Account Switcher Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* List Invitations Modal */}
      <InvitationsModal
        isOpen={isInvitationsModalOpen}
        onClose={() => {
          setIsInvitationsModalOpen(false);
          setDirectInvitation(null);
          const url = new URL(window.location.href);
          if (url.searchParams.has('inviteId')) {
            url.searchParams.delete('inviteId');
            window.history.replaceState({}, '', url.toString());
          }
        }}
        pendingInvitations={pendingInvitations}
        directInvitation={directInvitation}
        onSelectAcceptedList={(listId) => {
          const matched = lists.find((l) => l.id === listId);
          if (matched) {
            setSelectedList(matched);
          }
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CalendarProvider>
          <CustomHeadingsProvider>
            <MainAppContent />
          </CustomHeadingsProvider>
        </CalendarProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
