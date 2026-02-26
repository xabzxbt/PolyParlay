export const BRIDGE_URL = "https://bridge.polymarket.com";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DepositAddresses {
    evm?: string | { address: string; chainIds?: string[] };
    svm?: string | { address: string };
    btc?: string | { address: string };
    tron?: string | { address: string };
    [key: string]: any;
}

export interface DepositStatusItem {
    fromChainId: string;
    fromTokenAddress: string;
    fromAmountBaseUnit: string;
    toChainId: string;
    toTokenAddress: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    txHash?: string;
    createdTimeMs?: number;
}

export interface QuoteResponse {
    estCheckoutTimeMs: number;
    estInputUsd: number;
    estOutputUsd: number;
    estToTokenBaseUnit: string;
    quoteId: string;
    estFeeBreakdown?: Record<string, number>;
}

export interface SupportedChain {
    chainId: string;
    name: string;
    addressType: string;
    minDeposit: string;
    tokens: SupportedToken[];
}

export interface SupportedToken {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
}

export interface SupportedAssetsResponse {
    chains: SupportedChain[];
    [key: string]: any;
}

// ─── Chain display info ───────────────────────────────────────────────────────

export const CHAIN_INFO: Record<string, { name: string; icon: string; color: string; addressType: string }> = {
    "1": { name: "Ethereum", icon: "⟠", color: "#627EEA", addressType: "evm" },
    "137": { name: "Polygon", icon: "⬡", color: "#8247E5", addressType: "evm" },
    "42161": { name: "Arbitrum", icon: "◆", color: "#28A0F0", addressType: "evm" },
    "8453": { name: "Base", icon: "🔵", color: "#0052FF", addressType: "evm" },
    "10": { name: "Optimism", icon: "🔴", color: "#FF0420", addressType: "evm" },
    "56": { name: "BNB Chain", icon: "◈", color: "#F3BA2F", addressType: "evm" },
    "sol": { name: "Solana", icon: "◎", color: "#9945FF", addressType: "svm" },
    "btc": { name: "Bitcoin", icon: "₿", color: "#F7931A", addressType: "btc" },
};

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Returns the URL to redirect a user for depositing funds into their Polymarket wallet
 * directly via the official bridge.
 */
export function getDepositUrl(address: string): string {
    return `${BRIDGE_URL}?address=${address}`;
}

/**
 * Fetch deposit addresses from Bridge API.
 * Returns unique deposit addresses for EVM, SVM, and BTC networks.
 */
export async function fetchDepositAddresses(address: string): Promise<DepositAddresses> {
    const res = await fetch(`${BRIDGE_URL}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch deposit addresses: ${res.statusText}`);
    }

    const data = await res.json();

    // Bridge API returns { address: { evm: "0x...", svm: "...", btc: "..." }, note: "..." }
    // Unwrap the `address` field so our DepositAddresses type gets the flat strings
    if (data?.address && typeof data.address === "object") {
        return data.address;
    }

    return data;
}

/**
 * Fetch supported assets (chains and tokens) from Bridge API.
 */
export async function fetchSupportedAssets(): Promise<any> {
    try {
        const res = await fetch(`${BRIDGE_URL}/supported-assets`);
        if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
        return res.json();
    } catch {
        // Return defaults if API fails
        return null;
    }
}

/**
 * Track deposit status for a given deposit address.
 */
export async function fetchDepositStatus(depositAddress: string): Promise<DepositStatusItem[]> {
    try {
        const res = await fetch(`${BRIDGE_URL}/status/${depositAddress}`);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : data?.deposits || [];
    } catch {
        return [];
    }
}

/**
 * Get a quote for a deposit (fees, estimated output, timing).
 */
export async function fetchQuote(params: {
    fromChainId: string;
    fromTokenAddress: string;
    toChainId?: string;
    toTokenAddress?: string;
    fromAmountBaseUnit: string;
}): Promise<QuoteResponse | null> {
    try {
        const res = await fetch(`${BRIDGE_URL}/quote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...params,
                toChainId: params.toChainId || "137",
                toTokenAddress: params.toTokenAddress || "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
            }),
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

/**
 * Withdraw flow wrapper.
 * Executes native transfer of USDC.e for simple withdraw.
 * Takes standard wagmi walletClient and sends an ERC20 transfer.
 */
export async function withdrawUSDCFlow(
    walletClient: any,
    toAddress: `0x${string}`,
    amountUSD: number
): Promise<string> {
    if (!walletClient) throw new Error("Wallet not connected");

    const { parseUnits, erc20Abi } = await import("viem");
    const USDC_BRIDGED = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

    const [account] = await walletClient.getAddresses();

    const txHash = await walletClient.writeContract({
        address: USDC_BRIDGED,
        abi: erc20Abi,
        functionName: "transfer",
        args: [toAddress, parseUnits(amountUSD.toString(), 6)],
        account,
    });

    return txHash;
}

/**
 * Direct send USDC.e to proxy wallet (simplest deposit method).
 */
export async function directSendToProxy(
    walletClient: any,
    proxyWallet: `0x${string}`,
    amountUSD: number
): Promise<string> {
    if (!walletClient) throw new Error("Wallet not connected");

    const { parseUnits, erc20Abi } = await import("viem");
    const USDC_BRIDGED = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

    const [account] = await walletClient.getAddresses();

    const txHash = await walletClient.writeContract({
        address: USDC_BRIDGED,
        abi: erc20Abi,
        functionName: "transfer",
        args: [proxyWallet, parseUnits(amountUSD.toString(), 6)],
        account,
    });

    return txHash;
}
