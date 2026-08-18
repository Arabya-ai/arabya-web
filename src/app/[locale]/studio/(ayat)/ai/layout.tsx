import type { ReactNode } from "react";
import "@/mpt-studio/mpt-studio.css";

export default function PublicMptAiLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mpt-studio-root mx-auto w-full max-w-[1100px] px-4 py-8 md:px-6">
      {children}
    </div>
  );
}
