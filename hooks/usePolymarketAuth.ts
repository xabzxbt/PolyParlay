import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { ClobClient } from "@polymarket/clob-client";
import { fetchDepositAddresses } from "@/lib/polymarket/bridge";

const POLYMARKET_CREDS_KEY = "polymarket_creds";
const PROXY_WALLET_KEY = "polymarket_proxy";

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
      if (storedProxy) setProxyWallet(storedProxy);

      if (storedCreds && storedProxy) {
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
   * Fetches the user's Polymarket Proxy Wallet address (Gnosis Safe).
   * Polymarket's bridge API returns the deposit addresses for the connected EOA,
   * where the 'polygon' address is always the user's proxy wallet.
   */
  const loadProxyWallet = useCallback(async (walletAddress: string) => {
    try {
      const res = await fetchDepositAddresses(walletAddress);
      // The bridge API usually returns an array or an object. We look for Polygon.
      // Usually res = [{ network: "polygon", address: "0x..." }, ...] or similar.
      let proxy = walletAddress; // Fallback to EOA

      if (Array.isArray(res)) {
        const poly = res.find((r: any) => r.network?.toLowerCase() === "polygon");
        if (poly && poly.address) proxy = poly.address;
      } else if (res && typeof res === "object") {
        if (res.polygon) proxy = res.polygon;
        else if (res.address) proxy = res.address;
      }

      setProxyWallet(proxy);
      localStorage.setItem(`${PROXY_WALLET_KEY}_${walletAddress}`, proxy);
      return proxy;
    } catch (e) {
      console.error("Failed to fetch Polymarket Proxy address:", e);
      return walletAddress; // fallback
    }
  }, []);

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
