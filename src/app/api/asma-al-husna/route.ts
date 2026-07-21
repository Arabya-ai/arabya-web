import { NextResponse } from "next/server";

type AsmaName = {
  number: number;
  name: string;
  transliteration: string;
  meaningEn: string;
};

type UpstreamRow = {
  number?: number;
  name?: string;
  transliteration?: string;
  en?: { meaning?: string } | string;
};

function meaningOf(en: UpstreamRow["en"]): string {
  if (!en) return "";
  if (typeof en === "string") return en;
  return en.meaning ?? "";
}

/**
 * 99 Names via islamic.app (free, no key). Cached at the edge.
 * Optional ?n=1..99 for a single name; otherwise returns all + today pick.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nRaw = Number(searchParams.get("n"));

  try {
    const res = await fetch("https://api.islamic.app/v1/asma-al-husna", {
      next: { revalidate: 86400 * 7 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "upstream", status: res.status },
        { status: 502 },
      );
    }
    const payload = (await res.json()) as {
      data?: UpstreamRow[];
    };
    const rows = payload.data;
    if (!Array.isArray(rows) || !rows.length) {
      return NextResponse.json({ error: "empty" }, { status: 502 });
    }

    const names: AsmaName[] = rows
      .map((r) => ({
        number: Number(r.number) || 0,
        name: String(r.name ?? ""),
        transliteration: String(r.transliteration ?? ""),
        meaningEn: meaningOf(r.en),
      }))
      .filter((r) => r.number >= 1 && r.name);

    const dayIndex =
      Math.floor(Date.now() / 86400000) % Math.max(1, names.length);
    const today = names[dayIndex] ?? names[0];

    if (Number.isInteger(nRaw) && nRaw >= 1 && nRaw <= 99) {
      const one = names.find((x) => x.number === nRaw) ?? null;
      if (!one) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      return NextResponse.json(
        { source: "api.islamic.app", name: one },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=604800, stale-while-revalidate=86400",
          },
        },
      );
    }

    return NextResponse.json(
      {
        source: "api.islamic.app",
        count: names.length,
        today,
        names,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=604800, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
