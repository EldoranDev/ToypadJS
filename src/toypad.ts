import { Pad } from "./pad";
import { Command, INIT, ProductID, VendorID } from "./usb";

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
                case Command.MinifigScan:
                    const eventData = {
                        panel: data[2],
                        index: data[4],
                        action: data[5],
                        uid: data.slice(7, 13),
                    };

                    this.dispatchEvent(new CustomEvent("minifig-scan", { detail: eventData }))            
                    break;
            }
        });
    }

    public async setColor(pad: Pad, [r, g, b]: Color): Promise<void> {
        this.send([0x55, 0x06, 0xC0, 0x02, pad, r, g, b]);
    }

    private async send(command: Array<number>) {
        if (!this.open) {
            throw new Error("The Device is not open");
        }

        let checksum = 0;

        for (const word of command) {
            checksum = (checksum + word) & 0xFF;
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