import React, { useState } from 'react';
import { ListType, LIST_COLOR_PALETTES } from '../types';
import { createList } from '../services/listService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  ShoppingCart, 
  CheckSquare, 
  ListChecks, 
  Sparkles, 
  FolderPlus, 
  Plus, 
  X,
  Palette
} from 'lucide-react';

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListCreated?: (listId: string) => void;
}

const TEMPLATES = [
  {
    id: 'weekly_groceries',
    title: 'Weekly Grocery Run',
    type: 'grocery' as ListType,
    color: 'emerald',
    icon: '🛒',
    description: 'Weekly household grocery essentials and fresh produce',
    items: [
      { title: 'Organic Whole Milk', category: 'Dairy & Refrigerated', quantity: 1, unit: 'gal' },
      { title: 'Cage-Free Eggs', category: 'Dairy & Refrigerated', quantity: 1, unit: 'dozen' },
      { title: 'Bananas', category: 'Produce', quantity: 1, unit: 'bunch' },
      { title: 'Baby Spinach', category: 'Produce', quantity: 1, unit: 'bag' },
      { title: 'Sourdough Bread', category: 'Bakery & Bread', quantity: 1, unit: 'loaf' },
      { title: 'Chicken Breast', category: 'Meat & Seafood', quantity: 2, unit: 'lbs' },
      { title: 'Olive Oil', category: 'Pantry & Grains', quantity: 1, unit: 'bottle' },
      { title: 'Dark Roast Coffee Beans', category: 'Beverages', quantity: 1, unit: 'bag' },
    ],
  },
  {
    id: 'daily_tasks',
    title: 'Daily Priority Tasks',
    type: 'todo' as ListType,
    color: 'indigo',
    icon: '📝',
    description: 'Key daily todos, work goals, and personal errands',
    items: [
      { title: 'Review morning emails & schedule', priority: 'medium' as const },
      { title: 'Complete high-priority project deliverable', priority: 'high' as const },
      { title: 'Sync with team & collaborators', priority: 'medium' as const },
      { title: '30-minute afternoon workout / walk', priority: 'low' as const },
    ],
  },
  {
    id: 'weekend_mealprep',
    title: 'Weekend Meal Prep',
    type: 'grocery' as ListType,
    color: 'amber',
    icon: '🥑',
    description: 'Ingredients for healthy meal preparation',
    items: [
      { title: 'Fresh Salmon Fillets', category: 'Meat & Seafood', quantity: 2, unit: 'lbs' },
      { title: 'Organic Broccoli Crowns', category: 'Produce', quantity: 3, unit: 'heads' },
      { title: 'Sweet Potatoes', category: 'Produce', quantity: 4, unit: 'pcs' },
      { title: 'Quinoa / Brown Rice', category: 'Pantry & Grains', quantity: 1, unit: 'box' },
      { title: 'Greek Yogurt Plain', category: 'Dairy & Refrigerated', quantity: 1, unit: 'tub' },
    ],
  },
  {
    id: 'house_cleaning',
    title: 'Weekend Home Reset',
    type: 'todo' as ListType,
    color: 'teal',
    icon: '🧹',
    description: 'Weekly cleaning and organizing checklist',
    items: [
      { title: 'Vacuum living room and bedrooms', priority: 'medium' as const },
      { title: 'Wipe & sanitize kitchen counters', priority: 'high' as const },
      { title: 'Wash bed linens and towels', priority: 'medium' as const },
      { title: 'Take out recycling and compost', priority: 'low' as const },
    ],
  },
];

const ICONS = ['🛒', '📝', '🥑', '🥦', '🍞', '🧹', '🎯', '🚀', '🏡', '🎒', '☕', '🎉', '📦', '💡'];

