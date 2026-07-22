import { describe, expect, it } from "vitest";
import { absoluteUrl, buildListenUrl, socialShareLinks } from "@/lib/share";
import {
  ayahOgImagePath,
  mushafOgImagePath,
  rootOgImagePath,
} from "@/lib/og-meta";

describe("share helpers", () => {
  it("builds relative listen deep links", () => {
    expect(
      buildListenUrl({
        path: "/mushaf/1",
        listen: "surah",
        reciter: "alafasy",
        verse: "1:1",
      }),
    ).toBe("/mushaf/1?listen=surah&reciter=alafasy&v=1%3A1");
  });

  it("keeps absolute URLs absolute", () => {
    expect(absoluteUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(absoluteUrl("/mushaf/2").endsWith("/mushaf/2")).toBe(true);
  });

  it("returns social share destinations", () => {
    const links = socialShareLinks({
      title: "t",
      text: "body",
      url: "https://www.arabyaai.com/mushaf/1",
    });
    expect(links.map((l) => l.id)).toEqual([
      "whatsapp",
      "telegram",
      "x",
      "facebook",
      "linkedin",
    ]);
    expect(links[0].href).toContain("wa.me");
  });
});

describe("og paths", () => {
  it("builds stable OG image paths", () => {
    expect(mushafOgImagePath(1)).toBe("/mushaf/1/opengraph-image");
    expect(ayahOgImagePath(2, 255)).toBe("/ayah/2/255/opengraph-image");
    expect(rootOgImagePath("رحم")).toContain("/root/");
  });
});
