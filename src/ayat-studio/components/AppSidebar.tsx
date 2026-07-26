"use client";
import { Home, FolderOpen, Plus, History, Settings } from "lucide-react";
import Image from "next/image";
import { NavLink } from "@/ayat-studio/components/NavLink";
import { Link, usePathname } from "@/i18n/navigation";
import { studioPath } from "@/ayat-studio/lib/studio-paths";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/ayat-studio/components/ui/sidebar";

const items = [
  { title: "الرئيسية", url: "/dashboard", icon: Home },
  { title: "مشاريعي", url: "/projects", icon: FolderOpen },
  { title: "مشروع جديد", url: "/projects/new", icon: Plus },
  { title: "سجل التصدير", url: "/exports", icon: History },
  { title: "الإعدادات", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      side="right"
      className="border-sidebar-border border-l"
    >
      <SidebarContent className="relative overflow-x-hidden overflow-y-auto bg-sidebar">
        <div className="pattern-stars absolute inset-0 opacity-30 pointer-events-none" />

        <Link
          href="/"
          className="relative flex items-center gap-3 border-b border-sidebar-border px-4 py-5 hover:bg-sidebar-accent/30 transition-colors group"
          title="الصفحة الرئيسية — عربية"
        >
          <Image
            src="/brand/arabya-mark-square.png"
            alt="عربية"
            width={collapsed ? 28 : 36}
            height={collapsed ? 28 : 36}
            className="arabya-mark-icon shrink-0"
            unoptimized
          />
          {!collapsed && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="font-display font-bold leading-tight text-sidebar-foreground">
                عربية ستوديو
              </span>
              <span className="text-[9px] leading-none tracking-widest text-accent/70">
                ARABYA • STUDIO
              </span>
            </div>
          )}
        </Link>

        <SidebarGroup className="relative pt-4">
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent/70 px-3">
              القائمة
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {items.map((item) => {
                const isActive = pathname === studioPath(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`relative rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-accent/10 text-accent border border-accent/30 shadow-glow"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-accent border border-transparent"
                      }`}
                    >
                      <NavLink to={item.url} end>
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <span className="font-medium">{item.title}</span>
                        )}
                        {isActive && !collapsed && (
                          <span className="absolute left-2 h-1.5 w-1.5 rounded-full bg-accent shadow-glow" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mt-auto p-4 relative">
            <Link
              href="/"
              className="flex flex-col items-center gap-2 rounded-xl border border-accent/20 bg-card/40 p-4 text-center transition hover:border-accent/40 hover:bg-accent/5"
              title="الصفحة الرئيسية — عربية"
            >
              <Image
                src="/brand/arabya-mark-square.png"
                alt="عربية"
                width={48}
                height={48}
                className="arabya-mark-icon"
                unoptimized
              />
              <span className="text-xs font-display font-semibold text-sidebar-foreground">
                عربية
              </span>
              <span className="text-[10px] tracking-widest text-muted-foreground">
                الصفحة الرئيسية
              </span>
            </Link>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
