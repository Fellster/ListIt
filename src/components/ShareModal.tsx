import React, { useState, useEffect, useRef } from 'react';
import { ListModel, SharedMember, ListInvitation } from '../types';
import { 
  createListInvitation,
  shareListWithUser,
  subscribeListInvitations,
  cancelListInvitation,
  updateCollaboratorRole, 
  removeCollaborator 
} from '../services/listService';
import { useAuth, getAvatarColor, getInitials } from '../context/AuthContext';
import { 
  Check, 
  Copy, 
  AlertCircle,
  Mail,
  Send,
  Link,
  X,
  UserX,
  ListTodo,
  ShoppingCart,
  CheckSquare,
  Globe
} from 'lucide-react';
import { getPublicListShareUrl } from '../utils/urlUtils';

interface SwipeableRowProps {
  children: React.ReactNode;
  onRevoke?: () => void;
  canRevoke: boolean;
  revokeLabel?: string;
}

/**
 * An Apple-style swipeable row that slides left to reveal a vibrant red Revoke button.
 * Supports both mobile touch gestures and mouse drag on desktop.
 */
const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  onRevoke,
  canRevoke,
  revokeLabel = 'Revoke',
}) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isHorizontalGesture = useRef<boolean | null>(null);
  const maxReveal = 78;

  if (!canRevoke || !onRevoke) {
    return <div className="relative">{children}</div>;
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontalGesture.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    if (isHorizontalGesture.current === null) {
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        isHorizontalGesture.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isHorizontalGesture.current === false) return;

    if (deltaX < 0) {
      setOffset(Math.max(deltaX, -110));
    } else if (offset < 0) {
      setOffset(Math.min(0, -maxReveal + deltaX));
    }
  };

  const handleTouchEnd = () => {
    startX.current = null;
    startY.current = null;
    isHorizontalGesture.current = null;
    setIsDragging(false);

    if (offset < -35) {
      setOffset(-maxReveal);
    } else {
      setOffset(0);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, select')) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    isHorizontalGesture.current = null;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || startX.current === null || startY.current === null) return;
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;

    if (isHorizontalGesture.current === null) {
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        isHorizontalGesture.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isHorizontalGesture.current === false) return;

    if (deltaX < 0) {
      setOffset(Math.max(deltaX, -110));
    } else if (offset < 0) {
      setOffset(Math.min(0, -maxReveal + deltaX));
    }
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    startX.current = null;
    startY.current = null;
    isHorizontalGesture.current = null;
    if (offset < -35) {
      setOffset(-maxReveal);
    } else {
      setOffset(0);
    }
  };

  return (
    <div className="relative overflow-hidden bg-white dark:bg-[#252528]">
      {/* Background Red Revoke Action revealed when sliding left */}
      <div className="absolute inset-y-0 right-0 w-[78px] flex items-center justify-center bg-[#ff3b30] hover:bg-[#e03126] transition-colors z-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOffset(0);
            onRevoke();
          }}
          className="w-full h-full flex flex-col items-center justify-center text-white gap-0.5 active:opacity-75 transition-opacity cursor-pointer"
          title={`${revokeLabel} access`}
          aria-label={`${revokeLabel} access`}
        >
          <UserX className="w-4 h-4 stroke-[2.2]" />
          <span className="text-[10px] font-semibold tracking-tight">{revokeLabel}</span>
        </button>
      </div>

      {/* Foreground Sliding Row */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={() => {
          if (offset < 0) setOffset(0);
        }}
        className="relative z-10 bg-white dark:bg-[#252528] touch-pan-y select-none cursor-grab active:cursor-grabbing"
      >
        {children}
      </div>
    </div>
  );
};

