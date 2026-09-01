import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const PORT = 3000;

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not configured. OCR may be limited.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

async function startServer() {
  const app = express();

  // Increase payload limit for base64 camera image uploads
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ 
      status: 'ok', 
      hasGeminiKey: !!process.env.GEMINI_API_KEY 
    });
  });

  // OCR Scan Endpoint
  app.post('/api/ocr-scan', async (req, res) => {
    try {
      const { image, mimeType = 'image/jpeg', listType = 'general', customPrompt } = req.body;

      if (!image) {
        return res.status(400).json({ 
          error: 'No image data provided. Please provide a base64 encoded image string.' 
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: 'GEMINI_API_KEY is not configured in the server environment.' 
        });
      }

      // Extract raw base64 data if prefixed with data:image/...;base64,
      const cleanBase64 = image.includes('base64,') 
        ? image.split('base64,')[1] 
        : image;

      const ai = getGeminiClient();

      const promptText = customPrompt || `
You are a precise optical character recognition (OCR) line transcriber for handwriting and text in images.

Read all handwritten or printed text in the image line by line.

CRITICAL MANDATES:
1. EACH AND EVERY LINE OF TEXT MUST BE CONSIDERED AND EXTRACTED AS ITS OWN SEPARATE ITEM.
   - Do NOT combine, merge, group, or join multiple lines together.
   - Every single line, row, or bullet point on the paper is an independent item in the list.
   - If there are 8 lines of text, output exactly 8 items in the array.
2. ONLY extract what is EXPLICITLY WRITTEN on each line.
   - Do NOT add, infer, extrapolate, or hallucinate any unwritten words, brands, stores, or categories.
   - Ignore pre-printed notebook/stationery headers (such as "Calendar", "Date:", "Daily Planner", "Notes") and extract the actual tasks, items, or notes.
3. For each line/item:
   - "title": The exact text of that single line (strip leading bullets "•", dashes "-", checkboxes "[ ]", or line numbers "1.", "2.").
   - "quantity": Only if a specific quantity number was written on that line (e.g. 2 for "2 milk"). Otherwise null.
   - "unit": Only if a measurement unit was written on that line (e.g. "lbs", "gallon", "box", "can"). Otherwise null.
   - "store": Only if a store name was explicitly written on that line. Otherwise null.
   - "category": Only if a category heading was written on that line. Otherwise null.
   - "priority": Default "medium". Set to "urgent" or "high" only if explicitly marked (e.g. "URGENT", "!", "ASAP").
   - "rawLine": The verbatim text of that single line.

Return an array containing one entry for each line of text found in the image.
`;

      const candidateModels = [
        'gemini-3.1-flash-lite',
        'gemini-3.7-flash',
        'gemini-flash-latest',
      ];
      let response: any = null;
      let lastError: any = null;

      for (const modelName of candidateModels) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType || 'image/jpeg',
                      data: cleanBase64,
                    },
                  },
                  {
                    text: promptText,
                  },
                ],
              },
              config: {
                // Disable thinking budget to achieve near-instant OCR latency
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  description: 'List of extracted tasks or grocery items from the image OCR scan',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: 'Exact item name or task title' },
                      quantity: { type: Type.NUMBER, description: 'Optional quantity number' },
                      unit: { type: Type.STRING, description: 'Optional measurement unit' },
                      store: { type: Type.STRING, description: 'Optional store' },
                      category: { type: Type.STRING, description: 'Optional category' },
                      priority: { type: Type.STRING, description: 'Priority level (urgent, high, medium, low)' },
                      rawLine: { type: Type.STRING, description: 'Original verbatim line from image' },
                    },
                    required: ['title'],
                  },
                },
              },
            });

            if (response?.text) {
              break; // Successfully got response
            }
          } catch (modelErr: any) {
            lastError = modelErr;
            console.warn(`OCR attempt with model ${modelName} (attempt ${attempt + 1}) failed:`, modelErr?.message || modelErr);
            // Quick backoff before retry
            await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          }
        }
        if (response?.text) break;
      }

      if (!response?.text && lastError) {
        throw lastError;
      }

      const responseText = response.text?.trim() || '[]';
      let extractedItems = [];

      try {
        extractedItems = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing Gemini JSON response:', parseError, responseText);
        // Fallback regex extraction if needed
        const matches = responseText.match(/\{[\s\S]*?\}/g);
        if (matches) {
          extractedItems = matches.map((m) => {
            try { return JSON.parse(m); } catch { return null; }
          }).filter(Boolean);
        }
      }

      if (!Array.isArray(extractedItems)) {
        extractedItems = extractedItems ? [extractedItems] : [];
      }

      res.json({
        success: true,
        count: extractedItems.length,
        items: extractedItems,
      });
    } catch (err: any) {
      console.error('Server OCR error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to process image OCR scan.',
      });
    }
  });

  // Setup Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
