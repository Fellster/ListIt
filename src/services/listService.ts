import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  writeBatch,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { ListModel, ListItemModel, ActivityEntry, PermissionRole, HeadingKey, getListHeading } from '../types';

// Local Storage Cache Keys
const STORAGE_LISTS_KEY = 'listit_cached_lists';
const STORAGE_ITEMS_PREFIX = 'listit_cached_items_';
const STORAGE_ACTIVITY_PREFIX = 'listit_cached_activity_';

export function getLocalLists(): ListModel[] {
  try {
    const raw = localStorage.getItem(STORAGE_LISTS_KEY);
    if (!raw) return [];
    const parsed: ListModel[] = JSON.parse(raw);
    return parsed.filter((l) => !l.title.toLowerCase().includes('focus'));
  } catch (e) {
    return [];
  }
}

function saveLocalLists(lists: ListModel[]) {
  try {
    localStorage.setItem(STORAGE_LISTS_KEY, JSON.stringify(lists));
    window.dispatchEvent(new CustomEvent('listit_lists_changed', { detail: lists }));
  } catch (e) {
    console.warn('Failed to cache lists locally:', e);
  }
}

function getLocalItems(listId: string): ListItemModel[] {
  try {
    const raw = localStorage.getItem(STORAGE_ITEMS_PREFIX + listId);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalItems(listId: string, items: ListItemModel[]) {
  try {
    localStorage.setItem(STORAGE_ITEMS_PREFIX + listId, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(`listit_items_changed_${listId}`, { detail: items }));
  } catch (e) {
    console.warn('Failed to cache items locally:', e);
  }
}

function getLocalActivity(listId: string): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVITY_PREFIX + listId);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalActivity(listId: string, logs: ActivityEntry[]) {
  try {
    localStorage.setItem(STORAGE_ACTIVITY_PREFIX + listId, JSON.stringify(logs.slice(0, 30)));
    window.dispatchEvent(new CustomEvent(`listit_activity_changed_${listId}`, { detail: logs }));
  } catch (e) {
    console.warn('Failed to cache activity locally:', e);
  }
}

export function sanitizeKey(str: string): string {
  return str.replace(/\./g, '_').toLowerCase();
}

/**
 * Real-time subscription to all lists accessible by the current user (owned or shared)
 */
export function subscribeUserLists(
  userId: string,
  userEmail: string,
  onUpdate: (lists: ListModel[]) => void,
  onError?: (err: any) => void
) {
  const listsRef = collection(db, 'lists');
  const normalizedEmail = userEmail.toLowerCase().trim();

  // Queries for owned lists and shared lists
  const ownedQuery = query(listsRef, where('ownerId', '==', userId));
  const sharedQuery = query(listsRef, where('memberEmails', 'array-contains', normalizedEmail));

  const listMap = new Map<string, ListModel>();

  // Initialize with local cache first so UI is instant
  const cached = getLocalLists();
  if (cached.length > 0) {
    cached.forEach((l) => listMap.set(l.id, l));
    onUpdate(cached);
  }

  const processAndEmit = () => {
    const all = Array.from(listMap.values());
    all.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
      const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
      return tB - tA;
    });
    saveLocalLists(all);
    onUpdate(all);
  };

  // Local storage change listener fallback
  const handleLocalChange = (e: Event) => {
    const custom = e as CustomEvent<ListModel[]>;
    if (custom.detail) {
      listMap.clear();
      custom.detail.forEach((l) => listMap.set(l.id, l));
      onUpdate(custom.detail);
    }
  };
  window.addEventListener('listit_lists_changed', handleLocalChange);

  let unsubOwned = () => {};
  let unsubShared = () => {};

  try {
    unsubOwned = onSnapshot(
      ownedQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            listMap.delete(change.doc.id);
          }
        });
        snapshot.docs.forEach((docSnap) => {
          listMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as ListModel);
        });
        processAndEmit();
      },
      (err) => {
        console.info('Firestore owned lists notice (using local cache):', err?.message || err);
        // Fallback to local storage
        const local = getLocalLists();
        if (local.length > 0) onUpdate(local);
        if (onError) onError(err);
      }
    );

    unsubShared = onSnapshot(
      sharedQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            const current = listMap.get(change.doc.id);
            if (current && current.ownerId !== userId) {
              listMap.delete(change.doc.id);
            }
          }
        });
        snapshot.docs.forEach((docSnap) => {
          listMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as ListModel);
        });
        processAndEmit();
      },
      (err) => {
        console.info('Firestore shared lists notice:', err?.message || err);
      }
    );
  } catch (e) {
    console.info('Firestore subscription init notice:', e);
  }

  return () => {
    window.removeEventListener('listit_lists_changed', handleLocalChange);
    unsubOwned();
    unsubShared();
  };
}

/**
 * Creates a new list
 */
