import { describe, expect, it } from "vitest";
import { greetingMenu, nextBotTurn, emptyBotPayload } from "../menu";

const cats = [
  {
    name: "Rice",
    products: [
      { id: "p1", name: "Chicken rice", salePrice: 850 },
      { id: "p2", name: "Egg rice", salePrice: 650 },
    ],
  },
  {
    name: "Drinks",
    products: [{ id: "p3", name: "Iced tea", salePrice: 200 }],
  },
];

const base = {
  orgName: "Apex Mart",
  categories: cats,
  locationText: "42 Galle Road",
  offersText: "10% off drinks",
};

describe("whatsapp greeting menu", () => {
  it("lists six numbered options", () => {
    const text = greetingMenu("Apex Mart");
    expect(text).toContain("Welcome Apex Mart");
    expect(text).toContain("1. Order");
    expect(text).toContain("6. Talk to staff");
  });

  it("returns greeting on hi from any state", () => {
    const turn = nextBotTurn({
      ...base,
      state: "ORDERING",
      payload: emptyBotPayload(),
      text: "hi",
    });
    expect(turn.nextState).toBe("GREETING");
    expect(turn.reply).toContain("1. Order");
  });

  it("builds a cart then signals checkout", () => {
    const pickCat = nextBotTurn({
      ...base,
      state: "GREETING",
      payload: emptyBotPayload(),
      text: "1",
    });
    expect(pickCat.nextState).toBe("ORDERING");

    const pickItem = nextBotTurn({
      ...base,
      state: "ORDERING",
      payload: pickCat.nextPayload,
      text: "1",
    });
    const add = nextBotTurn({
      ...base,
      state: "ORDERING",
      payload: pickItem.nextPayload,
      text: "1",
    });
    expect(add.nextPayload.cart[0]?.productId).toBe("p1");
    expect(add.nextPayload.cart[0]?.quantity).toBe(1);

    const checkout = nextBotTurn({
      ...base,
      state: "ORDERING",
      payload: add.nextPayload,
      text: "0",
    });
    expect(checkout.action).toBe("checkout");
    expect(checkout.nextPayload.cart).toHaveLength(1);
  });

  it("tracks on option 5", () => {
    const ask = nextBotTurn({
      ...base,
      state: "GREETING",
      payload: emptyBotPayload(),
      text: "5",
    });
    expect(ask.nextState).toBe("TRACK");
    const found = nextBotTurn({
      ...base,
      state: "TRACK",
      payload: emptyBotPayload(),
      text: "s-abc",
    });
    expect(found.action).toBe("track");
    expect(found.trackQuery).toBe("S-ABC");
  });
});
