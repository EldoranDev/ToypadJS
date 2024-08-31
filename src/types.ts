import { Pad } from "./pad";

export type Color = [r: number, g: number, b: number];

export type UID = [number, number, number, number, number, number, number];

export enum PasswordMode {
  NoPassword = 0,
  Automatic = 1,
  Custom = 2,
}

export type Password = [number, number, number, number];

export enum TagStatus {
  Ok,
  Error,
}

export interface TagInfo {
  uid: UID;
  pad: Pad;
  index: number;
}

export interface ExtendedTagInfo extends TagInfo {
  status: TagStatus;
}
