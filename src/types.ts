export type ListType = 'grocery' | 'todo' | 'general';
export type PermissionRole = 'owner' | 'editor' | 'viewer';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface CustomFactor {
  id: string;
  label: string;
  value: string;
}

export interface SharedMember {
  email: string;
  name?: string;
  role: 'editor' | 'viewer';
  addedAt: string;
  avatarColor?: string;
}

export type StandardHeadingKey = 'today' | 'grocery' | 'home' | 'other';
export type HeadingKey = StandardHeadingKey | string;

export interface CustomHeading {
  id: string; // e.g. "work", "fitness", "custom_123"
  label: string; // e.g. "Work", "Fitness", "Projects"
  icon?: string;
  color?: string;
  createdAt?: string;
}

export interface ListModel {
  id: string;
  title: string;
  description?: string;
  type: ListType;
  heading?: HeadingKey;
  color: string;
  icon: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  sharedWith: Record<string, SharedMember>; // keyed by sanitized email or uid
  memberEmails: string[];
  members: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  isDailyFocus?: boolean;
  createdAt: any;
  updatedAt: any;
  itemCount?: number;
  completedCount?: number;
}

export function getListHeading(list: ListModel): HeadingKey {
  if (list.heading) return list.heading;
  const t = (list.title || '').toLowerCase();
  if (t === 'today' || t === "today's list" || t.includes('today')) return 'today';
  if (
    list.type === 'grocery' ||
    t.includes('grocery') ||
    t.includes('market') ||
    t.includes('trader') ||
    t.includes('costco') ||
    t.includes('safeway') ||
    t.includes('target') ||
    t.includes('supermarket') ||
    t.includes('food')
  ) {
    return 'grocery';
  }
  if (
    t.includes('home') ||
    t.includes('house') ||
    t.includes('chore') ||
    t.includes('yard') ||
    t.includes('garden') ||
    t.includes('repair') ||
    t.includes('cleaning') ||
    t.includes('maintenance')
  ) {
    return 'home';
  }
  return 'other';
}

export interface ListItemModel {
  id: string;
  listId: string;
  listTitle?: string;
  title: string;
  completed: boolean;
  completedBy?: string;
  completedByName?: string;
  completedAt?: string;
  category?: string;
  store?: string;
  quantity?: number;
  unit?: string;
  estimatedPrice?: number;
  priority?: PriorityLevel;
  dueDate?: string; // YYYY-MM-DD
  isForToday?: boolean;
  order?: number;
  // Factor 1: Location ("Where to get it")
  location?: string;
  // Factor 2: Time ("Time to get it done")
  timeScheduled?: string; // HH:MM (24h or formatted)
  timeSlot?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  durationMinutes?: number;
  // Factor 3: Notes, instructions & sub-details
  notes?: string;
  // Factor 4: Additional dynamic factors (e.g. store aisle, coupon code, contact person, link)
  customFactors?: CustomFactor[];
  // Google Calendar Integration
  googleCalendarEventId?: string;
  googleCalendarEventLink?: string;
  assignedTo?: string;
  assignedToEmail?: string;
  assignedToName?: string;
  createdAt?: any;
  updatedAt?: any;
  position?: number;
}

export interface ActivityEntry {
  id: string;
  listId: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: 
    | 'create_item' 
    | 'complete_item' 
    | 'uncomplete_item' 
    | 'delete_item' 
    | 'edit_item' 
    | 'share_list' 
    | 'create_list'
    | 'completed_item'
    | 'created_item'
    | 'deleted_item'
    | 'changed_permission'
    | 'shared_list';
  itemTitle?: string;
  timestamp: any;
  details?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  theme?: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'slate' | 'teal' | 'indigo' | 'coral' | 'ocean' | 'forest';
  isDarkMode?: boolean;
  emailNotifications?: boolean;
  defaultStore?: string;
  createdAt?: any;
}

export type FontFamilyOption = 
  | 'Plus Jakarta Sans' 
  | 'Inter' 
  | 'Outfit' 
  | 'DM Sans' 
  | 'Playfair Display' 
  | 'JetBrains Mono';

export type BackgroundPatternOption = 'mesh' | 'dots' | 'grid' | 'clean' | 'warm';

export interface ThemeConfig {
  accentColor: string;
  accentName: string;
  fontFamily: FontFamilyOption;
  backgroundPattern: BackgroundPatternOption;
  isDarkMode: boolean;
  cardRounding: 'rounded' | 'square' | 'pill';
  compactDensity: boolean;
}

