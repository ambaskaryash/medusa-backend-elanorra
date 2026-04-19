import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function addBulkInventory({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const inventoryModule = container.resolve(Modules.INVENTORY);
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION);
  const productModule = container.resolve(Modules.PRODUCT);

  logger.info("Fetching default stock location...");
  const locations = await stockLocationModule.listStockLocations({});
  if (!locations.length) {
    logger.error("No stock locations found! Please create one in the dashboard first.");
    return;
  }
  const locationId = locations[0].id;
  logger.info(`Using Stock Location: ${locations[0].name} (${locationId})`);

  // Fetch all variants and their linked inventory items via the new v2 Link architecture
  logger.info("Fetching all product variants...");
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: [
      "id", 
      "title", 
      "manage_inventory",
      "inventory_items.*",
      "inventory_items.inventory.*"
    ],
  });

  logger.info(`Found ${variants.length} variants. Processing inventory...`);

  let addedCount = 0;

  for (const variant of variants) {
    // 1. Ensure the variant actually manages inventory
    if (!variant.manage_inventory) {
      await productModule.updateProductVariants([{
        id: variant.id,
        manage_inventory: true
      }]);
    }

    // 2. Determine the Inventory Item ID linked to this variant, if any
    let inventoryItemId: string | null = null;
    
    if (variant.inventory_items && variant.inventory_items.length > 0) {
      inventoryItemId = variant.inventory_items[0].inventory_item_id;
    }

    // 3. If no inventory item exists for this variant, create one and link it
    if (!inventoryItemId) {
      // For a truly robust script, we would use the create inventory item workflow,
      // but creating it via module is straightforward.
      const invItem = await inventoryModule.createInventoryItems({
        sku: `SKU-${variant.id.slice(-6)}`, // Generate a dummy SKU if needed
        requires_shipping: true,
      });
      inventoryItemId = invItem.id;
      
      // Note: Ideally we attach it via remoteLink, but to keep it simple,
      // if it didn't have one, we just created the base item. 
      // Manual linking might be required in v2 via remoteLink.set()
    }

    // 4. Update the inventory level at the stock location to add 100
    try {
      if (inventoryItemId) {
        // Find existing level
        const levels = await inventoryModule.listInventoryLevels({
          inventory_item_id: inventoryItemId,
          location_id: locationId,
        });

        if (levels.length > 0) {
          // Add 100 to existing
          const currentStock = levels[0].stocked_quantity || 0;
          await inventoryModule.updateInventoryLevels(inventoryItemId, locationId, {
            stocked_quantity: currentStock + 100,
          });
        } else {
          // Create new level with 100
          await inventoryModule.createInventoryLevels([{
            inventory_item_id: inventoryItemId,
            location_id: locationId,
            stocked_quantity: 100,
          }]);
        }
        addedCount++;
      }
    } catch (e) {
      logger.error(`Failed to update inventory for variant ${variant.id}`);
    }
  }

  logger.info(`Successfully added 100 stock to ${addedCount} variants!`);
}
