import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows";

export default async function enableINR({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const storeModuleService = container.resolve(Modules.STORE);

  // 1. Get the current store
  const [store] = await storeModuleService.listStores({
    relations: ["supported_currencies"],
  });

  logger.info(`Fixing currencies for Store: ${store.name || store.id}`);

  // 2. Prepare the currency list (keep existing, add INR)
  const existingCodes = (store as any).supported_currencies?.map((c: any) => c.currency_code) || [];
  
  const newCurrencies = [...new Set([...existingCodes, "inr"])].map(code => ({
    currency_code: code,
    is_default: code === "inr" // Set INR as default
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
