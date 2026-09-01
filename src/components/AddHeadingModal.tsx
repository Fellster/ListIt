import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useCustomHeadings } from '../context/CustomHeadingsContext';
import { Check, X, Trash2, Folder } from 'lucide-react';

interface AddHeadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHeadingCreated: (headingId: string, headingLabel?: string) => void;
  onHeadingDeleted?: (headingId: string) => void;
}

export const AddHeadingModal: React.FC<AddHeadingModalProps> = ({
  isOpen,
  onClose,
  onHeadingCreated,
  onHeadingDeleted,
}) => {
  const { activeAccent } = useTheme();
  const { addCustomHeading, removeCustomHeading, customHeadings } = useCustomHeadings();
  const [headingName, setHeadingName] = useState('');
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHeadingName('');
      setError('');
      setDeletingId(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = headingName.trim();
    if (!clean) {
      setError('Please enter a heading name');
      return;
    }

    // Check if name conflicts with standard or existing custom headings
    const lower = clean.toLowerCase();
    if (['today', 'grocery', 'home', 'other'].includes(lower)) {
      setError(`"${clean}" is already a default heading.`);
      return;
    }

    if (customHeadings.some((h) => h.label.toLowerCase() === lower)) {
      setError(`A heading named "${clean}" already exists.`);
      return;
    }

    try {
      const created = addCustomHeading(clean);
      setHeadingName('');
      setError('');
      onHeadingCreated(created.id, clean);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create heading');
    }
  };

  const handleDeleteHeading = (id: string) => {
    removeCustomHeading(id);
    if (onHeadingDeleted) {
      onHeadingDeleted(id);
    }
    setDeletingId(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon in top corner */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Title */}
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            Add Heading Button
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create a custom navigation button for your workspace
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-2.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Button / Heading Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={headingName}
              onChange={(e) => {
                setHeadingName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Work, Fitness, Packing, Projects..."
              maxLength={30}
              className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition"
              style={{
                borderColor: headingName.trim() ? activeAccent.primary : undefined,
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!headingName.trim()}
              className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 hover:brightness-110 active:scale-95 cursor-pointer"
              style={{ backgroundColor: activeAccent.primary }}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Button</span>
            </button>
          </div>
        </form>

        {/* Existing Custom Buttons Manager */}
        {customHeadings.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                Active Custom Buttons ({customHeadings.length})
              </span>
              <span className="text-[10px] text-slate-400">
                Click trash to delete
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
              {customHeadings.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {ch.label}
                    </span>
                  </div>

                  {deletingId === ch.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteHeading(ch.id)}
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition shadow-2xs"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="px-1.5 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[11px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingId(ch.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition shrink-0 cursor-pointer"
                      title={`Delete "${ch.label}" button`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
