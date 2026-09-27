"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Cart, CartItem } from "@/lib/types";

export function getItemKey(item: { id?: string; sizeId?: number }): string {
  if (item.id) return item.id;
  if (item.sizeId) return `regular-${item.sizeId}`;
  return `item-${Date.now()}`;
}

interface CartContextValue {
  cart: Cart;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }, qty?: number) => void;
  updateQuantity: (idOrSizeId: string | number, qty: number) => void;
  removeItem: (idOrSizeId: string | number) => void;
  clearCart: () => void;
  setVoucher: (code: string | null) => void;
  totalItems: number;
  subtotal: number;
}

const STORAGE_KEY = "perfume-cart";

const emptyCart: Cart = { items: [], voucherCode: null };

const CartContext = createContext<CartContextValue>({
  cart: emptyCart,
  addItem: () => {},
  updateQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
  setVoucher: () => {},
  totalItems: 0,
  subtotal: 0,
});

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Cart;
        if (parsed && Array.isArray(parsed.items)) {
          const normalizedItems = parsed.items.map((it) => ({
            ...it,
            id: getItemKey(it),
            itemType: it.itemType || (it.refillData ? "refill" : "regular"),
          }));
          setCart({ ...parsed, items: normalizedItems });
        }
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart, mounted]);

  const addItem = useCallback(
    (rawItem: Omit<CartItem, "quantity"> & { quantity?: number }, qty?: number) => {
      const finalQty =
        typeof qty === "number" && qty > 0
          ? qty
          : typeof rawItem.quantity === "number" && rawItem.quantity > 0
            ? rawItem.quantity
            : 1;

      const key = rawItem.id || (rawItem.sizeId ? `regular-${rawItem.sizeId}` : `refill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
      const item: Omit<CartItem, "quantity"> = {
        ...rawItem,
        id: key,
        itemType: rawItem.itemType || (rawItem.refillData ? "refill" : "regular"),
      };

      setCart((prev) => {
        const existing = prev.items.find((i) => getItemKey(i) === key);
        if (existing) {
          return {
            ...prev,
            items: prev.items.map((i) =>
              getItemKey(i) === key
                ? { ...i, quantity: i.quantity + finalQty }
                : i
            ),
          };
        }
        return {
          ...prev,
          items: [...prev.items, { ...item, quantity: finalQty }],
        };
      });
    },
    []
  );

  const updateQuantity = useCallback((idOrSizeId: string | number, qty: number) => {
    const matchKey = String(idOrSizeId);
    setCart((prev) => {
      if (qty <= 0) {
        return {
          ...prev,
          items: prev.items.filter((i) => getItemKey(i) !== matchKey && i.sizeId !== idOrSizeId),
        };
      }
      return {
        ...prev,
        items: prev.items.map((i) =>
          getItemKey(i) === matchKey || i.sizeId === idOrSizeId
            ? { ...i, quantity: qty }
            : i
        ),
      };
    });
  }, []);

  const removeItem = useCallback((idOrSizeId: string | number) => {
    const matchKey = String(idOrSizeId);
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((i) => getItemKey(i) !== matchKey && i.sizeId !== idOrSizeId),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCart(emptyCart);
  }, []);

  const setVoucher = useCallback((code: string | null) => {
    setCart((prev) => ({ ...prev, voucherCode: code }));
  }, []);

  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        setVoucher,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
