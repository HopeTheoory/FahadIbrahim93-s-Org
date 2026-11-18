import { Product, Order, Activity } from "../types";

const KEYS = {
  PRODUCTS: 'shopease_inventory_v1',
  ORDERS: 'shopease_orders_v1',
  ACTIVITIES: 'shopease_activities_v1',
  HAS_SEEDED: 'shopease_initialized_v1'
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const storageService = {
  saveProducts: (products: Product[]) => {
    try {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error("Storage Error (Products):", e);
    }
  },

  getProducts: (): Product[] | null => {
    try {
      return safeParse<Product[]>(localStorage.getItem(KEYS.PRODUCTS));
    } catch {
      return null;
    }
  },

  saveOrders: (orders: Order[]) => {
    try {
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error("Storage Error (Orders):", e);
    }
  },

  getOrders: (): Order[] | null => {
    try {
      return safeParse<Order[]>(localStorage.getItem(KEYS.ORDERS));
    } catch {
      return null;
    }
  },

  saveActivities: (activities: Activity[]) => {
    try {
      localStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
    } catch (e) {
      console.error("Storage Error (Activities):", e);
    }
  },

  getActivities: (): Activity[] | null => {
    try {
      return safeParse<Activity[]>(localStorage.getItem(KEYS.ACTIVITIES));
    } catch {
      return null;
    }
  },

  setInitialized: () => {
    try {
      localStorage.setItem(KEYS.HAS_SEEDED, 'true');
    } catch {
      // Ignore storage error
    }
  },

  isInitialized: (): boolean => {
    try {
      return localStorage.getItem(KEYS.HAS_SEEDED) === 'true';
    } catch {
      return false;
    }
  },

  clearAll: () => {
    try {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore storage error
    }
    window.location.reload();
  }
};
