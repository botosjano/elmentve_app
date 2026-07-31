import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { CookieConsent } from "@/components/CookieConsent";

// Manrope + latin-ext: a magyar ő/ű helyes megjelenítéséhez kötelező.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://elmentve.hu"),
  applicationName: "Elmentve",
  title: {
    default: "Elmentve – hétköznapi biztonsági háló",
    template: "%s – Elmentve",
  },
  description:
    "Fotózd le. Ellenőrizd. Mi megőrizzük, és időben szólunk. Lejáratfigyelő és garanciaszéf: műszaki vizsga, okmány, biztosítás, nyugta és jótállás egy helyen.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Elmentve",
  },
  icons: {
    icon: [{ url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f5ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
        <CookieConsent />
      </body>
    </html>
  );
}
