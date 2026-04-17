import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function setupIndia({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const regionService = container.resolve(Modules.REGION);

  logger.info("Checking for India region...");

  const regions = await regionService.listRegions({
    name: "India"
  });

  if (regions.length > 0) {
    logger.info(`Region 'India' already exists with ID: ${regions[0].id}`);
    return;
  }

  logger.info("Creating India Region with INR currency...");
  
  try {
    const region = await regionService.createRegions({
      name: "India",
      currency_code: "inr",
      countries: ["in"],
    });

    logger.info(`Successfully created India Region! ID: ${region.id}`);
  } catch (error) {
    logger.error("Failed to create India region. Ensure 'inr' is enabled in your Medusa configuration.");
    logger.error(error.message);
  }
}
