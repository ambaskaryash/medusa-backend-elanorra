import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function clearProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);

  const products = await productModuleService.listProducts({}, { take: 1000 });
  
  if (products.length > 0) {
    logger.info(`Deleting ${products.length} products...`);
    await productModuleService.deleteProducts(products.map(p => p.id));
    logger.info("Products deleted.");
  }

  const inventoryModuleService = container.resolve(Modules.INVENTORY);
  const inventoryItems = await inventoryModuleService.listInventoryItems({}, { take: 1000 });
  
  if (inventoryItems.length > 0) {
    logger.info(`Deleting ${inventoryItems.length} inventory items...`);
    await inventoryModuleService.deleteInventoryItems(inventoryItems.map(i => i.id));
    logger.info("Inventory items deleted.");
  }
}
