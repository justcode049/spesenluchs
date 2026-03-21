"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ReceiptImage({ imagePath }: { imagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    async function getSignedUrl() {
      const supabase = createClient();
      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(imagePath, 300); // 5 min expiry

      if (data?.signedUrl) {
        setUrl(data.signedUrl);
      }
    }
    getSignedUrl();
  }, [imagePath]);

  useEffect(() => {
    if (!fullscreen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  if (!url) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-gray-100">
        <span className="text-sm text-gray-400">Bild wird geladen...</span>
      </div>
    );
  }

  return (
    <>
      <img
        src={url}
        alt="Beleg"
        className="w-full cursor-zoom-in rounded-lg border border-gray-200 object-contain"
        onClick={() => setFullscreen(true)}
      />

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(false);
            }}
            aria-label="Schließen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src={url}
            alt="Beleg (Vollbild)"
            className="max-h-[95vh] max-w-[95vw] object-contain"
            style={{ touchAction: "manipulation" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
