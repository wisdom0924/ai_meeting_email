import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 회의록 마법사",
  description: "회의 내용을 똑똑하게 기록하고 요약해 주는 AI 비서",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <AuthProvider>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
