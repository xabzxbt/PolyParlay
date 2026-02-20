"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";

const STORAGE_KEY = "polymarket_creds";
const MSG_TO_SIGN = "This message attests that I control the given wallet";

interface ApiKeyCreds {
  apiKey: string;
  secret: string;
  passphrase: string;
  address?: string;
}

export function usePolymarketAuth() {
  const { address, signer } = useAuth();
  const [credentials, setCredentials] = useState<ApiKeyCreds | null>(null);
  const [isDerivingKey, setIsDerivingKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setCredentials(null);
      return;
    }

    const stored = localStorage.getItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (!parsed.address && address) parsed.address = address; // Backfill if missing
        setCredentials(parsed);
      } catch {
      }
    }
  }, [address]);

  const deriveAPIKey = async (nonce: number = 0): Promise<boolean> => {

    if (!address || !signer) {
      setError("Wallet not connected");
      return false;
    }

    setIsDerivingKey(true);
    setError(null);

    try {
      const timestamp = Math.floor(Date.now() / 1000);

      const domain = {
        name: "ClobAuthDomain",
        version: "1",
        chainId: 137,
      };

      const types = {
        ClobAuth: [
          { name: "address", type: "address" },
          { name: "timestamp", type: "string" },
          { name: "nonce", type: "uint256" },
          { name: "message", type: "string" },
        ],
      };

      const value = {
        address: address.toLowerCase(), // Force lowercase for signing
        timestamp: timestamp.toString(),
        nonce,
        message: MSG_TO_SIGN,
      };


      const resolvedSigner = await signer;
      const signature = await resolvedSigner.signTypedData(domain, types, value);



      // Revert to Server Proxy strategy but with standard POST body data
      // This avoids client-side header stripping issues by proxies/browsers
      const res = await fetch("/api/derive-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address.toLowerCase(),
          signature,
          timestamp: timestamp.toString(),
          nonce,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to derive API key");
      }

      const creds: ApiKeyCreds & { address: string } = {
        apiKey: data.apiKey,
        secret: data.secret,
        passphrase: data.passphrase,
        address: address, // Add address here
      };

      localStorage.setItem(
        `${STORAGE_KEY}_${address.toLowerCase()}`,
        JSON.stringify(creds),
      );

      setCredentials(creds);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to derive API key");
      return false;
    } finally {
      setIsDerivingKey(false);
    }
  };

  const clearCredentials = () => {
    if (address) {
      localStorage.removeItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
    }
    setCredentials(null);
  };

  return {
    credentials,
    hasCredentials: !!credentials,
    isDerivingKey,
    error,
    deriveAPIKey,
    clearCredentials,
  };
}
