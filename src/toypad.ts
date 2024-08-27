import { Pad } from "./pad";
import { Command, Event, INIT, ProductID, VendorID } from "./usb";

type Color = [r: number, g: number, b: number];

export class Toypad extends EventTarget {
    get open(): boolean {
        return this.device.opened;
    }

    private constructor(
        private device: HIDDevice
    ) {
        super();
    }

    public async init(): Promise<void> {
        if (this.open) {
            throw new Error("Already initialised");
        }

        await this.device.open();
        await this.device.sendReport(0, INIT);

        this.device.addEventListener("inputreport", (event) => {
            const data = new Uint8Array(event.data.buffer);

            console.log("RX: ", [...data].map((x) => x.toString(16).padStart(2, '0')).join(' '));
        
            switch (data[1]) {
                case Event.MinifigScan:
                    const eventData = {
                        panel: data[2],
                        index: data[4],
                        action: data[5],
                        uid: data.slice(7, 13),
                    };

                    console.log("minifig-scan", eventData);

                    this.dispatchEvent(new CustomEvent("minifig-scan", { detail: eventData }))            
                    break;
                case Event.TagRead:
                    console.log("tag-read", data);
            }
        });
    }

    public async setColor(pad: Pad, [r, g, b]: Color): Promise<void> {
        await this.send(Command.Color,[
            pad, r, g, b
        ]);
    }

    public async readTag(index: number, page: number): Promise<void> {
        await this.send(Command.ReadTag, [
            index, page
        ]);
    }

    private async send(cmd: Command, payload: Array<number>) {
        if (!this.open) {
            throw new Error("The Device is not open");
        }

        let checksum = 0;

        for (const word of payload) {
            checksum = (checksum + word) & 0xFF;
        }

        const data = [
            0x55, // Magic Host -> Portal
            2 + payload.length,
            cmd,
            0x02,
            ...payload,
        ];

        data.push(this.getChecksum(data));

        const buffer = new Uint8Array(32);
        buffer.set(data)

        console.log("TX: ", [...buffer].map((x) => x.toString(16).padStart(2, '0')).join(' '));

        this.device.sendReport(0, buffer)
    }

    private getChecksum(data: Array<number>): number {
        let checksum = 0;

        for (const word of data) {
            checksum = (word + checksum) & 0xFF;
        }

        return checksum;
    }

    static async connect(): Promise<Toypad> {
        return new Promise((res, rej) => {
            navigator.hid.requestDevice({
                filters: [
                    { vendorId: VendorID, productId: ProductID }
                ]
            }).then((device) => {
                res(new Toypad(device[0]));
            }).catch((err) => {
                rej(err);
            })
        });
    }
}