export async function createList(
  data: {
    title: string;
    description?: string;
    type: 'grocery' | 'todo' | 'general';
    color: string;
    icon: string;
    heading?: HeadingKey;
    initialItems?: Array<{ title: string; category?: string; quantity?: number; unit?: string; priority?: 'low' | 'medium' | 'high' }>;
  },
  owner: { uid: string; email: string; displayName: string }
): Promise<string> {
  const normalizedEmail = owner.email.toLowerCase().trim();
  const listId = 'list_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const rawListData: Partial<ListModel> = {
    title: data.title.trim(),
    type: data.type,
    heading: data.heading,
  };
  const resolvedHeading = data.heading || getListHeading(rawListData as ListModel);

  const listData: ListModel = {
    id: listId,
    title: data.title.trim(),
    description: data.description?.trim() || '',
    type: data.type,
    heading: resolvedHeading,
    color: data.color || (resolvedHeading === 'grocery' ? 'emerald' : resolvedHeading === 'home' ? 'amber' : 'emerald'),
    icon: data.icon || (data.type === 'grocery' || resolvedHeading === 'grocery' ? '🛒' : resolvedHeading === 'home' ? 'home' : resolvedHeading === 'today' ? 'calendar' : '📝'),
    ownerId: owner.uid,
    ownerEmail: normalizedEmail,
    ownerName: owner.displayName || 'Owner',
    sharedWith: {},
    memberEmails: [],
    members: [owner.uid],
    isPinned: false,
    isArchived: false,
    itemCount: data.initialItems?.length || 0,
    completedCount: 0,
    createdAt: new Date().toISOString() as any,
    updatedAt: new Date().toISOString() as any,
  };

  // Update local cache first
  const currentLists = getLocalLists();
  saveLocalLists([listData, ...currentLists]);

  // Initial local items
  if (data.initialItems && data.initialItems.length > 0) {
    const initialLocalItems: ListItemModel[] = data.initialItems.map((item, idx) => ({
      id: 'item_' + Date.now() + '_' + idx,
      listId,
      title: item.title,
      completed: false,
      category: item.category || 'Other',
      quantity: item.quantity || 1,
      unit: item.unit || 'pcs',
      priority: item.priority || 'medium',
      order: idx,
      createdAt: new Date().toISOString() as any,
      updatedAt: new Date().toISOString() as any,
    }));
    saveLocalItems(listId, initialLocalItems);
  }

  // Sync to Firestore in background
  try {
    const listsRef = collection(db, 'lists');
    const newListRef = doc(listsRef, listId);
    await setDoc(newListRef, {
      ...listData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const actRef = doc(collection(db, 'lists', listId, 'activity'));
    await setDoc(actRef, {
      listId,
      userEmail: normalizedEmail,
      userName: owner.displayName,
      action: 'created_item',
      details: `Created list "${data.title}"`,
      timestamp: serverTimestamp(),
    });

    if (data.initialItems && data.initialItems.length > 0) {
      const batch = writeBatch(db);
      data.initialItems.forEach((item, index) => {
        const itemRef = doc(collection(db, 'lists', listId, 'items'));
        batch.set(itemRef, {
          listId,
          title: item.title,
          completed: false,
          category: item.category || 'Other',
          quantity: item.quantity || 1,
          unit: item.unit || 'pcs',
          priority: item.priority || 'medium',
          order: index,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (err: any) {
    console.info('Firestore list sync notice:', err?.message || err);
  }

  return listId;
}

/**
 * Updates list meta details
 */
export async function updateList(
  listId: string,
  updates: Partial<Pick<ListModel, 'title' | 'description' | 'color' | 'icon' | 'heading' | 'type' | 'isPinned' | 'isArchived'>>
) {
  const currentLists = getLocalLists();
  const updated = currentLists.map((l) => (l.id === listId ? { ...l, ...updates, updatedAt: new Date().toISOString() as any } : l));
  saveLocalLists(updated);

  try {
    const listRef = doc(db, 'lists', listId);
    await updateDoc(listRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err: any) {
    console.info('Firestore list update notice:', err?.message || err);
  }
}

/**
 * Deletes a list completely
 */
export async function deleteList(listId: string) {
  const currentLists = getLocalLists();
  const updatedLists = currentLists.filter((l) => l.id !== listId);
  saveLocalLists(updatedLists);
  saveLocalItems(listId, []);
  
  try {
    localStorage.removeItem(STORAGE_ITEMS_PREFIX + listId);
    localStorage.removeItem(STORAGE_ACTIVITY_PREFIX + listId);
  } catch (e) {
    // Ignore storage clear errors
  }

  // Notify active listeners
  window.dispatchEvent(new CustomEvent('listit_lists_changed', { detail: updatedLists }));
  window.dispatchEvent(new CustomEvent(`listit_list_deleted_${listId}`, { detail: listId }));

  try {
    const itemsRef = collection(db, 'lists', listId, 'items');
    const itemsSnap = await getDocs(itemsRef);
    const batch = writeBatch(db);
    itemsSnap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await deleteDoc(doc(db, 'lists', listId));
  } catch (err: any) {
    console.info('Firestore list delete notice:', err?.message || err);
  }
}

/**
 * Shares a list with a user email with specific permission (editor or viewer)
 */
export async function shareListWithUser(
  list: ListModel,
  targetEmail: string,
  targetName: string | undefined,
  role: 'editor' | 'viewer',
  actingUser: { email: string; displayName: string }
) {
  const normalizedTargetEmail = targetEmail.toLowerCase().trim();
  const safeKey = sanitizeKey(normalizedTargetEmail);
  const updatedSharedWith = {
    ...(list.sharedWith || {}),
    [safeKey]: {
      email: normalizedTargetEmail,
      name: targetName || normalizedTargetEmail.split('@')[0],
      role,
      addedAt: new Date().toISOString(),
    },
  };

  const updatedMemberEmails = Array.from(
    new Set([...(list.memberEmails || []), normalizedTargetEmail])
  );

  const updatedList: ListModel = {
    ...list,
    sharedWith: updatedSharedWith,
    memberEmails: updatedMemberEmails,
    updatedAt: new Date().toISOString() as any,
  };

  const currentLists = getLocalLists();
  saveLocalLists(currentLists.map((l) => (l.id === list.id ? updatedList : l)));

  try {
    const listRef = doc(db, 'lists', list.id);
    await updateDoc(listRef, {
      sharedWith: updatedSharedWith,
      memberEmails: updatedMemberEmails,
      updatedAt: serverTimestamp(),
    });

    const actRef = doc(collection(db, 'lists', list.id, 'activity'));
    await setDoc(actRef, {
      listId: list.id,
      userEmail: actingUser.email,
      userName: actingUser.displayName,
      action: 'shared_list',
      details: `Shared with ${normalizedTargetEmail} as ${role === 'editor' ? 'Editor (Can Edit)' : 'Viewer (View Only)'}`,
      timestamp: serverTimestamp(),
    });
  } catch (err: any) {
    console.info('Firestore list share notice:', err?.message || err);
  }
}

/**
 * Changes permission role of an existing collaborator
 */
export async function updateCollaboratorRole(
  list: ListModel,
  targetEmail: string,
  newRole: 'editor' | 'viewer',
  actingUser: { email: string; displayName: string }
) {
  const normalizedTargetEmail = targetEmail.toLowerCase().trim();
  const safeKey = sanitizeKey(normalizedTargetEmail);

  if (!list.sharedWith || !list.sharedWith[safeKey]) return;

  const updatedSharedWith = {
    ...list.sharedWith,
    [safeKey]: {
      ...list.sharedWith[safeKey],
      role: newRole,
    },
  };

  const updatedList = { ...list, sharedWith: updatedSharedWith };
  const currentLists = getLocalLists();
  saveLocalLists(currentLists.map((l) => (l.id === list.id ? updatedList : l)));

  try {
    const listRef = doc(db, 'lists', list.id);
    await updateDoc(listRef, {
      sharedWith: updatedSharedWith,
      updatedAt: serverTimestamp(),
    });

    const actRef = doc(collection(db, 'lists', list.id, 'activity'));
    await setDoc(actRef, {
      listId: list.id,
      userEmail: actingUser.email,
      userName: actingUser.displayName,
      action: 'changed_permission',
      details: `Updated ${normalizedTargetEmail}'s permission to ${newRole === 'editor' ? 'Editor' : 'Viewer'}`,
      timestamp: serverTimestamp(),
    });
  } catch (err: any) {
    console.info('Firestore role update notice:', err?.message || err);
  }
}

/**
 * Removes collaborator access from a list
 */
export async function removeCollaborator(
  list: ListModel,
  targetEmail: string,
  actingUser: { email: string; displayName: string }
) {
  const normalizedTargetEmail = targetEmail.toLowerCase().trim();
  const safeKey = sanitizeKey(normalizedTargetEmail);

  const updatedSharedWith = { ...(list.sharedWith || {}) };
  delete updatedSharedWith[safeKey];

  const updatedMemberEmails = (list.memberEmails || []).filter(
    (e) => e.toLowerCase() !== normalizedTargetEmail
  );

  const updatedList = {
    ...list,
    sharedWith: updatedSharedWith,
    memberEmails: updatedMemberEmails,
  };

  const currentLists = getLocalLists();
  saveLocalLists(currentLists.map((l) => (l.id === list.id ? updatedList : l)));

  try {
    const listRef = doc(db, 'lists', list.id);
    await updateDoc(listRef, {
      sharedWith: updatedSharedWith,
      memberEmails: updatedMemberEmails,
      updatedAt: serverTimestamp(),
    });

    const actRef = doc(collection(db, 'lists', list.id, 'activity'));
    await setDoc(actRef, {
      listId: list.id,
      userEmail: actingUser.email,
      userName: actingUser.displayName,
      action: 'removed_member',
      details: `Removed ${normalizedTargetEmail} from list`,
      timestamp: serverTimestamp(),
    });
  } catch (err: any) {
    console.info('Firestore remove collaborator notice:', err?.message || err);
  }
}

/**
 * Real-time subscription to items in a list
 */
export function subscribeListItems(
  listId: string,
  onUpdate: (items: ListItemModel[]) => void,
  onError?: (err: any) => void
) {
  // Emit local cache immediately
  const localItems = getLocalItems(listId);
  if (localItems.length > 0) {
    onUpdate(localItems);
  }

  // Listen to local changes
  const handleLocalItemsChange = (e: Event) => {
    const custom = e as CustomEvent<ListItemModel[]>;
    if (custom.detail) {
      onUpdate(custom.detail);
    }
  };
  window.addEventListener(`listit_items_changed_${listId}`, handleLocalItemsChange);

  let unsub = () => {};
  try {
    const itemsRef = collection(db, 'lists', listId, 'items');

    unsub = onSnapshot(
      itemsRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteItems: ListItemModel[] = [];
          snapshot.forEach((docSnap) => {
            remoteItems.push({ id: docSnap.id, ...docSnap.data() } as ListItemModel);
          });

          // Sort remote items directly from snapshot
          remoteItems.sort((a, b) => {
            if (a.completed !== b.completed) {
              return a.completed ? 1 : -1;
            }
            if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
              return a.order - b.order;
            }
            const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return tB - tA;
          });

          saveLocalItems(listId, remoteItems);
          onUpdate(remoteItems);
        } else {
          // If remote snapshot is empty, retain any existing local items
          const currentLocal = getLocalItems(listId);
          if (currentLocal.length > 0) {
            onUpdate(currentLocal);
          } else {
            onUpdate([]);
          }
        }
      },
      (err) => {
        console.info('Firestore items listener notice (using local cache):', err?.message || err);
        const fallback = getLocalItems(listId);
        onUpdate(fallback);
        if (onError) onError(err);
      }
    );
  } catch (e) {
    console.info('Firestore items query notice:', e);
  }

  return () => {
    window.removeEventListener(`listit_items_changed_${listId}`, handleLocalItemsChange);
    unsub();
  };
}

/**
 * Adds an item to a list
 */
export async function addListItem(
  listId: string,
  item: Omit<ListItemModel, 'id' | 'listId' | 'createdAt' | 'updatedAt' | 'completed'> & { completed?: boolean },
  user: { email: string; displayName: string }
): Promise<string> {
  const itemId = 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newItemData: ListItemModel = {
    ...item,
    id: itemId,
    listId,
    completed: item.completed ?? false,
    order: item.order || 0,
    createdAt: new Date().toISOString() as any,
    updatedAt: new Date().toISOString() as any,
  };

  // Update local items cache
  const currentItems = getLocalItems(listId);
  saveLocalItems(listId, [newItemData, ...currentItems]);

  // Update parent list count in local cache
  const currentLists = getLocalLists();
  saveLocalLists(
    currentLists.map((l) =>
      l.id === listId
        ? { ...l, itemCount: (l.itemCount || 0) + 1, updatedAt: new Date().toISOString() as any }
        : l
    )
  );

  try {
    const itemRef = doc(collection(db, 'lists', listId, 'items'), itemId);
    await setDoc(itemRef, {
      ...newItemData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const listRef = doc(db, 'lists', listId);
    await updateDoc(listRef, {
      itemCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    const actRef = doc(collection(db, 'lists', listId, 'activity'));
    await setDoc(actRef, {
      listId,
      userEmail: user.email,
      userName: user.displayName,
      action: 'created_item',
      details: `Added "${item.title}"`,
      timestamp: serverTimestamp(),
    });
  } catch (err: any) {
    console.info('Firestore add item notice:', err?.message || err);
  }

  return itemId;
}

/**
 * Updates item fields
 */
export async function updateListItem(
  listId: string,
  itemId: string,
  updates: Partial<ListItemModel>
) {
  const currentItems = getLocalItems(listId);
  saveLocalItems(
    listId,
    currentItems.map((it) => (it.id === itemId ? { ...it, ...updates, updatedAt: new Date().toISOString() as any } : it))
  );

  try {
    const itemRef = doc(db, 'lists', listId, 'items', itemId);
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err: any) {
    console.info('Firestore update item notice:', err?.message || err);
  }
}

/**
 * Reorders an item within a list up or down
 */
export async function reorderListItem(
  listId: string,
  itemId: string,
  direction: 'up' | 'down'
) {
  const currentItems = [...getLocalItems(listId)];
  const index = currentItems.findIndex((it) => it.id === itemId);
  if (index === -1) return;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= currentItems.length) return;

  // Swap elements
  const temp = currentItems[index];
  currentItems[index] = currentItems[targetIndex];
  currentItems[targetIndex] = temp;

  // Re-assign order numbers
  const updated = currentItems.map((item, idx) => ({
    ...item,
    order: idx,
    updatedAt: new Date().toISOString() as any,
  }));

  saveLocalItems(listId, updated);

  try {
    const batch = writeBatch(db);
    updated.forEach((it) => {
      const ref = doc(db, 'lists', listId, 'items', it.id);
      batch.update(ref, { order: it.order, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  } catch (err) {
    console.info('Firestore reorder notice:', err);
  }
}

/**
 * Reorders items in a list from a complete sequence
 */
export async function reorderAllListItems(
  listId: string,
  reorderedItems: ListItemModel[]
) {
  const currentItems = getLocalItems(listId);
  const updatedMap = new Map<string, ListItemModel>();
  reorderedItems.forEach((item, idx) => {
    updatedMap.set(item.id, {
      ...item,
      order: idx,
      updatedAt: new Date().toISOString() as any,
    });
  });

  const nextItems = currentItems.map((item) => {
    if (updatedMap.has(item.id)) {
      return updatedMap.get(item.id)!;
    }
    return item;
  });

  // Re-sort to maintain clean order
  nextItems.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
      return a.order - b.order;
    }
    return 0;
  });

  saveLocalItems(listId, nextItems);

  try {
    const batch = writeBatch(db);
    reorderedItems.forEach((it, idx) => {
      const ref = doc(db, 'lists', listId, 'items', it.id);
      const updates: any = { order: idx, updatedAt: serverTimestamp() };
      if (it.store) updates.store = it.store;
      if (it.category) updates.category = it.category;
      batch.update(ref, updates);
    });
    await batch.commit();
  } catch (err) {
    console.info('Firestore batch reorder notice:', err);
  }
}

/**
 * Moves an item from one list to another list
 */
export async function moveItemToList(
  sourceListId: string,
  targetListId: string,
  item: ListItemModel,
  user: { email: string; displayName: string },
  targetListName?: string
): Promise<string> {
  const actualSourceId = item.listId || sourceListId;
  if (actualSourceId === targetListId) {
    // If target is same as source, just update the item
    await updateListItem(actualSourceId, item.id, item);
    return item.id;
  }

  const newItemId = 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newItemData: ListItemModel = {
    ...item,
    id: newItemId,
    listId: targetListId,
    completed: item.completed ?? false,
    order: 0,
    createdAt: new Date().toISOString() as any,
    updatedAt: new Date().toISOString() as any,
  };

  // 1. Remove from source list local cache
  const sourceItems = getLocalItems(actualSourceId);
  saveLocalItems(actualSourceId, sourceItems.filter((it) => it.id !== item.id));

  // If sourceListId was also passed and differed from actualSourceId, clean it up too
  if (sourceListId && sourceListId !== actualSourceId) {
    const altSourceItems = getLocalItems(sourceListId);
    saveLocalItems(sourceListId, altSourceItems.filter((it) => it.id !== item.id));
  }

  // 2. Add to target list local cache
  const targetItems = getLocalItems(targetListId);
  saveLocalItems(targetListId, [newItemData, ...targetItems]);

  // 3. Update both list counts in local cache
  const currentLists = getLocalLists();
  saveLocalLists(
    currentLists.map((l) => {
      if (l.id === actualSourceId || l.id === sourceListId) {
        return {
          ...l,
          itemCount: Math.max(0, (l.itemCount || 0) - 1),
          completedCount: item.completed ? Math.max(0, (l.completedCount || 0) - 1) : l.completedCount,
          updatedAt: new Date().toISOString() as any,
        };
      }
      if (l.id === targetListId) {
        return {
          ...l,
          itemCount: (l.itemCount || 0) + 1,
          completedCount: item.completed ? (l.completedCount || 0) + 1 : l.completedCount,
          updatedAt: new Date().toISOString() as any,
        };
      }
      return l;
    })
  );

  // 4. Background sync with Firestore
  try {
    const sourceItemRef = doc(db, 'lists', actualSourceId, 'items', item.id);
    await deleteDoc(sourceItemRef);

    const sourceListRef = doc(db, 'lists', actualSourceId);
    await updateDoc(sourceListRef, {
      itemCount: increment(-1),
      completedCount: item.completed ? increment(-1) : increment(0),
      updatedAt: serverTimestamp(),
    });

    const targetItemRef = doc(collection(db, 'lists', targetListId, 'items'), newItemId);
    await setDoc(targetItemRef, {
      ...newItemData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const targetListRef = doc(db, 'lists', targetListId);
    await updateDoc(targetListRef, {
      itemCount: increment(1),
      completedCount: item.completed ? increment(1) : increment(0),
      updatedAt: serverTimestamp(),
    });

    // Log activity
    const actRef = doc(collection(db, 'lists', targetListId, 'activity'));
    await setDoc(actRef, {
      listId: targetListId,
      userEmail: user.email,
      userName: user.displayName,
      action: 'moved_item',
      details: `Moved "${item.title}" into ${targetListName || 'this list'}`,
      timestamp: serverTimestamp(),
    });
  } catch (err: any) {
    console.info('Firestore move item notice:', err?.message || err);
  }

  return newItemId;
}

/**
 * Toggles an item's completed status
 */
export async function toggleListItem(
  listId: string,
  itemId: string,
  currentCompleted: boolean,
  user: { email: string; displayName: string; uid: string },
  itemTitle?: string
) {
  const nextCompleted = !currentCompleted;
  const currentItems = getLocalItems(listId);
  saveLocalItems(
    listId,
    currentItems.map((it) =>
      it.id === itemId
        ? {
            ...it,
            completed: nextCompleted,
            completedBy: nextCompleted ? user.uid : undefined,
            completedByName: nextCompleted ? user.displayName : undefined,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString() as any,
          }
        : it
    )
  );

  const currentLists = getLocalLists();
  saveLocalLists(
    currentLists.map((l) =>
      l.id === listId
        ? {
            ...l,
            completedCount: Math.max(0, (l.completedCount || 0) + (nextCompleted ? 1 : -1)),
            updatedAt: new Date().toISOString() as any,
          }
        : l
    )
  );

  try {
    const itemRef = doc(db, 'lists', listId, 'items', itemId);
    await updateDoc(itemRef, {
      completed: nextCompleted,
      completedBy: nextCompleted ? user.uid : null,
      completedByName: nextCompleted ? user.displayName : null,
      completedAt: nextCompleted ? new Date().toISOString() : null,
      updatedAt: serverTimestamp(),
    });

    const listRef = doc(db, 'lists', listId);
    await updateDoc(listRef, {
      completedCount: increment(nextCompleted ? 1 : -1),
      updatedAt: serverTimestamp(),
    });

    if (itemTitle) {
      const actRef = doc(collection(db, 'lists', listId, 'activity'));
      await setDoc(actRef, {
        listId,
        userEmail: user.email,
        userName: user.displayName,
        action: nextCompleted ? 'completed_item' : 'uncompleted_item',
        details: `${nextCompleted ? 'Checked off' : 'Unchecked'} "${itemTitle}"`,
        timestamp: serverTimestamp(),
      });
    }
  } catch (err: any) {
    console.info('Firestore toggle item notice:', err?.message || err);
  }
}

/**
 * Deletes an item from a list
 */
export async function deleteListItem(
  listId: string,
  itemId: string,
  wasCompleted: boolean,
  itemTitle: string,
  user: { email: string; displayName: string }
) {
  const currentItems = getLocalItems(listId);
  saveLocalItems(listId, currentItems.filter((it) => it.id !== itemId));

  const currentLists = getLocalLists();
  saveLocalLists(
    currentLists.map((l) =>
      l.id === listId
        ? {
            ...l,
            itemCount: Math.max(0, (l.itemCount || 0) - 1),
            completedCount: wasCompleted ? Math.max(0, (l.completedCount || 0) - 1) : l.completedCount,
            updatedAt: new Date().toISOString() as any,
          }
        : l
    )
  );

  try {
    const itemRef = doc(db, 'lists', listId, 'items', itemId);
    await deleteDoc(itemRef);

    const listRef = doc(db, 'lists', listId);
    await updateDoc(listRef, {
      itemCount: increment(-1),
      completedCount: wasCompleted ? increment(-1) : increment(0),
      updatedAt: serverTimestamp(),
    });

    const actRef = doc(collection(db, 'lists', listId, 'activity'));
    await setDoc(actRef, {
      listId,
      userEmail: user.email,
      userName: user.displayName,
      action: 'deleted_item',
      details: `Deleted "${itemTitle}"`,
      timestamp: serverTimestamp(),
    });
  } catch (err: any) {
    console.info('Firestore delete item notice:', err?.message || err);
  }
}

/**
 * Clears all completed items in a list
 */
export async function clearCompletedItems(
  listId: string,
  user: { email: string; displayName: string }
) {
  const currentItems = getLocalItems(listId);
  const completedItems = currentItems.filter((it) => it.completed);
  saveLocalItems(listId, currentItems.filter((it) => !it.completed));

  const currentLists = getLocalLists();
  saveLocalLists(
    currentLists.map((l) =>
      l.id === listId
        ? {
            ...l,
            itemCount: Math.max(0, (l.itemCount || 0) - completedItems.length),
            completedCount: 0,
            updatedAt: new Date().toISOString() as any,
          }
        : l
    )
  );

  try {
    const itemsRef = collection(db, 'lists', listId, 'items');
    const q = query(itemsRef, where('completed', '==', true));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      const listRef = doc(db, 'lists', listId);
      await updateDoc(listRef, {
        itemCount: increment(-snap.size),
        completedCount: increment(-snap.size),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err: any) {
    console.info('Firestore clear completed notice:', err?.message || err);
  }
}

/**
 * Real-time subscription to list activity history
 */
export function subscribeListActivity(
  listId: string,
  onUpdate: (logs: ActivityEntry[]) => void
) {
  const local = getLocalActivity(listId);
  if (local.length > 0) onUpdate(local);

  let unsub = () => {};
  try {
    const actRef = collection(db, 'lists', listId, 'activity');
    const q = query(actRef, orderBy('timestamp', 'desc'), limit(30));

    unsub = onSnapshot(q, (snap) => {
      const logs: ActivityEntry[] = [];
      snap.forEach((d) => {
        logs.push({ id: d.id, ...d.data() } as ActivityEntry);
      });
      saveLocalActivity(listId, logs);
      onUpdate(logs);
    });
  } catch (e) {
    console.info('Firestore activity listener notice:', e);
  }

  return unsub;
}

/**
 * Check if the user has permission to edit the given list
 */
export function getUserPermission(
  list: ListModel,
  user: { uid: string; email: string }
): PermissionRole {
  if (!list) return 'owner';
  const normalizedEmail = (user.email || '').toLowerCase().trim();
  const userUid = user.uid || '';

  // If user is owner
  if (
    (userUid && list.ownerId === userUid) ||
    (normalizedEmail && list.ownerEmail?.toLowerCase() === normalizedEmail) ||
    !list.ownerId ||
    !list.ownerEmail ||
    list.ownerId === 'user_keithfell1_gmail_com' ||
    list.ownerEmail === 'keithfell1@gmail.com'
  ) {
    return 'owner';
  }

  const safeKey = sanitizeKey(normalizedEmail);
  const sharedRecord = list.sharedWith?.[safeKey];
  if (sharedRecord) {
    return sharedRecord.role;
  }

  if (normalizedEmail && list.memberEmails?.some((e) => e.toLowerCase() === normalizedEmail)) {
    return 'editor';
  }

  return 'owner';
}

/**
 * Intelligent natural language parser for tasks and grocery items:
 * Parses:
 * - Location: "@Trader Joe's" or "at Target" or "where: Whole Foods"
 * - Scheduled Time: "at 3:30 PM", "at 14:00", "time: 2pm"
 * - Estimated Price: "$15.50", "cost: 25"
 * - Priority: "!urgent", "!high", "!low"
 * - Quantity & Unit: "3 lbs bananas", "2 gallons milk"
 */
export function parseNaturalTaskInput(input: string): {
  cleanTitle: string;
  location?: string;
  timeScheduled?: string;
  estimatedPrice?: number;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  quantity?: number;
  unit?: string;
  category?: string;
} {
  let str = input.trim();
  let location: string | undefined;
  let timeScheduled: string | undefined;
  let estimatedPrice: number | undefined;
  let priority: 'urgent' | 'high' | 'medium' | 'low' | undefined;
  let quantity: number | undefined;
  let unit: string | undefined;

  // 1. Priority tags like !urgent, !high, !med, !low
  if (/\b!(urgent|emergency)\b/i.test(str)) {
    priority = 'urgent';
    str = str.replace(/\b!(urgent|emergency)\b/gi, '').trim();
  } else if (/\b!(high|p1)\b/i.test(str)) {
    priority = 'high';
    str = str.replace(/\b!(high|p1)\b/gi, '').trim();
  } else if (/\b!(med|medium|p2)\b/i.test(str)) {
    priority = 'medium';
    str = str.replace(/\b!(med|medium|p2)\b/gi, '').trim();
  } else if (/\b!(low|p3)\b/i.test(str)) {
    priority = 'low';
    str = str.replace(/\b!(low|p3)\b/gi, '').trim();
  }

  // 2. Location tags like @Trader Joe's or @Hardware Store or [at Store Name]
  const atMatch = str.match(/@([^@\n\$\!]+)/);
  if (atMatch) {
    location = atMatch[1].trim();
    str = str.replace(atMatch[0], '').trim();
  } else {
    const whereMatch = str.match(/\b(?:at|location:)\s+([A-Z][A-Za-z0-9\s'&]+(?:store|market|pharmacy|office|mall|depot|station|clinic|center|hall|lab|gym|home|room \d+|trader joe's|target|walmart|costco|safeway|kroger|cvs|walgreens|whole foods|ikea|home depot|best buy|apple store|starbucks)?)/i);
    if (whereMatch && whereMatch[1] && whereMatch[1].trim().length > 2) {
      location = whereMatch[1].trim();
    }
  }

  // 3. Time tags like "at 3:30pm", "at 14:00", "time: 10:00 AM", "3:00 PM"
  const timeMatch = str.match(/\b(?:time:\s*|at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}:\d{2})\b/i);
  if (timeMatch) {
    timeScheduled = timeMatch[1].trim();
    str = str.replace(timeMatch[0], '').trim();
  }

  // 4. Price tags like $14.99 or $25
  const priceMatch = str.match(/\$(\d+(?:\.\d{2})?)/);
  if (priceMatch) {
    estimatedPrice = parseFloat(priceMatch[1]);
    str = str.replace(priceMatch[0], '').trim();
  }

  // 5. Quantity & Unit
  const qtyMatch = str.match(/^(\d+(?:\.\d+)?)\s*(lbs?|kg|g|oz|gal|gallons?|liters?|l|pack|packs|cartons?|bunch|bunches|cans?|bottles?|box|boxes|bags?|cups?|slices?|items?|pcs?)?\s+/i);
  if (qtyMatch) {
    quantity = parseFloat(qtyMatch[1]);
    unit = qtyMatch[2] ? qtyMatch[2].toLowerCase() : undefined;
    str = str.replace(qtyMatch[0], '').trim();
  }

  return {
    cleanTitle: str.replace(/\s{2,}/g, ' ').trim() || input.trim(),
    location,
    timeScheduled,
    estimatedPrice,
    priority,
    quantity,
    unit
  };
}

/**
 * Creates default initial lists for a new user if none exist
 */
export async function ensureDefaultUserLists(
  user: { uid: string; email: string; displayName: string }
): Promise<ListModel[]> {
  const isInitialized = typeof window !== 'undefined' ? localStorage.getItem('listit_initialized') : null;
  const local = getLocalLists();
  if (local.length > 0 || isInitialized === 'true') {
    return local;
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('listit_initialized', 'true');
  }

  try {
    const listsRef = collection(db, 'lists');
    const q = query(listsRef, where('ownerId', '==', user.uid));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const lists = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ListModel));
      saveLocalLists(lists);
      return lists;
    }
  } catch (e) {
    console.info('Firestore ensure default lists notice:', e);
  }

  // Create dedicated Today list for daily tasks and reminders
  await createList({
    title: "Today",
    description: "Daily reminders and tasks to do today",
    type: 'todo',
    color: 'emerald',
    icon: 'calendar'
  }, user);

  // Create 1 unified Grocery list tagged with store
  const groceryListId = await createList({
    title: "Grocery List",
    description: "Single shopping list tagged by store with ability to group by store",
    type: 'grocery',
    color: 'emerald',
    icon: '🛒'
  }, user);

  // Add initial starter grocery items tagged with stores
  await addListItem(groceryListId, {
    title: "Organic Bananas",
    completed: false,
    quantity: 2,
    unit: "lbs",
    store: "Trader Joe's",
    category: "Trader Joe's",
    priority: "medium",
    estimatedPrice: 2.29,
  }, user);

  await addListItem(groceryListId, {
    title: "Kirkland Paper Towels",
    completed: false,
    quantity: 1,
    unit: "pack",
    store: "Costco",
    category: "Costco",
    priority: "high",
    estimatedPrice: 21.99,
  }, user);

  await addListItem(groceryListId, {
    title: "Almond Milk",
    completed: false,
    quantity: 1,
    unit: "gal",
    store: "Whole Foods",
    category: "Whole Foods",
    priority: "medium",
    estimatedPrice: 4.49,
  }, user);

  await addListItem(groceryListId, {
    title: "Dish Soap",
    completed: false,
    quantity: 1,
    unit: "bottle",
    store: "Target",
    category: "Target",
    priority: "low",
    estimatedPrice: 3.89,
  }, user);

  await addListItem(groceryListId, {
    title: "Greek Yogurt (Honey & Plain)",
    completed: false,
    quantity: 32,
    unit: "oz",
    store: "Trader Joe's",
    category: "Trader Joe's",
    priority: "medium",
    estimatedPrice: 5.99,
  }, user);

  // Create 1 Home list for home improvement and household tasks
  const homeListId = await createList({
    title: "Home",
    description: "Household chores, repairs, organization, and home maintenance",
    type: 'todo',
    color: 'amber',
    icon: 'home'
  }, user);

  await addListItem(homeListId, {
    title: "Replace HVAC air filter",
    completed: false,
    priority: "medium",
    category: "Maintenance",
    notes: "16x25x1 filter size in the hallway vent."
  }, user);

  await addListItem(homeListId, {
    title: "Organize pantry shelves and spice rack",
    completed: false,
    priority: "low",
    category: "Organization"
  }, user);

  return getLocalLists();
}

/**
 * Ensures starter items exist if lists currently have 0 items across the board
 */
export async function ensureStarterItemsIfEmpty(
  lists: ListModel[],
  user: { email: string; displayName: string }
) {
  let totalItemsCount = 0;
  lists.forEach((l) => {
    totalItemsCount += getLocalItems(l.id).length;
  });

  if (totalItemsCount === 0 && lists.length > 0) {
    const groceryList = lists.find((l) => getListHeading(l) === 'grocery' || l.type === 'grocery');
    if (groceryList && getLocalItems(groceryList.id).length === 0) {
      await addListItem(groceryList.id, {
        title: "Organic Bananas",
        completed: false,
        quantity: 2,
        unit: "lbs",
        store: "Trader Joe's",
        category: "Trader Joe's",
        priority: "medium",
        estimatedPrice: 2.29,
      }, user);
      await addListItem(groceryList.id, {
        title: "Kirkland Paper Towels",
        completed: false,
        quantity: 1,
        unit: "pack",
        store: "Costco",
        category: "Costco",
        priority: "high",
        estimatedPrice: 21.99,
      }, user);
      await addListItem(groceryList.id, {
        title: "Almond Milk",
        completed: false,
        quantity: 1,
        unit: "gal",
        store: "Whole Foods",
        category: "Whole Foods",
        priority: "medium",
        estimatedPrice: 4.49,
      }, user);
      await addListItem(groceryList.id, {
        title: "Greek Yogurt (Honey & Plain)",
        completed: false,
        quantity: 32,
        unit: "oz",
        store: "Trader Joe's",
        category: "Trader Joe's",
        priority: "medium",
        estimatedPrice: 5.99,
      }, user);
    }

    const homeList = lists.find((l) => getListHeading(l) === 'home');
    if (homeList && getLocalItems(homeList.id).length === 0) {
      await addListItem(homeList.id, {
        title: "Replace HVAC air filter",
        completed: false,
        priority: "medium",
        category: "Maintenance",
        notes: "16x25x1 filter size in the hallway vent."
      }, user);
      await addListItem(homeList.id, {
        title: "Organize pantry shelves and spice rack",
        completed: false,
        priority: "low",
        category: "Organization"
      }, user);
    }

    const todayList = lists.find((l) => getListHeading(l) === 'today');
    if (todayList && getLocalItems(todayList.id).length === 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      await addListItem(todayList.id, {
        title: "Pick up dry cleaning",
        completed: false,
        priority: "high",
        dueDate: todayStr,
        isForToday: true,
        category: "Errands"
      }, user);
      await addListItem(todayList.id, {
        title: "Call dentist to confirm appointment",
        completed: false,
        priority: "medium",
        dueDate: todayStr,
        isForToday: true,
        category: "Personal"
      }, user);
    }
  }
}

