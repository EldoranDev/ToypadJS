export type Listener = (data: Uint8Array) => void;

export abstract class Device {
  protected listener: Array<Listener> = [];

  abstract get opened(): boolean;

  abstract open(): Promise<void>;

  abstract send(data: Uint8Array): Promise<void>;

  addListener(handler: Listener): void {
    this.listener.push(handler);
  }

  removeListener(handler: Listener): void {
    const index = this.listener.indexOf(handler);

    this.listener.splice(index, 1);
  }
}
