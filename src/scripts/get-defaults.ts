import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function getMedusaDefaults({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const storeModuleService = container.resolve(Modules.STORE);

  const [store] = await storeModuleService.listStores();
  const salesChannels = await salesChannelModuleService.listSalesChannels();
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles();

  logger.info("--- Medusa Defaults ---");
  logger.info(`Store ID: ${store.id}`);
  logger.info(`Sales Channels: ${JSON.stringify(salesChannels.map(sc => ({ name: sc.name, id: sc.id })))}`);
  logger.info(`Shipping Profiles: ${JSON.stringify(shippingProfiles.map(sp => ({ name: sp.name, id: sp.id })))}`);
  logger.info("-----------------------");
}
