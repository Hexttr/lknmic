import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Личный кабинет пациента НМИЦ Здоровья Детей",
  description: "Вход по номеру телефона",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
