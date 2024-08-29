import { Pad } from "./pad";
import { Command, Event, createFrame, Frame, FrameType, parseFrame, MinifigAction } from "./protocol";
import { getDevice, Device } from "./usb";

export type Color = [r: number, g: number, b: number];

type CallbackFunction = (data: Frame) => void;

export type UID = [number, number, number, number, number, number, number];

export type MinifigInfo = {
    uid: UID,
    pad: Pad,
    index: number,
};

export class Toypad {
    private counter: number = 1;

    private minifigs: Map<string, MinifigInfo> = new Map();

    private promiseMap: Map<string, CallbackFunction> = new Map();

    private  getNextMessageId(): number {
        return (this.counter++) & 0xFF;
    }

    private constructor(
        private device: Device,

        private addCallback?: (info: MinifigInfo) => void,
        private removeCallback?: (info: MinifigInfo) => void,
    ) {}

    public get open(): boolean {
        return this.device.opened;
    }

    public async init(): Promise<void> {
        if (this.open) {
            throw new Error("Already initialised");
        }

        await this.device.open();
        await this.wake();

        this.device.addListener((data: Uint8Array) => {
            const frame = parseFrame(data);

            console.debug("RX: ", [...data].map((x) => x.toString(16).padStart(2, '0')).join(' '));

            if (frame.type === FrameType.Message) {
                if (this.promiseMap.has(frame.messageId.toString())) {
                    this.promiseMap.get(frame.messageId.toString())!(
                        frame
                    );

                    this.promiseMap.delete(frame.messageId.toString());
                }

                return;
            }

            switch (frame.event) {
                case Event.MinifigScan:
                    const info: MinifigInfo = {
                        uid: [...frame.data.slice(4, 11)] as UID,
                        pad: frame.data[0],
                        index: frame.data[2],
                    };

                    if (frame.data[3] === MinifigAction.Add) {
                        this.minifigs.set(frame.data[2].toString(), info);
                        if (this.addCallback) {
                            this.addCallback(info);
                        }
                    } else {
                        this.minifigs.delete(frame.data[2].toString());

                        if (this.removeCallback) {
                            this.removeCallback(info);
                        }
                    }
                    break;
            }
        });
    }

    public getMinifigs(): Array<MinifigInfo> {
        return [...this.minifigs.values()];
    }

    public hasMinifig(pad: Pad): boolean {
        if (pad === Pad.AllPads) {
            return this.minifigs.size > 0;
        }

        return this.getMinifigs().filter((info) => info.pad === pad).length > 0;
    }

    public async wake(): Promise<void> {
        await this.send(Command.Wake, [
            // Hex of: (c) LEGO 2014
            0x28, 0x63, 0x29, 0x20, 0x4c, 0x45, 0x47, 0x4f, 0x20, 0x32, 0x30, 0x31, 0x34,
        ]);
    }

    public async setColor(pad: Pad, color: Color): Promise<void> {
        await this.send(Command.Color, [
            pad, ...color
        ]);
    }

    public getColor(pad: Pad): Promise<Color> {
        if (pad === Pad.AllPads) {
            throw new Error("Color can not be requested from all pads");
        }

        return new Promise((resolve, reject) => {
            this.send(Command.GetColor, [(pad - 1)], (frame: Frame) => {
                console.log(frame);

                resolve([0, 0, 0]);
            }).catch((e) => {
                reject(e);
            });
        });
    }

    public async setColorAll(center: Color, left: Color, right: Color): Promise<void> {
        await this.send(Command.ColorAll, [
            1, ...center, 1, ...left, 1, ...right,
        ]);
    }

    public async flash(pad: Pad, ticksOn: number, ticksOff: number, ticksCount: number, color: Color): Promise<void> {
        await this.send(Command.Flash, [
            pad, ticksOn & 0xFF, ticksOff & 0xFF, ticksCount & 0xFF, ...color,
        ])
    }

    public async fade(pad: Pad, tickTime: number, tickCount: number, color: Color): Promise<void> {
        await this.send(Command.Fade, [
            pad, tickTime & 0xFF, tickCount & 0xFF, ...color,
        ]);
    }

    public async fadeRandom(pad: Pad, tickTime: number, tickCount: number): Promise<void> {
        await this.send(Command.FadeRandom, [
            pad, tickTime, tickCount,
        ])
    }

    public readTag(index: number, page: number): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            this.send(Command.ReadTag, [
                index, page
            ], (frame: Frame) => {
                console.debug('tag-read', frame);

                if (frame.event !== Event.Success) {
                    reject("Read error on tag");
                }

                resolve(frame.data);
            }).catch((err) => {
                reject(err);
            });
        });
    }

    public writeTag(index: number, page: number, data: Array<number>): Promise<void> {
        return new Promise((resolve) => {
            this.send(Command.WriteTag, [
                index, page, ...data
            ], (frame: Frame) => {
                console.debug('tag-write', frame);
                resolve();
            });
        });
    }

    private async send(
        cmd: Command,
        payload: Array<number>,
        callback?: CallbackFunction,
    ) {
        if (!this.open) {
            throw new Error("The Device is not open");
        }

        const messageId = this.getNextMessageId();
        const buffer = createFrame(cmd, messageId, payload);

        console.debug("TX: ", [...buffer].map((x) => x.toString(16).padStart(2, '0')).join(' '));

        if (undefined !== callback) {
            this.promiseMap.set(
                messageId.toString(),
                callback,
            );
        }

        await this.device.send(buffer)
    }

    static async connect(
        addCallback?: (info: MinifigInfo) => void,
        removeCallback?: (info: MinifigInfo) => void,
    ): Promise<Toypad> {
        return new Toypad(
            await getDevice(),
            addCallback,
            removeCallback,
        );
    }
}