import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function checkProductsLinkage({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // 1. Get the Default Sales Channel and its products
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "is_disabled", "products.*"],
  });

  logger.info(`--- Sales Channels Detail ---`);
  salesChannels.forEach((sc: any) => {
    logger.info(`Channel: ${sc.name} (${sc.id})`);
    logger.info(`Is Disabled: ${sc.is_disabled}`);
    logger.info(`Product Count: ${sc.products?.length || 0}`);
  });

  // 2. Get total product count
  const productModuleService = container.resolve(Modules.PRODUCT);
  const [, count] = await productModuleService.listAndCountProducts();
  logger.info(`--- Store Detail ---`);
  logger.info(`Total Products in DB: ${count}`);

  if (salesChannels.some((sc: any) => sc.products?.length === 0 && count > 0)) {
    logger.warn("WARNING: You have products in your database, but they are NOT assigned to any Sales Channel. Your publishable key will see nothing.");
  }
}
