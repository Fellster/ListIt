import React, { useState } from 'react';
import { useAuth, getAvatarColor, getInitials } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCalendar } from '../context/CalendarContext';
import { 
  Plus, 
  Sparkles, 
  Users, 
  LogIn, 
  LogOut, 
  UserCheck, 
  ChevronDown, 
  Shield, 
  RefreshCw,
  Share2,
  Smartphone,
  Palette,
  Calendar,
  CheckSquare,
  FolderOpen,
  Moon,
  Sun,
  ListPlus
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'today' | 'lists' | 'calendar';
  onSelectTab: (tab: 'today' | 'lists' | 'calendar') => void;
  onOpenCreate: () => void;
  onOpenAddToList?: () => void;
  onOpenViewList?: () => void;
  onOpenAuth: () => void;
  onOpenThemeModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentTab,
  onSelectTab,
  onOpenCreate, 
  onOpenAddToList,
  onOpenViewList,
  onOpenAuth,
  onOpenThemeModal
}) => {
  const { user, userProfile, logout, signInAsDemoUser } = useAuth();
  const { theme, updateTheme, activeAccent } = useTheme();
  const { isConnected: isCalendarConnected } = useCalendar();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const currentEmail = userProfile?.email || user?.email || '';
  const currentName = userProfile?.displayName || user?.displayName || 'Guest User';

  const handleSwitchDemo = async (name: string, email: string) => {
    setProfileMenuOpen(false);
    await signInAsDemoUser(name, email);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Navigation */}
        <div className="flex items-center gap-6">
          <div 
            onClick={() => onSelectTab('today')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs font-black text-lg transition-transform group-hover:scale-105"
              style={{ backgroundColor: activeAccent.primary }}
            >
              ✓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                  ListIt
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 rounded-full flex items-center gap-1 hidden sm:flex">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
            </div>
          </div>

          {/* Primary View Switcher Navigation: Today, All Lists, Calendar */}
          <nav className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => onSelectTab('today')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
                currentTab === 'today'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" style={{ color: currentTab === 'today' ? activeAccent.primary : undefined }} />
              <span>Today</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('lists')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
                currentTab === 'lists'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" style={{ color: currentTab === 'lists' ? activeAccent.primary : undefined }} />
              <span>All Lists</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('calendar')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition relative ${
                currentTab === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Calendar</span>
              {isCalendarConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          </nav>
        </div>

        {/* Action buttons & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Customization / Theme Studio Button */}
          <button
            type="button"
            onClick={onOpenThemeModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition border border-slate-200/80 dark:border-slate-700"
            title="Customize colors, fonts & backgrounds"
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

          {/* User Account / Multi-User Switcher Menu */}
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
                  <div className="text-[10px] text-slate-400 truncate max-w-[100px]">
                    {currentEmail}
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
                      <span>Switch Active User</span>
                      <Users className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleSwitchDemo('Keith Fell', 'keithfell1@gmail.com')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                          currentEmail === 'keithfell1@gmail.com'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>Keith (KeithFell1@gmail.com)</span>
                        {currentEmail === 'keithfell1@gmail.com' && <span className="text-[10px]">✓</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchDemo('Alex Rivera', 'alex.rivera@example.com')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                          currentEmail === 'alex.rivera@example.com'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>Alex (Collaborator)</span>
                        {currentEmail === 'alex.rivera@example.com' && <span className="text-[10px]">✓</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchDemo('Taylor Lee', 'taylor.lee@example.com')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                          currentEmail === 'taylor.lee@example.com'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>Taylor (Family/Shared)</span>
                        {currentEmail === 'taylor.lee@example.com' && <span className="text-[10px]">✓</span>}
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

      {/* Buttons Underneath Today, All Lists, Calendar Navigation Row */}
      <div className="border-t border-slate-200/70 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Mobile view switcher */}
          <div className="sm:hidden flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold w-full justify-between">
            <button
              type="button"
              onClick={() => onSelectTab('today')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition ${
                currentTab === 'today'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" style={{ color: currentTab === 'today' ? activeAccent.primary : undefined }} />
              <span>Today</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('lists')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition ${
                currentTab === 'lists'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" style={{ color: currentTab === 'lists' ? activeAccent.primary : undefined }} />
              <span>All Lists</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('calendar')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition ${
                currentTab === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Calendar</span>
            </button>
          </div>

          {/* Action Buttons: Create New List, Add on to List, View List (Uniform Same Size) */}
          <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
            {/* Button 1: Create New List */}
            <button
              type="button"
              onClick={onOpenCreate}
              className="flex-1 sm:flex-none sm:w-36 h-9 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition flex items-center justify-center gap-1.5 whitespace-nowrap"
              title="Create a brand new list"
            >
              <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <span>Create New List</span>
            </button>

            {/* Button 2: Add on to List */}
            <button
              type="button"
              onClick={onOpenAddToList || onOpenCreate}
              className="flex-1 sm:flex-none sm:w-36 h-9 px-3 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition flex items-center justify-center gap-1.5 whitespace-nowrap"
              style={{ backgroundColor: activeAccent.primary }}
              title="Add task or item to any list"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add on to List</span>
            </button>

            {/* Button 3: View List */}
            <button
              type="button"
              onClick={onOpenViewList || (() => onSelectTab('lists'))}
              className="flex-1 sm:flex-none sm:w-36 h-9 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition flex items-center justify-center gap-1.5 whitespace-nowrap"
              title="Select and view a specific list"
            >
              <FolderOpen className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
              <span>View List</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
