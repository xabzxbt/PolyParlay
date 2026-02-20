import Link from "next/link";
import { Target } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4 text-primary">
          <Target size={64} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-text-muted text-sm mb-6">This market doesn&apos;t exist yet.</p>
        <Link href="/" className="bg-primary text-text-primary px-4 py-2 rounded-button font-medium hover:bg-primary-hover shadow-sm transition-colors inline-flex items-center gap-2">
          ← Back to Markets
        </Link>
      </div>
    </div>
  );
}
