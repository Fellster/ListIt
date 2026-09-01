import React, { useState, useEffect } from 'react';
import { ListModel, GROCERY_STORES } from '../types';
import { addListItem } from '../services/listService';
import { isSpecificStore } from '../utils/groceryCategorizer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import {
  X,
  Plus,
  Mic,
  MapPin,
  Clock,
  Calendar,
  FolderOpen,
  Camera,
  Sparkles
} from 'lucide-react';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists: ListModel[];
  defaultListId?: string;
  onItemAdded?: (listId: string, itemId: string) => void;
  onOpenOcr?: (listId?: string) => void;
}

export const AddToListModal: React.FC<AddToListModalProps> = ({
  isOpen,
  onClose,
  lists,
  defaultListId,
  onItemAdded,
  onOpenOcr
}) => {
  const { user, userProfile } = useAuth();
  const { activeAccent } = useTheme();

  const [selectedListId, setSelectedListId] = useState<string>('');
  
  // 1. What
  const [what, setWhat] = useState('');
  // 2. Where
  const [where, setWhere] = useState('');
  // 3. When
  const [whenDate, setWhenDate] = useState(new Date().toISOString().split('T')[0]);
  const [whenTime, setWhenTime] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<'what' | 'where' | 'whenTime' | null>(null);

  // Setup initial selected list
  useEffect(() => {
    if (isOpen) {
      if (defaultListId && lists.some((l) => l.id === defaultListId)) {
        setSelectedListId(defaultListId);
      } else if (lists.length > 0) {
        const fallback = lists.find(
          (l) => l.title.toLowerCase() === 'today' || l.title.toLowerCase() === "today's list"
        ) || lists.find((l) => l.type === 'todo') || lists[0];
        setSelectedListId(fallback.id);
      }
    }
  }, [isOpen, defaultListId, lists]);

  const {
    isListening,
    startListening,
    stopListening
  } = useSpeechRecognition((finalText) => {
    if (activeVoiceField === 'what') {
      setWhat(finalText);
    } else if (activeVoiceField === 'where') {
      setWhere(finalText);
    } else if (activeVoiceField === 'whenTime') {
      setWhenTime(finalText);
    }
    setActiveVoiceField(null);
  });

  const handleStartVoice = (field: 'what' | 'where' | 'whenTime') => {
    if (isListening && activeVoiceField === field) {
      stopListening();
      setActiveVoiceField(null);
    } else {
      setActiveVoiceField(field);
      startListening({ continuous: false });
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!what.trim()) {
      const inputEl = document.getElementById('add-to-list-what-input');
      if (inputEl) inputEl.focus();
      return;
    }
    if (!selectedListId || isSubmitting) return;
    try {
      const userMeta = {
        email: (userProfile?.email || user?.email || 'keithfell1@gmail.com').toLowerCase(),
        displayName: userProfile?.displayName || user?.displayName || 'Keith Fell'
      };

      const cleanWhere = (where.trim() && isSpecificStore(where.trim())) ? where.trim() : undefined;
      const payload = {
        title: what.trim(),
        completed: false,
        location: cleanWhere,
        store: cleanWhere,
        category: cleanWhere,
        timeScheduled: whenTime.trim() || undefined,
        dueDate: whenDate || undefined,
        isForToday: true,
      };

      const newItemId = await addListItem(selectedListId, payload, userMeta);

      if (onItemAdded) {
        onItemAdded(selectedListId, newItemId);
      }

      setWhat('');
      setWhere('');
      setWhenTime('');
      onClose();
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: activeAccent.primary }}
            >
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Add Task / Item</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Target List Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>List</span>
            </label>
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.type === 'grocery' ? '🛒' : '📋'} {l.title}
                </option>
              ))}
            </select>
          </div>

          {/* 1. What */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold"
                  style={{
                    backgroundColor: activeAccent.light,
                    color: activeAccent.text
                  }}
                >
                  1
                </span>
                <span>What</span>
              </label>
              <div className="flex items-center gap-1.5">
                {onOpenOcr && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenOcr(selectedListId);
                    }}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 transition cursor-pointer"
                    title="Take photo & OCR scan entire list"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Camera Scan</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleStartVoice('what')}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                    isListening && activeVoiceField === 'what'
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Dictate with voice"
                >
                  <Mic className="w-3 h-3" />
                  <span>{isListening && activeVoiceField === 'what' ? 'Listening...' : 'Voice'}</span>
                </button>
              </div>
            </div>

            <input
              id="add-to-list-what-input"
              type="text"
              required
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="What needs to be done..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2"
              autoFocus
            />
          </div>

          {/* 2. Where */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold"
                  style={{
                    backgroundColor: activeAccent.light,
                    color: activeAccent.text
                  }}
                >
                  2
                </span>
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Where</span>
              </label>
              <button
                type="button"
                onClick={() => handleStartVoice('where')}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                  isListening && activeVoiceField === 'where'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Dictate location"
              >
                <Mic className="w-3 h-3" />
                <span>{isListening && activeVoiceField === 'where' ? 'Listening...' : 'Voice'}</span>
              </button>
            </div>

            <input
              type="text"
              list="add-location-suggestions"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="Store, place, or location (default: Any)..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2"
            />
            <datalist id="add-location-suggestions">
              {GROCERY_STORES.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
              <option value="Home" />
              <option value="Office" />
              <option value="Online" />
            </datalist>
          </div>

          {/* 3. When */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span 
                className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold"
                style={{
                  backgroundColor: activeAccent.light,
                  color: activeAccent.text
                }}
              >
                3
              </span>
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>When</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={whenDate}
                  onChange={(e) => setWhenDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-500" />
                    <span>Time</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleStartVoice('whenTime')}
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded flex items-center gap-0.5 transition ${
                      isListening && activeVoiceField === 'whenTime'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'text-slate-400 hover:text-rose-600'
                    }`}
                    title="Dictate time"
                  >
                    <Mic className="w-2.5 h-2.5" />
                    <span>{isListening && activeVoiceField === 'whenTime' ? 'Listening...' : 'Voice'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={whenTime}
                  onChange={(e) => setWhenTime(e.target.value)}
                  placeholder="e.g. 10:00 AM, 3:30 PM"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-modal-add-task"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition hover:brightness-110 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: activeAccent.primary }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Task</span>
          </button>
        </div>
      </div>
    </div>
  );
};
