import { beforeEach, describe, expect, it, vi } from "vitest";

const sendGAEvent = vi.hoisted(() => vi.fn());
vi.mock("@next/third-parties/google", () => ({ sendGAEvent }));

import { trackWattlasAction } from "@/lib/analytics";

describe("trackWattlasAction", () => {
  beforeEach(() => sendGAEvent.mockClear());

  it("emits the shared GA4 event with defined structured parameters", () => {
    trackWattlasAction("entity_selected", { entity_type: "generator", entity_name: "Young Wind Farm", country: "US", technology: undefined });
    expect(sendGAEvent).toHaveBeenCalledWith("event", "wattlas_action", {
      action: "entity_selected",
      entity_type: "generator",
      entity_name: "Young Wind Farm",
      country: "US",
    });
  });
});
