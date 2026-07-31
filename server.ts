import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import addItemHandler from './api/add-item.js';
import verifyPasscodeHandler from './api/verify-passcode.js';
import saveArchiveHandler from './api/save-archive.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mount /api/add-item route
  app.all('/api/add-item', async (req, res) => {
    try {
      await addItemHandler(req, res);
    } catch (err: any) {
      console.error('API Handler Error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  // Mount /api/save-archive route
  app.all('/api/save-archive', async (req, res) => {
    try {
      await saveArchiveHandler(req, res);
    } catch (err: any) {
      console.error('Save Archive API Handler Error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  // Mount /api/verify-passcode route
  app.all('/api/verify-passcode', async (req, res) => {
    try {
      await verifyPasscodeHandler(req, res);
    } catch (err: any) {
      console.error('Verify Passcode API Handler Error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  // Serve archive.json directly
  app.get('/archive.json', (req, res) => {
    const archivePath = path.join(process.cwd(), 'archive.json');
    res.sendFile(archivePath);
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
