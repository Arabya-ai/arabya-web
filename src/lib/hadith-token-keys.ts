/** Shared Arabic token key variants for hadith enrich / rhetoric. */

export function candidateKeys(norm: string): string[] {
  const keys: string[] = [];
  const push = (k: string) => {
    if (k && k.length >= 2 && !keys.includes(k)) keys.push(k);
  };
  push(norm);

  const stripPrefix = (s: string) => {
    push(s);
    if (s.startsWith("ال") && s.length > 3) push(s.slice(2));
    if (/^[وفبلسك]/.test(s) && s.length > 2) {
      const rest = s.slice(1);
      push(rest);
      if (rest.startsWith("ال") && rest.length > 3) push(rest.slice(2));
    }
  };
  stripPrefix(norm);

  const suffixRe = /(هما|هم|هن|كم|كن|نا|ني|ها|ه|ك|ي)$/;
  const m = norm.match(suffixRe);
  if (m && norm.length - m[1].length >= 2) {
    const base = norm.slice(0, -m[1].length);
    stripPrefix(base);
    if (base.endsWith("ت") && base.length > 3) {
      push(base.slice(0, -1) + "ه");
    }
  }

  return keys;
}
