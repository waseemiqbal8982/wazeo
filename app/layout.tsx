import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { SplashLoader } from "@/components/SplashLoader";
import { ContactFab } from "@/components/support/ContactFab";
import { CurrencyProvider } from "@/lib/currency-store";

export const metadata: Metadata = {
  title: {
    default: "Wazeo — SMM Panel",
    template: "%s · Wazeo",
  },
  description: "Wazeo is a fast, affordable SMM panel for Instagram, TikTok and YouTube growth.",
  metadataBase: new URL("https://wazeo.vercel.app"),
};

const preloadScript = `(function(){try{var t=localStorage.getItem('wazeo-theme')||'purple';var r=localStorage.getItem('wazeo-reduce')==='true';document.documentElement.dataset.theme=t;document.documentElement.dataset.reduceMotion=r?'true':'false';}catch(e){document.documentElement.dataset.theme='purple';}})();`;

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
              {children}
              <ContactFab />
            </CurrencyProvider>
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}


