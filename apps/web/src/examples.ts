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

const BEFORE = `# Trace: GET /api/products/42, no caching
src/web/pages/ProductPage.tsx            # Page asks for the product
src/api/routes/products.ts               # Route handler getProduct() is selected
src/api/services/product_service.ts      # getProduct() takes over
src/api/repositories/product_repo.ts     # Query built
src/api/db/client.ts                     # Query runs on every single request
src/api/repositories/product_repo.ts     # Row mapped to a Product
src/api/services/product_service.ts      # Product returned
src/api/routes/products.ts               # 200 response built
src/web/pages/ProductPage.tsx            # Page renders
`

const AFTER = `# Trace: GET /api/products/42, with a cache in front of the database
src/web/pages/ProductPage.tsx            # Page asks for the product
src/api/routes/products.ts               # Route handler getProduct() is selected
src/api/services/product_service.ts      # getProduct() takes over
src/api/cache/redis.ts                   # Cache hit: product returned without touching the database
src/api/services/product_service.ts      # Product returned
src/api/routes/products.ts               # 200 response built
src/web/pages/ProductPage.tsx            # Page renders
`

/** Compare mode: the same request before and after a cache was added (the repository and database drop out of the hot path). */
export const COMPARE_EXAMPLE = { before: BEFORE, after: AFTER }