export const CreateListModal: React.FC<CreateListModalProps> = ({ isOpen, onClose, onListCreated }) => {
  const { user, userProfile } = useAuth();
  const { activeAccent } = useTheme();
  const [activeTab, setActiveTab] = useState<'custom' | 'templates'>('custom');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ListType>('grocery');
  const [color, setColor] = useState('emerald');
  const [icon, setIcon] = useState('🛒');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError('');
    setLoading(true);

    try {
      const activeUid = user?.uid || userProfile?.uid || 'user_keithfell1_gmail_com';
      const activeEmail = (userProfile?.email || user?.email || 'keithfell1@gmail.com').toLowerCase();
      const activeDisplayName = userProfile?.displayName || user?.displayName || 'Keith Fell';

      const listId = await createList(
        {
          title: title.trim(),
          description: description.trim(),
          type,
          color,
          icon,
        },
        {
          uid: activeUid,
          email: activeEmail,
          displayName: activeDisplayName,
        }
      );

      // Reset
      setTitle('');
      setDescription('');
      onClose();
      if (onListCreated) onListCreated(listId);
    } catch (err: any) {
      console.error('Error creating list:', err);
      setError(err.message || 'Failed to create list.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: typeof TEMPLATES[0]) => {
    setError('');
    setLoading(true);

    try {
      const activeUid = user?.uid || userProfile?.uid || 'user_keithfell1_gmail_com';
      const activeEmail = (userProfile?.email || user?.email || 'keithfell1@gmail.com').toLowerCase();
      const activeDisplayName = userProfile?.displayName || user?.displayName || 'Keith Fell';

      const listId = await createList(
        {
          title: template.title,
          description: template.description,
          type: template.type,
          color: template.color,
          icon: template.icon,
          initialItems: template.items,
        },
        {
          uid: activeUid,
          email: activeEmail,
          displayName: activeDisplayName,
        }
      );

      onClose();
      if (onListCreated) onListCreated(listId);
    } catch (err: any) {
      console.error('Error applying template:', err);
      setError(err.message || 'Failed to create list template.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div 
          className="p-5 text-white flex items-center justify-between"
          style={{ backgroundColor: activeAccent.primary }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-lg">
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Create New List</h3>
              <p className="text-xs text-white/80">
                Shared grocery lists, task boards, or general checklists
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className="pb-3 font-semibold text-xs transition border-b-2"
            style={{
              borderColor: activeTab === 'custom' ? activeAccent.primary : 'transparent',
              color: activeTab === 'custom' ? activeAccent.text : undefined,
            }}
          >
            Custom List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className="pb-3 font-semibold text-xs transition border-b-2 flex items-center gap-1.5"
            style={{
              borderColor: activeTab === 'templates' ? activeAccent.primary : 'transparent',
              color: activeTab === 'templates' ? activeAccent.text : undefined,
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Starter Templates</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          {activeTab === 'custom' ? (
            <form onSubmit={handleCreateCustom} className="space-y-4">
              {/* List Type selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  List Type
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setType('grocery');
                      setIcon('🛒');
                      setColor('emerald');
                    }}
                    className="p-3 rounded-xl border text-left transition flex flex-col gap-1.5"
                    style={{
                      borderColor: type === 'grocery' ? activeAccent.primary : undefined,
                      backgroundColor: type === 'grocery' ? activeAccent.light : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🛒</span>
                      <span 
                        className="text-[10px] font-bold uppercase"
                        style={{ color: type === 'grocery' ? activeAccent.text : undefined }}
                      >
                        Aisle Auto-Sort
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">Grocery List</div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      Categories, units & pantry aisles
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setType('todo');
                      setIcon('📝');
                      setColor('indigo');
                    }}
                    className="p-3 rounded-xl border text-left transition flex flex-col gap-1.5"
                    style={{
                      borderColor: type === 'todo' ? activeAccent.primary : undefined,
                      backgroundColor: type === 'todo' ? activeAccent.light : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">📝</span>
                      <span 
                        className="text-[10px] font-bold uppercase"
                        style={{ color: type === 'todo' ? activeAccent.text : undefined }}
                      >
                        Priorities
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">To-Do Tasks</div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      Due dates, priorities & assignees
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setType('general');
                      setIcon('📋');
                      setColor('violet');
                    }}
                    className="p-3 rounded-xl border text-left transition flex flex-col gap-1.5"
                    style={{
                      borderColor: type === 'general' ? activeAccent.primary : undefined,
                      backgroundColor: type === 'general' ? activeAccent.light : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">📋</span>
                      <span 
                        className="text-[10px] font-bold uppercase"
                        style={{ color: type === 'general' ? activeAccent.text : undefined }}
                      >
                        Checklist
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">General List</div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      Packing, inventory & ideas
                    </div>
                  </button>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  List Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === 'grocery' ? 'e.g. Trader Joe’s Weekly Run' : 'e.g. Daily Top Priorities'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition"
                />
              </div>

              {/* Description input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Note / Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Shared with family for weekend trip"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition"
                />
              </div>

              {/* Color & Icon Selector */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Theme Color
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {Object.entries(LIST_COLOR_PALETTES).map(([palId, pal]) => (
                      <button
                        key={palId}
                        type="button"
                        onClick={() => setColor(palId)}
                        className={`w-7 h-7 rounded-full ${pal.bg} transition transform flex items-center justify-center cursor-pointer ${
                          color === palId ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Icon Emoji
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className="w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition"
                        style={{
                          borderColor: icon === emoji ? activeAccent.primary : undefined,
                          backgroundColor: icon === emoji ? activeAccent.light : undefined,
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="w-full py-3 px-4 text-white font-medium rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: activeAccent.primary }}
                >
                  <Plus className="w-4 h-4" />
                  <span>{loading ? 'Creating List...' : 'Create List'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Pick a ready-to-use template pre-filled with items. You can customize, rename, and share it immediately.
              </p>
              <div className="space-y-2.5">
                {TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 rounded-2xl transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                        {tmpl.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white transition flex items-center gap-2 truncate">
                          <span>{tmpl.title}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                            {tmpl.items.length} items
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{tmpl.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUseTemplate(tmpl)}
                      disabled={loading}
                      className="px-3.5 py-2 text-white text-xs font-semibold rounded-xl shadow-xs transition shrink-0 hover:brightness-110 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: activeAccent.primary }}
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
