"use client";

export interface SnapPayCallbacks {
  onSuccess?: (result: any) => void;
  onPending?: (result: any) => void;
  onError?: (result: any) => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, callbacks?: SnapPayCallbacks) => void;
      hide?: () => void;
    };
  }
}

/**
 * Opens Midtrans Snap popup when snap.js is ready, falling back to redirect_url.
 */
export function openMidtransSnap(
  token: string | undefined,
  redirectUrl: string,
  orderId: number,
  callbacks: {
    onPaidOrPending: () => void;
    onFailedOrClosed: (reason: "error" | "unfinish") => void;
  }
) {
  if (typeof window !== "undefined" && window.snap?.pay && token) {
    window.snap.pay(token, {
      onSuccess: () => {
        callbacks.onPaidOrPending();
        window.location.href = `/checkout/success?id=${orderId}`;
      },
      onPending: () => {
        callbacks.onPaidOrPending();
        window.location.href = `/checkout/success?id=${orderId}`;
      },
      onError: () => {
        callbacks.onFailedOrClosed("error");
      },
      onClose: () => {
        callbacks.onFailedOrClosed("unfinish");
      },
    });
    return;
  }

  // Fallback to Midtrans hosted Snap page when snap.js has not initialized
  if (redirectUrl) {
    callbacks.onPaidOrPending();
    window.location.href = redirectUrl;
  }
}
