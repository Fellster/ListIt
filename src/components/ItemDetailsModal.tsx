import React, { useState, useEffect } from 'react';
import { ListItemModel, ListModel, GROCERY_CATEGORIES, PriorityLevel, SharedMember, CustomFactor } from '../types';
import { updateListItem, deleteListItem } from '../services/listService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCalendar } from '../context/CalendarContext';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import { parseVoiceDictation, ParsedVoiceItem } from '../utils/voiceDictationParser';
import { 
  X, 
  Trash2, 
  Save, 
  Tag, 
  Calendar, 
  User, 
  Hash, 
  FileText, 
  Clock,
  AlertCircle,
  MapPin,
  DollarSign,
  CalendarPlus,
  ExternalLink,
  Plus,
  RefreshCw,
  Mic,
  MicOff,
  Sparkles,
  Check,
  RotateCcw,
  Volume2,
  Wand2
} from 'lucide-react';

interface ItemDetailsModalProps {
  list: ListModel;
  item: ListItemModel | null;
  isOpen: boolean;
  onClose: () => void;
  canEdit: boolean;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  list,
  item,
  isOpen,
  onClose,
  canEdit,
}) => {
  const { userProfile, user } = useAuth();
  const { activeAccent } = useTheme();
  const { isConnected: isGcalConnected, syncTaskToCalendar } = useCalendar();

  if (!isOpen || !item) return null;

  const [title, setTitle] = useState(item.title);
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [unit, setUnit] = useState(item.unit || 'pcs');
  const [category, setCategory] = useState(item.category || 'Other');
  const [priority, setPriority] = useState<PriorityLevel>(item.priority || 'medium');
  const [dueDate, setDueDate] = useState(item.dueDate || '');
  const [location, setLocation] = useState(item.location || '');
  const [timeScheduled, setTimeScheduled] = useState(item.timeScheduled || '');
  const [durationMinutes, setDurationMinutes] = useState(item.durationMinutes ? String(item.durationMinutes) : '30');
  const [estimatedPrice, setEstimatedPrice] = useState(item.estimatedPrice !== undefined ? String(item.estimatedPrice) : '');
  const [notes, setNotes] = useState(item.notes || '');
  const [assignedToEmail, setAssignedToEmail] = useState(item.assignedToEmail || '');
  const [customFactors, setCustomFactors] = useState<CustomFactor[]>(item.customFactors || []);
  const [newFactorKey, setNewFactorKey] = useState('');
  const [newFactorVal, setNewFactorVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncingGcal, setSyncingGcal] = useState(false);
  const [gcalSynced, setGcalSynced] = useState(!!item.googleCalendarEventId);

  // Voice Recording & Dictation States
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<'smart' | 'title' | 'notes' | 'location'>('smart');
  const [lastAppliedVoice, setLastAppliedVoice] = useState(false);
  const [parsedVoiceData, setParsedVoiceData] = useState<ParsedVoiceItem | null>(null);

  const {
    isSupported: isVoiceSupported,
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition((finalText) => {
    // When final speech result comes in, parse or update fields
    if (voiceTarget === 'smart') {
      const parsed = parseVoiceDictation(finalText, list.type);
      setParsedVoiceData(parsed);
    } else if (voiceTarget === 'title') {
      setTitle(finalText);
    } else if (voiceTarget === 'location') {
      setLocation(finalText);
    } else if (voiceTarget === 'notes') {
      setNotes((prev) => (prev ? `${prev}\n${finalText}` : finalText));
    }
  });

  // Keep smart parsed data up-to-date with live transcript
  useEffect(() => {
    const activeText = (transcript + ' ' + interimTranscript).trim();
    if (activeText && voiceTarget === 'smart') {
      const parsed = parseVoiceDictation(activeText, list.type);
      setParsedVoiceData(parsed);
    }
  }, [transcript, interimTranscript, voiceTarget, list.type]);

  const handleToggleVoicePanel = () => {
    if (isListening) {
      stopListening();
    }
    setShowVoicePanel((prev) => !prev);
    resetTranscript();
    setParsedVoiceData(null);
  };

  const handleStartVoice = (target: 'smart' | 'title' | 'notes' | 'location') => {
    if (!canEdit) return;
    setVoiceTarget(target);
    setShowVoicePanel(true);
    resetTranscript();
    setParsedVoiceData(null);
    setLastAppliedVoice(false);
    startListening({ continuous: false });
  };

  const handleApplySmartVoice = () => {
    if (!parsedVoiceData) return;
    if (parsedVoiceData.title) setTitle(parsedVoiceData.title);
    if (parsedVoiceData.category) setCategory(parsedVoiceData.category);
    if (parsedVoiceData.quantity) setQuantity(parsedVoiceData.quantity);
    if (parsedVoiceData.unit) setUnit(parsedVoiceData.unit);
    if (parsedVoiceData.location) setLocation(parsedVoiceData.location);
    if (parsedVoiceData.timeScheduled) setTimeScheduled(parsedVoiceData.timeScheduled);
    if (parsedVoiceData.dueDate) setDueDate(parsedVoiceData.dueDate);
    if (parsedVoiceData.estimatedPrice !== undefined) setEstimatedPrice(String(parsedVoiceData.estimatedPrice));
    if (parsedVoiceData.priority) setPriority(parsedVoiceData.priority);
    if (parsedVoiceData.notes) {
      setNotes((prev) => (prev ? `${prev}\n${parsedVoiceData.notes}` : parsedVoiceData.notes!));
    }
    setLastAppliedVoice(true);
    setTimeout(() => setLastAppliedVoice(false), 2000);
  };

  const handleAddFactor = () => {
    if (!newFactorKey.trim() || !newFactorVal.trim()) return;
    setCustomFactors([
      ...customFactors,
      { id: Date.now().toString(), label: newFactorKey.trim(), value: newFactorVal.trim() }
    ]);
    setNewFactorKey('');
    setNewFactorVal('');
  };

  const handleRemoveFactor = (id: string) => {
    setCustomFactors(customFactors.filter((f) => f.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (isListening) stopListening();
    setLoading(true);

    try {
      await updateListItem(list.id, item.id, {
        title: title.trim(),
        quantity: Number(quantity) || 1,
        unit: unit.trim() || 'pcs',
        category,
        priority,
        dueDate: dueDate || undefined,
        location: location.trim() || undefined,
        timeScheduled: timeScheduled.trim() || undefined,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
        estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : undefined,
        notes: notes.trim() || undefined,
        customFactors: customFactors.length > 0 ? customFactors : undefined,
        assignedToEmail: assignedToEmail || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Error updating item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualGcalSync = async () => {
    setSyncingGcal(true);
    try {
      const res = await syncTaskToCalendar({
        ...item,
        title,
        location,
        timeScheduled,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
        notes,
        customFactors,
        dueDate
      });
      if (res) {
        setGcalSynced(true);
        await updateListItem(list.id, item.id, {
          googleCalendarEventId: res.id,
          googleCalendarEventLink: res.htmlLink
        });
      }
    } catch (err) {
      console.error('GCal manual sync error:', err);
    } finally {
      setSyncingGcal(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit) return;
    if (isListening) stopListening();
    if (confirm(`Delete "${item.title}" from list?`)) {
      await deleteListItem(list.id, item.id, item.completed, item.title, {
        email: (userProfile?.email || user?.email || '').toLowerCase(),
        displayName: userProfile?.displayName || user?.displayName || 'User',
      });
      onClose();
    }
  };

  const sharedMembers = Object.values(list.sharedWith || {}) as SharedMember[];
  const fullSpokenText = (transcript + (interimTranscript ? ' ' + interimTranscript : '')).trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {list.type === 'grocery' ? '🛒 Grocery Item Details' : '📋 Task & Factor Editor'}
            </span>
            {!canEdit && (
              <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-medium">
                View Only
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={handleToggleVoicePanel}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  showVoicePanel || isListening
                    ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-300 dark:ring-rose-900 animate-pulse'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
                title="Voice dictation & speech recognition"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isListening ? 'Listening...' : 'Voice Dictate'}</span>
              </button>
            )}
            
            <button
              onClick={() => {
                if (isListening) stopListening();
                onClose();
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1">
          {!canEdit && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>You have view-only access. Item details cannot be edited without editor permission.</span>
            </div>
          )}

          {/* Voice Dictation Interactive Panel */}
          {showVoicePanel && canEdit && (
            <div className="p-4 bg-gradient-to-br from-rose-50/80 to-amber-50/50 dark:from-rose-950/20 dark:to-slate-800/60 rounded-2xl border border-rose-200 dark:border-rose-900/40 shadow-xs space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isListening ? 'bg-rose-500 text-white animate-bounce' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'}`}>
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Voice Dictation Studio
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Speak clearly into your microphone to dictate tasks or groceries
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening({ continuous: false });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                      isListening
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Stop Mic</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>Start Recording</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetTranscript();
                      setParsedVoiceData(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Reset transcript"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dictation Mode Selector */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setVoiceTarget('smart')}
                  className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                    voiceTarget === 'smart'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Smart Auto-Fill</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceTarget('title')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    voiceTarget === 'title'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Title Only
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceTarget('location')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    voiceTarget === 'location'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Location Only
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceTarget('notes')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    voiceTarget === 'notes'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Notes Only
                </button>
              </div>

              {/* Audio Wave / Recording Visualizer */}
              {isListening && (
                <div className="flex items-center justify-center gap-1.5 py-1.5 bg-rose-100/50 dark:bg-rose-950/30 rounded-xl">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    Recording live speech...
                  </span>
                  <div className="flex items-end gap-1 h-4 px-2">
                    <span className="w-1 bg-rose-500 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-2" />
                    <span className="w-1 bg-rose-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-4" />
                    <span className="w-1 bg-rose-500 rounded-full animate-[pulse_0.3s_ease-in-out_infinite] h-3" />
                    <span className="w-1 bg-rose-500 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-4" />
                    <span className="w-1 bg-rose-500 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-2" />
                  </div>
                </div>
              )}

              {/* Spoken Text Transcript Box */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[52px] text-xs">
                {fullSpokenText ? (
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    <span>{transcript}</span>
                    {interimTranscript && (
                      <span className="text-slate-400 dark:text-slate-500 italic"> {interimTranscript}</span>
                    )}
                  </p>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                    {isListening
                      ? 'Listening for voice input... Say: "Buy 2 boxes of cereal at Target for $5 tomorrow"'
                      : 'Click "Start Recording" or speak into the microphone to transcribe automatically.'}
                  </p>
                )}
              </div>

              {/* Error Notice */}
              {voiceError && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px]">{voiceError}</span>
                </div>
              )}

              {/* Smart Auto-Fill Parsed Fields Preview */}
              {voiceTarget === 'smart' && parsedVoiceData && parsedVoiceData.title && (
                <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Extracted Fields Preview</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleApplySmartVoice}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1"
                    >
                      {lastAppliedVoice ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Applied!</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Apply to All Fields</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {parsedVoiceData.title && (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-md font-semibold">
                        🏷️ Title: {parsedVoiceData.title}
                      </span>
                    )}
                    {parsedVoiceData.category && (
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-md font-semibold">
                        🛒 Category: {parsedVoiceData.category}
                      </span>
                    )}
                    {parsedVoiceData.quantity && (
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-md">
                        📦 Qty: {parsedVoiceData.quantity} {parsedVoiceData.unit || 'pcs'}
                      </span>
                    )}
                    {parsedVoiceData.location && (
                      <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-md">
                        📍 Location: {parsedVoiceData.location}
                      </span>
                    )}
                    {parsedVoiceData.timeScheduled && (
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-md">
                        ⏰ Time: {parsedVoiceData.timeScheduled}
                      </span>
                    )}
                    {parsedVoiceData.dueDate && (
                      <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-md">
                        📅 Due: {parsedVoiceData.dueDate}
                      </span>
                    )}
                    {parsedVoiceData.estimatedPrice !== undefined && (
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-md">
                        💰 Price: ${parsedVoiceData.estimatedPrice}
                      </span>
                    )}
                    {parsedVoiceData.priority && (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-md">
                        🚨 Priority: {parsedVoiceData.priority}
                      </span>
                    )}
                    {parsedVoiceData.notes && (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
                        📝 Notes: {parsedVoiceData.notes}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Title - What needs to be done */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                What Needs to Be Done *
              </label>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleStartVoice('title')}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                    isListening && voiceTarget === 'title'
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-slate-500 hover:text-rose-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Dictate Title"
                >
                  <Mic className="w-3 h-3" />
                  <span>{isListening && voiceTarget === 'title' ? 'Recording Title...' : 'Dictate Title'}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                disabled={!canEdit}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Organic whole milk, Prepare Q3 financial report"
                className="w-full px-4 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleStartVoice('title')}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition ${
                    isListening && voiceTarget === 'title'
                      ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 animate-bounce'
                      : 'text-slate-400 hover:text-rose-500'
                  }`}
                  title="Dictate with microphone"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Where to get it & Time to get it done */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Location / Where to get it */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Where to get it (Location)</span>
                </label>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleStartVoice('location')}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                        isListening && voiceTarget === 'location'
                          ? 'bg-rose-500 text-white'
                          : 'text-slate-400 hover:text-rose-600'
                      }`}
                      title="Dictate location"
                    >
                      <Mic className="w-2.5 h-2.5" />
                      <span>Dictate</span>
                    </button>
                  )}
                  {location && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>Directions</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  disabled={!canEdit}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Trader Joe's, Target, Main St Store"
                  className="w-full px-3.5 py-2 pr-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleStartVoice('location')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition ${
                      isListening && voiceTarget === 'location'
                        ? 'text-rose-600'
                        : 'text-slate-400 hover:text-rose-500'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Time to get it done */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Time to get it done</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={!canEdit}
                  value={timeScheduled}
                  onChange={(e) => setTimeScheduled(e.target.value)}
                  placeholder="e.g. 03:30 PM or 15:30"
                  className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <select
                  disabled={!canEdit}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-24 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
                >
                  <option value="15">15m</option>
                  <option value="30">30m</option>
                  <option value="45">45m</option>
                  <option value="60">1h</option>
                  <option value="120">2h</option>
                </select>
              </div>
            </div>
          </div>

          {/* Priority, Cost & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Priority */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Priority Level
              </label>
              <select
                disabled={!canEdit}
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
              >
                <option value="urgent">🚨 Urgent (Immediate)</option>
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low Priority</option>
              </select>
            </div>

            {/* Estimated Price */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>Price / Cost ($)</span>
              </label>
              <input
                type="number"
                step="0.01"
                disabled={!canEdit}
                value={estimatedPrice}
                onChange={(e) => setEstimatedPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                disabled={!canEdit}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Quantity & Unit & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Quantity</span>
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                disabled={!canEdit}
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Unit
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs, lbs, bags"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Department / Category</span>
              </label>
              <select
                disabled={!canEdit}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
              >
                {GROCERY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned collaborator */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned Collaborator</span>
            </label>
            <select
              disabled={!canEdit}
              value={assignedToEmail}
              onChange={(e) => setAssignedToEmail(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
            >
              <option value="">Unassigned (Open for Anyone)</option>
              <option value={list.ownerEmail}>{list.ownerName || list.ownerEmail} (Owner)</option>
              {sharedMembers.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.name || m.email} ({m.role})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Factors & Key-Value Metadata */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Any Other Factors (Store Aisle, Coupon, Brand, etc.)
            </label>

            {customFactors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {customFactors.map((f) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <strong className="text-slate-900 dark:text-white">{f.label}:</strong>
                    <span>{f.value}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFactor(f.id)}
                        className="text-slate-400 hover:text-rose-500 ml-1"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {canEdit && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFactorKey}
                  onChange={(e) => setNewFactorKey(e.target.value)}
                  placeholder="Factor (e.g. Aisle, Size)"
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={newFactorVal}
                  onChange={(e) => setNewFactorVal(e.target.value)}
                  placeholder="Value (e.g. Aisle 5B, Large)"
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddFactor}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition"
                >
                  + Add
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Notes, Instructions or Details</span>
              </label>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleStartVoice('notes')}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                    isListening && voiceTarget === 'notes'
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-slate-500 hover:text-rose-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Dictate into Notes"
                >
                  <Mic className="w-3 h-3" />
                  <span>{isListening && voiceTarget === 'notes' ? 'Recording Notes...' : 'Dictate Notes'}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                rows={3}
                disabled={!canEdit}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Specific brand, coupon code, extra instructions..."
                className="w-full px-3.5 py-2 pr-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleStartVoice('notes')}
                  className={`absolute right-2.5 bottom-3 p-1.5 rounded-lg transition ${
                    isListening && voiceTarget === 'notes'
                      ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 animate-bounce'
                      : 'text-slate-400 hover:text-rose-500'
                  }`}
                  title="Dictate into notes"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Google Calendar Link / Sync Box */}
          <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CalendarPlus className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-white">
                  Google Calendar Link
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {gcalSynced
                    ? 'Synced to your Google Calendar'
                    : 'Schedule this task to your Google Calendar'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualGcalSync}
              disabled={syncingGcal}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {syncingGcal ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <CalendarPlus className="w-3 h-3" />
              )}
              <span>{gcalSynced ? 'Re-Sync' : 'Schedule to GCal'}</span>
            </button>
          </div>

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
            {canEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isListening) stopListening();
                  onClose();
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                {canEdit ? 'Cancel' : 'Close'}
              </button>

              {canEdit && (
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                  style={{ backgroundColor: activeAccent.primary }}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

