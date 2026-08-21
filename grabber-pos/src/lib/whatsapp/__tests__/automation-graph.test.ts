import { describe, expect, it } from "vitest";
import {
  enabledPathList,
  greetingMenuFromGraph,
  normalizeEnabledPaths,
  pathReadyStatus,
  resolveMenuChoice,
} from "../automation-graph";
import { greetingMenu, nextBotTurn, emptyBotPayload } from "../menu";

describe("automation graph", () => {
  it("renumbers menu when paths are disabled", () => {
    const enabled = normalizeEnabledPaths({
      order: true,
      menu: false,
      offers: true,
      location: false,
      track: true,
      staff: true,
    });
    expect(enabledPathList(enabled)).toEqual([
      "order",
      "offers",
      "track",
      "staff",
    ]);
    expect(resolveMenuChoice("2", enabled)).toBe("offers");
    expect(resolveMenuChoice("4", enabled)).toBe("staff");
    const text = greetingMenuFromGraph("Anaz Store", "en", {
      greeting: "Open 8–8",
      enabled,
    });
    expect(text).toContain("Open 8–8");
    expect(text).toContain("1. Order");
    expect(text).toContain("2. Today's offers");
    expect(text).not.toContain("View menu");
  });

  it("marks offers/location as needing setup when empty", () => {
    const config = {
      greeting: "",
      enabled: normalizeEnabledPaths(null),
      locationText: "",
      offersText: "Flash sale",
      staffNotify: true,
    };
    expect(pathReadyStatus("offers", config)).toBe("ready");
    expect(pathReadyStatus("location", config)).toBe("needs_setup");
    expect(
      pathReadyStatus("order", {
        ...config,
        enabled: { ...config.enabled, order: false },
      }),
    ).toBe("off");
  });

  it("wires greeting + disabled paths through nextBotTurn", () => {
    const turn = nextBotTurn({
      orgName: "Anaz Store",
      categories: [
        {
          name: "Rice",
          products: [{ id: "p1", name: "Chicken rice", salePrice: 850 }],
        },
      ],
      locationText: "42 Galle Road",
      offersText: "10% off",
      greeting: "Kitchen & home",
      enabledPaths: {
        order: true,
        menu: true,
        offers: false,
        location: true,
        track: true,
        staff: true,
      },
      state: "GREETING",
      payload: emptyBotPayload(),
      text: "hi",
    });
    expect(turn.reply).toContain("Kitchen & home");
    expect(turn.reply).toContain("1. Order");
    expect(turn.reply).not.toContain("Today's offers");
    // With offers off, "3" is Location
    const loc = nextBotTurn({
      orgName: "Anaz Store",
      categories: [],
      locationText: "42 Galle Road",
      offersText: "",
      enabledPaths: {
        order: true,
        menu: true,
        offers: false,
        location: true,
        track: true,
        staff: true,
      },
      state: "GREETING",
      payload: emptyBotPayload(),
      text: "3",
    });
    expect(loc.reply).toContain("42 Galle Road");
  });

  it("keeps default six-option greeting when all paths on", () => {
    const text = greetingMenu("Apex Mart");
    expect(text).toContain("1. Order");
    expect(text).toContain("6. Talk to staff");
  });
});
