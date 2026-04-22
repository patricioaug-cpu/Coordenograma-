import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Mock Email Notification (as requested in RF-Trial/Login)
  app.post('/api/notify-login', async (req, res) => {
    const { nome, email, data_hora } = req.body;
    console.log(`[EMAIL NOTIFICATION SENT]
    To: patricioaug@gmail.com
    Subject: Novo Login no Sistema Coordenograma
    Body: 
    Nome: ${nome}
    Email: ${email}
    Data/Hora: ${data_hora}
    `);
    
    // We could use Gemini here to format a more professional log or message if needed
    res.json({ sent: true });
  });

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
