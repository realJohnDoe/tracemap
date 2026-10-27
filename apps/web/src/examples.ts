// Defaults of the web app: a request every developer has written, and a before/after of the most common fix for it.

/** Normal mode: a shopper clicks "Add to cart", from the browser through the API to the database and back. */
export const SINGLE_EXAMPLE = `# Trace: clicking "Add to cart" on a product page
# One path per line, in execution order. Text after " # " is an optional note.
src/web/components/AddToCartButton.tsx   # Click handler fires
src/web/hooks/useCart.ts                 # Optimistic update, POST /api/cart/items sent
src/api/routes/cart.ts                   # Route handler addItem() is selected
src/api/middleware/auth.ts               # Session cookie checked, user attached
src/api/schemas/cart.ts                  # Body validated: productId, quantity
src/api/services/cart_service.ts         # addItem() takes over
src/api/repositories/product_repo.ts     # Product loaded to check it exists
src/api/db/client.ts                     # Database connection taken from the pool
src/api/services/inventory_service.ts    # Stock checked for the requested quantity
src/api/repositories/cart_repo.ts        # Cart row inserted or quantity increased
src/api/services/cart_service.ts         # Updated cart returned to the route
src/api/routes/cart.ts                   # 200 response built with the cart
src/web/hooks/useCart.ts                 # Optimistic state replaced by the server's cart
src/web/components/CartBadge.tsx         # Item count in the header updated
`

/** The server-side business logic, from the service to the cart row: steps 6 to 10. */
export const SINGLE_HIGHLIGHT: [number, number] = [6, 10]

// The overselling fix: checking the stock and then inserting the cart row left a gap that two shoppers could both slip through.
const AFTER = `# Trace: clicking "Add to cart", with the stock reserved atomically (overselling fix)
# One path per line, in execution order. Text after " # " is an optional note.
src/web/components/AddToCartButton.tsx   # Click handler fires
src/web/hooks/useCart.ts                 # Optimistic update, POST /api/cart/items sent
src/api/routes/cart.ts                   # Route handler addItem() is selected
src/api/middleware/auth.ts               # Session cookie checked, user attached
src/api/schemas/cart.ts                  # Body validated: productId, quantity
src/api/services/cart_service.ts         # addItem() opens a transaction
src/api/db/transaction.ts                # BEGIN, connection taken from the pool
src/api/repositories/inventory_repo.ts   # Stock reserved in one UPDATE ... WHERE stock >= quantity
src/api/repositories/cart_repo.ts        # Cart row inserted or quantity increased
src/api/db/transaction.ts                # COMMIT, or ROLLBACK if the stock was gone
src/api/services/cart_service.ts         # Updated cart returned to the route
src/api/routes/cart.ts                   # 200 response built with the cart
src/web/hooks/useCart.ts                 # Optimistic state replaced by the server's cart
src/web/components/CartBadge.tsx         # Item count in the header updated
`

/**
 * Compare mode: the same "Add to cart" request before and after the overselling fix. The stock check
 * (inventory service) and the separate product lookup give way to one transaction that reserves the stock.
 */
export const COMPARE_EXAMPLE = {
  before: SINGLE_EXAMPLE,
  after: AFTER,
  // The server-side business logic on both sides, like the normal-mode highlight.
  beforeHighlight: SINGLE_HIGHLIGHT,
  afterHighlight: [6, 10] as [number, number],
}
