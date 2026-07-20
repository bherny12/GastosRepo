import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import { Providers } from "@/components/app/providers";
import { ServiceWorkerRegister } from "@/components/app/service-worker-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Los gastos de Doña Mónica",
  description: "Control familiar de ingresos, gastos, pagos y ventas de Ésika.",
  applicationName: "Los gastos de Doña Mónica",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png"
  },
  openGraph: {
    title: "Los gastos de Doña Mónica",
    description: "Una app cálida y clara para cuidar cada sol de la familia.",
    images: ["/logo.png"]
  }
};

export const viewport: Viewport = {
  themeColor: "#8B3A4A",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${lora.variable}`}>
        <ServiceWorkerRegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

