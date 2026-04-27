import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getProductById } from './foodCatalog';

type CartMap = Record<string, number>;

type FoodContextValue = {
  cart: CartMap;
  cartTotalRub: number;
  cartItemCount: number;
  addToCart: (productId: string, qty?: number) => void;
  setCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  decFromCart: (productId: string) => void;
  clearCart: () => void;
};

const FoodContext = createContext<FoodContextValue | undefined>(undefined);

function cartTotal(c: CartMap): number {
  let t = 0;
  for (const [id, q] of Object.entries(c)) {
    const p = getProductById(id);
    if (p && q > 0) t += p.priceRub * q;
  }
  return t;
}

function cartCount(c: CartMap): number {
  return Object.values(c).reduce((a, b) => a + b, 0);
}

export function FoodProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartMap>({});

  const addToCart = useCallback((productId: string, qty: number = 1) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] ?? 0) + Math.max(1, Math.floor(qty)),
    }));
  }, []);

  const decFromCart = useCallback((productId: string) => {
    setCart((prev) => {
      const n = (prev[productId] ?? 0) - 1;
      if (n <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: n };
    });
  }, []);

  const setCartQty = useCallback((productId: string, qty: number) => {
    const n = Math.floor(qty);
    if (!Number.isFinite(n) || n < 1) {
      setCart((prev) => {
        const { [productId]: _, ...rest } = prev;
        return rest;
      });
      return;
    }
    const capped = Math.min(n, 999);
    setCart((prev) => ({ ...prev, [productId]: capped }));
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({});
  }, []);

  const value = useMemo(
    () => ({
      cart,
      cartTotalRub: cartTotal(cart),
      cartItemCount: cartCount(cart),
      addToCart,
      setCartQty,
      removeFromCart,
      decFromCart,
      clearCart,
    }),
    [cart, addToCart, setCartQty, removeFromCart, decFromCart, clearCart],
  );

  return <FoodContext.Provider value={value}>{children}</FoodContext.Provider>;
}

export function useFoodCart() {
  const ctx = useContext(FoodContext);
  if (!ctx) throw new Error('useFoodCart вне FoodProvider');
  return ctx;
}
