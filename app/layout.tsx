import type { Metadata } from "next";
import Script from "next/script";
import ThemeProvider from "./theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Website Performance Dashboard",
  description: "Website performance monitoring dashboard",
  verification: {
    google: "hMp6jt0I7fHt0uaIwr2CNUJUVbj30NhkeMazDHnqa6Q",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}