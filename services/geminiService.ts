import { SocialMediaCaptions, Product, Order, AIStrategicInsight } from "../types";

const CACHE_KEYS = {
  INSIGHTS: 'shopease_cache_insights',
};

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Generates smart captions for products via server-side Gemini endpoint.
 */
export async function generateSmartCaptions(
  productName: string,
  imageBase64?: string | null
): Promise<SocialMediaCaptions> {
  const response = await fetch('/api/gemini/captions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productName, imageBase64 }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to generate captions. Please try again.');
  }

  return data as SocialMediaCaptions;
}

/**
 * Generates AI-powered business insights based on current store state with caching.
 */
export async function getStrategicInsights(
  products: Product[],
  orders: Order[]
): Promise<AIStrategicInsight[]> {
  try {
    const cached = sessionStorage.getItem(CACHE_KEYS.INSIGHTS);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL && Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {
    sessionStorage.removeItem(CACHE_KEYS.INSIGHTS);
  }

  const response = await fetch('/api/gemini/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products, orders }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load AI strategic insights.');
  }

  try {
    sessionStorage.setItem(
      CACHE_KEYS.INSIGHTS,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch {
    // Ignore storage quota errors for cache
  }

  return data as AIStrategicInsight[];
}

/**
 * Image generation requires a billing-enabled API key.
 */
export async function generateProductPhoto(_prompt: string): Promise<string | null> {
  throw new Error(
    'AI Product Photo generation requires a billing-enabled Gemini API key. Please upload a product photo directly instead.'
  );
}
