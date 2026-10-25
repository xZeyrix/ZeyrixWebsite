import type { Metadata } from "next";
import { Inter, Anton_SC, Oswald } from "next/font/google";
import "./[locale]/globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const antonSC = Anton_SC({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const oswald = Oswald({
  weight: "700",
  subsets: ["cyrillic"],
  variable: "--font-oswald",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zeyrix",
  description: "AI Software, Built for Real Business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${antonSC.variable} ${oswald.variable}`}
    >
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
