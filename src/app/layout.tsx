import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Wand2 } from "lucide-react";
import { ThemeProvider } from "next-themes";

import ThemeToggle from "@/components/ThemeToggle";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "12twenty Import Fixer",
  description: "Fix invalid picklist values in a 12twenty bulk-upload CSV before importing.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`h-full ${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mx-auto flex max-w-[1000px] items-center gap-3 px-6 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white dark:bg-teal-600">
                <Wand2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-[15px] font-semibold leading-tight">12twenty Import Fixer</h1>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  Load picklist files, fix values once per distinct value, export with original headers.
                </p>
              </div>
              <ThemeToggle />
            </div>
          </header>
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
