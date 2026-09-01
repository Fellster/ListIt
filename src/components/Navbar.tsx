import React, { useState } from 'react';
import { useAuth, getAvatarColor, getInitials } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCustomHeadings } from '../context/CustomHeadingsContext';
import { AddHeadingModal } from './AddHeadingModal';
import { 
  Plus, 
  ShoppingCart, 
  Home, 
  FolderOpen, 
  Folder,
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
  X,
  Sparkles,
  Trash2
} from 'lucide-react';
import { HeadingKey, CustomHeading } from '../types';

export type ActiveNavKey = HeadingKey;

interface NavbarProps {
  activeNav: ActiveNavKey;
  onNavigate: (key: ActiveNavKey) => void;
  onQuickCreateList: (title: string, heading?: ActiveNavKey) => Promise<void> | void;
  onOpenAuth: () => void;
  onOpenThemeModal: () => void;
  onOpenOcr?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeNav,
  onNavigate,
  onQuickCreateList,
  onOpenAuth,
  onOpenThemeModal,
  onOpenOcr
}) => {
  const { user, userProfile, logout, signInAsDemoUser } = useAuth();
  const { theme, updateTheme, activeAccent } = useTheme();
  const { customHeadings, removeCustomHeading } = useCustomHeadings();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Custom Heading Dialogue Box state
  const [isAddHeadingModalOpen, setIsAddHeadingModalOpen] = useState(false);
  const [headingToDelete, setHeadingToDelete] = useState<CustomHeading | null>(null);

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
      default: {
        const found = customHeadings.find((h) => h.id === navKey);
        return found ? found.label : typeof navKey === 'string' ? navKey : 'Custom';
      }
    }
  };

  const handleSwitchDemo = async (name: string, email: string) => {
    setProfileMenuOpen(false);
    await signInAsDemoUser(name, email);
  };

  const handleHeadingCreated = async (createdHeadingId: string, headingLabel?: string) => {
    setIsAddHeadingModalOpen(false);
    if (headingLabel) {
      try {
        await onQuickCreateList(headingLabel, createdHeadingId);
      } catch (e) {
        console.warn('Auto create list for heading notice:', e);
      }
    }
    onNavigate(createdHeadingId);
  };

  const handleHeadingDeleted = (deletedHeadingId: string) => {
    if (activeNav === deletedHeadingId) {
      onNavigate('other');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 transition-colors shadow-2xs">
      {/* Top Branding & Tools Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigate('today')}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group select-none shrink-0"
        >
          <div 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white font-black text-base shadow-xs group-hover:scale-105 transition-all"
            style={{ backgroundColor: activeAccent.primary }}
          >
            L
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              ListIt
            </span>
          </div>
        </div>

        {/* Action buttons & Profile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Customization / Theme Studio Button */}
          <button
            type="button"
            id="nav-btn-customize-theme"
            onClick={onOpenThemeModal}
            className="p-2 sm:px-3 sm:py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 border border-slate-200/70 dark:border-slate-700 shadow-2xs"
            title="Open Theme & Accent Customizer"
          >
            <Palette className="w-4 h-4" style={{ color: activeAccent.primary }} />
            <span className="hidden sm:inline">Theme</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            type="button"
            id="nav-btn-theme-toggle"
            onClick={() => updateTheme({ isDarkMode: !theme.isDarkMode })}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition border border-slate-200/70 dark:border-slate-700"
            title={theme.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme.isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Account / Profile Dropdown */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                id="nav-btn-profile-menu"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <div 
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(currentEmail)}`}
                >
                  {getInitials(currentName)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {currentName}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 leading-tight truncate max-w-[120px]">
                    {currentEmail}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Profile Menu Dropdown */}
              {profileMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{currentName}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentEmail}</p>
                    </div>

                    {/* Fast Switch User */}
                    <div className="px-2 py-1.5">
                      <p className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Switch Demo Member
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => handleSwitchDemo('Keith Fell', 'keithfell1@gmail.com')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                          currentEmail === 'keithfell1@gmail.com'
                            ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] ${getAvatarColor('keithfell1@gmail.com')}`}>
                            KF
                          </div>
                          <span>Keith Fell</span>
                        </div>
                        {currentEmail === 'keithfell1@gmail.com' && (
                          <Check className="w-3.5 h-3.5" style={{ color: activeAccent.primary }} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchDemo('Sarah Partner', 'sarah.fell@gmail.com')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                          currentEmail === 'sarah.fell@gmail.com'
                            ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] ${getAvatarColor('sarah.fell@gmail.com')}`}>
                            SP
                          </div>
                          <span>Sarah Partner</span>
                        </div>
                        {currentEmail === 'sarah.fell@gmail.com' && (
                          <Check className="w-3.5 h-3.5" style={{ color: activeAccent.primary }} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchDemo('Alex Teammate', 'alex.family@gmail.com')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                          currentEmail === 'alex.family@gmail.com'
                            ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] ${getAvatarColor('alex.family@gmail.com')}`}>
                            AT
                          </div>
                          <span>Alex Teammate</span>
                        </div>
                        {currentEmail === 'alex.family@gmail.com' && (
                          <Check className="w-3.5 h-3.5" style={{ color: activeAccent.primary }} />
                        )}
                      </button>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onOpenAuth();
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Manage / Add Accounts</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs hover:brightness-110 active:brightness-95"
              style={{ backgroundColor: activeAccent.primary }}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP LINE: Dynamic Headings (Today, Grocery, Home, Other, Custom Headings... + Plus Button) */}
      <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/90 px-3 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar py-0.5">
          {/* 1. Today */}
          <button
            type="button"
            id="nav-btn-today"
            onClick={() => onNavigate('today')}
            className={`flex-1 min-w-[70px] sm:min-w-[90px] h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center whitespace-nowrap shadow-2xs cursor-pointer shrink-0 ${
              activeNav === 'today'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
            }`}
            style={activeNav === 'today' ? { borderColor: activeAccent.primary } : {}}
          >
            <span>Today</span>
          </button>

          {/* 2. Grocery */}
          <button
            type="button"
            id="nav-btn-grocery"
            onClick={() => onNavigate('grocery')}
            className={`flex-1 min-w-[70px] sm:min-w-[90px] h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center whitespace-nowrap shadow-2xs cursor-pointer shrink-0 ${
              activeNav === 'grocery'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
            }`}
            style={activeNav === 'grocery' ? { borderColor: activeAccent.primary } : {}}
          >
            <span>Grocery</span>
          </button>

          {/* 3. Home */}
          <button
            type="button"
            id="nav-btn-home"
            onClick={() => onNavigate('home')}
            className={`flex-1 min-w-[70px] sm:min-w-[90px] h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center whitespace-nowrap shadow-2xs cursor-pointer shrink-0 ${
              activeNav === 'home'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
            }`}
            style={activeNav === 'home' ? { borderColor: activeAccent.primary } : {}}
          >
            <span>Home</span>
          </button>

          {/* 4. Other */}
          <button
            type="button"
            id="nav-btn-other"
            onClick={() => onNavigate('other')}
            className={`flex-1 min-w-[70px] sm:min-w-[90px] h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center whitespace-nowrap shadow-2xs cursor-pointer shrink-0 ${
              activeNav === 'other'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
            }`}
            style={activeNav === 'other' ? { borderColor: activeAccent.primary } : {}}
          >
            <span>Other</span>
          </button>

          {/* Custom Headings created by user */}
          {customHeadings.map((ch) => {
            const isActive = activeNav === ch.id;
            return (
              <div
                key={ch.id}
                className={`group relative flex-1 min-w-[80px] sm:min-w-[100px] h-10 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-between shadow-2xs shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
                }`}
                style={isActive ? { borderColor: activeAccent.primary } : {}}
              >
                <button
                  type="button"
                  id={`nav-btn-custom-${ch.id}`}
                  onClick={() => onNavigate(ch.id)}
                  className="flex-1 h-full px-2.5 sm:px-3 flex items-center justify-center whitespace-nowrap overflow-hidden cursor-pointer"
                >
                  <span className="truncate max-w-[85px] sm:max-w-[110px]">{ch.label}</span>
                </button>

                {/* Direct Delete Button on the tab */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeadingToDelete(ch);
                  }}
                  className="mr-1 w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition opacity-60 group-hover:opacity-100 shrink-0 cursor-pointer"
                  title={`Delete "${ch.label}" list`}
                  aria-label={`Delete ${ch.label} list`}
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>
            );
          })}

          {/* + Button to Add Custom Named Heading - Positioned directly AFTER the last custom button */}
          <button
            type="button"
            id="nav-btn-add-custom-heading"
            onClick={() => setIsAddHeadingModalOpen(true)}
            className="h-10 px-3 min-w-[40px] bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shrink-0 shadow-2xs cursor-pointer"
            title="Add custom heading button (e.g. Work, Fitness, Packing, Projects)"
          >
            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline text-xs">Heading</span>
          </button>
        </div>
      </div>

      {/* SECOND LINE: Decorative Heading Banner matching the active heading */}
      <div className="border-t border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="flex items-center justify-center w-full max-w-sm">
            <div
              id="heading-banner-decorative"
              className="w-full h-10 px-4 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center whitespace-nowrap select-none pointer-events-none"
              style={{ backgroundColor: activeAccent.primary }}
              aria-hidden="true"
            >
              <span>{getHeadingLabel(activeNav)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Heading Dialogue Box Modal */}
      <AddHeadingModal
        isOpen={isAddHeadingModalOpen}
        onClose={() => setIsAddHeadingModalOpen(false)}
        onHeadingCreated={handleHeadingCreated}
        onHeadingDeleted={handleHeadingDeleted}
      />

      {/* Quick Delete Heading Button Confirmation Modal */}
      {headingToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setHeadingToDelete(null)}
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
                  Delete "{headingToDelete.label}" list?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This will remove this list button from your navigation. Any existing lists will remain safely organized in "Other".
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setHeadingToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToRemove = headingToDelete.id;
                  removeCustomHeading(idToRemove);
                  handleHeadingDeleted(idToRemove);
                  setHeadingToDelete(null);
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
    </header>
  );
};
