import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "provaAI - Seu Assistente Inteligente",
  description: "provaAI - Chatbot inteligente para auxiliar seus estudos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased newspaper-bg">
        {children}
      </body>
    </html>
  );
}
