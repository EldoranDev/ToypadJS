export const FRAME_SIZE = 0x20;

export enum FrameType {
  Message = 0x55,
  Event = 0x56,
}

export enum Event {
  Success = 0x00,
  LedChange = 0x01,
  TagNotFound = 0x02,
  MinifigScan = 0x0b,
  TagRead = 0x12,
  Connected = 0x19,
}

export enum Command {
  Wake = 0xb0,
  Seed = 0xb1,
  Challenge = 0xb3,
  Color = 0xc0,
  GetColor = 0xc1,
  Fade = 0xc2,
  Flash = 0xc3,
  FadeRandom = 0xc4,
  ColorAll = 0xc8,
  TagList = 0xd0,
  ReadTag = 0xd2,
  WriteTag = 0xd3,
  Password = 0xe1,
  Active = 0xe5,
}

export type Frame = EventFrame | ResponseFrame;

export interface EventFrame {
  type: FrameType.Event;
  event: Event;
  data: Uint8Array;
}

export interface ResponseFrame {
  type: FrameType.Message;
  event: Event;
  messageId: number;
  data: Uint8Array;
}

export enum MinifigAction {
  Add = 0x0,
  Remove = 0x1,
}

export function createFrame(
  cmd: number,
  messageId: number,
  payload: Array<number>,
): Uint8Array {
  if (payload.length + 2 > FRAME_SIZE) {
    throw new Error("Payload is to big");
  }

  const data = [
    FrameType.Message,
    2 + payload.length,
    cmd,
    messageId,
    ...payload,
  ];

  const buffer = new Uint8Array(32);
  buffer.set([...data, calculateChecksum(data)]);

  return buffer;
}

export function parseFrame(data: Uint8Array): EventFrame | ResponseFrame {
  const length = data[1];

  if (length >= FRAME_SIZE - 2) {
    throw new Error("invalid frame: combined frame length is over 32");
  }

  if (data[2 + length] !== calculateChecksum(data.slice(0, 2 + length))) {
    throw new Error("invalid frame: checksum is not correct");
  }

  console.debug("Frame with length: ", length);

  switch (data[0]) {
    case FrameType.Event:
      return {
        type: data[0],
        event: data[1],
        data: data.slice(2, 2 + length),
      };
    case FrameType.Message:
      return {
        type: data[0],
        event: data[3],
        messageId: data[2],
        data: data.slice(3, 2 + length),
      };

    default:
      throw new Error("Unknown Frame type");
  }
}

export function calculateChecksum(data: Iterable<number>): number {
  let checksum = 0;

  for (const word of data) {
    checksum = (word + checksum) & 0xff;
  }

  return checksum;
}
