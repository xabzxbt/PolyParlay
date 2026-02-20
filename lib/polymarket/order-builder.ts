// Polymarket Order Builder — Client-side order construction + EIP-712 signing
// Based on: https://github.com/Polymarket/clob-client/src/order-builder/helpers.ts
//
// Flow:
// 1. buildOrder() creates the order struct (matches official SDK exactly)
// 2. getOrderTypedData() wraps it in EIP-712 typed data
// 3. User signs in MetaMask via walletClient.signTypedData()
// 4. Signed order sent to our API → forwarded to CLOB with builder headers

// === Contract Addresses (Polygon Mainnet) ===
// Verified against: https://github.com/Polymarket/clob-client/blob/main/src/config.ts
export const CONTRACTS = {
  exchange: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E" as `0x${string}`,
  negRiskExchange: "0xC5d563A36AE78145C45a50134d48A1215220f80a" as `0x${string}`,
  negRiskAdapter: "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296" as `0x${string}`,
  collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`, // USDC.e (bridged) on Polygon
  conditionalTokens: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045" as `0x${string}`,
} as const;

export const CHAIN_ID = 137;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

// === Enums (matches @polymarket/order-utils) ===
export enum Side {
  BUY = 0,
  SELL = 1,
}

enum SignatureType {
  EOA = 0,
  POLY_PROXY = 1,
  POLY_GNOSIS_SAFE = 2,
}

// === Tick sizes (from official SDK) ===
type TickSize = "0.1" | "0.01" | "0.001" | "0.0001";

interface RoundConfig {
  price: number;
  size: number;
  amount: number;
}

const ROUNDING_CONFIG: Record<TickSize, RoundConfig> = {
  "0.1": { price: 1, size: 2, amount: 3 },
  "0.01": { price: 2, size: 2, amount: 4 },
  "0.001": { price: 3, size: 2, amount: 5 },
  "0.0001": { price: 4, size: 2, amount: 6 },
};

// === Order Types ===
export interface OrderData {
  salt: string;
  maker: `0x${string}`;
  signer: `0x${string}`;
  taker: `0x${string}`;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: string;
  feeRateBps: string;
  side: number;
  signatureType: number;
}

export interface SignedOrder extends OrderData {
  signature: `0x${string}`;
}

interface OrderPayload {
  order: SignedOrder;
  owner: `0x${string}`;
  orderType: "GTC" | "FOK" | "GTD";
}

// === EIP-712 Types ===
const ORDER_TYPES = {
  Order: [
    { name: "salt", type: "uint256" },
    { name: "maker", type: "address" },
    { name: "signer", type: "address" },
    { name: "taker", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "makerAmount", type: "uint256" },
    { name: "takerAmount", type: "uint256" },
    { name: "expiration", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "feeRateBps", type: "uint256" },
    { name: "side", type: "uint8" },
    { name: "signatureType", type: "uint8" },
  ],
} as const;

// EIP-712 domain for Polymarket CTF Exchange
// CRITICAL: negRisk selects the verifyingContract — wrong contract = invalid signature!
function getExchangeDomain(negRisk: boolean) {
  return {
    name: "Polymarket CTF Exchange" as const,
    version: "1" as const,
    chainId: BigInt(CHAIN_ID),
    verifyingContract: negRisk ? CONTRACTS.negRiskExchange : CONTRACTS.exchange,
  };
}

// === USDC conversion (6 decimals) ===
const USDC_DECIMALS = 6;

function usdToRaw(usd: number): string {
  return Math.round(usd * 10 ** USDC_DECIMALS).toString();
}

function rawToUsd(raw: string): number {
  return parseInt(raw) / 10 ** USDC_DECIMALS;
}

// === Rounding Utilities (from official SDK: utilities.ts) ===
function decimalPlaces(num: number): number {
  if (Number.isInteger(num)) return 0;
  const arr = num.toString().split(".");
  if (arr.length <= 1) return 0;
  return arr[1].length;
}

function roundDown(num: number, decimals: number): number {
  if (decimalPlaces(num) <= decimals) return num;
  return Math.floor(num * 10 ** decimals) / 10 ** decimals;
}

function roundUp(num: number, decimals: number): number {
  if (decimalPlaces(num) <= decimals) return num;
  return Math.ceil(num * 10 ** decimals) / 10 ** decimals;
}

function roundNormal(num: number, decimals: number): number {
  if (decimalPlaces(num) <= decimals) return num;
  return Math.round((num + Number.EPSILON) * 10 ** decimals) / 10 ** decimals;
}

// === Salt Generator ===

// Generate random salt that fits within Number.MAX_SAFE_INTEGER
// CRITICAL: The salt is signed as a BigInt in EIP-712, then sent as a JSON number
// via parseInt(). If the salt exceeds MAX_SAFE_INTEGER, parseInt() truncates it,
// causing the submitted salt ≠ signed salt → "invalid signature" error.
// Safe salt generator for both Browser and Node environments
function generateSalt(): string {
  const buf = new Uint8Array(6); // 48 bits

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(buf);
  } else {
    // Fallback if crypto API is missing (e.g. some Node environments without polyfill)
    for (let i = 0; i < 6; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }

  let salt = 0;
  for (const b of buf) salt = salt * 256 + b;
  return salt.toString();
}

// === Order Amount Calculation (from official SDK: helpers.ts getOrderRawAmounts) ===
// This EXACTLY matches the official SDK's amount calculation logic
function getOrderRawAmounts(
  side: Side,
  size: number,     // For BUY: number of shares. For SELL: number of shares.
  price: number,    // 0-1 price per share
  roundConfig: RoundConfig,
): { rawMakerAmt: number; rawTakerAmt: number } {
  const rawPrice = roundNormal(price, roundConfig.price);

  if (side === Side.BUY) {
    // BUY: maker pays USDC, receives shares
    // makerAmount = price × size (USDC amount)
    // takerAmount = size (number of shares)
    const rawTakerAmt = roundDown(size, roundConfig.size);
    let rawMakerAmt = rawTakerAmt * rawPrice;
    if (decimalPlaces(rawMakerAmt) > roundConfig.amount) {
      rawMakerAmt = roundUp(rawMakerAmt, roundConfig.amount + 4);
      if (decimalPlaces(rawMakerAmt) > roundConfig.amount) {
        rawMakerAmt = roundDown(rawMakerAmt, roundConfig.amount);
      }
    }
    return { rawMakerAmt, rawTakerAmt };
  } else {
    // SELL: maker pays shares, receives USDC
    // makerAmount = size (number of shares)
    // takerAmount = price × size (USDC amount)
    const rawMakerAmt = roundDown(size, roundConfig.size);
    let rawTakerAmt = rawMakerAmt * rawPrice;
    if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
      rawTakerAmt = roundUp(rawTakerAmt, roundConfig.amount + 4);
      if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
        rawTakerAmt = roundDown(rawTakerAmt, roundConfig.amount);
      }
    }
    return { rawMakerAmt, rawTakerAmt };
  }
}

// === Main Order Builder ===

export function buildOrder(params: {
  maker: `0x${string}`;         // proxy wallet address (or EOA if no proxy)
  signer: `0x${string}`;        // EOA address that will sign
  tokenId: string;
  side: Side;
  pricePerShare: number; // 0-1 (e.g., 0.55 for 55¢)
  sizeUSD: number;       // USD amount to spend (for BUY) or shares to sell (for SELL)
  negRisk?: boolean;
  tickSize?: TickSize;   // market's tick size — determines rounding precision
  feeRateBps?: number;
  expiration?: number;   // unix timestamp, 0 = no expiry
  nonce?: string;
  isProxy?: boolean;     // true if maker is a proxy wallet
}): OrderData {
  const {
    maker, signer, tokenId, side,
    tickSize = "0.01",
    feeRateBps = parseInt(process.env.BUILDER_FEE_BPS ?? '200'), expiration = 0, nonce = "0", isProxy = false,
  } = params;

  // CASTING: Ensure inputs are numbers to prevent string concatenation bugs
  const pricePerShare = Number(params.pricePerShare);
  const sizeUSD = Number(params.sizeUSD);

  const roundConfig = ROUNDING_CONFIG[tickSize] || ROUNDING_CONFIG["0.01"];

  let makerAmount: string;
  let takerAmount: string;

  if (side === Side.BUY) {
    // User wants to SPEND sizeUSD of USDC → compute how many shares that buys
    const numberOfShares = sizeUSD / pricePerShare;
    const { rawMakerAmt, rawTakerAmt } = getOrderRawAmounts(side, numberOfShares, pricePerShare, roundConfig);

    // Convert to on-chain amounts (6 decimal USDC/CTF)
    makerAmount = Math.round(rawMakerAmt * 10 ** USDC_DECIMALS).toString();
    takerAmount = Math.round(rawTakerAmt * 10 ** USDC_DECIMALS).toString();
  } else {
    // SELL: sizeUSD = number of shares to sell
    const { rawMakerAmt, rawTakerAmt } = getOrderRawAmounts(side, sizeUSD, pricePerShare, roundConfig);

    makerAmount = Math.round(rawMakerAmt * 10 ** USDC_DECIMALS).toString();
    takerAmount = Math.round(rawTakerAmt * 10 ** USDC_DECIMALS).toString();
  }

  // VALIDATION: Ensure no NaN values (causes signature failure)
  if (makerAmount === "NaN" || takerAmount === "NaN") {

    throw new Error(`Invalid order amounts: Price=${pricePerShare}, Size=${sizeUSD}`);
  }

  return {
    salt: generateSalt(),
    maker,                    // proxy wallet or EOA
    signer,                   // EOA (the one that signs)
    taker: ZERO_ADDRESS,
    tokenId,
    makerAmount,
    takerAmount,
    expiration: expiration.toString(),
    nonce,
    feeRateBps: feeRateBps.toString(),
    side,
    signatureType: isProxy ? SignatureType.POLY_PROXY : SignatureType.EOA,
  };
}

// Get EIP-712 typed data for signing
// CRITICAL: negRisk MUST match the actual market type, or signature will be invalid!
export function getOrderTypedData(order: OrderData, negRisk: boolean) {
  return {
    domain: getExchangeDomain(negRisk),
    types: ORDER_TYPES,
    primaryType: "Order" as const,
    message: {
      salt: BigInt(order.salt),
      maker: order.maker,
      signer: order.signer,
      taker: order.taker,
      tokenId: BigInt(order.tokenId),
      makerAmount: BigInt(order.makerAmount),
      takerAmount: BigInt(order.takerAmount),
      expiration: BigInt(order.expiration),
      nonce: BigInt(order.nonce),
      feeRateBps: BigInt(order.feeRateBps),
      side: order.side,
      signatureType: order.signatureType,
    },
  };
}

// Create the CLOB POST /order payload
function buildOrderPayload(
  signedOrder: SignedOrder,
  owner: `0x${string}`,
  orderType: "GTC" | "FOK" | "GTD" = "GTC"
): OrderPayload {
  return { order: signedOrder, owner, orderType };
}

// === negRisk detection ===
// Fetches from CLOB API: GET /neg-risk?token_id=<tokenId>
// Most Polymarket markets ARE negRisk, but we must check to sign correctly
const negRiskCache = new Map<string, boolean>();

export async function getNegRisk(tokenId: string): Promise<boolean> {
  if (negRiskCache.has(tokenId)) return negRiskCache.get(tokenId)!;

  try {
    const res = await fetch(`https://clob.polymarket.com/neg-risk?token_id=${tokenId}`);
    if (!res.ok) {

      return true; // Most markets are negRisk, safe default
    }
    const data = await res.json();
    const isNegRisk = data.neg_risk === true;
    negRiskCache.set(tokenId, isNegRisk);
    return isNegRisk;
  } catch (err) {

    return true;
  }
}

