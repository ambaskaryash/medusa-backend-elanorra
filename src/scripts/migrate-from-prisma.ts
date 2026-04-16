import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import fs from "fs";
import path from "path";

export default async function migrateFromPrisma({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModuleService = container.resolve(Modules.PRODUCT);
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);
  const regionService = container.resolve(Modules.REGION);
  const fulfillmentService = container.resolve(Modules.FULFILLMENT);

  // Dynamic Lookup of IDs
  logger.info("Fetching default IDs...");
  
  const [salesChannels] = await salesChannelService.listAndCount({ name: "Default Sales Channel" });
  const SALES_CHANNEL_ID = salesChannels[0]?.id;
  
  const regions = await regionService.listRegions();
  const REGION_ID_INDIA = regions.find(r => r.name.toLowerCase().includes("india"))?.id || regions[0]?.id;
  
  const shippingProfiles = await fulfillmentService.listShippingProfiles();
  const SHIPPING_PROFILE_ID = shippingProfiles.find(p => p.type === "default")?.id || shippingProfiles[0]?.id;

  const CURRENCY_CODE = "inr";

  if (!SALES_CHANNEL_ID || !REGION_ID_INDIA || !SHIPPING_PROFILE_ID) {
    logger.error(`Missing required IDs: SC: ${SALES_CHANNEL_ID}, REGION: ${REGION_ID_INDIA}, SP: ${SHIPPING_PROFILE_ID}`);
    return;
  }

  logger.info(`Using IDs: SC=${SALES_CHANNEL_ID}, REGION=${REGION_ID_INDIA}, SP=${SHIPPING_PROFILE_ID}`);

  logger.info("Reading prisma_products.json...");
  const rawData = fs.readFileSync(path.join(process.cwd(), "prisma_products.json"), "utf-8");
  const prismaProducts = JSON.parse(rawData);

  logger.info(`Found ${prismaProducts.length} products to migrate.`);

  // 1. Create Categories
  const categoryNames = Array.from(new Set(prismaProducts.map((p: any) => p.category))).filter(Boolean) as string[];
  logger.info(`Checking ${categoryNames.length} categories...`);

  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "name"],
  });

  logger.info(`Found ${existingCategories.length} existing categories in Medusa.`);

  const existingCategoryHandles = new Set(existingCategories.map(c => c?.handle?.toLowerCase()).filter(Boolean));
  const categoriesToCreate = categoryNames.filter(name => {
    const handle = name.toLowerCase().replace(/\s+/g, '-');
    return !existingCategoryHandles.has(handle);
  });

  let allCategories: any[] = [...existingCategories];

  if (categoriesToCreate.length > 0) {
    logger.info(`Creating ${categoriesToCreate.length} missing categories...`);
    const { result: createdCategories } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: categoriesToCreate.map(name => ({
          name,
          handle: name.toLowerCase().replace(/\s+/g, '-'),
          is_active: true,
        })),
      },
    });
    allCategories = [...allCategories, ...createdCategories];
  }

  const categoryMap = new Map(allCategories.map(c => [c.name.toLowerCase(), c.id]));

  // 2. Create Collections
  const collectionData: any[] = [];
  prismaProducts.forEach((p: any) => {
    p.collections.forEach((c: any) => {
      if (!collectionData.find(cd => cd.title === c.collection.name)) {
        collectionData.push({
          title: c.collection.name,
          handle: c.collection.slug,
        });
      }
    });
  });

  let collectionMap = new Map();
  if (collectionData.length > 0) {
    logger.info(`Checking/Creating ${collectionData.length} collections...`);
    
    const { data: existingCollections } = await query.graph({
      entity: "product_collection",
      fields: ["id", "handle", "title"],
    });
    
    const existingHandles = new Set(existingCollections.map(c => c.handle));
    const toCreate = collectionData.filter(cd => !existingHandles.has(cd.handle));
    
    let allCollections: any[] = [...existingCollections];
    if (toCreate.length > 0) {
      const createdCollections = await productModuleService.createProductCollections(toCreate);
      allCollections = [...allCollections, ...createdCollections];
    }
    
    collectionMap = new Map(allCollections.map(c => [c.title, c.id]));
  }

  // 3. Create Products
  const prismaHandles = prismaProducts.map((p: any) => p.slug);
  const existingProducts = await productModuleService.listProducts({
    handle: prismaHandles,
  });
  const existingHandles = new Set(existingProducts.map(p => p.handle));

  const filteredPrismaProducts = prismaProducts.filter((p: any) => !existingHandles.has(p.slug));

  if (filteredPrismaProducts.length === 0) {
    logger.info("All products already exist in Medusa. Skipping creation.");
    return;
  }

  logger.info(`Mapping ${filteredPrismaProducts.length} new products...`);

  const medusaProducts = filteredPrismaProducts.map((p: any) => {
    // Process variants/options
    const optionsMap = new Map<string, Set<string>>();
    const optionAdjustments = new Map<string, number>(); // key: "OptionName:Value", value: adjustment

    p.variants.forEach((v: any) => {
      if (!optionsMap.has(v.name)) {
        optionsMap.set(v.name, new Set());
      }
      optionsMap.get(v.name)!.add(v.value);
      optionAdjustments.set(`${v.name}:${v.value}`, v.priceAdjustment || 0);
    });

    const options = Array.from(optionsMap.entries()).map(([title, values]) => ({
      title,
      values: Array.from(values),
    }));

    // Generate variants (combinations)
    let variants: any[] = [];
    let finalOptions = options;

    if (options.length === 0) {
      // Medusa v2 requires at least one option
      finalOptions = [{
        title: "Default",
        values: ["Default"],
      }];

      variants = [{
        title: "Default Variant",
        sku: `${p.slug}-default`.toUpperCase(),
        inventory_quantity: p.inventory || 0,
        options: {
          Default: "Default",
        },
        prices: [
          {
            amount: p.price * 100,
            currency_code: CURRENCY_CODE,
            region_id: REGION_ID_INDIA,
          }
        ]
      }];
    } else {
      // Cartesian product of options
      const combinations: any[][] = [[]];
      options.forEach(opt => {
        const newCombs: any[][] = [];
        combinations.forEach(comb => {
          opt.values.forEach(val => {
            newCombs.push([...comb, { name: opt.title, value: val }]);
          });
        });
        combinations.length = 0;
        combinations.push(...newCombs);
      });

      variants = combinations.map(comb => {
        const title = comb.map(c => c.value).join(" / ");
        let totalPrice = p.price * 100;
        const variantOptions: any = {};
        
        comb.forEach(c => {
          totalPrice += (optionAdjustments.get(`${c.name}:${c.value}`) || 0) * 100;
          variantOptions[c.name] = c.value;
        });

        return {
          title,
          sku: `${p.slug}-${title.replace(/\s+/g, '-').toLowerCase()}`.toUpperCase().substring(0, 50),
          options: variantOptions,
          inventory_quantity: Math.floor(p.inventory / combinations.length) || 0,
          prices: [
            {
              amount: totalPrice,
              currency_code: CURRENCY_CODE,
              region_id: REGION_ID_INDIA,
            }
          ]
        };
      });
    }

    return {
      title: p.name,
      description: p.description,
      handle: p.slug,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: SHIPPING_PROFILE_ID,
      images: p.images.map((img: any) => ({ url: img.src })),
      thumbnail: p.images[0]?.src,
      weight: p.weight,
      length: p.dimensions?.length,
      width: p.dimensions?.width,
      height: p.dimensions?.height,
      category_ids: p.category ? [categoryMap.get(p.category.toLowerCase())] : [],
      collection_id: p.collections[0] ? collectionMap.get(p.collections[0].collection.name) : undefined,
      options: finalOptions,
      variants,
      sales_channels: [{ id: SALES_CHANNEL_ID }],
    };
  });

  logger.info(`Migrating ${medusaProducts.length} products with workflow...`);
  
  try {
    const { result: createdProducts } = await createProductsWorkflow(container).run({
      input: {
        products: medusaProducts,
      },
    });
    logger.info(`Successfully migrated ${createdProducts.length} products!`);
  } catch (error) {
    logger.error("Error creating products workflow:");
    logger.error(error);
  }
}
