"use client";

import { SidebarProvider, SidebarTrigger } from "@/ayat-studio/components/ui/sidebar";
import { AppSidebar } from "@/ayat-studio/components/AppSidebar";
import { Link } from "@/i18n/navigation";
import { IslamicBackdrop } from "@/ayat-studio/components/IslamicDecor";
import { Home } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        <IslamicBackdrop />
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <header className="sticky top-0 z-30 h-14 flex items-center justify-between border-b border-accent/10 bg-background/70 backdrop-blur-xl px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-accent hover:bg-accent/10" />
              <span className="hidden sm:block text-xs tracking-widest text-accent/60">
                الاستوديو
              </span>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">عربية</span>
            </Link>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto relative">
            <div className="relative animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
