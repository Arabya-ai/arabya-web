"use client";

import { forwardRef } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/ayat-studio/lib/utils";
import { studioPath } from "@/ayat-studio/lib/studio-paths";

interface NavLinkCompatProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  to: string;
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, to, end, ...props }, ref) => {
    const pathname = usePathname();
    const href = studioPath(to);
    const isActive = end
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
