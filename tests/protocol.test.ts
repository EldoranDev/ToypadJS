import { describe, expect, test } from "vitest";
import { calculateChecksum, createFrame, parseFrame } from "../src/protocol";

describe.concurrent("calculateChecksum", () => {
  test("works for low numbers", () => {
    expect(calculateChecksum([1, 2, 3])).toBe(6);
  });

  test("works for empty payload", () => {
    expect(calculateChecksum([])).toBe(0);
  });

  test("overflows correctly", () => {
    expect(calculateChecksum([0xff, 0x1])).toBe(0x0);
    expect(calculateChecksum([0x100])).toBe(0x0);
    expect(calculateChecksum([0xfe, 0x1, 0x1, 0x1])).toBe(0x1);
  });
});

describe.concurrent("frame", () => {
  test("Placeholder", () => {
    expect(true).toBe(true);
  });
});

describe.concurrent("parseFrame", () => {
  test("can parse init frame", () => {
    const response = parseFrame(
      new Uint8Array([
        0x55, 0x0f, 0xb0, 0x01, 0x28, 0x63, 0x29, 0x20, 0x4c, 0x45, 0x47, 0x4f,
        0x20, 0x32, 0x30, 0x31, 0x34, 0xf7, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]),
    );

    expect(response).toBeTruthy();
  });

  test("detects invalid checksum", () => {
    expect(() => {
      parseFrame(
        new Uint8Array([
          0x55, 0x0f, 0xb0, 0x01, 0x28, 0x63, 0x29, 0x20, 0x4c, 0x45, 0x47,
          0x4f, 0x20, 0x32, 0x30, 0x31, 0x34, 0xff, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ]),
      );
    }).toThrowError("checksum");
  });
});
