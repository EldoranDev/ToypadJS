import { Device } from "./device";
import { WebHidDevice } from "./web-hid-device";

export type { Device } from "./device";

export const VendorID = 0x0e6f;
export const ProductID = 0x0241;

type Filter = { vendorId: number; productId: number };

export async function getDevice(
  vendorId: number = VendorID,
  productId: number = ProductID,
): Promise<Device> {
  try {
    return new WebHidDevice(await getHidDevice({ vendorId, productId }));
  } catch {
    throw new Error("No device found");
  }
}

function getHidDevice(filter: Filter): Promise<HIDDevice> {
  return new Promise((resolve, reject) => {
    navigator.hid
      .requestDevice({ filters: [filter] })
      .then((devices) => {
        if (devices.length === 0) {
          reject();
        }

        resolve(devices[0]);
      })
      .catch((e) => {
        reject(e);
      });
  });
}
