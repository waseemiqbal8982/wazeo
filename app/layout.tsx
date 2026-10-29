import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { SplashLoader } from "@/components/SplashLoader";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { ContactFab } from "@/components/support/ContactFab";
import { ImpersonateBanner } from "@/components/ImpersonateBanner";
import { CurrencyProvider } from "@/lib/currency-store";
import { FloatingAuth } from "@/components/landing/FloatingAuth";
import { CookieNotice } from "@/components/CookieNotice";
import { StatusStrip } from "@/components/StatusStrip";
import { Cursor } from "@/components/Cursor";

export const metadata: Metadata = {
  title: {
    default: "Wazeo — Gradual delivery for Instagram, TikTok & YouTube",
    template: "%s · Wazeo",
  },
  description:
    "Wazeo delivers your social media orders gradually and naturally with curves you control. Draw your own curve, watch the live graph, and keep growth looking organic.",
  metadataBase: new URL("https://wazeo.vercel.app"),
  openGraph: {
    title: "Wazeo — Gradual delivery for Instagram, TikTok & YouTube",
    description:
      "Draw your own delivery curve. Watch your order grow gradually with a live graph. Real prices, honest features, secure sign-in.",
    url: "https://wazeo.vercel.app",
    siteName: "Wazeo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wazeo — Gradual delivery",
    description: "Draw your own delivery curve and watch your order grow gradually.",
  },
};

const preloadScript = `(function(){try{
var tt=['purple','cyan','emerald','rose','amber','ocean','crimson','amoled'];
var t=localStorage.getItem('wazeo-theme')||'';if(!t){var m=document.cookie.match(/(?:^|; )wazeo-theme=([^;]*)/);t=m?decodeURIComponent(m[1]):'';}
if(!t){t=tt[Math.floor(Math.random()*tt.length)];try{localStorage.setItem('wazeo-theme',t);document.cookie='wazeo-theme='+encodeURIComponent(t)+'; path=/; max-age=31536000';}catch(e){}}
if(tt.indexOf(t)<0)t='purple';
var md=localStorage.getItem('wazeo-mode')||'';if(!md){var cm=document.cookie.match(/(?:^|; )wazeo-mode=([^;]*)/);md=cm?decodeURIComponent(cm[1]):'';}if(md!=='light'&&md!=='dark')md='dark';
var r=localStorage.getItem('wazeo-reduce')==='true';
document.documentElement.dataset.theme=t;document.documentElement.dataset.mode=md;document.documentElement.dataset.reduceMotion=r?'true':'false';
}catch(e){document.documentElement.dataset.theme='purple';document.documentElement.dataset.mode='dark';}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const rawLang = cookieStore.get("wazeo-lang")?.value || "";
  const lang = ["en", "ur", "hi", "fr", "zh"].includes(rawLang) ? rawLang : "en";
  const dir = lang === "ur" ? "rtl" : "ltr";
  return (
    <html lang={lang} dir={dir} data-theme="purple" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: preloadScript }} />
      </head>
      <body className="min-h-full">
        <ToastProvider>
          <ThemeProvider>
            <CurrencyProvider>
              <SplashLoader />
              <MaintenanceGate>
                {children}
              </MaintenanceGate>
              <ImpersonateBanner />
              <ContactFab />
              <FloatingAuth />
              <CookieNotice />
              <StatusStrip />
              <Cursor />
            </CurrencyProvider>
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}


