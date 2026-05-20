import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Repository Assistant",
  description: "AI-powered GitHub repository intelligence through MCP."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
