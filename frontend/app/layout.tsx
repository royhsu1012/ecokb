import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EconKB — 經濟學知識庫",
  description: "AI-powered economics knowledge base platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
