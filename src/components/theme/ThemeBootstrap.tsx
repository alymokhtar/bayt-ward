"use client";

import {
  applyThemeAccentToDocument,
  readStoredThemeAccent,
} from "@/lib/theme-client";
import { useEffect } from "react";

interface ThemeBootstrapProps {
  userId: string;
}

export default function ThemeBootstrap({ userId }: ThemeBootstrapProps) {
  useEffect(() => {
    const storedAccent = readStoredThemeAccent(userId);
    if (storedAccent) {
      applyThemeAccentToDocument(storedAccent);
    }
  }, [userId]);

  return null;
}
