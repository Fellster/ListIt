import React, { useState } from 'react';
import { ListModel, ListItemModel, HeadingKey } from '../types';
import { ListCard } from './ListCard';
import { useTheme } from '../context/ThemeContext';
import { useCustomHeadings } from '../context/CustomHeadingsContext';
import { 
  ShoppingCart, 
  Home, 
  FolderOpen, 
  CalendarCheck, 
  Plus, 
  Search, 
  Trash2,
  Edit2,
  Check,
  Folder
} from 'lucide-react';

interface HeadingDirectoryViewProps {
  heading: HeadingKey;
  headingLabel?: string;
  lists: ListModel[];
  allLists: ListModel[];
  onSelectList: (list: ListModel) => void;
  onSelectItem: (item: ListItemModel, list: ListModel) => void;
  onOpenShare: (list: ListModel) => void;
  onCreateList: (title: string, heading: HeadingKey) => void;
  onOpenOcr?: (listId: string) => void;
  onDeleteCustomHeading?: (id: string) => void;
  loading?: boolean;
}

export const HeadingDirectoryView: React.FC<HeadingDirectoryViewProps> = ({
  heading,
  headingLabel,
  lists,
  allLists,
  onSelectList,
  onSelectItem,
  onOpenShare,
  onCreateList,
  onOpenOcr,
  onDeleteCustomHeading,
  loading = false,
}) => {
  const { activeAccent } = useTheme();
  const { customHeadings, removeCustomHeading, renameCustomHeading } = useCustomHeadings();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const [isRenamingHeading, setIsRenamingHeading] = useState(false);
  const [headingRenameInput, setHeadingRenameInput] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const customHeadingObj = customHeadings.find((h) => h.id === heading);
  const isCustomHeading = !!customHeadingObj;

  const getHeadingConfig = (h: HeadingKey) => {
    switch (h) {
      case 'grocery':
        return {
          title: 'Grocery Lists',
          singularTitle: 'Grocery List',
          icon: <ShoppingCart className="w-5 h-5" style={{ color: activeAccent.primary }} />,
          placeholder: "e.g. Costco, Trader Joe's, Target Groceries, Farmers Market",
          description: 'Shopping lists tagged by store with aisle grouping and item checkoffs',
          emptyMessage: 'No grocery lists yet',
          emptyPrompt: 'Create your first grocery list for Costco, Trader Joe’s, or local supermarkets.',
        };
      case 'home':
        return {
          title: 'Home Lists',
          singularTitle: 'Home List',
          icon: <Home className="w-5 h-5 text-amber-500" />,
          placeholder: 'e.g. Yard Work, Home Maintenance, Spring Cleaning, Kitchen Remodel',
          description: 'Household chores, maintenance tasks, repairs, and home improvements',
          emptyMessage: 'No home lists yet',
          emptyPrompt: 'Create your first home list for chores, repairs, organization, or garden work.',
        };
      case 'today':
        return {
          title: 'Today Lists',
          singularTitle: 'Today List',
          icon: <CalendarCheck className="w-5 h-5" style={{ color: activeAccent.primary }} />,
          placeholder: 'e.g. Today Priorities, Morning Errands, Work Tasks Today',
          description: 'Custom task lists and daily routines scheduled for today',
          emptyMessage: 'No custom today lists yet',
          emptyPrompt: "Create a focused list for today's errands, routines, or priority goals.",
        };
      case 'other':
        return {
          title: 'Other Lists',
          singularTitle: 'List',
          icon: <FolderOpen className="w-5 h-5 text-indigo-500" />,
          placeholder: 'e.g. Vacation Packing, Books to Read, Project Ideas, Gifts',
          description: 'Custom checklists, projects, personal notes, and general lists',
          emptyMessage: 'No other lists yet',
          emptyPrompt: 'Create a custom list for projects, packing, reading, or notes.',
        };
      default: {
        const display = headingLabel || customHeadingObj?.label || (typeof h === 'string' ? h : 'Custom');
        return {
          title: `${display} Lists`,
          singularTitle: `${display} List`,
          icon: <Folder className="w-5 h-5" style={{ color: activeAccent.primary }} />,
          placeholder: `e.g. New ${display} Checklist, Priority Items, Project Plans...`,
          description: `Custom ${display} lists, checklists, and projects`,
          emptyMessage: `No ${display.toLowerCase()} lists yet`,
          emptyPrompt: `Create your first list under ${display}.`,
        };
      }
    }
  };

  const config = getHeadingConfig(heading);

  const filteredLists = lists.filter((list) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      list.title.toLowerCase().includes(q) ||
      (list.description && list.description.toLowerCase().includes(q))
    );
  });

  const totalItems = lists.reduce((acc, l) => acc + (l.itemCount || 0), 0);

  const handleInlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTitle.trim()) return;
    onCreateList(inlineTitle.trim(), heading);
    setInlineTitle('');
    setIsAddingInline(false);
  };

  const handleHeadingRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headingRenameInput.trim()) return;
    renameCustomHeading(heading, headingRenameInput.trim());
    setIsRenamingHeading(false);
  };

  return (
    <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-5 flex-1">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs shrink-0">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {!isRenamingHeading ? (
                <>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {config.title}
                  </h1>
                  {isCustomHeading && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeadingRenameInput(customHeadingObj?.label || '');
                        setIsRenamingHeading(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Rename this heading"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              ) : (
                <form onSubmit={handleHeadingRenameSubmit} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    value={headingRenameInput}
                    onChange={(e) => setHeadingRenameInput(e.target.value)}
                    className="px-2.5 py-1 text-base font-extrabold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700 transition"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRenamingHeading(false)}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </form>
              )}

              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {lists.length} {lists.length === 1 ? 'list' : 'lists'}
                {totalItems > 0 && ` • ${totalItems} items`}
              </span>

              {isCustomHeading && onDeleteCustomHeading && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:underline ml-1 flex items-center gap-1 cursor-pointer"
                  title="Delete this custom list"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete List</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block mt-0.5">
              {config.description}
            </p>
          </div>
        </div>

        {/* Controls: Search + Add List Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}...`}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddingInline(true)}
            className="px-3.5 py-1.5 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap hover:brightness-110 active:scale-95 cursor-pointer"
            style={{ backgroundColor: activeAccent.primary }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add {config.singularTitle}</span>
          </button>
        </div>
      </div>

      {/* Inline Create Form */}
      {isAddingInline && (
        <form
          onSubmit={handleInlineSubmit}
          className="p-4 bg-white dark:bg-slate-900 border-2 rounded-2xl shadow-md animate-in fade-in zoom-in-98 duration-150 space-y-3"
          style={{ borderColor: activeAccent.primary }}
        >
          <div className="flex items-center justify-between">
            <span 
              className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: activeAccent.text }}
            >
              <Plus className="w-3.5 h-3.5" style={{ color: activeAccent.primary }} />
              <span>Create New {config.singularTitle}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAddingInline(false);
                setInlineTitle('');
              }}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={inlineTitle}
              onChange={(e) => setInlineTitle(e.target.value)}
              placeholder={config.placeholder}
              className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2"
            />
            <button
              type="submit"
              className="px-4 py-2 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer hover:brightness-110 active:scale-95"
              style={{ backgroundColor: activeAccent.primary }}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create</span>
            </button>
          </div>
        </form>
      )}

      {/* Grid of List Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="py-12 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl text-center p-8 space-y-4 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
            {config.icon}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {searchQuery ? `No matching ${config.title.toLowerCase()}` : config.emptyMessage}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? 'Try a different search term or clear the filter.'
                : config.emptyPrompt}
            </p>
          </div>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setIsAddingInline(true)}
              className="px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5 hover:brightness-110 active:scale-95 cursor-pointer"
              style={{ backgroundColor: activeAccent.primary }}
            >
              <Plus className="w-4 h-4" />
              <span>Create {config.singularTitle}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredLists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              allLists={allLists}
              onSelectItem={(item, l) => onSelectItem(item, l)}
              onSelect={(l) => onSelectList(l)}
              onOpenShare={(l) => onOpenShare(l)}
              onOpenOcr={onOpenOcr}
            />
          ))}
        </div>
      )}

      {/* Delete Heading Confirmation Modal */}
      {isConfirmingDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsConfirmingDelete(false)}
        >
          <div 
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Delete "{customHeadingObj?.label || 'List'}" list?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This will delete this custom list from your navigation. Any existing lists will be kept safely in "Other".
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteCustomHeading) {
                    onDeleteCustomHeading(heading);
                  }
                  setIsConfirmingDelete(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete List</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
