import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Arabya.ai الصفحة الرئيسية">
          <span className="brand-mark">Arabya.ai</span>
          <span className="brand-sub">تفسير كلمات القرآن الكريم</span>
        </Link>
        <nav className="nav" aria-label="التنقل الرئيسي">
          <Link href="/">فهرس السور</Link>
          <Link href="/privacy">سياسة الخصوصية</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <p className="footer-brand">Arabya.ai</p>
        <p>
          جميع الحقوق محفوظة © {year} —{" "}
          <Link href="/privacy">سياسة الخصوصية</Link>
        </p>
        <p className="footer-note">
          بيانات النص والكلمات من مصادر قرآنية مفتوحة عبر Quran.com API، مع واجهة
          Arabya.
        </p>
      </div>
    </footer>
  );
}
