import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function listMethods({ container }: ExecArgs) {
  const service = container.resolve(Modules.PRODUCT);
  console.log("Product Module Methods:");
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(service)).filter(m => m.toLowerCase().includes("collection")));
}
