import { NextResponse } from "next/server";
import { getAsmaByNumber, getAsmaNames, todayAsmaIndex } from "@/lib/asma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nRaw = Number(searchParams.get("n"));

  try {
    if (Number.isInteger(nRaw) && nRaw >= 1 && nRaw <= 99) {
      const one = await getAsmaByNumber(nRaw);
      if (!one) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      return NextResponse.json(
        { name: one },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=604800, stale-while-revalidate=86400",
          },
        },
      );
    }

    const names = await getAsmaNames();
    const today = names[todayAsmaIndex(names.length)] ?? names[0];

    return NextResponse.json(
      {
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
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
