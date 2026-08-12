import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Identity System | Professional Identity Engine",
  description: "A continuous career intelligence engine that maps development evidence to dynamic portfolios, tailored resumes, and role matching recruiter maps.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
