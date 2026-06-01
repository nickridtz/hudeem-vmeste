import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Худеем Вместе",
  description: "Совместное похудение · Лето 2026",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const themeScript = `
  try {
    var t = localStorage.getItem('theme') || 'dark';
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch(e) { document.documentElement.classList.add('dark'); }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased transition-colors duration-200">
        <ThemeProvider>
          <NavBar />
          <main className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-6 space-y-5 animate-fade-in">
            {children}
          </main>
          <footer className="hidden sm:block max-w-4xl mx-auto px-4 py-8 text-center text-zinc-400 dark:text-zinc-600 text-xs">
            Худеем Вместе 🤝 · Лето 2026
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
