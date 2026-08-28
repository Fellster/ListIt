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
import { ListModel, ListItemModel, ActivityEntry, PermissionRole } from '../types';

// Local Storage Cache Keys
const STORAGE_LISTS_KEY = 'listit_cached_lists';
const STORAGE_ITEMS_PREFIX = 'listit_cached_items_';
const STORAGE_ACTIVITY_PREFIX = 'listit_cached_activity_';

function getLocalLists(): ListModel[] {
  try {
    const raw = localStorage.getItem(STORAGE_LISTS_KEY);
    return raw ? JSON.parse(raw) : [];
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
      custom.detail.forEach((l) => listMap.set(l.id, l));
      onUpdate(Array.from(listMap.values()));
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
    initialItems?: Array<{ title: string; category?: string; quantity?: number; unit?: string; priority?: 'low' | 'medium' | 'high' }>;
  },
  owner: { uid: string; email: string; displayName: string }
): Promise<string> {
  const normalizedEmail = owner.email.toLowerCase().trim();
  const listId = 'list_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const listData: ListModel = {
    id: listId,
    title: data.title.trim(),
    description: data.description?.trim() || '',
    type: data.type,
    color: data.color || 'emerald',
    icon: data.icon || (data.type === 'grocery' ? '🛒' : '📝'),
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
  updates: Partial<Pick<ListModel, 'title' | 'description' | 'color' | 'icon' | 'isPinned' | 'isArchived'>>
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
  saveLocalLists(currentLists.filter((l) => l.id !== listId));
  saveLocalItems(listId, []);

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
    const q = query(itemsRef, orderBy('createdAt', 'desc'));

    unsub = onSnapshot(
      q,
      (snapshot) => {
        const items: ListItemModel[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as ListItemModel);
        });
        items.sort((a, b) => {
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
        saveLocalItems(listId, items);
        onUpdate(items);
      },
      (err) => {
        console.info('Firestore items listener notice (using local cache):', err?.message || err);
        const fallback = getLocalItems(listId);
        if (fallback.length > 0) onUpdate(fallback);
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
    completed: false,
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
  const normalizedEmail = user.email.toLowerCase().trim();
  if (list.ownerId === user.uid || list.ownerEmail?.toLowerCase() === normalizedEmail) {
    return 'owner';
  }

  const safeKey = sanitizeKey(normalizedEmail);
  const sharedRecord = list.sharedWith?.[safeKey];
  if (sharedRecord) {
    return sharedRecord.role;
  }

  return 'viewer';
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
  const local = getLocalLists();
  if (local.length > 0) {
    return local;
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

  // Create "Today's Agenda & Tasks" as the primary daily list
  const todayListId = await createList({
    title: "Today's Focus & Tasks",
    description: "Your primary daily to-do board, errands, and time-scheduled agenda",
    type: 'todo',
    color: 'emerald',
    icon: 'calendar'
  }, user);

  // Add initial starter tasks to Today
  await addListItem(todayListId, {
    title: "Review daily priority agenda & connect Google Calendar",
    completed: false,
    timeScheduled: "09:00 AM",
    location: "Home Office",
    priority: "high",
    category: "Planning",
    notes: "Link your Google Calendar to sync time-blocked tasks and view today's events seamlessly."
  }, user);

  await addListItem(todayListId, {
    title: "Grocery run for dinner ingredients",
    completed: false,
    timeScheduled: "04:30 PM",
    location: "Trader Joe's",
    priority: "medium",
    category: "Errands",
    estimatedPrice: 32.50,
    notes: "Pick up organic spinach, pasta sauce, and sourdough bread."
  }, user);

  // Create a collaborative Grocery list too
  await createList({
    title: "Weekly Grocery & Market Run",
    description: "Shared shopping items organized by grocery aisles with cost tracker",
    type: 'grocery',
    color: 'amber',
    icon: 'shopping-cart'
  }, user);

  return getLocalLists();
}

