import { UID } from "./types";

export function getTagPassword(uid: UID): Uint8Array {
  // Using Uint32Arrays to get "true" ints
  const b = new Uint32Array(1);
  const v2 = new Uint32Array(1);

  // "UUUUUUU(c) Copyright LEGO 2014AA"
  const base = new Uint8Array([
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x28, 0x63, 0x29, 0x20, 0x43,
    0x6f, 0x70, 0x79, 0x72, 0x69, 0x67, 0x68, 0x74, 0x20, 0x4c, 0x45, 0x47,
    0x4f, 0x20, 0x32, 0x30, 0x31, 0x34, 0xaa, 0xaa,
  ]);

  for (let i = 0; i < uid.length; i++) {
    base[i] = uid[i];
  }

  for (let i = 0; i < 8; i++) {
    const v4 = new Uint32Array([rotateRight(v2[0], 25)]);
    const v5 = new Uint32Array([rotateRight(v2[0], 10)]);

    b[0] =
      (base[i * 4 + 3] << 24) |
      (base[i * 4 + 2] << 16) |
      (base[i * 4 + 1] << 8) |
      base[i * 4];

    v2[0] = b[0] + v4[0] + v5[0] - v2[0];
  }

  return new Uint8Array([
    (v2[0] >> 24) & 0xff,
    (v2[0] >> 16) & 0xff,
    (v2[0] >> 8) & 0xff,
    (v2[0] >> 0) & 0xff,
  ]);
}

function rotateRight(value: number, count: number): number {
  return (value >> count) | (value << (32 - count));
}
