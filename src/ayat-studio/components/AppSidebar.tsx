"use client";
import { Home, FolderOpen, Plus, History, Settings, ListChecks } from "lucide-react";
import { NavLink } from "@/ayat-studio/components/NavLink";
import { Link, usePathname } from "@/i18n/navigation";
import { studioPath } from "@/ayat-studio/lib/studio-paths";
import { useSession } from "next-auth/react";
import { canAccessStudio } from "@/lib/roles";
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
import { ArabesqueMedallion } from "@/ayat-studio/components/IslamicDecor";

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
  const { data: session } = useSession();
  const showEditorTools = canAccessStudio(session?.user?.role ?? "user");

  return (
    <Sidebar collapsible="icon" side="right" className="border-l border-sidebar-border">
      <SidebarContent className="bg-sidebar relative overflow-hidden">
        <div className="pattern-stars absolute inset-0 opacity-40 pointer-events-none" />

        {/* Logo */}
        <Link
          href={studioPath("/")}
          className="relative flex items-center gap-3 border-b border-sidebar-border px-4 py-5 hover:bg-sidebar-accent/30 transition-colors group"
        >
          <ArabesqueMedallion
            size={collapsed ? 28 : 36}
            className="text-accent shrink-0 transition-transform group-hover:rotate-45 duration-700"
          />
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-sidebar-foreground">عربية ستوديو</span>
              <span className="text-[9px] tracking-widest text-accent/70">ARABYA • STUDIO</span>
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
                        {!collapsed && <span className="font-medium">{item.title}</span>}
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

        {showEditorTools ? (
          <SidebarGroup className="relative pt-2">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent/70 px-3">
                أدوات المحرر
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1 px-2">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/studio/queue")}
                    className="rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-accent border border-transparent"
                  >
                    <Link href="/studio/queue">
                      <ListChecks className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="font-medium">طابور الجودة</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/studio/sources")}
                    className="rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-accent border border-transparent"
                  >
                    <Link href="/studio/sources">
                      <FolderOpen className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="font-medium">المصادر</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {/* Footer ornament */}
        {!collapsed && (
          <div className="mt-auto p-4 relative">
            <div className="rounded-xl border border-accent/20 bg-card/40 p-4 text-center">
              <p className="font-quran text-sm leading-relaxed text-accent/90">﴿ ٱقْرَأْ ﴾</p>
              <p className="mt-1 text-[10px] tracking-widest text-muted-foreground">سورة العلق</p>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
