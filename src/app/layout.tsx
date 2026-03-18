import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SonicForge - AI Sound Effect Generator",
  description:
    "Generate, design, and process professional sound effects with AI-powered synthesis. Text-to-sound, ambient soundscapes, game audio, loops, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-dark-950 text-dark-50 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
