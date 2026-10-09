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
  sku?: string;
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
  isHydrated: boolean;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isStoreCartItem(value: unknown): value is StoreCartItem {
  if (!isRecord(value)) return false;
  const {
    id,
    productId,
    categoryId,
    variantId,
    sku,
    name,
    href,
    imageUrl,
    color,
    size,
    unitPrice,
    currencySymbol,
    quantity,
    stockQuantity,
  } = value;

  return (
    typeof productId === "string" &&
    productId.length > 0 &&
    typeof variantId === "string" &&
    variantId.length > 0 &&
    (sku === undefined || typeof sku === "string") &&
    id === getCartItemId(productId, variantId) &&
    typeof categoryId === "string" &&
    typeof name === "string" &&
    typeof href === "string" &&
    href.length > 0 &&
    (typeof imageUrl === "string" || imageUrl === null) &&
    isOptionalString(color) &&
    isOptionalString(size) &&
    typeof unitPrice === "number" &&
    Number.isFinite(unitPrice) &&
    unitPrice >= 0 &&
    typeof currencySymbol === "string" &&
    typeof quantity === "number" &&
    Number.isSafeInteger(quantity) &&
    quantity > 0 &&
    (stockQuantity === undefined ||
      (typeof stockQuantity === "number" &&
        Number.isSafeInteger(stockQuantity) &&
        stockQuantity >= 0))
  );
}

function isStoreFavoriteItem(value: unknown): value is StoreFavoriteItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    typeof value.href === "string" &&
    value.href.length > 0 &&
    (typeof value.imageUrl === "string" || value.imageUrl === null) &&
    typeof value.priceLabel === "string"
  );
}

function readStoredItems<T>(
  key: string,
  isValidItem: (value: unknown) => value is T,
): T[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(key);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidItem);
  } catch (error) {
    console.warn(`Unable to read storefront data from localStorage (${key}).`, error);
    return [];
  }
}

function writeStoredItems<T>(key: string, items: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch (error) {
    console.error(`Unable to save storefront data to localStorage (${key}).`, error);
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
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCartItems(readStoredItems(CART_STORAGE_KEY, isStoreCartItem));
    setFavoriteItems(readStoredItems(FAVORITES_STORAGE_KEY, isStoreFavoriteItem));
    setIsHydrated(true);

    function handleStorage(event: StorageEvent) {
      try {
        if (event.storageArea !== window.localStorage) return;
      } catch (error) {
        console.warn("Unable to access localStorage while syncing storefront state.", error);
        return;
      }

      if (event.key === null || event.key === CART_STORAGE_KEY) {
        setCartItems(
          event.key === null
            ? []
            : readStoredItems(CART_STORAGE_KEY, isStoreCartItem),
        );
      }
      if (event.key === null || event.key === FAVORITES_STORAGE_KEY) {
        setFavoriteItems(
          event.key === null
            ? []
            : readStoredItems(FAVORITES_STORAGE_KEY, isStoreFavoriteItem),
        );
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    writeStoredItems(CART_STORAGE_KEY, cartItems);
  }, [cartItems, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    writeStoredItems(FAVORITES_STORAGE_KEY, favoriteItems);
  }, [favoriteItems, isHydrated]);

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
      isHydrated,
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
      isHydrated,
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
