import React, { useState, useRef, useEffect } from 'react';
import { ListModel } from '../types';
import { useAuth } from '../context/AuthContext';
import { addBatchListItems } from '../services/listService';
import { scanImageWithOcr, compressImage, fileToBase64 } from '../services/ocrService';
import { isSpecificStore } from '../utils/groceryCategorizer';
import confetti from 'canvas-confetti';
import {
  Camera,
  X,
  Upload,
  RotateCw,
  RefreshCw,
  AlertCircle,
  ShoppingCart,
  CheckSquare,
  ListTodo,
  FileImage,
  Sparkles,
} from 'lucide-react';

interface CameraOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists: ListModel[];
  defaultListId?: string;
  onSuccess?: (addedCount: number, targetList: ListModel) => void;
}

export const CameraOcrModal: React.FC<CameraOcrModalProps> = ({
  isOpen,
  onClose,
  lists,
  defaultListId,
  onSuccess,
}) => {
  const { user, userProfile } = useAuth();

  // Selected target list
  const [selectedListId, setSelectedListId] = useState<string>(
    defaultListId || lists[0]?.id || ''
  );

  // Mode: 'camera' | 'upload'
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Image & Scan State
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Current active user
  const currentUser = {
    email: (userProfile?.email || user?.email || '').toLowerCase().trim(),
    displayName: userProfile?.displayName || user?.displayName || 'User',
    uid: user?.uid || userProfile?.uid || '',
  };

  // Sync defaultListId when changed
  useEffect(() => {
    if (defaultListId) {
      setSelectedListId(defaultListId);
    } else if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0].id);
    }
  }, [defaultListId, lists]);

  // Start/Stop camera on open/close or mode switch
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      resetState();
      return;
    }

    if (mode === 'camera' && !capturedImage && !isScanning) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, mode, facingMode, capturedImage, isScanning]);

  const resetState = () => {
    setCapturedImage(null);
    setIsScanning(false);
    setScanError(null);
    setCameraError(null);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Unable to access camera:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Switch to photo upload below.'
          : 'Could not access camera. Please use photo upload.'
      );
      setMode('upload');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Fast capture photo directly from video element
  const capturePhoto = async () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const vWidth = video.videoWidth || 1280;
      const vHeight = video.videoHeight || 720;
      
      const maxDim = 960;
      let targetW = vWidth;
      let targetH = vHeight;
      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW * maxDim) / targetH);
          targetH = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, targetW, targetH);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
      stopCamera();

      setCapturedImage(compressedDataUrl);
      processImageOcr(compressedDataUrl);
    } catch (err: any) {
      console.error('Error capturing photo:', err);
      setScanError('Failed to capture snapshot. Please try again.');
    }
  };

  // Handle file picker or drag/drop
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawData = await fileToBase64(file);
      const compressed = await compressImage(rawData, 960, 960, 0.72);
      setCapturedImage(compressed);
      processImageOcr(compressed);
    } catch (err: any) {
      console.error('Error reading file:', err);
      setScanError('Failed to load selected photo. Please try another image.');
    }
  };

  // Send photo to Gemini OCR endpoint and immediately auto-add to the target list
  const processImageOcr = async (imageData: string) => {
    setIsScanning(true);
    setScanError(null);

    const targetList = lists.find((l) => l.id === selectedListId) || lists[0];
    const listType = targetList?.type || 'general';

    try {
      const items = await scanImageWithOcr(imageData, listType);
      
      // Filter out stationery header keywords (like "calendar", "date:", "planner", "page", etc.)
      const cleanedRawItems = items.filter(item => {
        const t = (item.title || '').trim().toLowerCase();
        if (!t) return false;
        if (['calendar', 'calendar:', 'date', 'date:', 'planner', 'daily planner', 'page', 'to do', 'todo'].includes(t)) {
          return false;
        }
        return true;
      });

      if (cleanedRawItems.length === 0) {
        setScanError('No readable text or list items found. Please try again with clear lighting.');
        setIsScanning(false);
      } else {
        // Format clean items
        const formattedItems = cleanedRawItems.map((item, idx) => {
          const storeClean = item.store && isSpecificStore(item.store) ? item.store : undefined;
          const categoryClean = item.category && isSpecificStore(item.category) ? item.category : undefined;
          return {
            title: item.title.trim(),
            quantity: item.quantity && item.quantity > 0 ? item.quantity : undefined,
            unit: item.unit || undefined,
            store: storeClean,
            category: categoryClean || storeClean,
            priority: item.priority || 'medium',
            isForToday: targetList?.title?.toLowerCase() === 'today' || targetList?.title?.toLowerCase() === "today's list",
            dueDate: (targetList?.title?.toLowerCase() === 'today' || targetList?.title?.toLowerCase() === "today's list")
              ? new Date().toISOString().split('T')[0]
              : undefined,
            order: idx,
          };
        });

        // Automatically add items to target list
        if (targetList?.id) {
          await addBatchListItems(targetList.id, formattedItems, {
            email: currentUser.email,
            displayName: currentUser.displayName,
          });

          // Trigger lightweight celebration
          try {
            confetti({
              particleCount: 35,
              spread: 60,
              origin: { y: 0.6 },
            });
          } catch (e) {}

          if (onSuccess) {
            onSuccess(formattedItems.length, targetList);
          }

          // Disappear immediately so the user is back to their list with items added
          onClose();
        }
      }
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setScanError(err.message || 'Failed to scan image. Please try again or type manually.');
      setIsScanning(false);
    }
  };

  const retakePhoto = () => {
    resetState();
    if (mode === 'camera') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  const targetList = lists.find((l) => l.id === selectedListId) || lists[0];

  const getListIcon = (type?: string) => {
    if (type === 'grocery') return <ShoppingCart className="w-5 h-5 text-amber-500" />;
    if (type === 'todo') return <CheckSquare className="w-5 h-5 text-emerald-500" />;
    return <ListTodo className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isScanning) onClose();
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocr-scan-title"
        className="relative w-full max-w-[460px] bg-[#fbfbfd] dark:bg-[#1c1c1e] text-slate-900 dark:text-slate-100 rounded-[28px] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden flex flex-col max-h-[88vh] tracking-tight antialiased animate-in zoom-in-95 duration-200"
      >
        {/* Apple-style Navigation Bar */}
        <div className="relative px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.07] bg-white/70 dark:bg-[#242426]/70 backdrop-blur-xl">
          <div className="w-7" /> {/* Left spacer for balance */}
          
          <h2 id="ocr-scan-title" className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-[#0071e3]" />
            <span>Camera Scan</span>
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isScanning}
            aria-label="Close"
            className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all active:scale-90 disabled:opacity-40"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-[13px] leading-normal">
          {/* Target List Card - Apple Reminders Style (matching ShareModal) */}
          {targetList && (
            <div className="bg-white dark:bg-[#252528] rounded-2xl p-3.5 shadow-xs border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                style={{ 
                  backgroundColor: targetList.color ? `${targetList.color}18` : 'rgba(0,113,227,0.1)',
                  border: `1px solid ${targetList.color ? `${targetList.color}30` : 'rgba(0,113,227,0.2)'}`
                }}
              >
                {getListIcon(targetList.type)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Adding directly to
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {targetList.title}
                </h3>
              </div>

              {lists.length > 1 && !isScanning && (
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-700 dark:text-slate-200 font-medium px-2.5 py-1.5 rounded-xl border-none outline-none cursor-pointer transition"
                >
                  {lists.map((l) => (
                    <option key={l.id} value={l.id} className="bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white">
                      {l.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Error Notice */}
          {scanError && !isScanning && (
            <div className="px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between gap-2 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="truncate">{scanError}</span>
              </div>
              <button
                type="button"
                onClick={retakePhoto}
                className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200 font-semibold text-[11px] shrink-0 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* STATE 1: Capturing - Camera or Upload */}
          {!capturedImage && !isScanning && (
            <div className="space-y-3.5">
              {/* iOS Segmented Source Control */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-normal uppercase">
                    Source
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#0071e3]" />
                    Auto-transcribe
                  </span>
                </div>

                <div className="bg-white dark:bg-[#252528] rounded-2xl p-1 shadow-xs border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('camera');
                      setCameraError(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      mode === 'camera'
                        ? 'bg-slate-100 dark:bg-white/[0.12] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('upload');
                      stopCamera();
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      mode === 'upload'
                        ? 'bg-slate-100 dark:bg-white/[0.12] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>
                </div>
              </div>

              {/* Mode A: Live Viewfinder */}
              {mode === 'camera' && (
                <div className="space-y-3">
                  <div className="bg-black rounded-2xl overflow-hidden shadow-xs border border-black/[0.06] dark:border-white/[0.08] relative aspect-4/3 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />

                    {/* Framing guide */}
                    <div className="absolute inset-4 border border-dashed border-white/40 rounded-xl pointer-events-none flex flex-col justify-between p-2.5">
                      <div className="self-center bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-medium text-white/90">
                        Align handwritten note or list
                      </div>
                    </div>

                    {/* Flip camera control */}
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      title="Flip camera"
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition active:scale-90"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {cameraError && (
                    <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  {/* iOS Shutter Button */}
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      aria-label="Capture and scan"
                      className="w-16 h-16 rounded-full border-3 border-white/80 dark:border-white/60 p-1 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg hover:border-white"
                    >
                      <div className="w-full h-full rounded-full bg-white dark:bg-slate-100 transition-transform active:scale-90 shadow-xs" />
                    </button>
                  </div>
                </div>
              )}

              {/* Mode B: Upload File / Drag and Drop */}
              {mode === 'upload' && (
                <label className="bg-white dark:bg-[#252528] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] p-8 text-center cursor-pointer hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition active:scale-[0.99] flex flex-col items-center justify-center gap-2 shadow-xs group">
                  <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                    <FileImage className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Choose Photo or File
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    Snap or pick a note, receipt, or handwritten list
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* STATE 2: Fast Scanning State */}
          {isScanning && (
            <div className="bg-white dark:bg-[#252528] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] p-6 text-center space-y-3.5 shadow-xs animate-in fade-in">
              {capturedImage && (
                <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] relative bg-black shadow-inner">
                  <img
                    src={capturedImage}
                    alt="Captured Scan"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-[#0071e3]/15 animate-pulse" />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0071e3]" />
                  <span>Scanning and Adding...</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Reading lines and adding items directly to {targetList.title}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
