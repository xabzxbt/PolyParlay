"use client";
import { createContext, useContext, ReactNode, useMemo, useCallback, useEffect } from "react";
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { BrowserProvider, JsonRpcSigner } from "ethers";

interface AuthContextType {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  disconnect: () => void;
  shortAddress: string;
  signer: Promise<JsonRpcSigner | null> | null;
}

const AuthContext = createContext<AuthContextType>({
  address: undefined,
  isConnected: false,
  isConnecting: false,
  disconnect: () => { },
  shortAddress: "",
  signer: null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const wagmi = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const appKit = useAppKitAccount();

  const address = wagmi.address || (appKit.address as `0x${string}` | undefined);
  const isConnected = wagmi.isConnected || appKit.isConnected || !!address;
  const isConnecting = wagmi.isConnecting || appKit.status === "connecting";

  const shortAddress = useMemo(() => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const signer = useMemo(async () => {
    if (!walletClient) return null;
    // For ethers v6, we need to extract the underlying provider from the connector
    // However, a simple robust way if window.ethereum exists and address matches:
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const provider = new BrowserProvider((window as any).ethereum);
      const s = await provider.getSigner(address);
      if (s.address.toLowerCase() === address?.toLowerCase()) {
        return s;
      }
    }

    // Fallback: Use the transport from walletClient (works for WalletConnect via Wagmi ConnectorClient)
    try {
      const { account, chain, transport } = walletClient as any;
      const provider = new BrowserProvider(transport, chain ? {
        chainId: chain.id,
        name: chain.name,
      } : undefined);
      return await provider.getSigner(account?.address || address);
    } catch (e) {
      console.error("Failed to create ethers signer:", e);
      return null;
    }
  }, [walletClient, address]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  useEffect(() => {
    if (typeof window !== "undefined" && (wagmi.address || appKit.address)) {
    }
  }, [wagmi.isConnected, appKit.isConnected, address, signer]);

  return (
    <AuthContext.Provider
      value={{ address, isConnected, isConnecting, disconnect, shortAddress, signer }}
    >
      {children}
    </AuthContext.Provider>
  );
}
