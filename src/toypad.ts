import { Pad } from "./pad";
import { INIT, ProductID, VendorID } from "./usb";

type Color = [r: number, g: number, b: number];

export class Toypad {
    private isInit: boolean = false;

    private listener: Function|null = null;

    constructor(
        private device: HIDDevice
    ) {
        
    }

    public async init(): Promise<void> {
        if (this.isInit) {
            throw new Error("Already initialised");
        }

        await this.device.open();
        // await this.device.selectConfiguration(1);
        // await this.device.claimInterface(0);

        await this.device.sendReport(0, INIT);

        this.device.addEventListener("inputreport", (event) => {
            console.log("RX: ", [...new Uint8Array(event.data.buffer)].map((x) => x.toString(16).padStart(2, '0')).join(' '));
        });
    }

    public async setColor(pad: Pad, [r, g, b]: Color): Promise<void> {
        if (!this.device.opened) {
            throw new Error("Device is not open");
        }

        this.send([0x55, 0x06, 0xC0, 0x02, pad, r, g, b]);
    }

    private async send(command: Array<number>) {
        let checksum = 0;

        for (const word of command) {
            checksum += word;

            if (checksum >= 256) {
                checksum -= 256;
            }
        }

        command.push(checksum);

        while (command.length < 32) {
            command.push(0x00);
        }

        console.log("TX: ", command.map((x) => x.toString(16).padStart(2, '0')).join(' '));

        this.device.sendReport(0, new Uint8Array(command))
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