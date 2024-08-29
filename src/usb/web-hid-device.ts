import { Device } from "./device";

const REPORT_ID: number = 0;

export class WebHidDevice extends Device {
    public constructor(
        private device: HIDDevice
    ) {
        super();
    }

    public get opened(): boolean {
        return this.device.opened;
    }

    public async open(): Promise<void> {
        this.device.addEventListener("inputreport", (event) => {
            const data = new Uint8Array(event.data.buffer);

            for (const lister of this.listener) {
                lister(data);
            }
        });

        await this.device.open();
    }

    public async send(data: Uint8Array): Promise<void> {
        await this.device.sendReport(
            REPORT_ID,
            data,
        );
    }

}