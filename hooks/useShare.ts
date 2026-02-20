"use client";
import { useState, useCallback } from "react";

export function useShareParlay() {
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const share = useCallback(async (legs: any[], stake: number, combinedOdds: number) => {
    setIsSharing(true);
    try {
      const res = await fetch("/api/parlay/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legs, stake, combinedOdds }),
      });
      const data = await res.json();
      if (data.success) {
        setShareUrl(data.url);

        // Try native share, fallback to clipboard
        if (navigator.share) {
          await navigator.share({
            title: `PolyParlay — ${legs.length}-Leg Parlay (×${combinedOdds.toFixed(1)})`,
            text: `Check out my ${legs.length}-leg parlay with ×${combinedOdds.toFixed(1)} odds!`,
            url: data.url,
          });
        } else {
          await navigator.clipboard.writeText(data.url);
        }
        return data.url;
      }
    } catch (err) {
    } finally {
      setIsSharing(false);
    }
    return null;
  }, []);

  return { share, isSharing, shareUrl };
}
