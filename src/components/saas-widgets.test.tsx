"use client";

/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatwootWidget } from "@/components/ChatwootWidget";
import { UmamiAnalytics } from "@/components/UmamiAnalytics";

describe("SaaS widgets graceful degradation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    document.body.innerHTML = "";
  });

  it("ChatwootWidget renders nothing and injects no script without env", () => {
    vi.stubEnv("NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN", "");
    vi.stubEnv("NEXT_PUBLIC_CHATWOOT_BASE_URL", "");
    const { container } = render(<ChatwootWidget />);
    expect(container.firstChild).toBeNull();
    expect(document.querySelector("#arabya-chatwoot-sdk")).toBeNull();
  });

  it("UmamiAnalytics returns null without env", () => {
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_SCRIPT_URL", "");
    const { container } = render(<UmamiAnalytics />);
    expect(container.firstChild).toBeNull();
  });
});
