import {
  generateBuilderHeaders,
  generateUserL2Headers,
  validateBuilderCredentials,
} from "@/lib/polymarket/builder-sign";
import type { SignedOrder } from "@/lib/polymarket/order-builder";

const CLOB_BASE = "https://clob.polymarket.com";

interface SignedLegOrder {
  legId: string;
  signedOrder: SignedOrder;
  tokenId: string;
  side: "BUY" | "SELL";
  pricePerShare: number;
  sizeUSD: number;
}

interface OrderResult {
  legId: string;
  success: boolean;
  orderId?: string;
  error?: string;
}

interface ParlayExecutionResult {
  success: boolean;
  orders: OrderResult[];
  errors: string[];
}

interface UserCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
  address: string;
}

export async function executeSignedParlay(
  signedOrders: SignedLegOrder[],
  userAddress: string,
  userCredentials: UserCredentials,
): Promise<ParlayExecutionResult> {

  const { valid, missing } = validateBuilderCredentials();
  if (!valid) {
    return {
      success: false,
      orders: [],
      errors: [`Builder credentials not configured. Missing: ${missing.join(", ")}`],
    };
  }

  if (!userCredentials.apiKey || !userCredentials.secret || !userCredentials.passphrase) {
    return {
      success: false,
      orders: [],
      errors: ["User API credentials missing. Please enable trading first."],
    };
  }

  // Debug: validate credential formats

  const results: OrderResult[] = [];
  const errors: string[] = [];

  for (const leg of signedOrders) {
    try {
      const result = await submitOrderToCLOB(leg.signedOrder, userCredentials);
      results.push({ legId: leg.legId, success: true, orderId: result.orderID });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ legId: leg.legId, success: false, error: msg });
      errors.push(msg);
    }
  }

  return {
    success: results.every((r) => r.success),
    orders: results,
    errors,
  };
}

async function submitOrderToCLOB(
  order: SignedOrder,
  userCredentials: UserCredentials,
): Promise<{ orderID: string }> {
  const path = "/order";

  // Convert numeric side (0=BUY, 1=SELL) to string side ("BUY"/"SELL")
  const sideStr = order.side === 0 ? "BUY" : "SELL";

  // Salt: parse to number (safe since generateSalt produces 48-bit values)
  const saltNum = parseInt(order.salt, 10);

  const payload = {
    deferExec: false,
    order: {
      salt: saltNum,
      maker: order.maker,
      signer: order.signer,
      taker: order.taker,
      tokenId: order.tokenId,
      makerAmount: order.makerAmount,
      takerAmount: order.takerAmount,
      expiration: order.expiration,
      nonce: order.nonce,
      feeRateBps: order.feeRateBps,
      side: sideStr,
      signatureType: order.signatureType,
      signature: order.signature,
    },
    owner: userCredentials.apiKey,
    orderType: "GTC",
  };

  const bodyStr = JSON.stringify(payload);

  // Generate User L2 headers
  const userHeaders = generateUserL2Headers(
    userCredentials.address,
    userCredentials.apiKey,
    userCredentials.secret,
    userCredentials.passphrase,
    "POST",
    path,
    bodyStr,
  );

  // Generate Builder attribution headers
  const builderHeaders = generateBuilderHeaders("POST", path, bodyStr);

  // ===== FULL DEBUG LOGGING =====

  const res = await fetch(`${CLOB_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...userHeaders,
      ...builderHeaders,
    },
    body: bodyStr,
  });

  const responseText = await res.text().catch(() => "");

  if (!res.ok) {
    const lower = responseText.toLowerCase();
    let userMsg = `Order rejected: ${responseText.slice(0, 200)}`;

    if (lower.includes("allowance")) {
      userMsg = "USDC not approved for exchange. Please retry — the app will request approval automatically.";
    } else if (lower.includes("insufficient") || lower.includes("balance")) {
      userMsg = "Insufficient USDC balance. Deposit USDC.e at polymarket.com";
    } else if (lower.includes("signature")) {
      userMsg = "Invalid signature. Try reconnecting your wallet.";
    } else if (lower.includes("unauthorized") || lower.includes("api key")) {
      userMsg = "Trading session expired. Click 'Enable Trading' again.";
    } else if (lower.includes("price") || lower.includes("tick")) {
      userMsg = "Price moved. Refresh and try again.";
    }

    throw new Error(userMsg);
  }

  try {
    const data = JSON.parse(responseText);
    return { orderID: data.orderID || data.id || "submitted" };
  } catch {
    return { orderID: "submitted" };
  }
}
