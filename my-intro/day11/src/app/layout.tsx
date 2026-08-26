import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "산책기록",
  description: "오늘의 걸음을 기록해요 — AI가 감성을 붙이고, 지도와 대시보드가 나의 산책을 기억한다.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e8927c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
