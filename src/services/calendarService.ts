import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { GoogleCalendarEvent, ListItemModel } from '../types';

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly'
];

/**
 * Authenticates with Google via Firebase Auth popup and returns the OAuth accessToken
 */
export async function authenticateGoogleCalendar(): Promise<string> {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  
  if (!credential?.accessToken) {
    throw new Error('Could not obtain Google Calendar access token from authentication.');
  }

  return credential.accessToken;
}

/**
 * Fetches Google Calendar events for today or a specific date
 */
export async function fetchCalendarEvents(
  accessToken: string,
  targetDate: Date = new Date()
): Promise<GoogleCalendarEvent[]> {
  try {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const timeMin = startOfDay.toISOString();
    const timeMax = endOfDay.toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
        timeMin
      )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('UNAUTHORIZED');
      }
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary || 'Untitled Event',
      description: item.description || '',
      location: item.location || '',
      start: item.start || {},
      end: item.end || {},
      htmlLink: item.htmlLink || '',
      colorId: item.colorId,
      status: item.status
    }));
  } catch (error: any) {
    if (error?.message !== 'UNAUTHORIZED') {
      console.warn('Google Calendar fetch notice:', error);
    }
    throw error;
  }
}

/**
 * Creates a Google Calendar Event from a task / list item
 */
export async function createCalendarEventFromTask(
  accessToken: string,
  task: ListItemModel,
  dateStr?: string
): Promise<{ id: string; htmlLink: string }> {
  try {
    const today = new Date();
    const taskDate = dateStr || task.dueDate || today.toISOString().split('T')[0];

    // Determine start & end time
    let startObj: any = {};
    let endObj: any = {};

    if (task.timeScheduled) {
      // parse "14:30" or "2:30 PM"
      let hours = 9;
      let minutes = 0;
      const match = task.timeScheduled.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        if (task.timeScheduled.toLowerCase().includes('pm') && hours < 12) hours += 12;
        if (task.timeScheduled.toLowerCase().includes('am') && hours === 12) hours = 0;
      }

      const startDateTime = new Date(`${taskDate}T00:00:00`);
      startDateTime.setHours(hours, minutes, 0, 0);

      const durationMins = task.durationMinutes || 45;
      const endDateTime = new Date(startDateTime.getTime() + durationMins * 60 * 1000);

      startObj = { dateTime: startDateTime.toISOString() };
      endObj = { dateTime: endDateTime.toISOString() };
    } else {
      // All-day event
      startObj = { date: taskDate };
      endObj = { date: taskDate };
    }

    // Build description including custom factors and notes
    let descriptionText = task.notes || '';
    if (task.customFactors && task.customFactors.length > 0) {
      descriptionText += '\n\nAdditional Details:\n' + 
        task.customFactors.map((f) => `• ${f.label}: ${f.value}`).join('\n');
    }
    if (task.estimatedPrice) {
      descriptionText += `\nEstimated Budget: $${task.estimatedPrice.toFixed(2)}`;
    }
    if (task.quantity) {
      descriptionText += `\nQuantity: ${task.quantity} ${task.unit || ''}`;
    }

    const payload = {
      summary: task.title,
      description: descriptionText.trim(),
      location: task.location || '',
      start: startObj,
      end: endObj
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Failed to create calendar event: ${errBody}`);
    }

    const created = await response.json();
    return {
      id: created.id,
      htmlLink: created.htmlLink || `https://calendar.google.com/calendar/r`
    };
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw error;
  }
}
