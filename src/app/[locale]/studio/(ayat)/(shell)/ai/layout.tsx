import type { ReactNode } from "react";
import "@/mpt-studio/mpt-studio.css";

export default function MptStudioLayout({ children }: { children: ReactNode }) {
  return <div className="mpt-studio-root w-full">{children}</div>;
}
