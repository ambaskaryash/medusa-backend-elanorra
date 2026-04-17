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
  
  // Combine existing codes with INR
  const allCodes = [...new Set([...existingCodes, "inr"])];

  // SANITIZE: Only send currency_code and is_default
  // This prevents the "fieldNames" error by removing IDs/timestamps from the update
  const newCurrencies = allCodes.map(code => ({
    currency_code: code,
    is_default: code === "inr" 
  }));

  try {
    // 3. Run the workflow to update the store
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: newCurrencies,
        },
      },
    });

    logger.info(`Successfully enabled INR! Current currencies: ${allCodes.join(", ")}`);
  } catch (error) {
    logger.error("Failed to update store currencies.");
    logger.error(error.message);
  }
}
