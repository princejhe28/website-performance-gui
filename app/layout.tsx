import type { Metadata } from "next";
import ThemeProvider from "./theme-provider";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Website Performance Dashboard",
  description: "Website performance monitoring dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Anti-FOUC: set theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;})();`,
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --bg-page: #f7f7f9;
            --bg-card: #ffffff;
            --bg-thead: #f9fafb;
            --bg-subtle: #f3f4f6;
            --bg-fail-row: #fffbfb;
            --text-primary: #111827;
            --text-secondary: #6b7280;
            --text-muted: #9ca3af;
            --text-body: #374151;
            --border: #f3f4f6;
            --border-strong: #e5e7eb;
            --shadow: 0 1px 4px rgba(0,0,0,0.07);
            --link: #4f46e5;
            --ring-track: #e5e7eb;
            --score-ring-inner: #ffffff;
            --page-btn-bg: #f3f4f6;
            --page-btn-color: #374151;
          }
          [data-theme="dark"] {
            --bg-page: #0f172a;
            --bg-card: #1e293b;
            --bg-thead: #253047;
            --bg-subtle: #334155;
            --bg-fail-row: #2a1a1a;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --text-body: #e2e8f0;
            --border: #334155;
            --border-strong: #475569;
            --shadow: 0 1px 4px rgba(0,0,0,0.4);
            --link: #818cf8;
            --ring-track: #334155;
            --score-ring-inner: #1e293b;
            --page-btn-bg: #334155;
            --page-btn-color: #e2e8f0;
          }
          *, *::before, *::after { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: system-ui, sans-serif;
            background: var(--bg-page);
            color: var(--text-primary);
            transition: background 0.2s, color 0.2s;
          }
        ` }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}