/**
 * Mayar Payment Gateway Helper
 * Mendukung deteksi Sandbox vs Live Publik serta resolusi environment multi-platform (Local, Node, Cloudflare Workers).
 */

export interface MayarConfig {
  isSandbox: boolean;
  apiKey: string;
  baseUrl: string;
  qrcodeUrl: string;
  paymentUrl: string;
  invoiceUrl: string;
}

const FALLBACK_SANDBOX_KEY =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5ZTU3ZjNhYi1jZjFjLTRiYTgtYTUxZi1hZDk4YWMxNjUzMTciLCJhY2NvdW50SWQiOiIzY2E4N2UyMS03Zjg1LTQ5ZjctYTNkOC02M2JjYzY3Mzg1ZTMiLCJjcmVhdGVkQXQiOiIxNzg3NjQwODU3MjgyIiwicm9sZSI6ImRldmVsb3BlciIsInNjb3BlIjp7InJlYWQiOnRydWUsIndyaXRlIjp0cnVlfSwic3ViIjoiYmFrYXJhZG55NjMyNUBnbWFpbC5jb20iLCJuYW1lIjoiQVkgUHJvamVjdCIsImxpbmsiOiJheS1wcm9qZWN0IiwiaXNTZWxmRG9tYWluIjpudWxsLCJpYXQiOjE3ODc2NDA4NTd9.fuwtycNlDDWkFjTtrO2FAgVOJEd6T0elkk7IFIEeeCzT64CZGrk5oKcROD6N0B5KZ85u5MQNO820d7PzktO6w76mYeaIv8CT5vTW9e_toVryR9598DW7BaN9jolv6ZMN3PX9iZQKmZYkzOpDuGQx6IcnkU0rAs4XZ-VfvgEUHRZUX8kjCytAds14rdPsdncNBQ7J17bnu41ry2Hv1STiS4oT10MHHbt3ehpmlwl64Kv_oao4i48jzmnnmaF9xzqKGjXWdRr_PM4EEg8bM3-2LCsk3BnTsZ_rmj7XfQ2Wrk2fz6hjS0ckpuwPtrd-WGxnm8Xt0qYzbhuH58zels7kEw";

const FALLBACK_LIVE_KEY =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjI4NjQ4YS02YzRhLTQ4YWUtOThmNi1mN2I5MGZmZTY1MDIiLCJhY2NvdW50SWQiOiJhMTU3OThiZS0yZTc4LTQ3MmUtYTBkZC1hYjQwNTNmZjM3NTIiLCJjcmVhdGVkQXQiOiIxNzg0OTk2ODcwNzQ2Iiwicm9sZSI6ImRldmVsb3BlciIsInNjb3BlIjp7InJlYWQiOnRydWUsIndyaXRlIjp0cnVlfSwic3ViIjoiYmFrYXJhZG55NjMyNUBnbWFpbC5jb20iLCJuYW1lIjoiQVkgUHJvamVjdCIsImxpbmsiOiJheS1wcm9qZWN0IiwiaXNTZWxmRG9tYWluIjpudWxsLCJpYXQiOjE3ODQ5OTY4NzB9.glm2hFRcUzMR7x2iHdze1jiGfbJS_ljXMR9xVOdj_NwyZpQaQsMbF-Zcz30UA2heUMLzylFTJl0XbiMWGNNeu__Oj0HDNO5MWdR7KrseSfJTuYZXBkg7EQwuiryT8FERSrY-I32jS6fzqa-BuA91GqH5B01_RvzliZa55mr77xJhu5TIx_TaIjTOueSEe8qoMK3ux1Xu52Tx8h9Gb2Xyw-RveJPEkyLneUEc9-Z5qDS8jXu5N9dkckUUpC-MVGtIlPknBaPXUlVptqyszruWJKuarx8F6vAD4c1EDcKJJwKaucL4HRdyqIESavw4KNioQM0_1Q_G7jjFgRlVmbua2A";

export function getMayarConfig(): MayarConfig {
  let isSandboxStr = process.env.MAYAR_IS_SANDBOX;
  let sandboxKey = process.env.MAYAR_SANDBOX_API_KEY;
  let liveKey = process.env.MAYAR_API_KEY;

  // Cloudflare Workers context fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env) {
      const env = ctx.env as Record<string, string>;
      if (env.MAYAR_IS_SANDBOX !== undefined) isSandboxStr = env.MAYAR_IS_SANDBOX;
      if (env.MAYAR_SANDBOX_API_KEY) sandboxKey = env.MAYAR_SANDBOX_API_KEY;
      if (env.MAYAR_API_KEY) liveKey = env.MAYAR_API_KEY;
    }
  } catch {
    // ignore
  }

  const isSandbox =
    isSandboxStr?.toLowerCase() !== "false" && isSandboxStr !== "0";

  const apiKey = isSandbox
    ? sandboxKey || FALLBACK_SANDBOX_KEY
    : liveKey || FALLBACK_LIVE_KEY;

  const baseUrl = isSandbox ? "https://api.mayar.io" : "https://api.mayar.id";

  return {
    isSandbox,
    apiKey,
    baseUrl,
    qrcodeUrl: `${baseUrl}/hl/v1/qrcode/create`,
    paymentUrl: `${baseUrl}/hl/v1/payment/create`,
    invoiceUrl: `${baseUrl}/hl/v1/invoice/create`,
  };
}

/**
 * Buat QRIS Dinamis Instan via Mayar /hl/v1/qrcode/create
 */
export async function createMayarDynamicQris(amount: number): Promise<{
  success: boolean;
  qrUrl?: string;
  qrString?: string;
  amount?: number;
  isSandbox: boolean;
  error?: string;
}> {
  const config = getMayarConfig();

  try {
    const res = await fetch(config.qrcodeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount }),
    });

    const resJson = await res.json();

    if (resJson.statusCode !== 200 && resJson.statusCode !== 201) {
      console.error("Mayar QR Code API error:", resJson);
      return {
        success: false,
        isSandbox: config.isSandbox,
        error: resJson.messages || resJson.message || "Gagal membuat QRIS Mayar",
      };
    }

    const data = resJson.data;
    return {
      success: true,
      qrUrl: data?.url || "",
      qrString: data?.qrString || "",
      amount: data?.amount || amount,
      isSandbox: config.isSandbox,
    };
  } catch (err: any) {
    console.error("Fetch Mayar QR error:", err);
    return {
      success: false,
      isSandbox: config.isSandbox,
      error: err.message || "Gagal menghubungi server Mayar QRIS.",
    };
  }
}
