"use client";
import { Home, FolderOpen, Plus, History, Settings, UserRound, Sparkles } from "lucide-react";
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
  { title: "حسابي", url: "/account", icon: UserRound, site: true },
  { title: "الرئيسية", url: "/dashboard", icon: Home },
  { title: "مشاريعي", url: "/projects", icon: FolderOpen },
  { title: "مشروع جديد", url: "/projects/new", icon: Plus },
  { title: "فيديو ذكي", url: "/ai", icon: Sparkles },
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
      className="studio-app-sidebar border-l"
    >
      <SidebarContent className="studio-app-sidebar__panel relative overflow-x-hidden overflow-y-auto">
        <Link
          href="/"
          className="studio-app-sidebar__brand"
          title="الصفحة الرئيسية — عربية"
        >
          <Image
            src="/brand/arabya-mark-ui.webp"
            alt="عربية"
            width={collapsed ? 28 : 36}
            height={collapsed ? 28 : 36}
            className="arabya-mark-icon shrink-0"
            sizes="36px"
          />
          {!collapsed && (
            <div className="studio-app-sidebar__brand-text">
              <span className="studio-app-sidebar__brand-name">عربية ستوديو</span>
              <span className="studio-app-sidebar__brand-kicker">Arabya Studio</span>
            </div>
          )}
        </Link>

        <SidebarGroup className="relative pt-3">
          {!collapsed && (
            <SidebarGroupLabel className="studio-app-sidebar__label">
              القائمة
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="studio-app-sidebar__menu">
              {items.map((item) => {
                const href = "site" in item && item.site ? item.url : studioPath(item.url);
                const isActive =
                  pathname === href ||
                  (href !== "/account" && pathname.startsWith(`${href}/`));
                const body = (
                  <>
                    <span className="studio-app-sidebar__icon" aria-hidden>
                      <item.icon className="h-4 w-4 shrink-0" />
                    </span>
                    {!collapsed && (
                      <span className="studio-app-sidebar__item-label">{item.title}</span>
                    )}
                  </>
                );
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="studio-app-sidebar__link text-white hover:text-white"
                    >
                      {"site" in item && item.site ? (
                        <Link href={item.url}>{body}</Link>
                      ) : (
                        <NavLink to={item.url} end>
                          {body}
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
    </Sidebar>
  );
}
