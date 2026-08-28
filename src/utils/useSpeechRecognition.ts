import { useState, useEffect, useRef, useCallback } from 'react';

export interface SpeechRecognitionHookResult {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: (options?: { continuous?: boolean; lang?: string }) => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(onFinalResult?: (result: string) => void): SpeechRecognitionHookResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore already stopped
      }
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const startListening = useCallback((options?: { continuous?: boolean; lang?: string }) => {
    setError(null);
    if (!isSupported) {
      setError('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = options?.continuous !== undefined ? options.continuous : false;
      recognition.interimResults = true;
      recognition.lang = options?.lang || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTrans += result[0].transcript;
          } else {
            interimTrans += result[0].transcript;
          }
        }

        if (finalTrans) {
          setTranscript((prev) => {
            const updated = (prev ? prev + ' ' : '') + finalTrans.trim();
            if (onFinalResultRef.current) {
              onFinalResultRef.current(updated);
            }
            return updated;
          });
        }
        setInterimTranscript(interimTrans);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          // Normal timeout with no speech detected
          setError('No speech detected. Please speak clearly into your microphone.');
        } else if (event.error === 'network') {
          setError('Network issue connecting to voice recognition service.');
        } else {
          setError(`Voice recognition notice: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setError(err?.message || 'Failed to start microphone recording.');
      setIsListening(false);
    }
  }, [isSupported]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
