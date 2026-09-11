"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/api";
import { EmptyState, Spinner } from "./ui";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/**
 * The drawing file endpoint is JWT-protected, so it cannot be used directly as an
 * <iframe src>. Fetch it with the bearer token and render the resulting blob URL.
 */
export default function DrawingPreview({
  drawingId,
  mimeType,
  className = "h-[520px]",
}: {
  drawingId: number;
  mimeType: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const token = getToken();
    fetch(`${BASE}/drawings/${drawingId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Preview unavailable for this drawing");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [drawingId]);

  if (error) return <EmptyState title="No preview" hint={error} />;
  if (!url) return <Spinner label="Loading drawing…" />;

  if (mimeType.startsWith("image/")) {
    return (
      <div className={`${className} overflow-auto bg-ink-100`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Engineering drawing" className="mx-auto max-w-none" />
      </div>
    );
  }

  return <iframe src={url} title="Engineering drawing" className={`${className} w-full`} />;
}
