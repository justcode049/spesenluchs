"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ReceiptImage({ imagePath }: { imagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);

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

  if (!url) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-gray-100">
        <span className="text-sm text-gray-400">Bild wird geladen...</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Beleg"
      className="w-full rounded-lg border border-gray-200 object-contain max-h-96"
    />
  );
}
