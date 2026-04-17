import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function inspectStore({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const storeModuleService = container.resolve(Modules.STORE);

  const [store] = await storeModuleService.listStores();
  logger.info(`Store Details: ${JSON.stringify(store, null, 2)}`);
}
