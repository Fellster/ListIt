import React, { useState, useRef, useEffect } from 'react';
import { ListModel } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { addBatchListItems } from '../services/listService';
import { scanImageWithOcr, compressImage, fileToBase64 } from '../services/ocrService';
import { isSpecificStore } from '../utils/groceryCategorizer';
import confetti from 'canvas-confetti';
import {
  Camera,
  X,
  Upload,
  Sparkles,
  Check,
  RotateCw,
  RefreshCw,
  AlertCircle,
  FileImage,
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
  const { activeAccent } = useTheme();

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
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Image & Scan State
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [addedSuccess, setAddedSuccess] = useState<{
    count: number;
    listTitle: string;
    items: { title: string; quantity?: number; unit?: string }[];
  } | null>(null);

  // Current active user
  const currentUser = {
    email: (userProfile?.email || user?.email || 'keithfell1@gmail.com').toLowerCase(),
    displayName: userProfile?.displayName || user?.displayName || 'Keith Fell',
    uid: user?.uid || userProfile?.uid || 'user_keithfell1_gmail_com',
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

    if (mode === 'camera' && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, mode, facingMode, capturedImage]);

  const resetState = () => {
    setCapturedImage(null);
    setIsScanning(false);
    setScanError(null);
    setAddedSuccess(null);
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
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Unable to access camera:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission was denied. Please allow camera access or use photo upload.'
          : 'Could not access the camera device. Please use photo upload.'
      );
      setMode('upload');
      setIsCameraActive(false);
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
    setIsCameraActive(false);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture photo directly from live video element with optimized dimensions
  const capturePhoto = async () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const vWidth = video.videoWidth || 1280;
      const vHeight = video.videoHeight || 720;
      
      const maxDim = 1200;
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
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      stopCamera();

      setCapturedImage(compressedDataUrl);
      processImageOcr(compressedDataUrl);
    } catch (err: any) {
      console.error('Error capturing snapshot:', err);
      setScanError('Failed to capture picture. Please try again.');
    }
  };

  // Handle file picker or drag/drop
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawData = await fileToBase64(file);
      const compressed = await compressImage(rawData, 1200, 1200, 0.8);
      setCapturedImage(compressed);
      processImageOcr(compressed);
    } catch (err: any) {
      console.error('Error reading file:', err);
      setScanError('Failed to load selected photo. Please try another image.');
    }
  };

  // Send photo to Gemini OCR endpoint and immediately auto-add to the open list
  const processImageOcr = async (imageData: string) => {
    setIsScanning(true);
    setScanError(null);
    setAddedSuccess(null);

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
        setScanError('No readable text or list items were found in this image. Please try again with clearer lighting or closer framing.');
      } else {
        // Prepare clean items containing strictly what was written
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

        // Automatically add directly to open list
        if (targetList?.id) {
          await addBatchListItems(targetList.id, formattedItems, {
            email: currentUser.email,
            displayName: currentUser.displayName,
          });

          // Trigger celebration confetti
          try {
            confetti({
              particleCount: 55,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
            });
          } catch (e) {}

          setAddedSuccess({
            count: formattedItems.length,
            listTitle: targetList.title,
            items: formattedItems,
          });

          if (onSuccess) {
            onSuccess(formattedItems.length, targetList);
          }

          // Auto-close modal after brief visual confirmation
          setTimeout(() => {
            onClose();
          }, 850);
        }
      }
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setScanError(err.message || 'Failed to scan image. Please try again or type manually.');
    } finally {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs font-bold"
              style={{ backgroundColor: activeAccent.primary }}
            >
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Camera OCR Scan
                </h2>
                <span
                  className="px-2 py-0.5 text-[10px] font-bold rounded-full border flex items-center gap-1"
                  style={{
                    backgroundColor: activeAccent.light,
                    color: activeAccent.text,
                    borderColor: activeAccent.border,
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-Add
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Snap or upload a photo to auto-add items directly to your list
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

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* STATE 1: Live Camera View or Upload Picker (before capture) */}
          {!capturedImage && !isScanning && !addedSuccess && (
            <div className="space-y-4">
              {/* Mode switch tabs */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode('camera');
                    setCameraError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    mode === 'camera'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Live Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('upload');
                    stopCamera();
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    mode === 'upload'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </button>
              </div>

              {/* Mode 1: Live Camera Viewfinder */}
              {mode === 'camera' && (
                <div className="space-y-3">
                  <div className="relative w-full aspect-4/3 sm:aspect-16/10 bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-800">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />

                    {/* Viewfinder Target Framing Overlay */}
                    <div className="absolute inset-4 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                      <div className="flex justify-between text-[10px] font-bold text-white/80 uppercase tracking-wider bg-black/40 px-2 py-1 rounded backdrop-blur-xs self-center">
                        Align handwritten note or list
                      </div>
                      <div className="text-center text-[10px] text-white/70 bg-black/40 px-2 py-1 rounded backdrop-blur-xs self-center">
                        Hold steady & ensure clear lighting
                      </div>
                    </div>

                    {/* Camera Control Buttons Overlay */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition shadow-md"
                        title="Flip Camera (Front/Rear)"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {cameraError ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span>{cameraError}</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Shutter Capture Button */}
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      id="btn-snap-photo"
                      onClick={capturePhoto}
                      className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-slate-900 border-4 border-slate-300 dark:border-slate-700 shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      title="Take Picture & Auto-Add with OCR"
                    >
                      <div
                        className="w-11 h-11 rounded-full transition-transform group-hover:scale-90"
                        style={{ backgroundColor: activeAccent.primary }}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Mode 2: Photo File Upload / Drag and Drop */}
              {mode === 'upload' && (
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 rounded-2xl cursor-pointer transition p-6 text-center group">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-3 shadow-xs group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: activeAccent.primary }}
                    >
                      <FileImage className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Click to choose photo or drag & drop here
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      JPG, PNG, WebP or HEIC supported
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* STATE 2: Image Captured & OCR Processing in Progress */}
          {isScanning && (
            <div className="space-y-4 text-center py-6 animate-in fade-in">
              <div className="relative w-full max-w-sm mx-auto aspect-4/3 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 bg-black">
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured Scan"
                    className="w-full h-full object-cover opacity-80"
                  />
                )}
                {/* Laser Scanning Line Animation */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-bounce top-1/2" />
                <div className="absolute inset-0 bg-emerald-500/10 animate-pulse pointer-events-none" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>Reading Handwriting & Adding to List...</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Extracting written items and automatically adding them to {targetList.title}...
                </p>
              </div>
            </div>
          )}

          {/* STATE 3: Scan Error */}
          {scanError && !isScanning && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-200 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-rose-900 dark:text-rose-100">Scan Notice</h4>
                  <p className="mt-0.5">{scanError}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                {capturedImage && (
                  <button
                    type="button"
                    onClick={() => processImageOcr(capturedImage)}
                    className="px-3 py-1.5 font-bold text-white rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    style={{ backgroundColor: activeAccent.primary }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Retake Photo</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: Auto-Added Success Confirmation */}
          {addedSuccess && !isScanning && (
            <div className="space-y-4 py-2 animate-in fade-in zoom-in-95">
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md animate-bounce">
                  <Check className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-emerald-900 dark:text-emerald-100">
                    Added {addedSuccess.count} {addedSuccess.count === 1 ? 'item' : 'items'} to {addedSuccess.listTitle}!
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    Your scanned items were automatically added directly to your open list.
                  </p>
                </div>

                {/* Items chips preview */}
                <div className="flex flex-wrap justify-center gap-1.5 max-h-36 overflow-y-auto p-1">
                  {addedSuccess.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-semibold rounded-lg shadow-2xs"
                    >
                      {item.quantity ? `${item.quantity} ${item.unit || ''} ` : ''}{item.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            {addedSuccess ? 'Done' : 'Cancel'}
          </button>

          {addedSuccess && (
            <button
              type="button"
              onClick={retakePhoto}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan Another Photo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
