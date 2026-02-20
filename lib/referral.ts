// Referral system — simple URL-based tracking
// Usage: polyparlay.xyz?ref=0xABC123
//
// On first visit with ?ref= param, stores referrer in localStorage
// On bet placement, includes referrer in order metadata
// Builder revenue share: referrer gets 10% of builder earnings from their referrals

const REF_KEY = "polyparlay_referrer";
const SELF_REF_KEY = "polyparlay_my_ref";

export function captureReferral(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref && ref.length > 3) {
    const existing = localStorage.getItem(REF_KEY);
    if (!existing) {
      localStorage.setItem(REF_KEY, ref);
    }
    // Clean URL without losing other params
    params.delete("ref");
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
    return ref;
  }
  return localStorage.getItem(REF_KEY);
}

function getReferrer(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REF_KEY) || "xabzxbt";
}

function getMyReferralLink(address?: string): string {
  if (typeof window === "undefined") return "";
  const ref = address || localStorage.getItem(SELF_REF_KEY) || "";
  if (address) localStorage.setItem(SELF_REF_KEY, address);
  const base = window.location.origin;
  return ref ? `${base}?ref=${ref}` : base;
}

function setMyRefAddress(address: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SELF_REF_KEY, address);
}

// Stats tracking (localStorage-based for now, can be moved to backend later)
function trackReferralBet(amount: number) {
  if (typeof window === "undefined") return;
  const ref = getReferrer();
  if (!ref) return;
  const key = `polyparlay_ref_bets_${ref}`;
  const current = JSON.parse(localStorage.getItem(key) || '{"count":0,"volume":0}');
  current.count += 1;
  current.volume += amount;
  localStorage.setItem(key, JSON.stringify(current));
}

function getReferralStats(): { totalReferred: number; referralLink: string } {
  if (typeof window === "undefined") return { totalReferred: 0, referralLink: "" };
  // Count unique referrals (simplified — in production this would be backend)
  const ref = localStorage.getItem(SELF_REF_KEY);
  return {
    totalReferred: 0, // Would come from backend in production
    referralLink: ref ? `${window.location.origin}?ref=${ref}` : "",
  };
}
