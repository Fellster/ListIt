import React, { useState } from 'react';
import { ListModel, PermissionRole, SharedMember } from '../types';
import { getUserPermission, updateList, deleteList } from '../services/listService';
import { useAuth, getAvatarColor, getInitials } from '../context/AuthContext';
import { 
  Users, 
  Pin, 
  MoreVertical, 
  Share2, 
  Trash2, 
  CheckCircle2, 
  Eye, 
  Edit3, 
  Shield, 
  ChevronRight,
  ShoppingCart,
  ListTodo,
  CheckSquare
} from 'lucide-react';

interface ListCardProps {
  list: ListModel;
  onSelect: (list: ListModel) => void;
  onOpenShare: (list: ListModel) => void;
}

export const ListCard: React.FC<ListCardProps> = ({ list, onSelect, onOpenShare }) => {
  const { user, userProfile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const currentUser = {
    uid: user?.uid || '',
    email: (userProfile?.email || user?.email || '').toLowerCase(),
  };

  const role: PermissionRole = getUserPermission(list, currentUser);
  const isOwner = role === 'owner';

  const total = list.itemCount || 0;
  const completed = list.completedCount || 0;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sharedMembers = Object.values(list.sharedWith || {}) as SharedMember[];

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateList(list.id, { isPinned: !list.isPinned });
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
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
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShoppingCart className="w-2.5 h-2.5" /> Grocery
          </span>
        );
      case 'todo':
        return (
          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ListTodo className="w-2.5 h-2.5" /> Tasks
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckSquare className="w-2.5 h-2.5" /> Checklist
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => onSelect(list)}
      className="group relative bg-white border border-slate-200/90 hover:border-emerald-400/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
    >
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100/80 group-hover:bg-emerald-50 flex items-center justify-center text-xl transition shrink-0 border border-slate-200/60">
              {list.icon || (list.type === 'grocery' ? '🛒' : '📝')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition line-clamp-1">
                  {list.title}
                </h3>
                {list.isPinned && (
                  <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {getTypeBadge()}
                {getRoleBadge()}
              </div>
            </div>
          </div>

          {/* Quick Actions menu */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-20 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onOpenShare(list);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Share & Permissions</span>
                </button>

                <button
                  onClick={handleTogglePin}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Pin className="w-3.5 h-3.5 text-amber-500" />
                  <span>{list.isPinned ? 'Unpin list' : 'Pin to top'}</span>
                </button>

                {isOwner && (
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete list</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {list.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 mb-3">
            {list.description}
          </p>
        )}
      </div>

      {/* Progress & Collaborators Footer */}
      <div className="pt-3 border-t border-slate-100 space-y-2.5 mt-2">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium text-[11px]">
              {total === 0
                ? 'No items yet'
                : `${completed} of ${total} completed`}
            </span>
            <span className="font-bold text-slate-700 text-[11px]">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                progressPercent === 100
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Bottom row: Members & arrow */}
        <div className="flex items-center justify-between pt-1">
          {/* Collaborator Avatars */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenShare(list);
            }}
            className="flex items-center -space-x-1.5 hover:opacity-90 transition p-0.5 rounded-lg"
            title="Manage shared access"
          >
            {/* Owner avatar */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] border-2 border-white ring-1 ring-slate-100 shadow-2xs ${getAvatarColor(
                list.ownerEmail
              )}`}
              title={`Owner: ${list.ownerName || list.ownerEmail}`}
            >
              {getInitials(list.ownerName || list.ownerEmail)}
            </div>

            {/* Collaborators avatars */}
            {sharedMembers.slice(0, 3).map((m) => (
              <div
                key={m.email}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] border-2 border-white ring-1 ring-slate-100 shadow-2xs ${getAvatarColor(
                  m.email
                )}`}
                title={`${m.name || m.email} (${m.role === 'editor' ? 'Editor' : 'Viewer'})`}
              >
                {getInitials(m.name || m.email)}
              </div>
            ))}

            {sharedMembers.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold flex items-center justify-center border-2 border-white">
                +{sharedMembers.length - 3}
              </div>
            )}

            <span className="text-[11px] text-slate-400 font-medium ml-2.5 flex items-center gap-1 hover:text-emerald-600">
              <Users className="w-3 h-3" />
              {sharedMembers.length + 1}
            </span>
          </div>

          <div className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition flex items-center text-xs font-semibold">
            <span>Open</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
