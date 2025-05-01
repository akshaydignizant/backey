/**
 * Calculate total amount for bill items with potential discounts/taxes
 */
export function calculateTotalAmount(
  items: Array<{ quantity: number }>,
  variants: Array<{ price: number }>
): number {
  // Basic implementation - sum of all items
  let total = 0;

  for (let i = 0; i < items.length; i++) {
    total += items[i].quantity * variants[i].price;
  }

  // TODO: Add tax calculation based on location
  // TODO: Apply discounts if any

  return parseFloat(total.toFixed(2));
}