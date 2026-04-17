import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function debugLinkage({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const apiKeyModuleService = container.resolve(Modules.API_KEY);
  const regionModuleService = container.resolve(Modules.REGION);

  // 1. List Sales Channels
  const [salesChannels] = await salesChannelModuleService.listSalesChannels();
  logger.info(`--- Sales Channels ---`);
  logger.info(JSON.stringify(salesChannels, null, 2));

  // 2. List Publishable API Keys and their links
  const [apiKeys] = await apiKeyModuleService.listApiKeys({
    type: "publishable"
  });
  logger.info(`--- Publishable API Keys ---`);
  logger.info(JSON.stringify(apiKeys, null, 2));

  // 3. List Regions
  const [regions] = await regionModuleService.listRegions();
  logger.info(`--- Regions ---`);
  logger.info(JSON.stringify(regions, null, 2));

  if (salesChannels.length === 0) {
    logger.warn("WARNING: No Sales Channels found. Medusa needs at least one to serve products.");
  }

  if (regions.length === 0) {
    logger.warn("WARNING: No Regions found. This will prevent cart initialization.");
  }
}
