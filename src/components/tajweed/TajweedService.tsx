"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export type TajweedRule = {
  id: string;
  nameAr: string;
  nameEn: string;
  swatch: string;
  summaryAr: string;
  summaryEn: string;
};

export type TajweedSegment = {
  text: string;
  rule: string | null;
};

export type TajweedSample = {
  id: string;
  refAr: string;
  refEn: string;
  segments: TajweedSegment[];
};

export function TajweedService({
  rules,
  samples,
}: {
  rules: TajweedRule[];
  samples: TajweedSample[];
}) {
  const t = useTranslations("TajweedService");
  const locale = useLocale();
  const [activeRule, setActiveRule] = useState<string | null>(null);

  const ruleMap = useMemo(() => {
    const map = new Map<string, TajweedRule>();
    for (const rule of rules) map.set(rule.id, rule);
    return map;
  }, [rules]);

  return (
    <div className="tajweed-svc">
      <section className="tajweed-svc__legend" aria-labelledby="tajweed-svc-legend">
        <h2 id="tajweed-svc-legend">{t("legendTitle")}</h2>
        <p>{t("legendLead")}</p>
        <ul className="tajweed-legend-list">
          {rules.map((rule) => {
            const selected = activeRule === rule.id;
            return (
              <li key={rule.id}>
                <button
                  type="button"
                  className={`tajweed-svc__rule ${selected ? "is-active" : ""}`}
                  onClick={() =>
                    setActiveRule((prev) => (prev === rule.id ? null : rule.id))
                  }
                  aria-pressed={selected}
                >
                  <span
                    className="tajweed-swatch"
                    style={{ background: rule.swatch }}
                    aria-hidden
                  />
                  <span>
                    <strong>
                      {locale === "en" ? rule.nameEn : rule.nameAr}
                    </strong>
                    <span className="tajweed-svc__rule-sum">
                      {locale === "en" ? rule.summaryEn : rule.summaryAr}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {activeRule ? (
          <p className="tajweed-svc__hint">{t("filterHint")}</p>
        ) : null}
      </section>

      <section className="tajweed-svc__samples" aria-labelledby="tajweed-svc-samples">
        <h2 id="tajweed-svc-samples">{t("samplesTitle")}</h2>
        <p>{t("samplesLead")}</p>
        <ul className="tajweed-svc__sample-list">
          {samples.map((sample) => (
            <li key={sample.id} className="tajweed-svc__sample">
              <p className="tajweed-svc__ref">
                {locale === "en" ? sample.refEn : sample.refAr}
              </p>
              <p className="tajweed-svc__ayah" lang="ar" dir="rtl">
                {sample.segments.map((seg, i) => {
                  const rule = seg.rule ? ruleMap.get(seg.rule) : null;
                  const dimmed =
                    Boolean(activeRule) && seg.rule !== activeRule;
                  return (
                    <span
                      key={`${sample.id}-${i}`}
                      className={
                        dimmed
                          ? "tajweed-svc__seg is-dim"
                          : "tajweed-svc__seg"
                      }
                      style={
                        rule
                          ? {
                              color: rule.swatch,
                              borderBottomColor: rule.swatch,
                            }
                          : undefined
                      }
                      title={
                        rule
                          ? locale === "en"
                            ? rule.nameEn
                            : rule.nameAr
                          : undefined
                      }
                    >
                      {seg.text}
                    </span>
                  );
                })}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
