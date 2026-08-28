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

export interface ListModel {
  id: string;
  title: string;
  description?: string;
  type: ListType;
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
  quantity?: number;
  unit?: string;
  estimatedPrice?: number;
  priority?: PriorityLevel;
  dueDate?: string; // YYYY-MM-DD
  isForToday?: boolean;
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
  order?: number;
  createdAt: any;
  updatedAt?: any;
}

export interface ActivityEntry {
  id: string;
  listId: string;
  userEmail: string;
  userName: string;
  action: 'created_item' | 'completed_item' | 'uncompleted_item' | 'deleted_item' | 'updated_item' | 'shared_list' | 'changed_permission' | 'removed_member';
  details: string;
  timestamp: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  theme?: ThemeConfig;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
  colorId?: string;
  status?: string;
}

// Customization & Theme Types
export type FontFamilyOption = 
  | 'Plus Jakarta Sans'
  | 'Inter'
  | 'Outfit'
  | 'DM Sans'
  | 'Space Grotesk'
  | 'Playfair Display'
  | 'JetBrains Mono'
  | 'Merriweather';

export type BackgroundPatternOption =
  | 'clean'
  | 'grid'
  | 'dots'
  | 'mesh'
  | 'paper'
  | 'gradient'
  | 'blueprint'
  | 'dark-obsidian';

export interface ThemeConfig {
  accentColor: string; // hex or preset id
  accentName: string;
  fontFamily: FontFamilyOption;
  backgroundPattern: BackgroundPatternOption;
  isDarkMode: boolean;
  cardRounding: 'subtle' | 'rounded' | 'smooth' | 'full';
  compactDensity: boolean;
}

export const FONT_PRESETS: { id: FontFamilyOption; name: string; category: string; description: string; sample: string }[] = [
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans', category: 'Modern Geometric', description: 'Clean, professional & ultra-legible', sample: 'Smart task management' },
  { id: 'Inter', name: 'Inter', category: 'Neutral Sans', description: 'The gold standard UI typeface', sample: 'Precise grocery lists' },
  { id: 'Outfit', name: 'Outfit', category: 'Modern Friendly', description: 'Warm, rounded geometric display', sample: 'Today’s daily focus' },
  { id: 'DM Sans', name: 'DM Sans', category: 'Geometric Sans', description: 'Refined, highly readable at all sizes', sample: 'Collaborate in real time' },
  { id: 'Space Grotesk', name: 'Space Grotesk', category: 'Tech Monospace Feel', description: 'Bold and tech-forward character', sample: 'Scheduled 3:30 PM' },
  { id: 'Playfair Display', name: 'Playfair Display', category: 'Editorial Serif', description: 'Elegant, distinguished and premium', sample: 'Artisanal Bakery & Produce' },
  { id: 'JetBrains Mono', name: 'JetBrains Mono', category: 'Developer Monospace', description: 'Crisp, structured tabular alignment', sample: 'Priority: High · Trader Joes' },
  { id: 'Merriweather', name: 'Merriweather', category: 'Warm Book Serif', description: 'Gentle on the eyes, literary style', sample: 'Daily journal & errands' }
];

export const ACCENT_PALETTES = [
  { id: 'emerald', name: 'Emerald Sage', primary: '#059669', primaryHover: '#047857', light: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  { id: 'indigo', name: 'Royal Indigo', primary: '#4f46e5', primaryHover: '#4338ca', light: '#eef2ff', text: '#3730a3', border: '#c7d2fe' },
  { id: 'violet', name: 'Velvet Violet', primary: '#7c3aed', primaryHover: '#6d28d9', light: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
  { id: 'rose', name: 'Sunset Rose', primary: '#e11d48', primaryHover: '#be123c', light: '#fff1f2', text: '#9f1239', border: '#fecdd3' },
  { id: 'amber', name: 'Warm Amber', primary: '#d97706', primaryHover: '#b45309', light: '#fffbeb', text: '#92400e', border: '#fde68a' },
  { id: 'sky', name: 'Ocean Cyan', primary: '#0284c7', primaryHover: '#0369a1', light: '#f0f9ff', text: '#075985', border: '#bae6fd' },
  { id: 'teal', name: 'Nordic Teal', primary: '#0d9488', primaryHover: '#0f766e', light: '#f0fdfa', text: '#115e59', border: '#99f6e4' },
  { id: 'slate', name: 'Obsidian Minimal', primary: '#334155', primaryHover: '#1e293b', light: '#f8fafc', text: '#0f172a', border: '#cbd5e1' },
];

export const BACKGROUND_PRESETS: { id: BackgroundPatternOption; name: string; previewClass: string; description: string }[] = [
  { id: 'clean', name: 'Clean Solid Minimal', previewClass: 'bg-slate-50', description: 'Clean off-white canvas with maximum focus' },
  { id: 'dots', name: 'Polite Dot Matrix', previewClass: 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] bg-slate-50', description: 'Subtle engineering dot pattern' },
  { id: 'grid', name: 'Architect Blueprint', previewClass: 'bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px] bg-slate-50', description: 'Geometric structural grid lines' },
  { id: 'mesh', name: 'Aurora Mesh Glow', previewClass: 'bg-gradient-to-tr from-slate-50 via-emerald-50/40 to-teal-50/30', description: 'Gentle, modern ambient pastel gradient' },
  { id: 'paper', name: 'Warm Textured Paper', previewClass: 'bg-[#faf8f5]', description: 'Soft cream tone with high-comfort reading' },
  { id: 'gradient', name: 'Sunset Horizon Soft', previewClass: 'bg-gradient-to-b from-amber-50/30 via-slate-50 to-rose-50/20', description: 'Warm subtle transitions across sections' },
  { id: 'dark-obsidian', name: 'Dark Mode Obsidian', previewClass: 'bg-slate-950 text-slate-100', description: 'Deep contrast dark theme for low light' },
];

export const GROCERY_CATEGORIES = [
  'Produce',
  'Dairy & Refrigerated',
  'Meat & Seafood',
  'Bakery & Bread',
  'Pantry & Grains',
  'Canned & Jarred',
  'Frozen Foods',
  'Snacks & Treats',
  'Beverages',
  'Household & Cleaning',
  'Personal Care',
  'Other'
] as const;

export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number];

export const LIST_COLOR_PALETTES = [
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-300', lightBg: 'bg-emerald-50' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', text: 'text-indigo-700', border: 'border-indigo-300', lightBg: 'bg-indigo-50' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-300', lightBg: 'bg-amber-50' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-300', lightBg: 'bg-rose-50' },
  { id: 'violet', label: 'Violet', bg: 'bg-violet-500', text: 'text-violet-700', border: 'border-violet-300', lightBg: 'bg-violet-50' },
  { id: 'sky', label: 'Sky Blue', bg: 'bg-sky-500', text: 'text-sky-700', border: 'border-sky-300', lightBg: 'bg-sky-50' },
  { id: 'teal', label: 'Teal', bg: 'bg-teal-500', text: 'text-teal-700', border: 'border-teal-300', lightBg: 'bg-teal-50' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-300', lightBg: 'bg-orange-50' },
];
