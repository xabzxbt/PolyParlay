"use client";

import { AlertTriangle } from "lucide-react";

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-red-500/10 p-4 rounded-pill mb-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Something went wrong</h2>
      <p className="text-text-secondary mb-6 max-w-md">
        We hit an unexpected error. Please try again.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium"
      >
        Try again
      </button>
    </div>
  );
}
