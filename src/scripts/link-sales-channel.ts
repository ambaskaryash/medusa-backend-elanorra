import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { linkSalesChannelsToApiKeyWorkflow } from "@medusajs/medusa/core-flows";

export default async function linkSalesChannel({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const keyId = "apk_01KPCZP6JMTFHKT76ANFVEVRGY";
  const channelId = "sc_01KPAR7V31W1NWNQ96ZJ8NGWQC";

  logger.info(`Linking API Key ${keyId} to Sales Channel ${channelId} using Workflow...`);

  try {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: keyId,
        add: [channelId],
      },
    });
    logger.info("Successfully linked API Key to Sales Channel!");
  } catch (error) {
    logger.error(`Failed to link: ${error.message}`);
    console.error(error);
  }
}
