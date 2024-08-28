import { Pad } from "./pad";
import { Command, Event, createFrame, Frame, FrameType, INIT, parseFrame, ProductID, VendorID, MinifigAction } from "./usb";

type Color = [r: number, g: number, b: number];

type CallbackFunction = (data: Frame) => void;

type UID = [number, number, number, number, number, number, number];

type MinifigInfo = {
    uid: UID,
    pad: Pad,
    index: number,
};

export class Toypad {
    private counter: number = 2;

    private minifigs: Map<string, MinifigInfo> = new Map();

    private promiseMap: Map<string, CallbackFunction> = new Map();

    private  getNextMessageId(): number {
        return (this.counter++) & 0xFF;
    }

    private constructor(
        private device: HIDDevice,

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
        await this.device.sendReport(0, INIT);

        this.device.addEventListener("inputreport", (event) => {
            const frame = parseFrame(new Uint8Array(event.data.buffer));

            console.debug("RX: ", [...new Uint8Array(event.data.buffer)].map((x) => x.toString(16).padStart(2, '0')).join(' '));

            if (frame.type === FrameType.Message) {
                if (this.promiseMap.has(frame.messageId.toString())) {
                    this.promiseMap.get(frame.messageId.toString())!(
                        frame
                    );
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

    public async setColor(pad: Pad, [r, g, b]: Color): Promise<void> {
        await this.send(Command.Color, this.getNextMessageId(), [
            pad, r, g, b
        ]);
    }

    public async flash(pad: Pad, ticksOn: number, ticksOff: number, ticksCount: number, [r, g, b]: Color): Promise<void> {
        await this.send(Command.Flash, this.getNextMessageId(), [
            pad, ticksOn & 0xFF, ticksOff & 0xFF, ticksCount & 0xFF, r, g, b,
        ])
    }

    public readTag(index: number, page: number): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const messageId = this.getNextMessageId();

            this.promiseMap.set(messageId.toString(), (frame: Frame) => {
                console.debug('tag-read', frame);

                this.promiseMap.delete(messageId.toString());
                
                if (frame.event !== Event.Success) {
                    reject("Read error on tag");
                }

                resolve(frame.data);
            })

            this.send(Command.ReadTag, messageId, [
                index, page
            ]).catch((err) => {
                reject(err);
            })
        });
    }

    private async send(cmd: Command, messageId: number, payload: Array<number>) {
        if (!this.open) {
            throw new Error("The Device is not open");
        }

        const buffer = createFrame(cmd, messageId, payload);

        console.debug("TX: ", [...buffer].map((x) => x.toString(16).padStart(2, '0')).join(' '));

        await this.device.sendReport(0, buffer)
    }

    static async connect(
        addCallback?: (info: MinifigInfo) => void,
        removeCallback?: (info: MinifigInfo) => void,
    ): Promise<Toypad> {
        return new Promise((res, rej) => {
            navigator.hid.requestDevice({
                filters: [
                    { vendorId: VendorID, productId: ProductID }
                ]
            }).then((device) => {
                res(new Toypad(
                    device[0],
                    addCallback,
                    removeCallback,
                ));
            }).catch((err) => {
                rej(err);
            })
        });
    }
}