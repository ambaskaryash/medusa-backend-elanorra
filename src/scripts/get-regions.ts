import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function getRegions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const regionModuleService = container.resolve(Modules.REGION);
  const regions = await regionModuleService.listRegions();
  logger.info(`Regions: ${JSON.stringify(regions.map(r => ({ name: r.name, id: r.id, currency_code: r.currency_code })))}`);
}
