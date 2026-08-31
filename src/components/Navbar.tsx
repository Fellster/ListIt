import React, { useState } from 'react';
import { useAuth, getAvatarColor, getInitials } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCalendar } from '../context/CalendarContext';
import { 
  Plus, 
  ShoppingCart, 
  Home, 
  FolderOpen, 
  Calendar, 
  CheckSquare, 
  Moon, 
  Sun, 
  Palette, 
  ChevronDown, 
  Users, 
  LogOut, 
  LogIn,
  Check,
  X
} from 'lucide-react';

export type ActiveNavKey = 'today' | 'grocery' | 'home' | 'other' | 'calendar';

interface NavbarProps {
  activeNav: ActiveNavKey;
  onNavigate: (key: ActiveNavKey) => void;
  onQuickCreateList: (title: string, heading?: ActiveNavKey) => Promise<void> | void;
  onOpenAuth: () => void;
  onOpenThemeModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeNav,
  onNavigate,
  onQuickCreateList,
  onOpenAuth,
  onOpenThemeModal
}) => {
  const { user, userProfile, logout, signInAsDemoUser } = useAuth();
  const { theme, updateTheme, activeAccent } = useTheme();
  const { isConnected: isCalendarConnected } = useCalendar();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentEmail = userProfile?.email || user?.email || '';
  const currentName = userProfile?.displayName || user?.displayName || 'Keith Fell';

  const getHeadingLabel = (navKey: ActiveNavKey) => {
    switch (navKey) {
      case 'today':
        return 'Today';
      case 'grocery':
        return 'Grocery';
      case 'home':
        return 'Home';
      case 'other':
        return 'Other';
      default:
        return '';
    }
  };

  const getPlaceholder = (navKey: ActiveNavKey) => {
    switch (navKey) {
      case 'today':
        return 'Enter new Today list title (e.g. Daily Errands, Morning Routine)...';
      case 'grocery':
        return "Enter new Grocery list title (e.g. Costco, Trader Joe's, Target)...";
      case 'home':
        return 'Enter new Home list title (e.g. Yard Work, Cleaning, Maintenance)...';
      case 'other':
        return 'Enter new list title (e.g. Project X, Packing, Books)...';
      default:
        return 'Enter new list title...';
    }
  };

  const handleSwitchDemo = async (name: string, email: string) => {
    setProfileMenuOpen(false);
    await signInAsDemoUser(name, email);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onQuickCreateList(newListTitle.trim(), activeNav);
      setNewListTitle('');
      setIsCreatingList(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 transition-colors shadow-2xs">
      {/* Top Branding & Tools Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigate('today')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white shadow-xs font-black text-lg transition-transform group-hover:scale-105"
            style={{ backgroundColor: activeAccent.primary }}
          >
            ✓
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">
                ListIt
              </span>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 hidden sm:flex border"
                style={{ 
                  backgroundColor: activeAccent.light, 
                  color: activeAccent.text, 
                  borderColor: activeAccent.border 
                }}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full animate-pulse" 
                  style={{ backgroundColor: activeAccent.primary }}
                />
                Live Sync
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons & Profile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Customization / Theme Studio Button */}
          <button
            type="button"
            onClick={onOpenThemeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition border border-slate-200/80 dark:border-slate-700"
            title="Customize theme, colors and styling"
          >
            <Palette className="w-3.5 h-3.5" style={{ color: activeAccent.primary }} />
            <span className="hidden md:inline">Theme</span>
          </button>

          {/* Quick Dark Mode Toggle */}
          <button
            type="button"
            onClick={() => updateTheme({ isDarkMode: !theme.isDarkMode })}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition border border-slate-200/60 dark:border-slate-700"
            title={theme.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme.isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* User Account / Profile Menu */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1.5 pl-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 transition"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${getAvatarColor(
                    currentEmail || currentName
                  )} shadow-2xs text-white`}
                >
                  {getInitials(currentName || currentEmail)}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-bold text-slate-800 dark:text-white leading-tight truncate max-w-[100px]">
                    {currentName}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setProfileMenuOpen(false)}
                >
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700 mb-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{currentName}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentEmail}</div>
                  </div>

                  {/* Multi-Persona Quick Switcher */}
                  <div className="p-2 text-slate-600 dark:text-slate-300">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Switch Active Profile</span>
                      <Users className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleSwitchDemo('Keith Fell', 'keithfell1@gmail.com')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                          currentEmail === 'keithfell1@gmail.com'
                            ? 'font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                        style={currentEmail === 'keithfell1@gmail.com' ? { backgroundColor: activeAccent.light, color: activeAccent.text } : {}}
                      >
                        <span>Keith (KeithFell1@gmail.com)</span>
                        {currentEmail === 'keithfell1@gmail.com' && <Check className="w-3.5 h-3.5" style={{ color: activeAccent.primary }} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchDemo('Alex Rivera', 'alex.rivera@example.com')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                          currentEmail === 'alex.rivera@example.com'
                            ? 'font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                        style={currentEmail === 'alex.rivera@example.com' ? { backgroundColor: activeAccent.light, color: activeAccent.text } : {}}
                      >
                        <span>Alex (Collaborator)</span>
                        {currentEmail === 'alex.rivera@example.com' && <Check className="w-3.5 h-3.5" style={{ color: activeAccent.primary }} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchDemo('Taylor Lee', 'taylor.lee@example.com')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                          currentEmail === 'taylor.lee@example.com'
                            ? 'font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                        style={currentEmail === 'taylor.lee@example.com' ? { backgroundColor: activeAccent.light, color: activeAccent.text } : {}}
                      >
                        <span>Taylor (Family/Shared)</span>
                        {currentEmail === 'taylor.lee@example.com' && <Check className="w-3.5 h-3.5" style={{ color: activeAccent.primary }} />}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP LINE: 5 Buttons (1. Today, 2. Grocery, 3. Home, 4. Other, 5. Calendar) */}
      <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/90 px-3 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3 overflow-x-auto no-scrollbar">
          {/* 1. Today */}
          <button
            type="button"
            id="nav-btn-today"
            onClick={() => onNavigate('today')}
            className={`flex-1 min-w-[70px] sm:min-w-[100px] h-10 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shadow-2xs ${
              activeNav === 'today'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
            }`}
            style={activeNav === 'today' ? { borderColor: activeAccent.primary } : {}}
          >
            <CheckSquare 
              className="w-4 h-4" 
              style={activeNav === 'today' ? { color: activeAccent.primary } : {}}
            />
            <span>Today</span>
          </button>

          {/* 2. Grocery */}
          <button
            type="button"
            id="nav-btn-grocery"
            onClick={() => onNavigate('grocery')}
            className={`flex-1 min-w-[70px] sm:min-w-[100px] h-10 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shadow-2xs ${
              activeNav === 'grocery'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
            }`}
            style={activeNav === 'grocery' ? { borderColor: activeAccent.primary } : {}}
          >
            <ShoppingCart 
              className="w-4 h-4" 
              style={activeNav === 'grocery' ? { color: activeAccent.primary } : {}}
            />
            <span>Grocery</span>
          </button>

          {/* 3. Home */}
          <button
            type="button"
            id="nav-btn-home"
            onClick={() => onNavigate('home')}
            className={`flex-1 min-w-[70px] sm:min-w-[100px] h-10 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shadow-2xs ${
              activeNav === 'home'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
            }`}
            style={activeNav === 'home' ? { borderColor: activeAccent.primary } : {}}
          >
            <Home 
              className="w-4 h-4" 
              style={activeNav === 'home' ? { color: activeAccent.primary } : {}}
            />
            <span>Home</span>
          </button>

          {/* 4. Other */}
          <button
            type="button"
            id="nav-btn-other"
            onClick={() => onNavigate('other')}
            className={`flex-1 min-w-[70px] sm:min-w-[100px] h-10 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shadow-2xs ${
              activeNav === 'other'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
            }`}
            style={activeNav === 'other' ? { borderColor: activeAccent.primary } : {}}
          >
            <FolderOpen 
              className="w-4 h-4" 
              style={activeNav === 'other' ? { color: activeAccent.primary } : {}}
            />
            <span>Other</span>
          </button>

          {/* 5. Calendar */}
          <button
            type="button"
            id="nav-btn-calendar"
            onClick={() => onNavigate('calendar')}
            className={`flex-1 min-w-[70px] sm:min-w-[100px] h-10 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shadow-2xs ${
              activeNav === 'calendar'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
            }`}
            style={activeNav === 'calendar' ? { borderColor: activeAccent.primary } : {}}
          >
            <Calendar 
              className="w-4 h-4" 
              style={activeNav === 'calendar' ? { color: activeAccent.primary } : {}}
            />
            <span>Calendar</span>
            {isCalendarConnected && (
              <span 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ backgroundColor: activeAccent.primary }}
              />
            )}
          </button>
        </div>
      </div>

      {/* SECOND LINE: Exactly 1 Button (New List) or Single-Line Title Prompt */}
      <div className="border-t border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          {!isCreatingList ? (
            /* Single "New List" Button */
            <button
              type="button"
              id="btn-new-list"
              onClick={() => setIsCreatingList(true)}
              className="w-full sm:w-80 h-10 px-4 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition flex items-center justify-center gap-2 whitespace-nowrap hover:brightness-110 active:brightness-95"
              style={{ backgroundColor: activeAccent.primary }}
            >
              <Plus className="w-4 h-4" />
              <span>
                {activeNav === 'today'
                  ? 'New Today List'
                  : activeNav === 'grocery'
                  ? 'New Grocery List'
                  : activeNav === 'home'
                  ? 'New Home List'
                  : 'New List'}
              </span>
            </button>
          ) : (
            /* Single-Line List Title Creation Form */
            <form 
              onSubmit={handleCreateSubmit} 
              className="flex items-center gap-2 w-full max-w-xl mx-auto animate-in fade-in duration-200"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  autoFocus
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder={getPlaceholder(activeNav)}
                  className="w-full h-10 pl-3.5 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition"
                  style={{ borderColor: newListTitle.trim() ? activeAccent.primary : undefined }}
                />
              </div>

              <button
                type="submit"
                disabled={!newListTitle.trim() || isSubmitting}
                className="h-10 px-4 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs hover:brightness-110"
                style={{ backgroundColor: activeAccent.primary }}
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating...' : 'Start List'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCreatingList(false);
                  setNewListTitle('');
                }}
                className="h-10 w-10 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition shrink-0"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
};
