"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/ayat-studio/components/ui/sidebar";
import { AppSidebar } from "@/ayat-studio/components/AppSidebar";
import { usePathname } from "@/i18n/navigation";
import { isStudioEditorPath } from "@/ayat-studio/lib/studio-shell-mode";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const editorMode = isStudioEditorPath(pathname);

  return (
    <SidebarProvider
      defaultOpen
      className={
        editorMode
          ? "ayat-studio-shell relative flex h-full min-h-0 w-full flex-1 overflow-hidden"
          : "ayat-studio-shell relative flex min-h-0 w-full overflow-x-hidden"
      }
      style={
        editorMode
          ? undefined
          : {
              minHeight:
                "calc(100dvh - var(--arabya-header-height, 4.5rem))",
            }
      }
    >
      <AppSidebar />
      <SidebarInset
        className={
          editorMode
            ? "relative z-0 flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden bg-transparent"
            : "relative z-0 flex min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-transparent"
        }
      >
        <header className="relative z-10 flex h-11 shrink-0 items-center gap-3 border-b border-border/60 bg-card/70 px-3 backdrop-blur-xl sm:h-12 sm:px-4">
          <SidebarTrigger className="shrink-0 text-accent hover:bg-accent/10" />
          <span className="truncate text-xs tracking-widest text-muted-foreground">
            الاستوديو
          </span>
        </header>
        <div
          className={
            editorMode
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
          }
        >
          <div
            className={
              editorMode
                ? "relative mx-auto flex h-full min-h-0 w-full max-w-[1800px] flex-1 animate-fade-in p-2 sm:p-3 lg:p-3"
                : "relative mx-auto w-full max-w-[1800px] flex-1 animate-fade-in p-3 sm:p-4 md:p-5 lg:p-6"
            }
          >
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
