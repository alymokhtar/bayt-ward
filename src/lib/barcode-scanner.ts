import { useCallback } from "react";

export function isBarcodeSubmitKey(key: string): boolean {
  return key === "Enter" || key === "Tab";
}

export function useBarcodeScanner<T extends HTMLInputElement>(
  onScan: (value: string) => void | Promise<void>,
  inputRef?: React.RefObject<T | null>
) {
  const focusInput = useCallback(() => {
    if (!inputRef?.current) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputRef]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<T>) => {
      if (!isBarcodeSubmitKey(event.key)) return;

      const value = event.currentTarget.value.trim();
      if (!value) return;

      event.preventDefault();
      void onScan(value);
    },
    [onScan]
  );

  return { handleKeyDown, focusInput };
}
