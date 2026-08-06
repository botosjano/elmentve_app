import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { CookieConsent } from "@/components/CookieConsent";
import { SkipLink } from "@/components/ui/SkipLink";
import { SITE_URL } from "@/lib/siteConfig";

// Manrope + latin-ext: a magyar ő/ű helyes megjelenítéséhez kötelező.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const title = "Elmentve – hétköznapi biztonsági háló";
const description =
  "Fotózd le. Ellenőrizd. Mi megőrizzük, és időben szólunk. Lejáratfigyelő és garanciaszéf: műszaki vizsga, okmány, biztosítás, nyugta és jótállás egy helyen.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Elmentve",
  title: {
    default: title,
    template: "%s – Elmentve",
  },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "hu_HU",
    siteName: "Elmentve",
    title,
    description,
    url: SITE_URL,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.jpg"],
  },
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
        {/* Ha a JS egyáltalán nem fut le, a .el-reveal gyerekei a statikus CSS
            miatt opacity:0-n maradnának -- ez felülírja azokat láthatóra. */}
        <noscript>
          <style>{`.el-reveal > * { opacity: 1 !important; transform: none !important; filter: none !important; }`}</style>
        </noscript>
        {/* Skip link -- flotta-szintű audit találat (kártya b02fa268), a
            TerraCode mintáját követve (PR #115): sr-only + focus:not-sr-only,
            NEM display:none (ami kivenné a fókusz-sorrendből is). Cél:
            #main-content minden oldalon (marketing oldalak és /app/* is,
            l. AppShell.tsx). A CookieConsent alapállapota (első látogatás,
            döntés előtt) sima div, nem aria-modal/inert -- nincs a
            TerraCode #101-ben talált buktató. Külön kliens-komponensbe
            kiemelve (SkipLink.tsx), mert a fókusz-fixhez (kártya 9f71acc2)
            `onClick`-re van szükség, ami Server Component-ben nem elérhető. */}
        <SkipLink />
        {children}
        <ServiceWorkerRegister />
        <CookieConsent />
      </body>
    </html>
  );
}
