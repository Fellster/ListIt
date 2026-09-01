export interface OcrExtractedItem {
  id: string;
  title: string;
  quantity?: number;
  unit?: string;
  store?: string;
  category?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  rawLine?: string;
  selected?: boolean;
}

export interface OcrScanResponse {
  success: boolean;
  count: number;
  items: OcrExtractedItem[];
  error?: string;
}

/**
 * Sends image data (base64) to server-side Gemini OCR endpoint
 */
export async function scanImageWithOcr(
  imageBase64: string,
  listType: string = 'general',
  customPrompt?: string
): Promise<OcrExtractedItem[]> {
  try {
    const res = await fetch('/api/ocr-scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        listType,
        customPrompt,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      let msg = errorData.error || `OCR scan request failed with HTTP ${res.status}`;
      if (typeof msg === 'object') {
        msg = msg.message || JSON.stringify(msg);
      } else if (typeof msg === 'string' && msg.startsWith('{') && msg.includes('message')) {
        try {
          const parsed = JSON.parse(msg);
          if (parsed?.error?.message) {
            msg = parsed.error.message;
          } else if (parsed?.message) {
            msg = parsed.message;
          }
        } catch {
          // keep original msg
        }
      }
      throw new Error(msg);
    }

    const data: OcrScanResponse = await res.json();
    if (!data.success) {
      let msg = data.error || 'Failed to extract text from photo.';
      if (typeof msg === 'string' && msg.startsWith('{') && msg.includes('message')) {
        try {
          const parsed = JSON.parse(msg);
          if (parsed?.error?.message) msg = parsed.error.message;
        } catch {
          // ignore
        }
      }
      throw new Error(msg);
    }

    const extracted: OcrExtractedItem[] = [];

    (data.items || []).forEach((item, itemIdx) => {
      const fullText = (item.title || item.rawLine || '').trim();
      // Split on any newlines to ensure each line of text is strictly its own item
      const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

      if (lines.length <= 1) {
        const cleanTitle = (lines[0] || fullText)
          .replace(/^[-*•\u2022\u25E6\u2043\u2219]\s*/, '')
          .replace(/^\d+[\.\)]\s*/, '')
          .replace(/^\[[ xX]?\]\s*/, '')
          .trim();

        if (cleanTitle.length > 0) {
          extracted.push({
            ...item,
            id: `ocr_${Date.now()}_${itemIdx}_${Math.random().toString(36).substring(2, 6)}`,
            title: cleanTitle,
            selected: true,
            priority: item.priority || 'medium',
          });
        }
      } else {
        lines.forEach((line, subIdx) => {
          const cleanTitle = line
            .replace(/^[-*•\u2022\u25E6\u2043\u2219]\s*/, '')
            .replace(/^\d+[\.\)]\s*/, '')
            .replace(/^\[[ xX]?\]\s*/, '')
            .trim();

          if (cleanTitle.length > 0) {
            extracted.push({
              id: `ocr_${Date.now()}_${itemIdx}_${subIdx}_${Math.random().toString(36).substring(2, 6)}`,
              title: cleanTitle,
              selected: true,
              priority: item.priority || 'medium',
              rawLine: line,
            });
          }
        });
      }
    });

    return extracted;
  } catch (err: any) {
    console.error('Error scanning image with OCR:', err);
    throw err;
  }
}

/**
 * Helper to convert an image File/Blob to a base64 string
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Helper to compress and downscale large camera snapshots for fast OCR upload
 */
export function compressImage(
  dataUrl: string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
