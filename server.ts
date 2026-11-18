import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local in non-production environments if keys are not already in process.env
const envLocalPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please verify your API key in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (retries > 0 && (message.includes('429') || message.includes('RESOURCE_EXHAUSTED'))) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

function extractErrorDetails(error: unknown): { status: number; message: string } {
  const errObj = error as { status?: number; message?: string };
  const message = errObj?.message || 'Unexpected Gemini API error';
  if (typeof errObj?.status === 'number' && errObj.status >= 400 && errObj.status < 600) {
    return { status: errObj.status, message };
  }
  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
    return { status: 429, message };
  }
  if (message.includes('403') || message.includes('PERMISSION_DENIED')) {
    return { status: 403, message };
  }
  if (message.includes('400') || message.includes('API_KEY_INVALID')) {
    return { status: 400, message };
  }
  return { status: 500, message };
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

  app.post('/api/gemini/captions', async (req: Request, res: Response) => {
    try {
      const { productName, imageBase64 } = req.body as {
        productName?: string;
        imageBase64?: string | null;
      };

      const ai = getGenAIClient();
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        {
          text: `Act as an expert social media manager for a small business in Bangladesh.
Product/Shop: "${productName || 'ShopEase Store'}". Identify exactly what is in the image (if provided).
Generate three distinct, catchy social media captions (Facebook, Instagram, TikTok).
Use a mix of English and Bengali (Banglish). Facebook: Emotional/Descriptive. Instagram: Aesthetic/Hashtags. TikTok: Script Hook.
Include emojis and hashtags like #ShopEaseBD #BangladeshSME.`,
        },
      ];

      if (imageBase64) {
        const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
        if (matches && matches.length === 3) {
          parts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
        }
      }

      const captions = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: { parts },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                facebook: { type: Type.STRING },
                instagram: { type: Type.STRING },
                tiktok: { type: Type.STRING },
              },
              required: ['facebook', 'instagram', 'tiktok'],
            },
          },
        });
        return JSON.parse((response.text ?? '{}').trim());
      });

      res.json(captions);
    } catch (error) {
      const { status, message } = extractErrorDetails(error);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/gemini/insights', async (req: Request, res: Response) => {
    try {
      const { products = [], orders = [] } = req.body as {
        products?: Array<{ name: string; stock: number; price: number }>;
        orders?: Array<{ productName: string; platform: string }>;
      };

      const ai = getGenAIClient();
      const prompt = `Context: A small business seller in Bangladesh using "ShopEase".
Inventory State: ${JSON.stringify(products.map((p) => ({ name: p.name, stock: p.stock, price: p.price })))}
Recent Orders: ${JSON.stringify(orders.slice(0, 5).map((o) => ({ item: o.productName, platform: o.platform })))}

Task: Provide 3 high-impact strategic insights for the merchant.
One for Marketing, one for Inventory, one for Sales growth.
Make them specific to the Bangladeshi market context (e.g., mention F-commerce, delivery trends).
Return as JSON array of objects with: title, description, actionLabel, impact (high/medium/low), and type (marketing/inventory/sales).`;

      const insights = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: { parts: [{ text: prompt }] },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  actionLabel: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                  type: { type: Type.STRING, enum: ['marketing', 'inventory', 'sales'] },
                },
                required: ['title', 'description', 'actionLabel', 'impact', 'type'],
              },
            },
          },
        });
        return JSON.parse((response.text ?? '[]').trim());
      });

      res.json(insights);
    } catch (error) {
      const { status, message } = extractErrorDetails(error);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ShopEase server running on http://0.0.0.0:${port}`);
  });
}

startServer();
