import React, { useEffect, useState } from 'react';
import { ActivityEntry } from '../types';
import { subscribeListActivity } from '../services/listService';
import { getAvatarColor, getInitials } from '../context/AuthContext';
import { 
  X, 
  Activity, 
  CheckCircle2, 
  PlusCircle, 
  Trash2, 
  UserCheck, 
  Edit, 
  Clock 
} from 'lucide-react';

interface ActivityDrawerProps {
  listId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({ listId, isOpen, onClose }) => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    if (!isOpen || !listId) return;
    const unsub = subscribeListActivity(listId, (logs) => {
      setActivities(logs);
    });
    return () => unsub();
  }, [listId, isOpen]);

  if (!isOpen) return null;

  const getActionIcon = (action: ActivityEntry['action']) => {
    switch (action) {
      case 'completed_item':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'created_item':
        return <PlusCircle className="w-4 h-4 text-indigo-600" />;
      case 'deleted_item':
        return <Trash2 className="w-4 h-4 text-rose-500" />;
      case 'shared_list':
      case 'changed_permission':
        return <UserCheck className="w-4 h-4 text-amber-500" />;
      default:
        return <Edit className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs">
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Live Activity Feed</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No activity recorded yet for this list.
            </div>
          ) : (
            activities.map((act) => (
              <div
                key={act.id}
                className="p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-xl transition flex items-start gap-2.5"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${getAvatarColor(act.userEmail)} shadow-2xs`}>
                  {getInitials(act.userName || act.userEmail)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs text-slate-800 truncate">
                      {act.userName || act.userEmail.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(act.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600">
                    <span className="shrink-0">{getActionIcon(act.action)}</span>
                    <span className="break-words leading-tight">{act.details}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400 text-center">
          Real-time Firestore synchronization active
        </div>
      </div>
    </div>
  );
};
