import type { Metadata } from "next";
import { Inter, Playfair_Display, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import DemoBanner from "@/components/DemoBanner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DemoClockControl from "@/components/DemoClockControl";
import AminaChat from "@/components/AminaChat";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Visa Travel & Tours - Concept Demo",
  description: "Bilingual inquiry-capture and customer-engagement concept demo prepared for Visa Travel and Tours SPRL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <body 
        className={`${inter.variable} ${playfair.variable} ${robotoMono.variable} font-sans min-h-full flex flex-col bg-slate-50 text-slate-800`}
        suppressHydrationWarning
      >
        <Providers>
          <DemoBanner />
          <Header />
          <main className="flex-grow flex flex-col">
            {children}
          </main>
          <Footer />
          <DemoClockControl />
          <AminaChat />
        </Providers>
      </body>
    </html>
  );
}
