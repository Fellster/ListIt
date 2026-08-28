import React, { useState } from 'react';
import { useCalendar } from '../context/CalendarContext';
import { useTheme } from '../context/ThemeContext';
import { ListModel, ListItemModel } from '../types';
import { 
  Calendar as CalendarIcon, 
  RefreshCw, 
  ExternalLink, 
  MapPin, 
  Clock, 
  Plus, 
  CheckCircle2, 
  CalendarPlus,
  AlertCircle,
  Sparkles,
  Link,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface CalendarAgendaViewProps {
  lists: ListModel[];
  allTodayItems: ListItemModel[];
  onOpenItemModal: (item: ListItemModel, list: ListModel) => void;
}

export const CalendarAgendaView: React.FC<CalendarAgendaViewProps> = ({
  lists,
  allTodayItems,
  onOpenItemModal,
}) => {
  const { 
    isConnected, 
    isConnecting, 
    connectCalendar, 
    disconnectCalendar, 
    todayEvents, 
    loadingEvents, 
    refreshEvents,
    syncTaskToCalendar
  } = useCalendar();
  const { activeAccent } = useTheme();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
      {/* Calendar Header Card - Clean & Minimalist */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
            <span>Google Calendar Integration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Schedule & Time-Blocking
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Synchronize scheduled tasks and errands directly with your Google Calendar
          </p>
        </div>

        {/* Connection status button */}
        <div className="flex items-center gap-2.5">
          {isConnected ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Google Account Linked</span>
              </div>
              <button
                type="button"
                onClick={refreshEvents}
                disabled={loadingEvents}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-slate-700"
                title="Refresh calendar events"
              >
                <RefreshCw className={`w-4 h-4 ${loadingEvents ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={disconnectCalendar}
                className="px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-semibold transition"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={connectCalendar}
              disabled={isConnecting}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarIcon className="w-4 h-4" />
              )}
              <span>Connect Google Calendar</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Live Google Calendar Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Google Calendar Events for Today</span>
                  {todayEvents.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-full text-xs font-bold">
                      {todayEvents.length}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">{formattedDate}</p>
              </div>

              {isConnected && (
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                >
                  <span>Open Google Calendar</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {!isConnected ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center text-xl mx-auto">
                  📅
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  Connect Google Calendar
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Sign in with your Google Account to view your scheduled events and keep ListIt tasks in sync with your calendar.
                </p>
                <button
                  type="button"
                  onClick={connectCalendar}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  Connect Calendar Now
                </button>
              </div>
            ) : loadingEvents ? (
              <div className="py-10 text-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs text-slate-400">Loading today's schedule from Google Calendar...</p>
              </div>
            ) : todayEvents.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No scheduled calendar events for today.
                </p>
                <p className="text-xs text-slate-400">
                  Sync any task below with one click to schedule it directly into your calendar!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEvents.map((evt) => {
                  const startStr = evt.start.dateTime
                    ? new Date(evt.start.dateTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'All Day';
                  const endStr = evt.end.dateTime
                    ? new Date(evt.end.dateTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '';

                  return (
                    <div
                      key={evt.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {evt.summary}
                          </span>
                          {evt.status === 'confirmed' && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              Confirmed
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{startStr} {endStr ? `– ${endStr}` : ''}</span>
                          </span>

                          {evt.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-500" />
                              <span>{evt.location}</span>
                            </span>
                          )}
                        </div>

                        {evt.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {evt.description}
                          </p>
                        )}
                      </div>

                      {evt.htmlLink && (
                        <a
                          href={evt.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                          title="Open event in Google Calendar"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Today's Tasks eligible for Calendar Sync */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-emerald-500" />
                <span>Today's Tasks ({allTodayItems.length})</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Click "Sync" to export any task to your live Google Calendar.
            </p>

            <div className="space-y-2.5 max-h-96 overflow-y-auto no-scrollbar">
              {allTodayItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No tasks added for today yet.
                </p>
              ) : (
                allTodayItems.map((item) => {
                  const parentList = lists.find((l) => l.id === item.listId);
                  return (
                    <div
                      key={item.id}
                      onClick={() => parentList && onOpenItemModal(item, parentList)}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 hover:border-slate-300 transition cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          {item.timeScheduled && <span>⏰ {item.timeScheduled}</span>}
                          {item.location && <span>📍 {item.location}</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          syncTaskToCalendar(item);
                        }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                          item.googleCalendarEventId
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {item.googleCalendarEventId ? 'Synced ✓' : 'Sync'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
