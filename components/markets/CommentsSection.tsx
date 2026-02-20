"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Loader2, User } from "lucide-react";
import { shortenAddress, timeAgo } from "@/lib/utils";

interface Comment {
  address: string;
  comment: string;
  timestamp: string;
}

interface CommentsSectionProps {
  marketId: string;
  yesToken?: string;
  noToken?: string;
  yesPrice?: number;
}

export default function CommentsSection({
  marketId,
  yesToken,
  noToken,
  yesPrice = 0.5,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        market_id: marketId,
        yes_token: yesToken || "",
        no_token: noToken || "",
        yes_price: yesPrice.toString(),
      });

      const response = await fetch(`/api/comments?${params}`);
      const data = await response.json();

      if (data.success) {
        // Transform traders into comments if no actual comments exist
        // The API returns traders with their positions, which we can display
        const traderComments: Comment[] = [];

        // Add YES side traders as comments
        if (data.yesTraders && Array.isArray(data.yesTraders)) {
          data.yesTraders.slice(0, 5).forEach((trader: any) => {
            traderComments.push({
              address: trader.address || trader.proxyWallet || "",
              comment: `Holding YES position: $${trader.positionValue?.toFixed(2) || "0"} (${trader.positionSize || 0} shares)`,
              timestamp: trader.firstTrade || new Date().toISOString(),
            });
          });
        }

        // Add NO side traders as comments
        if (data.noTraders && Array.isArray(data.noTraders)) {
          data.noTraders.slice(0, 5).forEach((trader: any) => {
            traderComments.push({
              address: trader.address || trader.proxyWallet || "",
              comment: `Holding NO position: $${trader.positionValue?.toFixed(2) || "0"} (${trader.positionSize || 0} shares)`,
              timestamp: trader.firstTrade || new Date().toISOString(),
            });
          });
        }

        setComments(traderComments);
      } else {
        setComments([]);
      }
    } catch (err) {
      setError("Failed to load comments");
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && comments.length === 0) {
      fetchComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const commentCount = comments.length;

  return (
    <div className="bg-surface-1/50 border border-border-strong rounded-card overflow-hidden">
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-2/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-white">
            Trader Activity
          </span>
          <span className="text-xs text-slate-400 bg-surface-2 px-2 py-0.5 rounded-pill">
            {commentCount}
          </span>
        </div>
        <span
          className={`text-slate-400 text-sm transition-transform ${isExpanded ? "rotate-180" : ""
            }`}
        >
          ▼
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border-strong">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 animate-pulse"
                >
                  <div className="w-8 h-8 bg-surface-2 rounded-pill" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-2 rounded w-24" />
                    <div className="h-3 bg-surface-2 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={fetchComments}
                className="mt-2 text-primary text-sm hover:underline"
              >
                Retry
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No trader activity yet</p>
            </div>
          ) : (
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {comments.map((comment, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-surface-2/30 rounded-lg"
                >
                  <div className="w-8 h-8 bg-primary/20 rounded-pill flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-primary">
                        {shortenAddress(comment.address)}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {timeAgo(new Date(comment.timestamp))}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 truncate">
                      {comment.comment}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
