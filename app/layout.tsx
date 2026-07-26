import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vejle Boldklub Admin",
  description: "Administration for Vejle Boldklub",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
