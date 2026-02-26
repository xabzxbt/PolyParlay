import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { ClobClient } from "@polymarket/clob-client";

const POLYMARKET_CREDS_KEY = "polymarket_creds";
const PROXY_WALLET_KEY = "polymarket_proxy";

// Gnosis Safe Proxy Factory for deterministic proxy wallet derivation
const SAFE_FACTORY = "0xaacfeea03eb1561c4e67d661e40682bd20e3541b";

export function usePolymarketAuth() {
  const { address, signer } = useAuth();
  const [proxyWallet, setProxyWallet] = useState<string | null>(null);
  const [apiCreds, setApiCreds] = useState<any>(null);
  const [isL2Connected, setIsL2Connected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from local storage on load
  useEffect(() => {
    if (address) {
      const storedCreds = localStorage.getItem(`${POLYMARKET_CREDS_KEY}_${address}`);
      const storedProxy = localStorage.getItem(`${PROXY_WALLET_KEY}_${address}`);

      if (storedCreds) setApiCreds(JSON.parse(storedCreds));

      // IMPORTANT: Only set proxy if it's a valid hex string, not a serialized object
      if (storedProxy && typeof storedProxy === "string" && storedProxy.startsWith("0x")) {
        setProxyWallet(storedProxy);
      } else if (storedProxy) {
        // Clear corrupted proxy wallet data
        localStorage.removeItem(`${PROXY_WALLET_KEY}_${address}`);
      }

      if (storedCreds && storedProxy && storedProxy.startsWith("0x")) {
        setIsL2Connected(true);
      } else {
        setIsL2Connected(false);
      }
    } else {
      setIsL2Connected(false);
      setApiCreds(null);
      setProxyWallet(null);
    }
  }, [address]);

  /**
   * Safely store the proxy wallet, ensuring it's always a valid hex address string.
   */
  const saveProxyWallet = useCallback((walletAddress: string, proxy: any) => {
    // Ensure proxy is a string starting with 0x
    let safeProxy: string;

    if (typeof proxy === "string" && proxy.startsWith("0x") && proxy.length === 42) {
      safeProxy = proxy;
    } else if (typeof proxy === "string" && proxy.startsWith("0x")) {
      safeProxy = proxy; // might be a valid address with different length
    } else {
      // Fallback to EOA if proxy is invalid
      safeProxy = walletAddress;
    }

    setProxyWallet(safeProxy);
    localStorage.setItem(`${PROXY_WALLET_KEY}_${walletAddress}`, safeProxy);
    return safeProxy;
  }, []);

  /**
   * Fetches the user's Polymarket Proxy Wallet address (Gnosis Safe).
   * 
   * The proxy wallet is NOT from the Bridge API (that returns deposit addresses).
   * Instead, we derive it from the API credentials or compute via contract.
   * For users who have already logged into Polymarket.com, the proxy wallet
   * was created on their first login. We can find it by checking the
   * Gnosis Safe Factory or using the profile API.
   */
  const loadProxyWallet = useCallback(async (walletAddress: string): Promise<string> => {
    try {
      // First check if we already have a valid cached proxy
      const stored = localStorage.getItem(`${PROXY_WALLET_KEY}_${walletAddress}`);
      if (stored && typeof stored === "string" && stored.startsWith("0x") && stored.length === 42) {
        setProxyWallet(stored);
        return stored;
      }

      // Try to get proxy wallet from Polymarket's profile/settings API
      // The proxy wallet is visible at polymarket.com/settings
      try {
        const res = await fetch(`/api/proxy-wallet?address=${walletAddress}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.proxyWallet && typeof data.proxyWallet === "string" && data.proxyWallet.startsWith("0x")) {
            return saveProxyWallet(walletAddress, data.proxyWallet);
          }
        }
      } catch {
        // API route may not exist, continue
      }

      // Fallback: use EOA as proxy (for users who haven't used Polymarket before).
      // The actual proxy will be set during connectL2 when we derive API keys.
      return saveProxyWallet(walletAddress, walletAddress);
    } catch (e) {
      console.error("Failed to fetch Polymarket Proxy address:", e);
      return walletAddress; // fallback
    }
  }, [saveProxyWallet]);

  /**
   * Connects to Polymarket L2 (CLOB) by prompting the user to sign a message.
   * This generates the API keys used for gasless trading.
   */
  const connectL2 = useCallback(async () => {
    if (!address || !signer) throw new Error("Wallet not connected");
    setIsLoading(true);

    try {
      // 1. Get Proxy Wallet (Funder)
      let funder = proxyWallet;
      if (!funder) {
        funder = await loadProxyWallet(address);
      }

      const ethersSigner = await signer;
      // Patch for ethers v6 to v5 compatibility
      if (!(ethersSigner as any)._signTypedData && (ethersSigner as any).signTypedData) {
        (ethersSigner as any)._signTypedData = (ethersSigner as any).signTypedData.bind(ethersSigner);
      }

      // 2. Initialize temporary client to create/derive credentials
      // We use GNOSIS_SAFE (2) as the signature type because Polymarket uses Safe proxies
      const tempClient = new ClobClient("https://clob.polymarket.com", 137, ethersSigner as any);

      // 3. Derive API Key
      // This will prompt MetaMask to sign a standardized message
      const creds = await tempClient.deriveApiKey();

      // Save credentials locally
      setApiCreds(creds);
      localStorage.setItem(`${POLYMARKET_CREDS_KEY}_${address}`, JSON.stringify(creds));
      setIsL2Connected(true);

      return creds;
    } catch (e) {
      console.error("L2 Connection failed", e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [address, signer, proxyWallet, loadProxyWallet]);

  /**
   * Disconnect L2 (removes keys)
   */
  const disconnectL2 = useCallback(() => {
    if (address) {
      localStorage.removeItem(`${POLYMARKET_CREDS_KEY}_${address}`);
      localStorage.removeItem(`${PROXY_WALLET_KEY}_${address}`);
    }
    setApiCreds(null);
    setProxyWallet(null);
    setIsL2Connected(false);
  }, [address]);

  /**
   * Returns a ready-to-use ClobClient instance for trading
   */
  const getClient = useCallback(async () => {
    if (!address || !signer || !apiCreds || !proxyWallet) {
      throw new Error("L2 Auth not initialized");
    }
    const ethersSigner = await signer;
    // Patch for ethers v6 to v5 compatibility
    if (!(ethersSigner as any)._signTypedData && (ethersSigner as any).signTypedData) {
      (ethersSigner as any)._signTypedData = (ethersSigner as any).signTypedData.bind(ethersSigner);
    }
    const sigType = proxyWallet.toLowerCase() === address.toLowerCase() ? 0 : 2;

    return new ClobClient(
      "https://clob.polymarket.com",
      137,
      ethersSigner as any,
      apiCreds,
      sigType, // 0 for EOA, 2 for GNOSIS_SAFE
      proxyWallet // Funder address
    );
  }, [address, signer, apiCreds, proxyWallet]);

  return {
    // New exact names
    proxyWallet,
    apiCreds,
    isL2Connected,
    isLoading,
    connectL2,
    disconnectL2,
    getClient,
    loadProxyWallet,

    // Backwards compatibility with previous hook implementations
    credentials: apiCreds,
    hasCredentials: isL2Connected,
    isDerivingKey: isLoading,
    deriveAPIKey: async () => {
      try {
        await connectL2();
        return true;
      } catch (e) {
        return false;
      }
    },
    error: null as string | null
  };
}
