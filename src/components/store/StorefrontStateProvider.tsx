"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Promotion } from "@/lib/promotions";

export type StoreFavoriteItem = {
  id: string;
  name: string;
  href: string;
  imageUrl: string | null;
  priceLabel: string;
};

export type StoreCartItem = {
  id: string;
  productId: string;
  categoryId: string;
  variantId: string;
  name: string;
  href: string;
  imageUrl: string | null;
  color?: string;
  size?: string;
  unitPrice: number;
  currencySymbol: string;
  quantity: number;
  stockQuantity?: number;
};

type StorefrontState = {
  cartItems: StoreCartItem[];
  favoriteItems: StoreFavoriteItem[];
  cartCount: number;
  favoritesCount: number;
  activePromotions: Promotion[];
  addToCart: (item: Omit<StoreCartItem, "id" | "quantity">, quantity?: number) => void;
  updateCartQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (item: StoreFavoriteItem) => void;
  removeFavorite: (productId: string) => void;
};

const CART_STORAGE_KEY = "bayt-ward-store-cart";
const FAVORITES_STORAGE_KEY = "bayt-ward-store-favorites";

const StorefrontStateContext = createContext<StorefrontState | null>(null);

function readStoredItems<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(key);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getCartItemId(productId: string, variantId: string) {
  return `${productId}:${variantId}`;
}

export function StorefrontStateProvider({
  children,
  activePromotions,
}: {
  children: ReactNode;
  activePromotions: Promotion[];
}) {
  const [cartItems, setCartItems] = useState<StoreCartItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<StoreFavoriteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCartItems(readStoredItems<StoreCartItem>(CART_STORAGE_KEY));
    setFavoriteItems(readStoredItems<StoreFavoriteItem>(FAVORITES_STORAGE_KEY));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteItems));
  }, [favoriteItems, hydrated]);

  const addToCart = useCallback(
    (item: Omit<StoreCartItem, "id" | "quantity">, quantity = 1) => {
      const nextQuantity = Math.max(1, Math.floor(quantity));
      const id = getCartItemId(item.productId, item.variantId);
      const stockLimit = Number.isSafeInteger(item.stockQuantity)
        ? Math.max(0, item.stockQuantity ?? 0)
        : Number.POSITIVE_INFINITY;

      if (stockLimit === 0) return;

      setCartItems((current) => {
        const existing = current.find((cartItem) => cartItem.id === id);

        if (existing) {
          return current.map((cartItem) =>
            cartItem.id === id
              ? {
                  ...cartItem,
                  ...item,
                  quantity: Math.min(cartItem.quantity + nextQuantity, stockLimit),
                }
              : cartItem
          );
        }

        return [
          ...current,
          { ...item, id, quantity: Math.min(nextQuantity, stockLimit) },
        ];
      });
    },
    []
  );

  const updateCartQuantity = useCallback((id: string, quantity: number) => {
    setCartItems((current) => {
      const item = current.find((cartItem) => cartItem.id === id);
      if (!item) return current;

      const stockLimit = Number.isSafeInteger(item.stockQuantity)
        ? Math.max(0, item.stockQuantity ?? 0)
        : item.quantity;
      const nextQuantity = Math.min(
        Math.max(0, Math.floor(quantity)),
        stockLimit,
      );

      return nextQuantity === 0
        ? current.filter((cartItem) => cartItem.id !== id)
        : current.map((cartItem) =>
            cartItem.id === id
              ? { ...cartItem, quantity: nextQuantity }
              : cartItem
          );
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const isFavorite = useCallback(
    (productId: string) => favoriteItems.some((item) => item.id === productId),
    [favoriteItems]
  );

  const toggleFavorite = useCallback((item: StoreFavoriteItem) => {
    setFavoriteItems((current) =>
      current.some((favorite) => favorite.id === item.id)
        ? current.filter((favorite) => favorite.id !== item.id)
        : [item, ...current]
    );
  }, []);

  const removeFavorite = useCallback((productId: string) => {
    setFavoriteItems((current) => current.filter((item) => item.id !== productId));
  }, []);

  const value = useMemo<StorefrontState>(
    () => ({
      cartItems,
      favoriteItems,
      activePromotions,
      cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      favoritesCount: favoriteItems.length,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      isFavorite,
      toggleFavorite,
      removeFavorite,
    }),
    [
      addToCart,
      cartItems,
      clearCart,
      favoriteItems,
      activePromotions,
      isFavorite,
      removeFavorite,
      removeFromCart,
      toggleFavorite,
      updateCartQuantity,
    ]
  );

  return (
    <StorefrontStateContext.Provider value={value}>
      {children}
    </StorefrontStateContext.Provider>
  );
}

export function useStorefrontState() {
  const context = useContext(StorefrontStateContext);

  if (!context) {
    throw new Error("useStorefrontState must be used inside StorefrontStateProvider");
  }

  return context;
}
