import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EconKB — 經濟學知識庫",
  description: "AI-powered economics knowledge base platform",
};

// 在 hydration 前套用主題，避免閃爍（FOUC）
const themeInitScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||(t!=="dark"&&window.matchMedia("(prefers-color-scheme: light)").matches)){document.documentElement.setAttribute("data-theme","light")}}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
