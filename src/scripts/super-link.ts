import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { linkSalesChannelsToApiKeyWorkflow } from "@medusajs/medusa/core-flows";

export default async function superLink({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const productModuleService = container.resolve(Modules.PRODUCT);
  
  const keyId = "apk_01KPCZP6JMTFHKT76ANFVEVRGY";
  const channelId = "sc_01KPAR7V31W1NWNQ96ZJ8NGWQC";

  // 1. Get all products
  const products = await productModuleService.listProducts({}, { select: ["id"] });
  const productIds = products.map(p => p.id);
  
  logger.info(`Found ${productIds.length} products to link.`);

  // 2. Link all products to the sales channel
  if (productIds.length > 0) {
    logger.info(`Linking products to Sales Channel ${channelId}...`);
    const links = productIds.map(id => ({
      [Modules.PRODUCT]: {
        product_id: id,
      },
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: channelId,
      },
    }));

    try {
      await link.create(links);
      logger.info("Successfully linked all products to Sales Channel!");
    } catch (error) {
      logger.warn(`Some links might already exist: ${error.message}`);
    }
  }

  // 3. Link Sales Channel to API Key
  logger.info(`Linking Sales Channel ${channelId} to API Key ${keyId}...`);
  try {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: keyId,
        add: [channelId],
      },
    });
    logger.info("Successfully linked API Key to Sales Channel!");
  } catch (error) {
    logger.error(`Failed to link API Key: ${error.message}`);
  }

  logger.info("Super Link complete!");
}
