import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mockCreate is available when vi.mock is hoisted
const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { extractReceipt } from "../extract-receipt";

describe("extractReceipt - VAT rate normalization (Bugfix #25)", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  function mockResponse(extraction: Record<string, unknown>) {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(extraction) }],
    });
  }

  const baseExtraction = {
    date: "2026-03-15",
    total_amount: 42.5,
    currency: "EUR",
    vendor_name: "Test",
    vendor_city: "Berlin",
    receipt_type: "restaurant",
    confidence: { date: 90, total_amount: 95, vendor_name: 80, vat_positions: 85, receipt_type: 90 },
  };

  it("normalizes VAT rate from whole number (19) to decimal (0.19)", async () => {
    mockResponse({
      ...baseExtraction,
      vat_positions: [{ rate: 19, net: 35.71, vat: 6.79, gross: 42.5 }],
    });

    const result = await extractReceipt("base64data", "image/jpeg");
    expect(result.vat_positions[0].rate).toBe(0.19);
  });

  it("normalizes VAT rate 7 to 0.07", async () => {
    mockResponse({
      ...baseExtraction,
      vat_positions: [{ rate: 7, net: 10.0, vat: 0.7, gross: 10.7 }],
    });

    const result = await extractReceipt("base64data", "image/jpeg");
    expect(result.vat_positions[0].rate).toBe(0.07);
  });

  it("keeps already decimal rate (0.19) as-is", async () => {
    mockResponse({
      ...baseExtraction,
      vat_positions: [{ rate: 0.19, net: 35.71, vat: 6.79, gross: 42.5 }],
    });

    const result = await extractReceipt("base64data", "image/jpeg");
    expect(result.vat_positions[0].rate).toBe(0.19);
  });

  it("handles multiple VAT positions with mixed formats", async () => {
    mockResponse({
      ...baseExtraction,
      vat_positions: [
        { rate: 19, net: 30.0, vat: 5.7, gross: 35.7 },
        { rate: 7, net: 13.36, vat: 0.94, gross: 14.3 },
      ],
    });

    const result = await extractReceipt("base64data", "image/jpeg");
    expect(result.vat_positions[0].rate).toBe(0.19);
    expect(result.vat_positions[1].rate).toBe(0.07);
  });

  it("handles empty vat_positions array", async () => {
    mockResponse({ ...baseExtraction, vat_positions: [] });

    const result = await extractReceipt("base64data", "image/jpeg");
    expect(result.vat_positions).toEqual([]);
  });

  it("strips markdown code blocks from response", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "```json\n" + JSON.stringify({
            ...baseExtraction,
            vat_positions: [{ rate: 19, net: 8.4, vat: 1.6, gross: 10.0 }],
          }) + "\n```",
        },
      ],
    });

    const result = await extractReceipt("base64data", "image/jpeg");
    expect(result.date).toBe("2026-03-15");
    expect(result.vat_positions[0].rate).toBe(0.19);
  });
});
