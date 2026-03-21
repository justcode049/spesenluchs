"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSave<T>(
  value: T,
  saveFn: (v: T) => Promise<void>,
  delay = 800
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fadeRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initialRef = useRef(true);
  const latestValue = useRef(value);
  const saveFnRef = useRef(saveFn);

  saveFnRef.current = saveFn;
  latestValue.current = value;

  useEffect(() => {
    // Skip initial render
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (fadeRef.current) clearTimeout(fadeRef.current);

    timeoutRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await saveFnRef.current(latestValue.current);
        setStatus("saved");
        fadeRef.current = setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
      }
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, delay]);

  return status;
}

export function useImmediateSave() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const fadeRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(async (saveFn: () => Promise<void>) => {
    if (fadeRef.current) clearTimeout(fadeRef.current);
    setStatus("saving");
    try {
      await saveFn();
      setStatus("saved");
      fadeRef.current = setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }, []);

  return { status, save };
}
