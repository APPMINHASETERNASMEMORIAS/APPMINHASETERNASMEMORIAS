import express from 'express';
import { createServer as createViteServer } from 'vite';
import app from './server.js';

async function startDevServer() {
  const PORT = process.env.PORT || 3000;

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  app.listen(PORT as number, '0.0.0.0', () => {
    console.log(`Dev server running on http://0.0.0.0:${PORT}`);
  });
}

startDevServer().catch(console.error);
