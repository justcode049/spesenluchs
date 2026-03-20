import { describe, it, expect, vi } from "vitest";

// Mock Anthropic with a proper class
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: vi.fn() };
    },
  };
});

import { recognizeTrip } from "../trip-recognition";

const profile = { city: "Hamburg", primary_workplace: "Hamburg, Büro" };

const existingTrips = [
  {
    id: "trip-1",
    destination: "München",
    start_datetime: "2026-03-10T08:00:00",
    end_datetime: "2026-03-12T18:00:00",
  },
  {
    id: "trip-2",
    destination: "Berlin",
    start_datetime: "2026-04-01T09:00:00",
    end_datetime: "2026-04-03T17:00:00",
  },
];

describe("recognizeTrip", () => {
  it("returns 'none' when receipt has no date", async () => {
    const result = await recognizeTrip(
      { date: null, vendor_city: "München", receipt_type: "hotel" },
      profile,
      existingTrips
    );
    expect(result.type).toBe("none");
    expect(result.confidence).toBe(0);
  });

  it("matches existing trip by date + city", async () => {
    const result = await recognizeTrip(
      { date: "2026-03-11", vendor_city: "München", receipt_type: "restaurant" },
      profile,
      existingTrips
    );
    expect(result.type).toBe("existing");
    expect(result.tripId).toBe("trip-1");
    expect(result.confidence).toBe(0.95);
  });

  it("matches existing trip by date only (lower confidence)", async () => {
    const result = await recognizeTrip(
      { date: "2026-03-11", vendor_city: "Garching", receipt_type: "taxi" },
      profile,
      existingTrips
    );
    expect(result.type).toBe("existing");
    expect(result.tripId).toBe("trip-1");
    expect(result.confidence).toBe(0.7);
  });

  it("matches with buffer day (1 day before trip start)", async () => {
    const result = await recognizeTrip(
      { date: "2026-03-09", vendor_city: "München", receipt_type: "parking" },
      profile,
      existingTrips
    );
    expect(result.type).toBe("existing");
    expect(result.tripId).toBe("trip-1");
  });

  it("matches with buffer day (1 day after trip end)", async () => {
    const result = await recognizeTrip(
      { date: "2026-03-13", vendor_city: "München", receipt_type: "taxi" },
      profile,
      existingTrips
    );
    expect(result.type).toBe("existing");
    expect(result.tripId).toBe("trip-1");
  });

  it("returns 'none' for receipt in home city (no Claude call)", async () => {
    const result = await recognizeTrip(
      { date: "2026-05-01", vendor_city: "Hamburg", receipt_type: "restaurant" },
      profile,
      existingTrips
    );
    expect(result.type).toBe("none");
    expect(result.confidence).toBe(0.8);
  });

  it("returns 'none' when no vendor_city and no match", async () => {
    const result = await recognizeTrip(
      { date: "2026-06-01", vendor_city: null, receipt_type: "other" },
      profile,
      []
    );
    expect(result.type).toBe("none");
  });

  it("returns 'none' when no profile city", async () => {
    const result = await recognizeTrip(
      { date: "2026-06-01", vendor_city: "Frankfurt", receipt_type: "hotel" },
      { city: null, primary_workplace: null },
      []
    );
    expect(result.type).toBe("none");
  });

  it("matches second trip correctly", async () => {
    const result = await recognizeTrip(
      { date: "2026-04-02", vendor_city: "Berlin", receipt_type: "hotel" },
      profile,
      existingTrips
    );
    expect(result.type).toBe("existing");
    expect(result.tripId).toBe("trip-2");
    expect(result.confidence).toBe(0.95);
  });
});
