import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function linkSalesChannel({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);

  const keyId = "apk_01KPCZP6JMTFHKT76ANFVEVRGY";
  const channelId = "sc_01KPAR7V31W1NWNQ96ZJ8NGWQC";

  logger.info(`Linking API Key ${keyId} to Sales Channel ${channelId}...`);

  try {
    await link.create({
      [Modules.API_KEY]: {
        api_key_id: keyId,
      },
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: channelId,
      },
    });
    logger.info("Successfully linked API Key to Sales Channel!");
  } catch (error) {
    logger.error(`Failed to link: ${error.message}`);
  }
}
