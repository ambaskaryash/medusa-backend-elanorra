import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows";

export default async function enableINR({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const storeModuleService = container.resolve(Modules.STORE);

  // 1. Get the current store and its currencies using the Query Engine
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: [store] } = await query.graph({
    entity: "store",
    fields: ["id", "name", "supported_currencies.*"],
  });

  if (!store) {
    logger.error("No store found.");
    return;
  }

  logger.info(`Fixing currencies for Store: ${store.name || store.id}`);

  // 2. Prepare the currency list (keep existing, ensure INR is there)
  const existingCurrencies = store.supported_currencies || [];
  const existingCodes = existingCurrencies.map((c: any) => c.currency_code);
  
  // Create a clean list of supported currencies
  let newCurrencies = [...existingCurrencies];
  
  if (!existingCodes.includes("inr")) {
    newCurrencies.push({
      currency_code: "inr",
      is_default: true // We'll make it default if it's new
    });
  }

  // Ensure only one is default (if we set INR as default)
  newCurrencies = newCurrencies.map(c => ({
    currency_code: c.currency_code,
    is_default: c.currency_code === "inr" 
  }));

  try {
    // 3. Run the workflow to update the store
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: newCurrencies,
          default_currency_code: "inr"
        },
      },
    });

    logger.info("Successfully added INR to supported currencies and set as default!");
  } catch (error) {
    logger.error("Failed to update store currencies.");
    logger.error(error.message);
  }
}
