/**
 * Server environment config.
 * All values come from .env — never hardcode addresses or keys.
 */

function require(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const SELLER_ADDRESS = require("VITE_SELLER_ADDRESS") as `0x${string}`;
export const PRICE_PER_CALL = process.env.PRICE_PER_CALL ?? "0.001";
export const PORT = parseInt(process.env.SERVER_PORT ?? "3001", 10);
export const FACILITATOR_URL =
  process.env.FACILITATOR_URL ?? "https://gateway-api-testnet.circle.com";
