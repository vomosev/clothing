'use client';

import { createContext, useContext, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

const STORAGE_KEY = 'monolith.cart';

const CartContext = createContext(null);

function lineKey(item) {
  return `${item.productId}::${item.size || 'ONE'}`;
}

function sanitizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const productId = Number(raw.productId);
  const quantity = Number(raw.quantity);
  const price = Number(raw.price_cents);
  if (!Number.isFinite(productId) || productId <= 0) return null;
  if (!Number.isFinite(price) || price < 0) return null;
  return {
    productId,
    slug: typeof raw.slug === 'string' ? raw.slug : '',
    name: typeof raw.name === 'string' ? raw.name : 'Item',
    size: typeof raw.size === 'string' && raw.size ? raw.size : 'ONE',
    price_cents: Math.round(price),
    quantity: Number.isFinite(quantity) && quantity > 0 ? Math.min(Math.round(quantity), 20) : 1,
    imageKey: typeof raw.imageKey === 'string' ? raw.imageKey : '',
  };
}

function readStorage() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];
    return list.map(sanitizeItem).filter(Boolean);
  } catch (err) {
    // Corrupt or unavailable storage must never break the app.
    return [];
  }
}

function writeStorage(items) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  } catch (err) {
    // Quota exceeded or private-mode storage — safe to ignore.
  }
}

const initialState = { items: [], hydrated: false };

function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return { items: action.items, hydrated: true };

    case 'add': {
      const incoming = sanitizeItem(action.item);
      if (!incoming) return state;
      const key = lineKey(incoming);
      const existing = state.items.find((line) => lineKey(line) === key);
      if (existing) {
        return {
          ...state,
          items: state.items.map((line) =>
            lineKey(line) === key
              ? { ...line, quantity: Math.min(line.quantity + incoming.quantity, 20) }
              : line
          ),
        };
      }
      return { ...state, items: [...state.items, incoming] };
    }

    case 'remove':
      return {
        ...state,
        items: state.items.filter(
          (line) => lineKey(line) !== `${action.productId}::${action.size || 'ONE'}`
        ),
      };

    case 'quantity': {
      const key = `${action.productId}::${action.size || 'ONE'}`;
      const quantity = Number(action.quantity);
      if (!Number.isFinite(quantity) || quantity < 1) {
        return { ...state, items: state.items.filter((line) => lineKey(line) !== key) };
      }
      return {
        ...state,
        items: state.items.map((line) =>
          lineKey(line) === key ? { ...line, quantity: Math.min(Math.round(quantity), 20) } : line
        ),
      };
    }

    case 'clear':
      return { ...state, items: [] };

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydratedRef = useRef(false);

  useEffect(() => {
    dispatch({ type: 'hydrate', items: readStorage() });
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    writeStorage(state.items);
  }, [state.items, state.hydrated]);

  useEffect(() => {
    function onStorage(event) {
      if (event.key !== STORAGE_KEY) return;
      dispatch({ type: 'hydrate', items: readStorage() });
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addItem = useCallback((item) => {
    dispatch({ type: 'add', item });
  }, []);

  const removeItem = useCallback((productId, size) => {
    dispatch({ type: 'remove', productId, size });
  }, []);

  const setQuantity = useCallback((productId, size, quantity) => {
    dispatch({ type: 'quantity', productId, size, quantity });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'clear' });
  }, []);

  const count = useMemo(
    () => state.items.reduce((total, line) => total + line.quantity, 0),
    [state.items]
  );

  const subtotalCents = useMemo(
    () => state.items.reduce((total, line) => total + line.price_cents * line.quantity, 0),
    [state.items]
  );

  const value = useMemo(
    () => ({
      items: state.items,
      hydrated: state.hydrated,
      addItem,
      removeItem,
      setQuantity,
      clear,
      count,
      subtotalCents,
    }),
    [state.items, state.hydrated, addItem, removeItem, setQuantity, clear, count, subtotalCents]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside a CartProvider');
  }
  return ctx;
}

export default CartContext;