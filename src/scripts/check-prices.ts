import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function checkPrices({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["title", "variants.price_set.prices.amount"],
  });
  console.log("Product Prices in Medusa:");
  console.log(JSON.stringify(products, null, 2));
}
