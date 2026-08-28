import React, { useState } from 'react';
import { ListModel } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  X,
  FolderOpen,
  Plus,
  Search,
  ShoppingCart,
  CheckSquare,
  Users,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface ViewListModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists: ListModel[];
  onSelectList: (list: ListModel) => void;
  onCreateNewList: () => void;
}

export const ViewListModal: React.FC<ViewListModalProps> = ({
  isOpen,
  onClose,
  lists,
  onSelectList,
  onCreateNewList,
}) => {
  const { activeAccent } = useTheme();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'grocery' | 'todo'>('all');

  if (!isOpen) return null;

  const filteredLists = lists.filter((l) => {
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
      (l.description && l.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'all' || l.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: activeAccent.primary }}
            >
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">View List</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a list to view tasks and items
              </p>
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

        {/* Search & Filter */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your lists..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(['all', 'grocery', 'todo'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                    filterType === type
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'grocery' ? '🛒 Grocery' : '📋 Tasks'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onCreateNewList();
              }}
              className="text-xs font-bold hover:underline flex items-center gap-1"
              style={{ color: activeAccent.primary }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New List</span>
            </button>
          </div>
        </div>

        {/* List items */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1 max-h-96">
          {filteredLists.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No lists found matching your search.
            </div>
          ) : (
            filteredLists.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  onSelectList(l);
                  onClose();
                }}
                className="w-full p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center justify-between text-left group shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${
                      l.type === 'grocery'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                    }`}
                  >
                    {l.type === 'grocery' ? '🛒' : '📋'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {l.title}
                      </span>
                      {l.isDailyFocus && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded">
                          Daily Focus
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{l.itemCount || 0} items</span>
                      <span>•</span>
                      <span className="capitalize">{l.type} list</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition shrink-0">
                  <span className="text-xs font-semibold hidden sm:inline">Open</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {lists.length} total lists
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
