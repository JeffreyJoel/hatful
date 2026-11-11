import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Hatful",
  description: "Secret Santa for your group. Names are drawn once, and only you see yours.",
};

export const viewport: Viewport = {
  themeColor: "#0E3A2D",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster position="top-center" toastOptions={{ className: "font-sans" }} />
      </body>
    </html>
  );
}