export const ACCENT_PALETTES = [
  { id: 'emerald', name: 'Emerald Forest', primary: '#059669', primaryHover: '#047857', light: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  { id: 'blue', name: 'Oceanic Blue', primary: '#2563eb', primaryHover: '#1d4ed8', light: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  { id: 'indigo', name: 'Royal Indigo', primary: '#4f46e5', primaryHover: '#4338ca', light: '#eef2ff', text: '#3730a3', border: '#c7d2fe' },
  { id: 'purple', name: 'Deep Violet', primary: '#7c3aed', primaryHover: '#6d28d9', light: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
  { id: 'rose', name: 'Sunset Rose', primary: '#e11d48', primaryHover: '#be123c', light: '#fff1f2', text: '#9f1239', border: '#fecdd3' },
  { id: 'amber', name: 'Warm Amber', primary: '#d97706', primaryHover: '#b45309', light: '#fffbeb', text: '#92400e', border: '#fde68a' },
  { id: 'teal', name: 'Teal Oasis', primary: '#0d9488', primaryHover: '#0f766e', light: '#f0fdfa', text: '#115e59', border: '#99f6e4' },
  { id: 'slate', name: 'Modern Slate', primary: '#475569', primaryHover: '#334155', light: '#f8fafc', text: '#1e293b', border: '#cbd5e1' },
];

export const FONT_PRESETS: { id: FontFamilyOption; name: string; category: string; description: string; sample: string }[] = [
  { id: 'Plus Jakarta Sans', name: 'Jakarta (Modern)', category: 'Modern Geometric', description: 'Contemporary high-contrast sans-serif', sample: 'Smart grocery list & daily routines' },
  { id: 'Outfit', name: 'Outfit (Clean Tech)', category: 'High Legibility', description: 'Clean modern geometric display', sample: 'Smart grocery list & daily routines' },
  { id: 'DM Sans', name: 'DM Sans (Refined)', category: 'Minimalist Sans', description: 'Geometric precision with soft curves', sample: 'Smart grocery list & daily routines' },
  { id: 'Inter', name: 'Inter (Functional)', category: 'Universal Screen', description: 'High-density UI clarity', sample: 'Smart grocery list & daily routines' },
  { id: 'Playfair Display', name: 'Playfair (Editorial)', category: 'Serif Elegance', description: 'Refined editorial serif styling', sample: 'Smart grocery list & daily routines' },
  { id: 'JetBrains Mono', name: 'JetBrains (Developer)', category: 'Monospaced Code', description: 'Clean structured monospaced layout', sample: 'Smart grocery list & daily routines' },
];

export const BACKGROUND_PRESETS: { id: BackgroundPatternOption; name: string; description: string; previewClass: string }[] = [
  { id: 'clean', name: 'Pure Minimal', description: 'Clean solid neutral background', previewClass: 'theme-bg-clean' },
  { id: 'mesh', name: 'Soft Glow Gradient', description: 'Subtle atmospheric multi-color blur', previewClass: 'theme-bg-mesh' },
  { id: 'dots', name: 'Architectural Dots', description: 'Light dotted coordinate matrix', previewClass: 'theme-bg-dots' },
  { id: 'grid', name: 'Grid Blueprint', description: 'Structured subtle blueprint grid', previewClass: 'theme-bg-grid' },
  { id: 'warm', name: 'Warm Paper Texture', description: 'Subtle warm tactile tone', previewClass: 'theme-bg-warm' },
];

export const GROCERY_CATEGORIES = [
  'Produce',
  'Dairy & Refrigerated',
  'Meat & Seafood',
  'Bakery & Bread',
  'Pantry & Grains',
  'Frozen Foods',
  'Beverages',
  'Snacks & Sweets',
  'Deli & Prepared',
  'Personal Care',
  'Household & Cleaning',
  'Pet Care',
  'Other'
] as const;

export type GroceryCategory = typeof GROCERY_CATEGORIES[number];

export const GROCERY_STORES = [
  { id: 'costco', name: 'Costco', color: 'bg-red-500 text-white' },
  { id: 'trader_joes', name: "Trader Joe's", color: 'bg-amber-600 text-white' },
  { id: 'safeway', name: 'Safeway', color: 'bg-rose-600 text-white' },
  { id: 'target', name: 'Target', color: 'bg-red-600 text-white' },
  { id: 'whole_foods', name: 'Whole Foods', color: 'bg-emerald-700 text-white' },
  { id: 'supermarket', name: 'Local Supermarket', color: 'bg-emerald-600 text-white' },
  { id: 'other', name: 'Other Store', color: 'bg-slate-600 text-white' }
];

export const LIST_COLOR_PALETTES: Record<string, { bg: string; text: string; border: string; badge: string; ring: string; lightBg: string }> = {
  emerald: {
    bg: 'bg-emerald-600',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500 dark:border-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    ring: 'focus:ring-emerald-500',
    lightBg: 'bg-emerald-50/50 dark:bg-emerald-950/20'
  },
  blue: {
    bg: 'bg-blue-600',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-500 dark:border-blue-600',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    ring: 'focus:ring-blue-500',
    lightBg: 'bg-blue-50/50 dark:bg-blue-950/20'
  },
  purple: {
    bg: 'bg-purple-600',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-500 dark:border-purple-600',
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    ring: 'focus:ring-purple-500',
    lightBg: 'bg-purple-50/50 dark:bg-purple-950/20'
  },
  amber: {
    bg: 'bg-amber-600',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500 dark:border-amber-600',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    ring: 'focus:ring-amber-500',
    lightBg: 'bg-amber-50/50 dark:bg-amber-950/20'
  },
  rose: {
    bg: 'bg-rose-600',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-500 dark:border-rose-600',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    ring: 'focus:ring-rose-500',
    lightBg: 'bg-rose-50/50 dark:bg-rose-950/20'
  },
  teal: {
    bg: 'bg-teal-600',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-500 dark:border-teal-600',
    badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    ring: 'focus:ring-teal-500',
    lightBg: 'bg-teal-50/50 dark:bg-teal-950/20'
  },
  indigo: {
    bg: 'bg-indigo-600',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-500 dark:border-indigo-600',
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    ring: 'focus:ring-indigo-500',
    lightBg: 'bg-indigo-50/50 dark:bg-indigo-950/20'
  },
  slate: {
    bg: 'bg-slate-700',
    text: 'text-slate-700 dark:text-slate-400',
    border: 'border-slate-500 dark:border-slate-600',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    ring: 'focus:ring-slate-500',
    lightBg: 'bg-slate-100/50 dark:bg-slate-800/30'
  }
};
