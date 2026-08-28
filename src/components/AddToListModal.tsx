import React, { useState, useEffect } from 'react';
import { ListModel, PriorityLevel, GROCERY_CATEGORIES } from '../types';
import { addListItem } from '../services/listService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCalendar } from '../context/CalendarContext';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import { parseVoiceDictation } from '../utils/voiceDictationParser';
import {
  X,
  Plus,
  Mic,
  MicOff,
  Sparkles,
  MapPin,
  Clock,
  DollarSign,
  Tag,
  Calendar,
  AlertCircle,
  FolderOpen
} from 'lucide-react';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists: ListModel[];
  defaultListId?: string;
  onItemAdded?: (listId: string, itemId: string) => void;
}

export const AddToListModal: React.FC<AddToListModalProps> = ({
  isOpen,
  onClose,
  lists,
  defaultListId,
  onItemAdded
}) => {
  const { user, userProfile } = useAuth();
  const { activeAccent } = useTheme();
  const { isConnected: isCalendarConnected, syncTaskToCalendar } = useCalendar();

  const [selectedListId, setSelectedListId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>('pcs');
  const [category, setCategory] = useState<string>('Produce');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [location, setLocation] = useState('');
  const [timeScheduled, setTimeScheduled] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [isForToday, setIsForToday] = useState(true);
  const [syncToGcal, setSyncToGcal] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Setup initial selected list
  useEffect(() => {
    if (isOpen) {
      if (defaultListId && lists.some((l) => l.id === defaultListId)) {
        setSelectedListId(defaultListId);
      } else if (lists.length > 0) {
        // Pick primary daily list or first list
        const daily = lists.find(
          (l) => l.isDailyFocus || l.title.toLowerCase().includes('today') || l.title.toLowerCase().includes('daily')
        );
        setSelectedListId(daily ? daily.id : lists[0].id);
      }
    }
  }, [isOpen, defaultListId, lists]);

  const currentList = lists.find((l) => l.id === selectedListId) || lists[0];
  const isGrocery = currentList?.type === 'grocery';

  // Speech Recognition for smart item dictation
  const {
    isSupported: isVoiceSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening
  } = useSpeechRecognition((finalText) => {
    if (!finalText.trim()) return;
    const parsed = parseVoiceDictation(finalText, currentList?.type || 'todo');
    setTitle(parsed.title || finalText);
    if (parsed.quantity) setQuantity(parsed.quantity);
    if (parsed.unit) setUnit(parsed.unit);
    if (parsed.category) setCategory(parsed.category);
    if (parsed.location) setLocation(parsed.location);
    if (parsed.timeScheduled) setTimeScheduled(parsed.timeScheduled);
    if (parsed.priority) setPriority(parsed.priority);
    if (parsed.estimatedPrice) setEstimatedPrice(String(parsed.estimatedPrice));
    if (parsed.notes) setNotes(parsed.notes);
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user || !selectedListId) return;

    setIsSubmitting(true);
    try {
      const userMeta = {
        email: userProfile?.email || user.email || '',
        displayName: userProfile?.displayName || user.displayName || 'Me'
      };

      const payload = {
        title: title.trim(),
        completed: false,
        quantity: isGrocery ? quantity : undefined,
        unit: isGrocery ? unit : undefined,
        category: isGrocery ? category : undefined,
        priority,
        location: location.trim() || undefined,
        timeScheduled: timeScheduled.trim() || undefined,
        dueDate: dueDate || undefined,
        isForToday,
        estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : undefined,
        notes: notes.trim() || undefined
      };

      const newItemId = await addListItem(selectedListId, payload, userMeta);

      if (syncToGcal && isCalendarConnected && timeScheduled) {
        syncTaskToCalendar({
          id: newItemId,
          listId: selectedListId,
          ...payload,
          createdAt: new Date()
        }).catch((err) => console.warn('Auto gcal sync notice:', err));
      }

      if (onItemAdded) {
        onItemAdded(selectedListId, newItemId);
      }

      // Reset fields & close
      setTitle('');
      setLocation('');
      setTimeScheduled('');
      setEstimatedPrice('');
      setNotes('');
      setShowMoreDetails(false);
      onClose();
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: activeAccent.primary }}
            >
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Add on to List</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quickly add a task or item to any of your lists
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Target List Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Select List to Add To</span>
            </label>
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.type === 'grocery' ? '🛒' : '📋'} {l.title} ({l.type === 'grocery' ? 'Grocery' : 'To-Do'})
                </option>
              ))}
            </select>
          </div>

          {/* Item / Task Title + Voice Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isGrocery ? 'Item Name *' : 'What needs to be done? *'}
              </label>
              {isVoiceSupported && (
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) stopListening();
                    else startListening();
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    isListening
                      ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-rose-600" />
                      <span>Listening...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-rose-500" />
                      <span>Voice Dictate</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  isListening
                    ? 'Listening... Speak naturally!'
                    : isGrocery
                    ? 'e.g. 2 gallons organic milk'
                    : 'e.g. Review financial report at 2pm'
                }
                className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isListening ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 dark:border-slate-700'
                }`}
                autoFocus
              />
            </div>
            {isListening && (
              <p className="mt-1 text-[11px] text-rose-600 animate-pulse font-medium">
                🎙️ Speak naturally with quantities, locations or times.
              </p>
            )}
          </div>

          {/* Grocery Specific: Quantity & Category */}
          {isGrocery && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Qty
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pcs, lbs, gal"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  {GROCERY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Due date & Today flag */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
              >
                <option value="urgent">🚨 Urgent</option>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>

          {/* Toggle More Details (Location, Scheduled Time, Price, Notes) */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              {showMoreDetails ? '− Hide additional details' : '+ Add Location, Time, Price, or Notes'}
            </button>
          </div>

          {showMoreDetails && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Location */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    <span>Store / Location</span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Trader Joe's or Online"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                {/* Scheduled Time */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-500" />
                    <span>Scheduled Time</span>
                  </label>
                  <input
                    type="text"
                    value={timeScheduled}
                    onChange={(e) => setTimeScheduled(e.target.value)}
                    placeholder="e.g. 2:30 PM"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-500" />
                  <span>Estimated Cost / Price ($)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                  placeholder="e.g. 5.99"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes & Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any specific brand preferences, details, or checklist instructions..."
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {/* Quick Checkboxes */}
          <div className="pt-2 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isForToday}
                onChange={(e) => setIsForToday(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Include on Today's Agenda</span>
            </label>

            {isCalendarConnected && timeScheduled && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncToGcal}
                  onChange={(e) => setSyncToGcal(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Sync to Google Calendar</span>
              </label>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            style={{ backgroundColor: activeAccent.primary }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>
    </div>
  );
};
