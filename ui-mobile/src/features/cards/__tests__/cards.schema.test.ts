import {
  createCardProductRequestSchema,
  createManualCardSchema
} from "@/features/cards/schemas/cards.schema";

describe("createManualCardSchema", () => {
  it("accepts a manual card with a 4-digit last four", () => {
    const parsed = createManualCardSchema.parse({
      cardProductId: 1,
      issuerId: 2,
      nickname: "Travel",
      lastFour: "4242",
      isPrimary: true
    });
    expect(parsed.lastFour).toBe("4242");
  });

  it("rejects a manual card with no last four", () => {
    expect(() =>
      createManualCardSchema.parse({ cardProductId: 1, issuerId: 2, isPrimary: false })
    ).toThrow();
  });

  it("rejects a last four that is not exactly 4 digits", () => {
    expect(() =>
      createManualCardSchema.parse({ cardProductId: 1, issuerId: 2, lastFour: "12", isPrimary: false })
    ).toThrow();
  });
});

describe("createCardProductRequestSchema", () => {
  it("requires last four only when it also creates a user card", () => {
    expect(() =>
      createCardProductRequestSchema.parse({
        issuerName: "Mystery Bank",
        cardName: "Mystery Card",
        createUserCard: false
      })
    ).not.toThrow();
  });

  it("rejects creating a user card without a last four", () => {
    expect(() =>
      createCardProductRequestSchema.parse({
        issuerName: "Mystery Bank",
        cardName: "Mystery Card",
        createUserCard: true
      })
    ).toThrow();
  });
});
