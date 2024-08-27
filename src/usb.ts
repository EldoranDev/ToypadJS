export const VendorID = 0x0E6F;
export const ProductID = 0x0241;

export enum Command {
    LedChange = 0x01,
    TagNotFound = 0x02,
    MinifigScan = 0x0b,
    TagRead = 0x12,
    Connected = 0x19,
}

export const INIT = new Uint8Array([0x55, 0x0f, 0xb0, 0x01, 0x28, 0x63, 0x29, 0x20, 0x4c, 0x45, 0x47, 0x4f, 0x20, 0x32, 0x30, 0x31, 0x34, 0xf7, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);