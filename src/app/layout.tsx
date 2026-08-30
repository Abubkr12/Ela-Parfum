import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { CartProvider } from "@/lib/cart-context";
import { Toaster } from "sonner";
import Script from "next/script";
import { createClient } from "@/lib/supabase/server";
import { ChatWidget } from "@/components/chat-widget";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "Ela Parfum",
  description:
    "Toko parfum isi ulang premium di Condet. Jual parfum jadi, refill bermerk, karakter, dan elixir/biang mentahan.",
  keywords: [
    "ela parfum",
    "parfum isi ulang",
    "parfum condet",
    "minyak wangi",
    "custom perfume",
    "parfum custom",
    "refill perfume"
  ],
  openGraph: {
    title: "Ela Parfum",
    description:
      "Katalog parfum, request racikan, refill bermerk, dan AI assistant dalam satu platform.",
    type: "website",
    locale: "id_ID"
  },
  verification: {
    google: "6Aj8ua-KeRu_TtC_25TGvB4kU-ohv2RgzXCCRV_x8_Y",
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0c0b"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          id="theme-script"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('perfume-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <CartProvider>
            {children}
            {user && <ChatWidget userId={user.id} />}
            <Toaster position="top-center" richColors />
            <Analytics />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
