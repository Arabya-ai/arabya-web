import type { Metadata } from "next";
import Link from "next/link";
import { StudyAssistant } from "@/components/StudyAssistant";

export const metadata: Metadata = {
  title: "دراسة سريعة",
  description: "ادرس كلمة أو آية: معنى وإعراب وتفسير ميسر — عربية",
};

export default function StudyPage() {
  return (
    <div className="shell page-block study-page">
      <nav className="surah-nav" aria-label="تنقل">
        <Link href="/" className="nav-pill">
          ← الفهرس
        </Link>
      </nav>
      <StudyAssistant />
    </div>
  );
}
