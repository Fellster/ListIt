import React, { useState, useMemo } from 'react';
import { ListItemModel, ListModel } from '../types';
import { 
  toggleListItem, 
} from '../services/listService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCalendar } from '../context/CalendarContext';
import confetti from 'canvas-confetti';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Circle, 
  Plus, 
  DollarSign, 
  CalendarPlus, 
  RefreshCw,
  Edit3
} from 'lucide-react';

interface TodayViewProps {
  lists: ListModel[];
  allTodayItems: ListItemModel[];
  onSelectItem: (item: ListItemModel, list: ListModel) => void;
  onOpenList: (list: ListModel) => void;
  onOpenCreateList: () => void;
  onOpenAddToList?: (defaultListId?: string) => void;
  onOpenViewList?: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  lists,
  allTodayItems,
  onSelectItem,
  onOpenList,
  onOpenCreateList,
  onOpenAddToList,
}) => {
  const { user, userProfile } = useAuth();
  const { activeAccent } = useTheme();
  const { 
    isConnected: isCalendarConnected, 
    isConnecting: isCalendarConnecting,
    connectCalendar, 
    todayEvents, 
    loadingEvents, 
    refreshEvents,
    syncTaskToCalendar 
  } = useCalendar();

  // Filter State
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [timeSectionFilter, setTimeSectionFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'anytime'>('all');
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);

  // Today counts
  const totalCount = allTodayItems.length;
  const completedCount = allTodayItems.filter((i) => i.completed).length;

  // Item completion toggle with confetti
  const handleToggle = async (item: ListItemModel) => {
    if (!user) return;
    const userMeta = {
      email: userProfile?.email || user.email || '',
      displayName: userProfile?.displayName || user.displayName || 'Me',
      uid: user.uid
    };

    const willComplete = !item.completed;
    if (willComplete) {
      try {
        confetti({
          particleCount: 25,
          spread: 40,
          origin: { y: 0.8 },
          colors: [activeAccent.primary, '#10b981', '#3b82f6', '#f59e0b']
        });
      } catch (e) {
        // ignore
      }
    }

    await toggleListItem(item.listId, item.id, item.completed, userMeta, item.title);
  };

  // Sync individual task to Google Calendar
  const handleSyncItemToGcal = async (item: ListItemModel, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncingItemId(item.id);
    try {
      await syncTaskToCalendar(item);
    } catch (err) {
      console.error('Manual gcal sync error:', err);
    } finally {
      setSyncingItemId(null);
    }
  };

  // Helper to categorize tasks into time slots
  const getTimeSlot = (timeStr?: string): 'morning' | 'afternoon' | 'evening' | 'anytime' => {
    if (!timeStr) return 'anytime';
    const lower = timeStr.toLowerCase();
    if (lower.includes('am')) return 'morning';
    if (lower.includes('pm')) {
      const match = lower.match(/(\d{1,2})/);
      if (match) {
        const hour = parseInt(match[1], 10);
        if (hour === 12 || (hour >= 1 && hour < 5)) return 'afternoon';
        return 'evening';
      }
      return 'afternoon';
    }
    const match24 = timeStr.match(/^(\d{1,2})/);
    if (match24) {
      const hour = parseInt(match24[1], 10);
      if (hour < 12) return 'morning';
      if (hour < 17) return 'afternoon';
      return 'evening';
    }
    return 'anytime';
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return allTodayItems.filter((item) => {
      if (activeFilter === 'pending' && item.completed) return false;
      if (activeFilter === 'completed' && !item.completed) return false;
      if (timeSectionFilter !== 'all') {
        const slot = getTimeSlot(item.timeScheduled);
        if (slot !== timeSectionFilter) return false;
      }
      return true;
    });
  }, [allTodayItems, activeFilter, timeSectionFilter]);

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
      {/* Main Grid: Left side Today tasks, Right side Lists & Google Calendar widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Columns: Task Manager */}
        <div className="lg:col-span-2 space-y-5">
          {/* Filter & View Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All ({allTodayItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeFilter === 'pending'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                To Do ({totalCount - completedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeFilter === 'completed'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Done ({completedCount})
              </button>
            </div>

            {/* Time Slot Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs text-slate-500 dark:text-slate-400 font-semibold">
              {(['all', 'morning', 'afternoon', 'evening', 'anytime'] as const).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeSectionFilter(slot)}
                  className={`px-2.5 py-1 rounded-lg transition capitalize text-xs ${
                    timeSectionFilter === slot
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Task Items List */}
          {filteredItems.length === 0 ? (
            <div className="py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center p-8 space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center text-xl mx-auto">
                ✨
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                {activeFilter === 'completed'
                  ? 'No completed items yet for today'
                  : 'Your agenda for today is clear!'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Use the "Add on to List" button in the top navigation to schedule tasks and items for today.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredItems.map((item) => {
                const parentList = lists.find((l) => l.id === item.listId);
                const isSyncing = syncingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => parentList && onSelectItem(item, parentList)}
                    className={`group p-3.5 rounded-xl border transition-all cursor-pointer bg-white dark:bg-slate-900 flex items-start justify-between gap-3 shadow-2xs hover:shadow-sm ${
                      item.completed
                        ? 'border-slate-200/60 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-900/50'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Left: Checkbox & Content */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(item);
                        }}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 transition shrink-0"
                      >
                        {item.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/40" />
                        ) : (
                          <Circle className="w-5 h-5 hover:stroke-emerald-600 stroke-[2]" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Title & List Tag */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold leading-tight text-slate-900 dark:text-white ${
                              item.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                            }`}
                          >
                            {item.title}
                          </span>

                          {/* Priority Tag */}
                          {item.priority && item.priority !== 'medium' && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                                item.priority === 'urgent'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : item.priority === 'high'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.priority}
                            </span>
                          )}

                          {/* Parent List Chip */}
                          {parentList && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenList(parentList);
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition inline-flex items-center gap-1"
                            >
                              <span>{parentList.type === 'grocery' ? '🛒' : '📋'}</span>
                              <span>{parentList.title}</span>
                            </button>
                          )}
                        </div>

                        {/* Factors Row (Location, Time, Price, Notes) */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          {item.location && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                item.location
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 rounded-md font-medium hover:underline text-[11px]"
                            >
                              <MapPin className="w-3 h-3 text-rose-500" />
                              <span>{item.location}</span>
                            </a>
                          )}

                          {item.timeScheduled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 rounded-md font-medium text-[11px]">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              <span>{item.timeScheduled}</span>
                              {item.durationMinutes && (
                                <span className="text-indigo-400">({item.durationMinutes}m)</span>
                              )}
                            </span>
                          )}

                          {item.estimatedPrice !== undefined && item.estimatedPrice > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-md font-bold text-[11px]">
                              <DollarSign className="w-3 h-3 text-emerald-500" />
                              <span>{item.estimatedPrice.toFixed(2)}</span>
                            </span>
                          )}

                          {item.notes && (
                            <span className="text-[11px] text-slate-400 line-clamp-1 italic">
                              "{item.notes}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Edit Details */}
                      <button
                        type="button"
                        onClick={() => parentList && onSelectItem(item, parentList)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Google Calendar Sync */}
                      <button
                        type="button"
                        onClick={(e) => handleSyncItemToGcal(item, e)}
                        disabled={isSyncing}
                        title={
                          item.googleCalendarEventId
                            ? 'Already synced to Google Calendar'
                            : 'Sync to Google Calendar'
                        }
                        className={`p-1.5 rounded-lg border transition ${
                          item.googleCalendarEventId
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isSyncing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        ) : (
                          <CalendarPlus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Column: Clean List Switcher & Google Calendar Widget */}
        <div className="space-y-5">
          {/* Quick List Overview Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Your Lists ({lists.length})
              </h3>
              <button
                type="button"
                onClick={onOpenCreateList}
                className="text-xs font-bold hover:underline flex items-center gap-1"
                style={{ color: activeAccent.primary }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New List</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto no-scrollbar">
              {lists.map((l) => (
                <div
                  key={l.id}
                  className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/80 transition flex items-center justify-between group"
                >
                  <button
                    type="button"
                    onClick={() => onOpenList(l)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs shrink-0">
                      {l.type === 'grocery' ? '🛒' : '📋'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {l.title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {l.itemCount || 0} items
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => onOpenAddToList ? onOpenAddToList(l.id) : onOpenList(l)}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700 text-xs"
                      title="Add item to this list"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Google Calendar Live Agenda & Connection Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  🗓️
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Google Calendar
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {isCalendarConnected ? 'Connected & synced' : 'Live schedule sync'}
                  </p>
                </div>
              </div>

              {isCalendarConnected && (
                <button
                  type="button"
                  onClick={refreshEvents}
                  disabled={loadingEvents}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Refresh calendar events"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              )}
            </div>

            {/* Connection Status Box */}
            {!isCalendarConnected ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Connect your Google Calendar to view today's events and sync tasks with one click.
                </p>
                <button
                  type="button"
                  onClick={connectCalendar}
                  disabled={isCalendarConnecting}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5"
                >
                  {isCalendarConnecting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                  <span>Connect Google Calendar</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {loadingEvents ? (
                  <div className="space-y-1.5 py-2">
                    <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                    <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                  </div>
                ) : todayEvents.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400 space-y-1">
                    <p>No calendar events scheduled for today.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto no-scrollbar">
                    {todayEvents.map((evt) => {
                      const startStr = evt.start.dateTime
                        ? new Date(evt.start.dateTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'All Day';

                      return (
                        <div
                          key={evt.id}
                          className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                              {evt.summary}
                            </span>
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                              {startStr}
                            </span>
                          </div>
                          {evt.location && (
                            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              <span>{evt.location}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
