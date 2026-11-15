import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import "./product.css";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "ITS US — Travel like a local",
  description: "Meet Hyderabad through its local guides, neighborhood stories, and your own kind of itinerary.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        <SiteHeader />
        <main>{children}</main>
        <MobileNav />
      </body>
    </html>
  );
}