// === Tick size detection ===
// Fetches from CLOB API: GET /tick-size?token_id=<tokenId>
// Each market has its own tick size that determines rounding precision.
// Using wrong tick size → "invalid amounts" error from CLOB!
const tickSizeCache = new Map<string, TickSize>();
const TICK_SIZE_TTL = 5 * 60 * 1000; // 5 min cache
const tickSizeTimestamps = new Map<string, number>();

export async function getTickSize(tokenId: string): Promise<TickSize> {
  const cachedAt = tickSizeTimestamps.get(tokenId);
  if (tickSizeCache.has(tokenId) && cachedAt && (Date.now() - cachedAt) < TICK_SIZE_TTL) {
    return tickSizeCache.get(tokenId)!;
  }

  try {
    const res = await fetch(`https://clob.polymarket.com/tick-size?token_id=${tokenId}`);
    if (!res.ok) {

      return "0.01";
    }
    const data = await res.json();
    const ts = data.minimum_tick_size?.toString() as TickSize;

    // Validate it's a known tick size
    if (ts && ROUNDING_CONFIG[ts]) {
      tickSizeCache.set(tokenId, ts);
      tickSizeTimestamps.set(tokenId, Date.now());

      return ts;
    }


    return "0.01";
  } catch (err) {

    return "0.01";
  }
}
