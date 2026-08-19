import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ArabyaPanel, ArabyaPanelStack } from "@/components/ui/ArabyaPanel";

describe("ArabyaPanel", () => {
  it("renders shared panel primitive classes", () => {
    const html = renderToStaticMarkup(
      <ArabyaPanelStack>
        <ArabyaPanel accent title="Title" muted="Muted">
          Body
        </ArabyaPanel>
      </ArabyaPanelStack>,
    );
    expect(html).toContain('class="arabya-panel-stack"');
    expect(html).toContain('class="arabya-panel arabya-panel--accent"');
    expect(html).toContain('class="arabya-panel__title"');
    expect(html).toContain('class="arabya-panel__muted"');
  });

  it("supports legacy dash-card, custom tag, and title id", () => {
    const html = renderToStaticMarkup(
      <ArabyaPanel
        as="article"
        legacyDash
        accent
        titleId="panel-title"
        title="Legacy"
        className="extra"
      >
        Item
      </ArabyaPanel>,
    );
    expect(html).toContain("<article");
    expect(html).toContain("dash-card dash-card--accent");
    expect(html).toContain('id="panel-title"');
    expect(html).toContain("extra");
  });
});
