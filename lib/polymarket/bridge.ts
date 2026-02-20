export const BRIDGE_URL = "https://bridge.polymarket.com";

/**
 * Returns the URL to redirect a user for depositing funds into their Polymarket wallet
 * directly via the official bridge.
 * @param address The Poly proxy wallet or EOA address
 */
export function getDepositUrl(address: string): string {
    return `${BRIDGE_URL}?address=${address}`;
}

export async function fetchDepositAddresses(address: string): Promise<any> {
    const deposit = await fetch(`${BRIDGE_URL}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
    });

    if (!deposit.ok) {
        throw new Error(`Failed to fetch bridging addresses: ${deposit.statusText}`);
    }

    return deposit.json();
}

/**
 * Withdraw flow wrapper
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

    // Import dynamically to avoid SSR issues
    const { parseUnits, erc20Abi } = await import("viem");
    const USDC_BRIDGED = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

    const [account] = await walletClient.getAddresses();

    // Actually performs a native on-chain transfer on Polygon
    const txHash = await walletClient.writeContract({
        address: USDC_BRIDGED,
        abi: erc20Abi,
        functionName: "transfer",
        args: [toAddress, parseUnits(amountUSD.toString(), 6)],
        account,
    });

    return txHash;
}
