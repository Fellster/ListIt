import { GROCERY_CATEGORIES, GroceryCategory, PriorityLevel } from '../types';
import { parseItemInput } from './groceryCategorizer';

export interface ParsedVoiceItem {
  rawText: string;
  title: string;
  category?: string;
  quantity?: number;
  unit?: string;
  priority?: PriorityLevel;
  location?: string;
  timeScheduled?: string;
  dueDate?: string;
  estimatedPrice?: number;
  notes?: string;
}

export function parseVoiceDictation(spokenText: string, listType: 'grocery' | 'todo' = 'todo'): ParsedVoiceItem {
  let text = spokenText.trim();
  if (!text) {
    return { rawText: '', title: '' };
  }

  let priority: PriorityLevel | undefined;
  let location: string | undefined;
  let timeScheduled: string | undefined;
  let dueDate: string | undefined;
  let estimatedPrice: number | undefined;
  let notes: string | undefined;

  // 1. Check for priority phrases
  if (/\b(urgent|emergency|asap|highest priority|immediate)\b/i.test(text)) {
    priority = 'urgent';
    text = text.replace(/\b(urgent|emergency|asap|highest priority|immediate)\b/gi, '').trim();
  } else if (/\b(high priority|important|urgent|priority one|p1)\b/i.test(text)) {
    priority = 'high';
    text = text.replace(/\b(high priority|important|priority one|p1)\b/gi, '').trim();
  } else if (/\b(medium priority|normal priority|standard)\b/i.test(text)) {
    priority = 'medium';
    text = text.replace(/\b(medium priority|normal priority|standard)\b/gi, '').trim();
  } else if (/\b(low priority|minor|someday|whenever)\b/i.test(text)) {
    priority = 'low';
    text = text.replace(/\b(low priority|minor|someday|whenever)\b/gi, '').trim();
  }

  // 2. Check for Price / Cost
  // Patterns like: "for 5 dollars", "for $12.50", "cost 25 dollars", "priced at 4.99", "$15"
  const priceRegex = /(?:(?:for|costs?|costing|priced at|at)\s+)?(?:\$|\b)(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|usd|\$)?/i;
  const priceMatch = text.match(/(?:for|costs?|costing|priced at)\s+\$?(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|usd)?/i) || 
                     text.match(/\$(\d+(?:\.\d{1,2})?)/);
  if (priceMatch && priceMatch[1]) {
    const p = parseFloat(priceMatch[1]);
    if (!isNaN(p) && p > 0) {
      estimatedPrice = p;
      text = text.replace(priceMatch[0], '').trim();
    }
  }

  // 3. Check for Due Date mentions (today, tomorrow, next Monday, etc.)
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (/\b(?:by|on|due|for)?\s*today\b/i.test(text)) {
    dueDate = formatDate(now);
    text = text.replace(/\b(?:by|on|due|for)?\s*today\b/gi, '').trim();
  } else if (/\b(?:by|on|due|for)?\s*tomorrow\b/i.test(text)) {
    const tmrw = new Date(now);
    tmrw.setDate(now.getDate() + 1);
    dueDate = formatDate(tmrw);
    text = text.replace(/\b(?:by|on|due|for)?\s*tomorrow\b/gi, '').trim();
  } else {
    // Check day of week: "on Monday", "by Friday", "next Wednesday"
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayRegex = /\b(?:by|on|due|next)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
    const dayMatch = text.match(dayRegex);
    if (dayMatch && dayMatch[1]) {
      const targetDayIdx = days.indexOf(dayMatch[1].toLowerCase());
      if (targetDayIdx !== -1) {
        const d = new Date(now);
        const currentDayIdx = d.getDay();
        let diff = targetDayIdx - currentDayIdx;
        if (diff <= 0) diff += 7; // Next occurrence
        d.setDate(d.getDate() + diff);
        dueDate = formatDate(d);
        text = text.replace(dayMatch[0], '').trim();
      }
    }
  }

  // 4. Check for Time mentions: "at 3:30 pm", "at 4pm", "at 14:00", "at 9 in the morning"
  const timeRegex = /\b(?:at|time:?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}\s*(?:in the morning|in the afternoon|in the evening|at night|pm|am))\b/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch && timeMatch[1]) {
    let t = timeMatch[1].trim();
    if (/in the morning/i.test(t)) {
      t = t.replace(/in the morning/i, 'AM').trim();
    } else if (/in the afternoon|in the evening|at night/i.test(t)) {
      t = t.replace(/in the afternoon|in the evening|at night/i, 'PM').trim();
    }
    timeScheduled = t;
    text = text.replace(timeMatch[0], '').trim();
  }

  // 5. Check for Location mentions: "at Trader Joe's", "at Target", "from Whole Foods", "location CVS"
  const locRegex = /\b(?:at|from|location:?)\s+([A-Z0-9][A-Za-z0-9\s'&]+?(?:store|market|pharmacy|office|depot|station|clinic|center|hall|lab|gym|home|trader joe's|target|walmart|costco|safeway|kroger|cvs|walgreens|whole foods|ikea|home depot|best buy|apple store|starbucks|supermarket|bakery|grocer)?)(?=\s+(?:with|for|and|by|due|note|$))/i;
  const locMatch = text.match(locRegex);
  if (locMatch && locMatch[1] && locMatch[1].trim().length > 2) {
    location = locMatch[1].trim();
    text = text.replace(locMatch[0], '').trim();
  }

  // 6. Check for Notes phrases: "with note: ...", "note: ...", "instructions: ...", "make sure to ..."
  const notesRegex = /\b(?:with note:?|note:?|instructions:?|details:?|make sure to|remember to)\s+(.+)$/i;
  const notesMatch = text.match(notesRegex);
  if (notesMatch && notesMatch[1]) {
    notes = notesMatch[1].trim();
    text = text.replace(notesMatch[0], '').trim();
  }

  // Clean leading connector words like "Buy", "Get", "Pick up", "Add", "Please", "Do"
  let cleanTitle = text.replace(/^(?:please\s+|can you\s+|i need to\s+|remember to\s+)/i, '').trim();

  // If list is grocery, parse quantity and category
  const groceryParsed = parseItemInput(cleanTitle, 'Other');

  // Strip extraneous punctuation
  cleanTitle = cleanTitle.replace(/^[,.\s]+|[,.\s]+$/g, '');
  if (cleanTitle) {
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  }

  return {
    rawText: spokenText,
    title: (listType === 'grocery' ? groceryParsed.title : cleanTitle) || spokenText,
    category: listType === 'grocery' ? groceryParsed.category : undefined,
    quantity: groceryParsed.quantity !== 1 ? groceryParsed.quantity : undefined,
    unit: groceryParsed.unit !== 'pcs' ? groceryParsed.unit : undefined,
    priority,
    location,
    timeScheduled,
    dueDate,
    estimatedPrice,
    notes,
  };
}
