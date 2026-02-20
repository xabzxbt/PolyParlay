import { createHmac } from "crypto";

function getEnv(key: string): string {
  return process.env[key] || "";
}

/**
 * Convert standard base64 to URL-safe base64
 * (Polymarket requires this format for HMAC signatures)
 * '+' → '-', '/' → '_', keep '=' suffix
 */
function toUrlSafeBase64(sig: string): string {
  return sig.split("+").join("-").split("/").join("_");
}

interface BuilderHeaders {
  POLY_BUILDER_API_KEY: string;
  POLY_BUILDER_SIGNATURE: string;
  POLY_BUILDER_TIMESTAMP: string;
  POLY_BUILDER_PASSPHRASE: string;
}

interface UserL2Headers {
  POLY_ADDRESS: string;
  POLY_SIGNATURE: string;
  POLY_TIMESTAMP: string;
  POLY_API_KEY: string;
  POLY_PASSPHRASE: string;
}

/**
 * Generate builder attribution headers for CLOB API.
 * Based on: https://github.com/Polymarket/builder-signing-sdk
 *
 * Key rules:
 * - Timestamp in SECONDS (not ms)
 * - HMAC message: timestamp + method + path [+ body]
 * - Signature: URL-safe base64
 */
export function generateBuilderHeaders(
  method: string,
  path: string,
  body?: string,
): BuilderHeaders {
  const apiKey = getEnv("POLYMARKET_BUILDER_API_KEY");
  const secret = getEnv("POLYMARKET_BUILDER_SECRET");
  const passphrase = getEnv("POLYMARKET_BUILDER_PASSPHRASE");

  // ✅ FIX 1: Timestamp in SECONDS
  const timestamp = Math.floor(Date.now() / 1000);

  // ✅ FIX 2: message format matches builder SDK exactly
  let message = timestamp + method + path;
  if (body !== undefined) {
    message += body;
  }

  const base64Secret = Buffer.from(secret, "base64");
  const sig = createHmac("sha256", base64Secret)
    .update(message)
    .digest("base64");

  // ✅ FIX 3: URL-safe base64 encoding
  const signature = toUrlSafeBase64(sig);

  return {
    POLY_BUILDER_API_KEY: apiKey,
    POLY_BUILDER_SIGNATURE: signature,
    POLY_BUILDER_TIMESTAMP: `${timestamp}`,
    POLY_BUILDER_PASSPHRASE: passphrase,
  };
}

/**
 * Generate user L2 authentication headers for CLOB API.
 * Based on: https://github.com/Polymarket/clob-client (headers/index.ts + signing/hmac.ts)
 *
 * Key rules:
 * - Timestamp in SECONDS (not ms)
 * - HMAC message: timestamp + method + requestPath [+ body]
 * - Signature: URL-safe base64
 * - Address: use as-is (checksummed), NOT lowercased
 */
export function generateUserL2Headers(
  address: string,
  apiKey: string,
  secret: string,
  passphrase: string,
  method: string,
  path: string,
  body?: string,
): UserL2Headers {
  // ✅ FIX 1: Timestamp in SECONDS
  const timestamp = Math.floor(Date.now() / 1000);

  // ✅ FIX 2: message format matches clob-client hmac.ts exactly
  let message = timestamp + method + path;
  if (body !== undefined) {
    message += body;
  }

  const base64Secret = Buffer.from(secret, "base64");
  const sig = createHmac("sha256", base64Secret)
    .update(message)
    .digest("base64");

  // ✅ FIX 3: URL-safe base64 encoding
  const signature = toUrlSafeBase64(sig);

  return {
    // ✅ FIX 4: Address as-is (checksummed), matching official SDK behavior
    POLY_ADDRESS: address,
    POLY_SIGNATURE: signature,
    POLY_TIMESTAMP: `${timestamp}`,
    POLY_API_KEY: apiKey,
    POLY_PASSPHRASE: passphrase,
  };
}

export function validateBuilderCredentials(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!getEnv("POLYMARKET_BUILDER_API_KEY")) missing.push("POLYMARKET_BUILDER_API_KEY");
  if (!getEnv("POLYMARKET_BUILDER_SECRET")) missing.push("POLYMARKET_BUILDER_SECRET");
  if (!getEnv("POLYMARKET_BUILDER_PASSPHRASE")) missing.push("POLYMARKET_BUILDER_PASSPHRASE");

  return { valid: missing.length === 0, missing };
}
