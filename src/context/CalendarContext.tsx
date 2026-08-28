import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GoogleCalendarEvent, ListItemModel } from '../types';
import { authenticateGoogleCalendar, fetchCalendarEvents, createCalendarEventFromTask } from '../services/calendarService';

interface CalendarContextType {
  accessToken: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  todayEvents: GoogleCalendarEvent[];
  loadingEvents: boolean;
  error: string | null;
  connectCalendar: () => Promise<void>;
  disconnectCalendar: () => void;
  refreshEvents: () => Promise<void>;
  syncTaskToCalendar: (task: ListItemModel) => Promise<{ id: string; htmlLink: string } | null>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('listit_gcal_token');
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [todayEvents, setTodayEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh today's events from Google Calendar
  const refreshEvents = useCallback(async () => {
    if (!accessToken) {
      setTodayEvents([]);
      return;
    }

    setLoadingEvents(true);
    setError(null);

    try {
      const events = await fetchCalendarEvents(accessToken, new Date());
      setTodayEvents(events);
      setError(null);
    } catch (err: any) {
      if (
        err?.message === 'UNAUTHORIZED' ||
        (err?.message && (err.message.includes('401') || err.message.includes('403') || err.message.includes('Forbidden')))
      ) {
        // Token invalid, expired, or missing calendar permissions - gracefully disconnect
        setAccessToken(null);
        localStorage.removeItem('listit_gcal_token');
        setTodayEvents([]);
      } else {
        console.warn('Calendar fetch notice:', err);
        setError('Could not refresh Google Calendar events. Check your connection.');
      }
    } finally {
      setLoadingEvents(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('listit_gcal_token', accessToken);
      refreshEvents();
    } else {
      localStorage.removeItem('listit_gcal_token');
      setTodayEvents([]);
    }
  }, [accessToken, refreshEvents]);

  // Connect via Firebase Google OAuth popup
  const connectCalendar = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const token = await authenticateGoogleCalendar();
      setAccessToken(token);
      setIsConnecting(false);
      setError(null);
    } catch (err: any) {
      setIsConnecting(false);
      const isPopupClosed =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.type === 'popup_closed' ||
        err?.message?.toLowerCase().includes('popup window closed') ||
        err?.message?.toLowerCase().includes('popup-closed-by-user') ||
        err?.message?.toLowerCase().includes('popup_closed') ||
        (typeof err === 'string' && err.toLowerCase().includes('popup window closed'));

      if (isPopupClosed) {
        console.info('Google Calendar OAuth popup was closed by user.');
      } else {
        console.warn('OAuth connection notice:', err);
        setError(err.message || 'Google Calendar authorization was not completed.');
      }
    }
  };

  const disconnectCalendar = () => {
    setAccessToken(null);
    setTodayEvents([]);
    localStorage.removeItem('listit_gcal_token');
  };

  // Sync a task item directly to Google Calendar
  const syncTaskToCalendar = async (task: ListItemModel) => {
    if (!accessToken) {
      // Prompt user to connect first
      connectCalendar();
      return null;
    }

    try {
      const result = await createCalendarEventFromTask(accessToken, task);
      // Refresh events so the new event shows immediately
      await refreshEvents();
      return result;
    } catch (err: any) {
      console.error('Failed to sync to calendar:', err);
      if (err.message === 'UNAUTHORIZED') {
        setAccessToken(null);
        connectCalendar();
      }
      throw err;
    }
  };

  return (
    <CalendarContext.Provider
      value={{
        accessToken,
        isConnected: !!accessToken,
        isConnecting,
        todayEvents,
        loadingEvents,
        error,
        connectCalendar,
        disconnectCalendar,
        refreshEvents,
        syncTaskToCalendar
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
