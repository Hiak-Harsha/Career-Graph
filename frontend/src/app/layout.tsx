import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Graph — Living Professional Identity",
  description:
    "A living representation of your professional evolution. Work becomes evidence, evidence becomes understanding, understanding becomes your career graph.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
