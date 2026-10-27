import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { SplashLoader } from "@/components/SplashLoader";

export const metadata: Metadata = {
  title: {
    default: "Wazeo — SMM Panel",
    template: "%s · Wazeo",
  },
  description: "Wazeo is a fast, affordable SMM panel for Instagram, TikTok and YouTube growth.",
  metadataBase: new URL("https://wazeo.vercel.app"),
};

const preloadScript = `(function(){try{var t=localStorage.getItem('wazeo-theme')||'purple';var r=localStorage.getItem('wazeo-reduce')==='true';document.documentElement.dataset.theme=t;document.documentElement.dataset.reduceMotion=r?'true':'false';}catch(e){document.documentElement.dataset.theme='purple';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="purple" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: preloadScript }} />
      </head>
      <body className="min-h-full">
        <ToastProvider>
          <ThemeProvider>
            <SplashLoader />
            {children}
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}


