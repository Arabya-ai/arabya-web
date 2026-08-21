"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { normalizeArabicSearch } from "@/lib/arabic-normalize";

export function NlpToolkit() {
  const t = useTranslations("NlpService");
  const [input, setInput] = useState("إِنَّ ٱلْحَمْدَ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ");
  const normalized = useMemo(
    () => normalizeArabicSearch(input),
    [input],
  );

  return (
    <div className="nlp-svc">
      <section className="nlp-svc__panel" aria-labelledby="nlp-local-h">
        <h2 id="nlp-local-h">{t("localTitle")}</h2>
        <p>{t("localLead")}</p>
        <label className="nlp-svc__input">
          <span>{t("inputLabel")}</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            dir="rtl"
            lang="ar"
            maxLength={2000}
          />
        </label>
        <div className="nlp-svc__out">
          <h3>{t("normalizedLabel")}</h3>
          <p lang="ar" dir="rtl">
            {normalized || "—"}
          </p>
        </div>
      </section>

      <section className="nlp-svc__links" aria-labelledby="nlp-links-h">
        <h2 id="nlp-links-h">{t("hubTitle")}</h2>
        <p>{t("hubLead")}</p>
        <ul className="nlp-svc__cards">
          <li>
            <Link href="/lughawi" className="nlp-svc__card">
              <strong>{t("lughawiTitle")}</strong>
              <span>{t("lughawiDesc")}</span>
            </Link>
          </li>
          <li>
            <Link href="/lughawi/features" className="nlp-svc__card">
              <strong>{t("featuresTitle")}</strong>
              <span>{t("featuresDesc")}</span>
            </Link>
          </li>
          <li>
            <Link href="/roots" className="nlp-svc__card">
              <strong>{t("rootsTitle")}</strong>
              <span>{t("rootsDesc")}</span>
            </Link>
          </li>
          <li>
            <Link href="/search" className="nlp-svc__card">
              <strong>{t("searchTitle")}</strong>
              <span>{t("searchDesc")}</span>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
