import type { Metadata } from "next";
import "./globals.css";
import TopBar from "@/components/nav/TopBar";
import BottomTabs from "@/components/nav/BottomTabs";
import { SpaceProvider } from "@/components/spaces/SpaceContext";

export const metadata: Metadata = {
  title: "Kyndra",
  description: "Family collaboration made simple.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-skin="sunrise">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased">
        <SpaceProvider>
          <div className="mx-auto flex min-h-screen max-w-md flex-col">
            <TopBar />
            <main className="flex-1 px-4 pb-20 pt-3">{children}</main>
            <BottomTabs />
          </div>
        </SpaceProvider>
      </body>
    </html>
  );
}
