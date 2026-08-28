import React, { useState } from 'react';
import { ListModel, PermissionRole, SharedMember } from '../types';
import { 
  shareListWithUser, 
  updateCollaboratorRole, 
  removeCollaborator, 
  sanitizeKey 
} from '../services/listService';
import { useAuth, getAvatarColor, getInitials } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Eye, 
  Edit3, 
  Trash2, 
  Check, 
  Copy, 
  Share2, 
  Sparkles, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface ShareModalProps {
  list: ListModel;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ list, isOpen, onClose }) => {
  const { userProfile, user } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<'editor' | 'viewer'>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  if (!isOpen) return null;

  const currentEmail = (userProfile?.email || user?.email || '').toLowerCase();
  const isOwner = list.ownerId === user?.uid || list.ownerEmail?.toLowerCase() === currentEmail;

  // Extract shared members list
  const sharedList = Object.values(list.sharedWith || {}) as SharedMember[];

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setError('');
    setActionSuccess('');

    const targetEmail = emailInput.trim().toLowerCase();

    if (targetEmail === list.ownerEmail.toLowerCase()) {
      setError('This user is already the owner of this list.');
      return;
    }

    setLoading(true);
    try {
      await shareListWithUser(
        list,
        targetEmail,
        targetEmail.split('@')[0],
        roleInput,
        {
          email: currentEmail,
          displayName: userProfile?.displayName || user?.displayName || 'User',
        }
      );
      setEmailInput('');
      setActionSuccess(`Shared with ${targetEmail} as ${roleInput === 'editor' ? 'Editor' : 'Viewer'}`);
      setTimeout(() => setActionSuccess(''), 3500);
    } catch (err: any) {
      console.error('Error sharing list:', err);
      setError(err.message || 'Failed to share list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberEmail: string, newRole: 'editor' | 'viewer') => {
    setError('');
    try {
      await updateCollaboratorRole(
        list,
        memberEmail,
        newRole,
        {
          email: currentEmail,
          displayName: userProfile?.displayName || user?.displayName || 'User',
        }
      );
      setActionSuccess(`Updated permissions for ${memberEmail}`);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating role:', err);
      setError('Could not update permission role.');
    }
  };

  const handleRemove = async (memberEmail: string) => {
    setError('');
    try {
      await removeCollaborator(
        list,
        memberEmail,
        {
          email: currentEmail,
          displayName: userProfile?.displayName || user?.displayName || 'User',
        }
      );
      setActionSuccess(`Removed ${memberEmail} from list`);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error removing collaborator:', err);
      setError('Could not remove member.');
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?listId=${list.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleQuickAddEmail = (demoEmail: string) => {
    setEmailInput(demoEmail);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Share "{list.title}"</h3>
              <p className="text-xs text-slate-300">
                Grant specific view or edit access to collaborators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Add Collaborator Form (Enabled for Owner or existing Editors) */}
          {isOwner ? (
            <form onSubmit={handleShare} className="space-y-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Invite by Email & Set Permission
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <div className="flex gap-2">
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value as 'editor' | 'viewer')}
                    className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="editor">✏️ Can Edit (Editor)</option>
                    <option value="viewer">👁️ View Only (Viewer)</option>
                  </select>

                  <button
                    type="submit"
                    disabled={loading || !emailInput.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Invite</span>
                  </button>
                </div>
              </div>

              {/* Quick suggestions */}
              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                <span>Quick demo invite:</span>
                <button
                  type="button"
                  onClick={() => handleQuickAddEmail('alex.rivera@example.com')}
                  className="px-2 py-0.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded text-slate-700 transition"
                >
                  + alex.rivera@example.com
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddEmail('taylor.lee@example.com')}
                  className="px-2 py-0.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded text-slate-700 transition"
                >
                  + taylor.lee@example.com
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Collaborator view:</span> Only the list owner ({list.ownerEmail}) can invite or remove members. You can still share the link!
              </div>
            </div>
          )}

          {/* Permissions explanation box */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
                <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Editor Access</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Can add items, edit titles & quantities, check off tasks, and sync in real-time.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
                <Eye className="w-3.5 h-3.5 text-sky-600" />
                <span>Viewer Access</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Can see items update live across devices, but cannot modify, add, or delete items.
              </p>
            </div>
          </div>

          {/* People with access list */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Members With Access ({sharedList.length + 1})</span>
              </h4>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
              {/* Owner row */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(list.ownerEmail)} shadow-xs`}>
                    {getInitials(list.ownerName || list.ownerEmail)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{list.ownerName || list.ownerEmail.split('@')[0]}</span>
                      {list.ownerEmail.toLowerCase() === currentEmail && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">You</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{list.ownerEmail}</div>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Owner
                </span>
              </div>

              {/* Shared members rows */}
              {sharedList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No other collaborators yet. Invite someone above!
                </div>
              ) : (
                sharedList.map((member) => {
                  const isCurrentMember = member.email.toLowerCase() === currentEmail;
                  return (
                    <div
                      key={member.email}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(member.email)} shadow-xs`}>
                          {getInitials(member.name || member.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                            <span className="truncate">{member.name || member.email.split('@')[0]}</span>
                            {isCurrentMember && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium shrink-0">You</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 truncate">{member.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isOwner ? (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.email, e.target.value as 'editor' | 'viewer')}
                              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                                member.role === 'editor'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-sky-50 text-sky-700 border-sky-200'
                              }`}
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemove(member.email)}
                              title="Remove member"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                              member.role === 'editor'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            {member.role === 'editor' ? 'Editor' : 'Viewer'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Shareable Link Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-700">Direct Link to List</div>
              <div className="text-[11px] text-slate-400 truncate">
                {window.location.origin}?listId={list.id}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition flex items-center gap-1.5 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
