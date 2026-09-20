import React, { useState } from 'react';
import { ListInvitation } from '../types';
import { 
  acceptListInvitation, 
  declineListInvitation 
} from '../services/listService';
import { useAuth, getAvatarColor, getInitials } from '../context/AuthContext';
import { 
  Mail, 
  Check, 
  X, 
  AlertCircle,
  Inbox,
  UserCheck,
  UserX,
  LogIn,
  ListTodo,
  ShoppingCart,
  CheckSquare
} from 'lucide-react';

interface InvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingInvitations: ListInvitation[];
  directInvitation?: ListInvitation | null;
  onSelectAcceptedList: (listId: string) => void;
  onOpenAuth: () => void;
}

export const InvitationsModal: React.FC<InvitationsModalProps> = ({
  isOpen,
  onClose,
  pendingInvitations,
  directInvitation,
  onSelectAcceptedList,
  onOpenAuth
}) => {
  const { user, userProfile, signInAsDemoUser } = useAuth();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [acceptedSuccessMessage, setAcceptedSuccessMessage] = useState('');

  if (!isOpen) return null;

  const currentEmail = (userProfile?.email || user?.email || '').toLowerCase().trim();
  const currentDisplayName = userProfile?.displayName || user?.displayName || currentEmail.split('@')[0] || 'User';

  // Combine direct invitation with pending list, deduplicating
  const allInvitationsMap = new Map<string, ListInvitation>();
  if (directInvitation && directInvitation.status === 'pending') {
    allInvitationsMap.set(directInvitation.id, directInvitation);
  }
  pendingInvitations.forEach((inv) => {
    allInvitationsMap.set(inv.id, inv);
  });
  const invitationsToDisplay = Array.from(allInvitationsMap.values());

  const handleAccept = async (invitation: ListInvitation) => {
    setErrorMessage('');
    setAcceptedSuccessMessage('');
    setLoadingId(invitation.id);

    try {
      if (!user) {
        setErrorMessage('Please sign in or choose an account first to accept.');
        setLoadingId(null);
        return;
      }

      // Check if logged in email matches invited email
      if (currentEmail !== invitation.invitedEmail.toLowerCase().trim()) {
        setErrorMessage(
          `This invitation was sent to ${invitation.invitedEmail}. Please switch or sign in with that account to accept.`
        );
        setLoadingId(null);
        return;
      }

      const listId = await acceptListInvitation(invitation.id, {
        uid: user.uid,
        email: currentEmail,
        displayName: currentDisplayName,
      });

      setAcceptedSuccessMessage(`Joined "${invitation.listTitle}"`);
      
      // Auto open list after brief moment
      setTimeout(() => {
        onSelectAcceptedList(listId);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setErrorMessage(err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (invitation: ListInvitation) => {
    setErrorMessage('');
    setAcceptedSuccessMessage('');
    setLoadingId(invitation.id);

    try {
      await declineListInvitation(invitation.id, {
        uid: user?.uid,
        email: currentEmail || invitation.invitedEmail,
      });
    } catch (err: any) {
      console.error('Error declining invitation:', err);
      setErrorMessage(err.message || 'Failed to decline invitation.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleSwitchToInvitedEmail = async (invitedEmail: string) => {
    const suggestedName = invitedEmail.split('@')[0].replace(/[._]/g, ' ');
    const capitalizedName = suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1);
    await signInAsDemoUser(capitalizedName, invitedEmail);
  };

  const getListTypeIcon = (type?: string) => {
    if (type === 'grocery') return <ShoppingCart className="w-4 h-4 text-amber-500" />;
    if (type === 'todo') return <CheckSquare className="w-4 h-4 text-emerald-500" />;
    return <ListTodo className="w-4 h-4 text-blue-500" />;
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
        aria-labelledby="invitations-sheet-title"
        className="relative w-full max-w-[460px] bg-[#fbfbfd] dark:bg-[#1c1c1e] text-slate-900 dark:text-slate-100 rounded-[28px] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden flex flex-col max-h-[88vh] tracking-tight antialiased animate-in zoom-in-95 duration-200"
      >
        {/* Apple-style Navigation Bar */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.07] bg-white/70 dark:bg-[#242426]/70 backdrop-blur-xl">
          <div className="w-12" />
          
          <h2 id="invitations-sheet-title" className="text-sm font-semibold text-slate-900 dark:text-white">
            Invitations
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-[13px] leading-normal">
          {errorMessage && (
            <div className="px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {acceptedSuccessMessage && (
            <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 flex items-center gap-2 text-xs">
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">{acceptedSuccessMessage}</span>
            </div>
          )}

          {invitationsToDisplay.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-400 mb-3">
                <Inbox className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No Pending Invitations
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mt-1">
                When someone shares a list with you, it will appear here for you to accept.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitationsToDisplay.map((inv) => {
                const isMatchingEmail = currentEmail === inv.invitedEmail.toLowerCase().trim();
                const isAccepting = loadingId === inv.id;

                return (
                  <div 
                    key={inv.id}
                    className="bg-white dark:bg-[#252528] rounded-2xl p-4 shadow-xs border border-black/[0.04] dark:border-white/[0.06] space-y-3"
                  >
                    {/* Top Row: List & Inviter Details */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${getAvatarColor(inv.ownerEmail)} shadow-xs mt-0.5`}>
                          {getInitials(inv.ownerName || inv.ownerEmail)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {getListTypeIcon(inv.listType)}
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {inv.listTitle}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            From <span className="font-medium text-slate-700 dark:text-slate-300">{inv.ownerName || inv.ownerEmail.split('@')[0]}</span>
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-white/[0.08] rounded-full shrink-0">
                        {inv.role === 'editor' ? 'Can edit' : 'View only'}
                      </span>
                    </div>

                    {/* Account mismatch banner */}
                    {!isMatchingEmail && (
                      <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-xs space-y-2">
                        <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                          Sent to <span className="font-semibold">{inv.invitedEmail}</span>. You are currently signed in as {currentEmail || 'a guest'}.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSwitchToInvitedEmail(inv.invitedEmail)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs transition flex items-center gap-1"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>Switch Account</span>
                          </button>
                          <button
                            type="button"
                            onClick={onOpenAuth}
                            className="px-2.5 py-1 bg-white dark:bg-[#1c1c1e] border border-amber-200 text-amber-800 dark:text-amber-200 rounded-lg font-medium text-xs hover:bg-amber-50 transition"
                          >
                            Sign In
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                      <button
                        type="button"
                        disabled={isAccepting}
                        onClick={() => handleDecline(inv)}
                        className="px-3.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition flex items-center gap-1 disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>

                      <button
                        type="button"
                        disabled={isAccepting || !isMatchingEmail}
                        onClick={() => handleAccept(inv)}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0071e3] hover:bg-[#0077ed] rounded-full shadow-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{isAccepting ? 'Joining...' : 'Accept'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Apple-style Footer */}
        <div className="px-5 py-3.5 border-t border-black/[0.05] dark:border-white/[0.07] bg-white/70 dark:bg-[#242426]/70 backdrop-blur-xl flex justify-end">
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
