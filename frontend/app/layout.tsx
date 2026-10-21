import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS | Personal AI Assistant",
  description: "Local-first, modular personal AI assistant command center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-jarvis-dark text-slate-100 antialiased sci-fi-grid selection:bg-jarvis-cyan/30 selection:text-jarvis-cyan">
        {children}
      </body>
    </html>
  );
}
