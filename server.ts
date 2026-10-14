import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import ocrHandler from './api/ocr-scan';

dotenv.config();

const PORT = 3000;

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

  // Public App Configuration endpoint
  app.get('/api/app-config', (_req, res) => {
    const devUrl = process.env.APP_URL || '';
    const sharedUrl =
      process.env.SHARED_APP_URL ||
      (devUrl.includes('ais-dev-') ? devUrl.replace('ais-dev-', 'ais-pre-') : '') ||
      'https://ais-pre-4ewykb3pq2vqg5p4h44jfk-301569695870.us-east5.run.app';

    res.json({
      publicAppUrl: sharedUrl,
      devAppUrl: devUrl,
    });
  });

  // Same authenticated handler used by Vercel and local development.
  app.post('/api/ocr-scan', ocrHandler);

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