interface ShareModalProps {
  list: ListModel;
  isOpen: boolean;
  onClose: () => void;
  onListUpdated?: (updatedList: ListModel) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ list, isOpen, onClose, onListUpdated }) => {
  const { userProfile, user } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<'editor' | 'viewer'>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<ListInvitation[]>([]);
  const [recentlyCreatedInvite, setRecentlyCreatedInvite] = useState<ListInvitation | null>(null);
  const [localSharedWith, setLocalSharedWith] = useState<Record<string, SharedMember>>(
    list.sharedWith || {}
  );

  const currentEmail = (userProfile?.email || user?.email || '').toLowerCase().trim();
  const isOwner = list.ownerId === user?.uid || list.ownerEmail?.toLowerCase() === currentEmail;

  // Sync local shared list if the list prop changes
  useEffect(() => {
    setLocalSharedWith(list.sharedWith || {});
  }, [list.sharedWith, list.id]);

  // Listen to local storage changes
  useEffect(() => {
    const handleListsChanged = (e: any) => {
      const updatedLists: ListModel[] = e.detail || [];
      const current = updatedLists.find((l) => l.id === list.id);
      if (current && current.sharedWith) {
        setLocalSharedWith(current.sharedWith);
      }
    };
    window.addEventListener('listit_lists_changed', handleListsChanged);
    return () => window.removeEventListener('listit_lists_changed', handleListsChanged);
  }, [list.id]);

  // Real-time subscription to pending invitations for this list
  useEffect(() => {
    if (!isOpen || !list.id) return;

    const unsub = subscribeListInvitations(list.id, (invs) => {
      setPendingInvitations(invs);
    });

    return () => unsub();
  }, [isOpen, list.id]);

  if (!isOpen) return null;

  const sharedList = Object.values(localSharedWith || {}) as SharedMember[];
  const publicShareUrl = getPublicListShareUrl(list.id);

  const getInviteUrl = (_inviteId?: string) => {
    return publicShareUrl;
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = emailInput.trim().toLowerCase();
    if (!targetEmail) return;
    setError('');
    setActionSuccess('');

    if (targetEmail === list.ownerEmail?.toLowerCase().trim()) {
      setError('This user is already the owner of this list.');
      return;
    }

    setLoading(true);
    try {
      // 1. Save recipient permission to Firestore (updates memberEmails, editorEmails, sharedWith)
      const updatedList = await shareListWithUser(
        list,
        targetEmail,
        undefined,
        roleInput,
        {
          email: currentEmail,
          displayName: userProfile?.displayName || user?.displayName || 'Owner',
          uid: user?.uid,
        }
      );

      // Only report success after the Firestore update succeeds
      setLocalSharedWith(updatedList.sharedWith || {});
      onListUpdated?.(updatedList);

      // 2. Canonical public invitation URL: https://[PUBLIC-LISTIT-DOMAIN]/?listId=[LIST_ID]
      const shareUrl = publicShareUrl;

      // 3. Construct mailto invitation
      const emailSubject = `Invitation to collaborate on "${list.title}" in ListIt`;
      const emailBody = 
        `You've been invited to collaborate on "${list.title}" in ListIt.\n\n` +
        `Open this link to access the list:\n${shareUrl}\n\n` +
        `If prompted, sign in or create your ListIt account using the email address this invitation was sent to (${targetEmail}).`;

      const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

      // 4. Open the user's email composer
      try {
        window.location.href = mailtoUrl;
      } catch (mailErr) {
        console.warn('Could not launch mail client automatically:', mailErr);
      }

      setEmailInput('');
      setActionSuccess(`Invited ${targetEmail} as ${roleInput === 'editor' ? 'Editor' : 'Viewer'}. Opening email composer...`);
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      console.error('Error saving invitation to Firestore:', err);
      // If the Firestore update fails, report the failure to the user instead of silently reporting success
      setError(err.message || 'Failed to save invitation to Firestore. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberEmail: string, newRole: 'editor' | 'viewer') => {
    setError('');
    const normalizedEmail = memberEmail.toLowerCase().trim();

    try {
      const updatedList = await updateCollaboratorRole(
        list,
        normalizedEmail,
        newRole,
        {
          email: currentEmail,
          displayName: userProfile?.displayName || user?.displayName || 'Owner',
          uid: user?.uid,
        }
      );
      setLocalSharedWith(updatedList.sharedWith || {});
      onListUpdated?.(updatedList);
      setActionSuccess(`Updated permissions for ${memberEmail}`);
      setTimeout(() => setActionSuccess(''), 2500);
    } catch (err: any) {
      console.error('Error updating role:', err);
      setError(err.message || 'Could not update role.');
    }
  };

  const handleRemove = async (memberEmail: string) => {
    setError('');
    const normalizedEmail = memberEmail.toLowerCase().trim();

    try {
      const updatedList = await removeCollaborator(
        list,
        normalizedEmail,
        {
          email: currentEmail,
          displayName: userProfile?.displayName || user?.displayName || 'Owner',
          uid: user?.uid,
        }
      );
      setLocalSharedWith(updatedList.sharedWith || {});
      onListUpdated?.(updatedList);
      setActionSuccess(`Revoked access for ${memberEmail}`);
      setTimeout(() => setActionSuccess(''), 2500);
    } catch (err: any) {
      console.error('Error removing collaborator:', err);
      setError(err.message || 'Could not remove member.');
    }
  };

  const handleCancelInvite = async (inviteId: string, email: string) => {
    setError('');
    // Immediately remove pending invite row from UI
    setPendingInvitations((prev) => prev.filter((inv) => inv.id !== inviteId));
    if (recentlyCreatedInvite?.id === inviteId) {
      setRecentlyCreatedInvite(null);
    }

    try {
      await cancelListInvitation(inviteId, {
        email: currentEmail,
        displayName: userProfile?.displayName || user?.displayName || 'Owner',
      });
      setActionSuccess(`Cancelled invite for ${email}`);
      setTimeout(() => setActionSuccess(''), 2500);
    } catch (err: any) {
      console.error('Error cancelling invitation:', err);
      setError('Could not cancel invitation.');
    }
  };

  const handleCopyInviteLink = (inviteId: string) => {
    navigator.clipboard.writeText(publicShareUrl).then(() => {
      setCopiedInviteId(inviteId);
      setTimeout(() => setCopiedInviteId(null), 2000);
    });
  };

  const handleCopyDirectListLink = () => {
    navigator.clipboard.writeText(publicShareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleDraftEmail = (invitation: ListInvitation) => {
    const shareUrl = getPublicListShareUrl(invitation.listId || list.id);
    const subject = encodeURIComponent(`Collaborate on "${invitation.listTitle || list.title}" in ListIt`);
    const body = encodeURIComponent(
      `Hi,\n\nI've invited you to collaborate on "${invitation.listTitle || list.title}" as ${invitation.role === 'editor' ? 'an Editor' : 'a Viewer'}.\n\nClick here to join:\n${shareUrl}\n\n— ${list.ownerName || currentEmail}`
    );
    window.open(`mailto:${invitation.invitedEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  const getListIcon = () => {
    if (list.type === 'grocery') return <ShoppingCart className="w-5 h-5 text-amber-500" />;
    if (list.type === 'todo') return <CheckSquare className="w-5 h-5 text-emerald-500" />;
    return <ListTodo className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
        className="relative w-full max-w-[460px] bg-[#fbfbfd] dark:bg-[#1c1c1e] text-slate-900 dark:text-slate-100 rounded-[28px] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden flex flex-col max-h-[88vh] tracking-tight antialiased animate-in zoom-in-95 duration-200"
      >
        {/* Apple-style Navigation Bar */}
        <div className="relative px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.07] bg-white/70 dark:bg-[#242426]/70 backdrop-blur-xl">
          <div className="w-12" /> {/* Left spacer for balance */}
          
          <h2 id="share-sheet-title" className="text-sm font-semibold text-slate-900 dark:text-white">
            Share List
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all active:scale-90"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-[13px] leading-normal">
          {/* Notifications / Alerts */}
          {error && (
            <div className="px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 flex items-center gap-2 text-xs">
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">{actionSuccess}</span>
            </div>
          )}

          {/* Hero List Card - Apple Note/Reminders Item Style */}
          <div className="bg-white dark:bg-[#252528] rounded-2xl p-4 shadow-xs border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-3.5">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
              style={{ 
                backgroundColor: list.color ? `${list.color}18` : 'rgba(0,122,255,0.1)',
                border: `1px solid ${list.color ? `${list.color}30` : 'rgba(0,122,255,0.2)'}`
              }}
            >
              {getListIcon()}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {list.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {list.ownerEmail === currentEmail ? 'Created by you' : `Created by ${list.ownerName || list.ownerEmail}`}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyDirectListLink}
              title="Copy List Link"
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3 h-3 text-[#34c759]" />
                  <span className="text-[#34c759]">Copied</span>
                </>
              ) : (
                <>
                  <Link className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Public Collaboration Link Card */}
          <div className="bg-white dark:bg-[#252528] rounded-2xl p-3 shadow-xs border border-black/[0.04] dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Globe className="w-3.5 h-3.5 text-[#0071e3] dark:text-[#3898ff]" />
                <span>Public Invitation Link</span>
              </div>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                Protected by Auth & Rules
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-black/20 rounded-xl p-1 border border-black/[0.04] dark:border-white/[0.06]">
              <div 
                className="flex-1 min-w-0 px-2.5 py-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate select-all"
                title={publicShareUrl}
              >
                {publicShareUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyDirectListLink}
                className="px-3 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight px-0.5">
              Anyone invited to this list can open this public link and sign in with their invited email address to collaborate.
            </p>
          </div>

          {/* Invite Section (Owner Only) */}
          {isOwner ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-normal uppercase">
                  Add People
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {roleInput === 'viewer' ? 'v: view only' : 'e: can edit'}
                </span>
              </div>

              <form 
                onSubmit={handleShare}
                className="bg-white dark:bg-[#252528] rounded-2xl p-1.5 shadow-xs border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1.5 transition-all focus-within:ring-2 focus-within:ring-[#0071e3]/30"
              >
                <div className="pl-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>

                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Name, email, or contact..."
                  className="flex-1 min-w-0 bg-transparent py-1.5 px-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                />

                {/* Two Touchable Dots: v (view only) on left, e (edit) on right */}
                <div 
                  className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.08] p-1 rounded-full shrink-0"
                  role="radiogroup"
                  aria-label="Access permission"
                >
                  <button
                    type="button"
                    onClick={() => setRoleInput('viewer')}
                    aria-label="View only"
                    title="View only (v)"
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs transition-all active:scale-90 ${
                      roleInput === 'viewer'
                        ? 'bg-[#0071e3] text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    v
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleInput('editor')}
                    aria-label="Edit"
                    title="Edit (can make changes)"
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs transition-all active:scale-90 ${
                      roleInput === 'editor'
                        ? 'bg-[#0071e3] text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    e
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || !emailInput.trim()}
                  className="h-7 px-2.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-[11px] shadow-2xs transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center shrink-0"
                >
                  {loading ? 'Sending...' : 'Invite'}
                </button>
              </form>
            </div>
          ) : (
            <div className="px-3.5 py-2.5 bg-slate-100/70 dark:bg-white/[0.04] rounded-2xl text-xs text-slate-500 dark:text-slate-400">
              Only the list owner ({list.ownerEmail}) can send invitations or manage permissions.
            </div>
          )}

          {/* Quick Invite Link Banner (When recently created) */}
          {recentlyCreatedInvite && (
            <div className="bg-[#f2f7ff] dark:bg-[#1a2434] border border-[#0071e3]/20 rounded-2xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#0071e3] dark:text-[#3898ff] truncate">
                  Invite link created for {recentlyCreatedInvite.invitedEmail}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {recentlyCreatedInvite.role === 'editor' ? 'Can make changes' : 'View only'}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyInviteLink(recentlyCreatedInvite.id)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#252528] text-slate-800 dark:text-slate-100 text-xs font-medium border border-black/[0.06] dark:border-white/[0.08] shadow-2xs hover:bg-slate-50 transition active:scale-95 flex items-center gap-1"
                >
                  {copiedInviteId === recentlyCreatedInvite.id ? (
                    <>
                      <Check className="w-3 h-3 text-[#34c759]" />
                      <span className="text-[#34c759]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDraftEmail(recentlyCreatedInvite)}
                  className="p-1.5 rounded-xl bg-white dark:bg-[#252528] text-slate-800 dark:text-slate-100 border border-black/[0.06] dark:border-white/[0.08] shadow-2xs hover:bg-slate-50 transition active:scale-95"
                  title="Open mail draft"
                >
                  <Send className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            </div>
          )}

          {/* Pending Invitations Inset List */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-normal uppercase">
                  Pending Invitations
                </span>
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Slide left to revoke
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    {pendingInvitations.length}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-[#252528] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden shadow-xs">
                {pendingInvitations.map((inv) => (
                  <SwipeableRow
                    key={inv.id}
                    canRevoke={isOwner}
                    onRevoke={() => handleCancelInvite(inv.id, inv.invitedEmail)}
                    revokeLabel="Revoke"
                  >
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${getAvatarColor(inv.invitedEmail)} shrink-0 shadow-2xs`}>
                          {getInitials(inv.invitedEmail)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                            {inv.invitedEmail}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {inv.role === 'editor' ? 'Can make changes' : 'View only'} • Invited
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyInviteLink(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded-lg transition"
                          title="Copy invite link"
                        >
                          {copiedInviteId === inv.id ? (
                            <Check className="w-3.5 h-3.5 text-[#34c759]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDraftEmail(inv)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded-lg transition"
                          title="Send email draft"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </SwipeableRow>
                ))}
              </div>
            </div>
          )}

          {/* People with Access Inset Group */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-normal uppercase">
                People with Access
              </span>
              {isOwner && sharedList.length > 0 && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Slide left to revoke
                </span>
              )}
            </div>

            <div className="bg-white dark:bg-[#252528] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden shadow-xs">
              {/* Owner Row */}
              <div className="px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${getAvatarColor(list.ownerEmail)} shrink-0 shadow-2xs`}>
                    {getInitials(list.ownerName || list.ownerEmail)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      <span className="truncate">{list.ownerName || list.ownerEmail?.split('@')[0]}</span>
                      {list.ownerEmail?.toLowerCase() === currentEmail && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal shrink-0">(You)</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{list.ownerEmail}</div>
                  </div>
                </div>

                <span className="text-xs font-normal text-slate-400 dark:text-slate-500 pr-1">
                  Owner
                </span>
              </div>

              {/* Shared Members */}
              {sharedList.length === 0 ? (
                <div className="px-3.5 py-4 text-center text-xs text-slate-400">
                  Only you have access to this list
                </div>
              ) : (
                sharedList.map((member) => {
                  const isCurrentMember = member.email.toLowerCase() === currentEmail;
                  return (
                    <SwipeableRow
                      key={member.email}
                      canRevoke={isOwner && !isCurrentMember}
                      onRevoke={() => handleRemove(member.email)}
                      revokeLabel="Revoke"
                    >
                      <div className="px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${getAvatarColor(member.email)} shrink-0 shadow-2xs`}>
                            {getInitials(member.name || member.email)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{member.name || member.email.split('@')[0]}</span>
                              {isCurrentMember && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal shrink-0">(You)</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{member.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isOwner ? (
                            /* Two-dot role switcher for collaborator: v (view) on left, e (edit) on right */
                            <div 
                              className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.08] p-0.5 rounded-full shrink-0"
                              role="radiogroup"
                              aria-label="Member permission"
                            >
                              <button
                                type="button"
                                onClick={() => handleRoleChange(member.email, 'viewer')}
                                aria-label="View only"
                                title="View only (v)"
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-semibold text-[10px] transition-all active:scale-90 ${
                                  member.role === 'viewer'
                                    ? 'bg-[#0071e3] text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                                }`}
                              >
                                v
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRoleChange(member.email, 'editor')}
                                aria-label="Can edit"
                                title="Can edit (e)"
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-semibold text-[10px] transition-all active:scale-90 ${
                                  member.role === 'editor'
                                    ? 'bg-[#0071e3] text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                                }`}
                              >
                                e
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 pr-1">
                              {member.role === 'editor' ? 'Editor (e)' : 'Viewer (v)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </SwipeableRow>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Apple-style Bottom Action Bar */}
        <div className="px-5 py-3.5 border-t border-black/[0.05] dark:border-white/[0.07] bg-white/70 dark:bg-[#242426]/70 backdrop-blur-xl flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopyDirectListLink}
            className="text-xs font-medium text-[#0071e3] hover:text-[#0077ed] dark:text-[#3898ff] dark:hover:text-[#52a5ff] flex items-center gap-1.5 transition active:opacity-70"
          >
            <Link className="w-3.5 h-3.5" />
            <span>{copiedLink ? 'Link copied' : 'Copy link'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold rounded-full shadow-xs transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
