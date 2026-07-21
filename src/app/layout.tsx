import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";

import shieldLogo from "../../assets/img/shield.png";

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
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="h-1 bg-brand-700" />
          <div className="mx-auto flex max-w-[1000px] items-center gap-3 px-6 py-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <Image
                src={shieldLogo}
                alt="Catholic University of America"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[15px] font-semibold leading-tight text-navy-900">12twenty Import Fixer</h1>
              <p className="truncate text-xs text-slate-500">
                Load picklist files, fix values once per distinct value, export with original headers.
              </p>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
