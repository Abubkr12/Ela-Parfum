import crypto from "crypto";

export interface MidtransConfig {
  isProduction: boolean;
  serverKey: string;
  clientKey: string;
  signatureKey: string;
  snapBaseUrl: string;
  apiBaseUrl: string;
  snapJsUrl: string;
}

export interface MidtransSnapItem {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface CreateSnapParams {
  midtransOrderId: string;
  grossAmount: number;
  customerDetails: {
    first_name: string;
    email: string;
    phone: string;
  };
  itemDetails?: MidtransSnapItem[];
  callbacks?: {
    finish?: string;
    unfinish?: string;
    error?: string;
  };
  expiryDurationHours?: number;
}

export interface SnapTransactionResult {
  token: string;
  redirect_url: string;
  midtrans_order_id: string;
}

function readRuntimeEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env) {
      Object.assign(env, ctx.env as Record<string, string | undefined>);
    }
  } catch {
    // Running outside Cloudflare Workers (Node/Next dev)
  }
  return env;
}

export function getMidtransConfig(): MidtransConfig {
  const env = readRuntimeEnv();

  const isProdStr = env.MIDTRANS_IS_PRODUCTION ?? env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION ?? "false";
  const isProduction = isProdStr.toLowerCase() === "true" || isProdStr === "1";

  const serverKey = isProduction
    ? (env.MIDTRANS_SERVER_KEY_PRODUCTION || env.MIDTRANS_SERVER_KEY || "").trim()
    : (env.MIDTRANS_SERVER_KEY_SANDBOX || env.MIDTRANS_SERVER_KEY || "").trim();

  const clientKey = isProduction
    ? (env.MIDTRANS_CLIENT_KEY_PRODUCTION || env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "").trim()
    : (env.MIDTRANS_CLIENT_KEY_SANDBOX || env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "").trim();

  const signatureKey = isProduction
    ? (env.MIDTRANS_SIGNATURE_KEY_PRODUCTION || env.MIDTRANS_SIGNATURE_KEY || serverKey).trim()
    : (env.MIDTRANS_SIGNATURE_KEY_SANDBOX || env.MIDTRANS_SIGNATURE_KEY || serverKey).trim();

  const snapBaseUrl = isProduction
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";

  const apiBaseUrl = isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";

  return {
    isProduction,
    serverKey,
    clientKey,
    signatureKey,
    snapBaseUrl,
    apiBaseUrl,
    snapJsUrl: `${snapBaseUrl}/snap/snap.js`,
  };
}

function encodeBasicAuth(serverKey: string): string {
  return Buffer.from(`${serverKey}:`).toString("base64");
}

/**
 * Strip attempt suffix (e.g. MW-XXX-A1234 -> MW-XXX) so retries map back to the internal order_code.
 */
export function extractBaseOrderCode(midtransOrderId: string): string {
  if (!midtransOrderId) return "";
  return midtransOrderId.replace(/-A\d+$/i, "");
}

export async function createMidtransSnapTransaction(
  params: CreateSnapParams
): Promise<SnapTransactionResult> {
  const cfg = getMidtransConfig();
  if (!cfg.serverKey) {
    throw new Error("Midtrans Server Key belum dikonfigurasi pada environment.");
  }

  const grossAmount = Math.round(params.grossAmount);

  const payload: Record<string, unknown> = {
    transaction_details: {
      order_id: params.midtransOrderId,
      gross_amount: grossAmount,
    },
    customer_details: {
      first_name: params.customerDetails.first_name.slice(0, 50),
      email: params.customerDetails.email,
      phone: params.customerDetails.phone,
    },
    credit_card: {
      secure: true,
    },
    expiry: {
      unit: "hours",
      duration: params.expiryDurationHours ?? 24,
    },
  };

  if (params.itemDetails && params.itemDetails.length > 0) {
    const cleanItems = params.itemDetails.map((item) => ({
      id: item.id.slice(0, 50),
      price: Math.round(item.price),
      quantity: Math.max(1, Math.round(item.quantity)),
      name: item.name.slice(0, 50),
    }));

    const itemsSum = cleanItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Midtrans strictly rejects requests where sum(item_details) !== gross_amount
    if (itemsSum === grossAmount) {
      payload.item_details = cleanItems;
    } else {
      const diff = grossAmount - itemsSum;
      payload.item_details = [
        ...cleanItems,
        {
          id: "ADJUSTMENT",
          price: diff,
          quantity: 1,
          name: diff >= 0 ? "Biaya Layanan & Pengiriman" : "Potongan / Diskon",
        },
      ];
    }
  }

  if (params.callbacks) {
    payload.callbacks = params.callbacks;
  }

  const response = await fetch(`${cfg.snapBaseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${encodeBasicAuth(cfg.serverKey)}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    token?: string;
    redirect_url?: string;
    error_messages?: string[];
  };

  if (!response.ok || !data.token || !data.redirect_url) {
    const errMsg = data.error_messages?.join(", ") || `HTTP ${response.status}`;
    throw new Error(`Midtrans Snap error: ${errMsg}`);
  }

  return {
    token: data.token,
    redirect_url: data.redirect_url,
    midtrans_order_id: params.midtransOrderId,
  };
}

export interface MidtransStatusResponse {
  status_code?: string;
  order_id?: string;
  gross_amount?: string;
  payment_type?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_id?: string;
  status_message?: string;
}

export async function getMidtransTransactionStatus(
  midtransOrderId: string
): Promise<MidtransStatusResponse | null> {
  const cfg = getMidtransConfig();
  if (!cfg.serverKey || !midtransOrderId) return null;

  const response = await fetch(
    `${cfg.apiBaseUrl}/v2/${encodeURIComponent(midtransOrderId)}/status`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${encodeBasicAuth(cfg.serverKey)}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as MidtransStatusResponse;
}

/**
 * Verifies Midtrans webhook SHA-512 signature using raw gross_amount string.
 * Supports both dedicated Signature Secret Key and classic Server Key.
 */
export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  incomingSignature: string
): boolean {
  if (!orderId || !statusCode || !grossAmount || !incomingSignature) {
    return false;
  }

  const cfg = getMidtransConfig();
  const candidates = [cfg.signatureKey, cfg.serverKey].filter(Boolean);

  for (const key of candidates) {
    const raw = `${orderId}${statusCode}${grossAmount}${key}`;
    const expected = crypto.createHash("sha512").update(raw).digest("hex");
    if (expected === incomingSignature) {
      return true;
    }
  }

  return false;
}

export function isMidtransPaidStatus(
  transactionStatus?: string,
  fraudStatus?: string
): boolean {
  if (transactionStatus === "settlement") return true;
  if (transactionStatus === "capture") {
    return !fraudStatus || fraudStatus === "accept";
  }
  return false;
}

export function isMidtransFailedStatus(transactionStatus?: string): boolean {
  return (
    transactionStatus === "deny" ||
    transactionStatus === "cancel" ||
    transactionStatus === "expire" ||
    transactionStatus === "failure"
  );
}
