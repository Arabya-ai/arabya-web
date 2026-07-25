import {
  Amiri,
  Reem_Kufi,
  Tajawal,
} from "next/font/google";
import { Toaster } from "@/ayat-studio/components/ui/toaster";
import { TooltipProvider } from "@/ayat-studio/components/ui/tooltip";
import { StudioProviders } from "@/ayat-studio/components/StudioProviders";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

const reemKufi = Reem_Kufi({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-reem-kufi",
  display: "swap",
});

const amiriQuran = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri-quran",
  display: "swap",
});

export default function CreateRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      id="ayat-studio-root"
      className={`ayat-studio ${tajawal.variable} ${reemKufi.variable} ${amiriQuran.variable}`}
    >
      <StudioProviders>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </StudioProviders>
    </div>
  );
}
