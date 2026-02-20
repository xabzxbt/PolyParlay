"use client";
import { useParams } from "next/navigation";
import Link from "next/link";

import { Target } from "lucide-react";

// In production, fetch shared parlay from DB and allow copying
export default function SharedParlayPage() {
  const { id } = useParams();

  return (
    <div className="max-w-[500px] mx-auto px-4 py-16 text-center">
      <div className="bg-bg-card border border-border rounded-card p-8">
        <div className="w-14 h-14 rounded-modal bg-primary-dim border border-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
          <Target size={28} />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Shared Parlay</h1>
        <p className="text-sm text-text-muted mb-6">
          Someone shared a parlay with you! Connect your wallet to copy it.
        </p>

        <div className="bg-bg-secondary border border-border rounded-button p-3 mb-6">
          <span className="text-xs font-mono text-text-muted">Share ID: {id}</span>
        </div>

        {/* In production: show parlay legs, odds, and a "Copy Parlay" button */}
        <div className="space-y-2 mb-6 text-left">
          <div className="flex items-center gap-2 p-3 bg-bg-secondary rounded-button border border-border">
            <span className="w-5 h-5 rounded-pill bg-primary-dim text-primary text-[11px] font-bold flex items-center justify-center">1</span>
            <span className="text-xs text-text-secondary flex-1">Loading parlay data...</span>
          </div>
        </div>

        <Link href="/" className="bg-primary text-text-primary px-4 py-2 rounded-button font-medium hover:bg-primary-hover shadow-sm transition-colors inline-flex items-center gap-2">
          Open PolyParlay
        </Link>
      </div>
    </div>
  );
}
