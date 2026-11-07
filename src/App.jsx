import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const PRODUCTS_URL = "https://dummyjson.com/products?limit=24";
const REQUEST_TIMEOUT_MS = 10_000;
const CART_STORAGE_KEY = "shopsphere-cart-v1";

const offlineProducts = [
  {
    id: "offline-1",
    title: "Soundwave Wireless Headphones",
    price: 79.99,
    category: "Tech",
    rating: 4.7,
    thumbnail: "",
  },
  {
    id: "offline-2",
    title: "Everyday Insulated Tumbler",
    price: 34.5,
    category: "Home",
    rating: 4.5,
    thumbnail: "",
  },
  {
    id: "offline-3",
    title: "Weekend Trail Backpack",
    price: 129,
    category: "Outdoors",
    rating: 4.8,
    thumbnail: "",
  },
  {
    id: "offline-4",
    title: "Desk Glow Table Lamp",
    price: 58,
    category: "Home",
    rating: 4.3,
    thumbnail: "",
  },
  {
    id: "offline-5",
    title: "Pocket Notes Set of Three",
    price: 24.99,
    category: "Workspace",
    rating: 4.6,
    thumbnail: "",
  },
  {
    id: "offline-6",
    title: "Coastline Mini Speaker",
    price: 89.95,
    category: "Tech",
    rating: 4.4,
    thumbnail: "",
  },
  {
    id: "offline-7",
    title: "Field Day Water Bottle",
    price: 42,
    category: "Outdoors",
    rating: 4.2,
    thumbnail: "",
  },
  {
    id: "offline-8",
    title: "Arcwood Monitor Stand",
    price: 149,
    category: "Workspace",
    rating: 4.9,
    thumbnail: "",
  },
];

function isValidProduct(product) {
  if (
    !product ||
    !Number.isInteger(product.id) ||
    typeof product.title !== "string" ||
    !product.title.trim() ||
    typeof product.category !== "string" ||
    !product.category.trim() ||
    typeof product.price !== "number" ||
    !Number.isFinite(product.price) ||
    product.price < 0 ||
    typeof product.rating !== "number" ||
    !Number.isFinite(product.rating) ||
    product.rating < 0 ||
    product.rating > 5 ||
    typeof product.thumbnail !== "string"
  ) {
    return false;
  }

  try {
    const thumbnailUrl = new URL(product.thumbnail);
    return (
      thumbnailUrl.protocol === "https:" || thumbnailUrl.protocol === "http:"
    );
  } catch {
    return false;
  }
}

function isValidProductsResponse(data) {
  return (
    data &&
    typeof data === "object" &&
    Array.isArray(data.products) &&
    data.products.every(isValidProduct)
  );
}

const formatPrice = (price) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);

function isValidCartEntry(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    ((Number.isInteger(entry.id) && entry.id > 0) ||
      (typeof entry.id === "string" && Boolean(entry.id.trim()))) &&
    typeof entry.title === "string" &&
    Boolean(entry.title.trim()) &&
    typeof entry.price === "number" &&
    Number.isFinite(entry.price) &&
    entry.price >= 0 &&
    Number.isSafeInteger(entry.quantity) &&
    entry.quantity > 0
  );
}

function loadCartState() {
  try {
    const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart === null) {
      return { entries: [], persistenceAvailable: true, notice: "" };
    }

    let entries;
    try {
      entries = JSON.parse(savedCart);
    } catch {
      return {
        entries: [],
        persistenceAvailable: true,
        notice: "Saved cart data was invalid, so the cart started empty.",
      };
    }

    const hasUniqueIds =
      Array.isArray(entries) &&
      new Set(entries.map((entry) => entry?.id)).size === entries.length;
    if (
      !Array.isArray(entries) ||
      !entries.every(isValidCartEntry) ||
      !hasUniqueIds
    ) {
      return {
        entries: [],
        persistenceAvailable: true,
        notice: "Saved cart data was invalid, so the cart started empty.",
      };
    }

    return { entries, persistenceAvailable: true, notice: "" };
  } catch {
    return {
      entries: [],
      persistenceAvailable: false,
      notice:
        "Saved cart storage is unavailable. Cart changes stay in this session.",
    };
  }
}

export function addCartItem(entries, product) {
  const existing = entries.find((entry) => entry.id === product.id);
  if (!existing) {
    return [
      ...entries,
      {
        id: product.id,
        title: product.title,
        price: product.price,
        quantity: 1,
      },
    ];
  }

  if (!Number.isSafeInteger(existing.quantity + 1)) {
    return entries;
  }

  return entries.map((entry) =>
    entry.id === product.id
      ? { ...entry, quantity: entry.quantity + 1 }
      : entry,
  );
}

export function changeCartQuantity(entries, productId, change) {
  return entries.flatMap((entry) => {
    if (entry.id !== productId) {
      return [entry];
    }
    const quantity = entry.quantity + change;
    return Number.isSafeInteger(quantity) && quantity > 0
      ? [{ ...entry, quantity }]
      : [];
  });
}

export function getCartSummary(entries) {
  return entries.reduce(
    (summary, entry) => ({
      itemCount: summary.itemCount + entry.quantity,
      subtotalCents:
        summary.subtotalCents + Math.round(entry.price * 100) * entry.quantity,
    }),
    { itemCount: 0, subtotalCents: 0 },
  );
}

export function getVisibleProducts(
  products,
  searchQuery,
  selectedCategory,
  sortOrder,
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const compareIds = (first, second) =>
    typeof first === "number" && typeof second === "number"
      ? first - second
      : String(first).localeCompare(String(second), undefined, {
          numeric: true,
        });

  return products
    .filter((product) => {
      const matchesTitle = product.title.toLowerCase().includes(normalizedQuery);
      const matchesCategory =
        selectedCategory === "all" ||
        product.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesTitle && matchesCategory;
    })
    .sort((first, second) => {
      if (sortOrder === "price-asc") {
        return first.price - second.price || compareIds(first.id, second.id);
      }
      if (sortOrder === "price-desc") {
        return second.price - first.price || compareIds(first.id, second.id);
      }
      if (sortOrder === "rating-desc") {
        return second.rating - first.rating || compareIds(first.id, second.id);
      }
      return 0;
    });
}

function ProductImage({ product }) {
  const [failed, setFailed] = useState(!product.thumbnail);

  useEffect(() => {
    setFailed(!product.thumbnail);
  }, [product.thumbnail]);

  return (
    <div className="product-card__visual">
      {failed ? (
        <div
          className="product-card__image-placeholder"
          role="img"
          aria-label={`${product.title} image unavailable`}
        >
          <span aria-hidden="true">✳</span>
          <span>Image unavailable</span>
        </div>
      ) : (
        <img
          className="product-card__image"
          src={product.thumbnail}
          alt={product.title}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      <span className="product-card__visual-caption">PUBLIC CATALOG</span>
    </div>
  );
}

function ProductCard({ product, onAddToCart }) {
  return (
    <article className="product-card">
      <ProductImage product={product} />
      <div className="product-card__details">
        <span className="product-card__category">{product.category}</span>
        <h2 className="product-card__title">{product.title}</h2>
        <div className="product-card__meta">
          <span className="product-card__price">{formatPrice(product.price)}</span>
          <span
            className="product-card__rating"
            aria-label={`Rated ${product.rating} out of 5`}
          >
            <span aria-hidden="true">★</span> {product.rating.toFixed(1)}
          </span>
        </div>
        <button
          className="product-card__button"
          type="button"
          onClick={() => onAddToCart(product)}
          aria-label={`Add ${product.title} to cart`}
        >
          Add to cart
        </button>
      </div>
    </article>
  );
}

function SummaryCard({ label, value, detail, icon }) {
  return (
    <article className="summary-card">
      <span className="summary-card__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="summary-card__label">{label}</p>
        <p className="summary-card__value">{value}</p>
        <p className="summary-card__detail">{detail}</p>
      </div>
    </article>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataSource, setDataSource] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState("featured");
  const [cartState, setCartState] = useState(loadCartState);
  const requestIdRef = useRef(0);
  const requestActiveRef = useRef(false);

  const cart = cartState.entries;

  useEffect(() => {
    if (!cartState.persistenceAvailable) {
      return;
    }

    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cartState.entries),
      );
    } catch {
      setCartState((current) => ({
        ...current,
        persistenceAvailable: false,
        notice:
          "Cart storage is unavailable. Cart changes stay in this session.",
      }));
    }
  }, [cartState]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    let timedOut = false;

    requestActiveRef.current = true;
    setStatus("loading");
    setProducts([]);
    setDataSource(null);
    setErrorMessage("");

    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
      if (requestIdRef.current === requestId) {
        requestActiveRef.current = false;
        setStatus("error");
        setErrorMessage("The request took too long. Please try again.");
      }
    }, REQUEST_TIMEOUT_MS);

    async function loadProducts() {
      try {
        const response = await fetch(PRODUCTS_URL, {
          signal: controller.signal,
        });

        if (requestIdRef.current !== requestId || controller.signal.aborted) {
          return;
        }
        if (!response.ok) {
          throw new Error(`The product service returned ${response.status}.`);
        }

        const data = await response.json();
        if (requestIdRef.current !== requestId || controller.signal.aborted) {
          return;
        }
        if (!isValidProductsResponse(data)) {
          throw new Error("The product service returned invalid product data.");
        }

        requestActiveRef.current = false;
        setProducts(data.products);
        setDataSource("api");
        setStatus(data.products.length ? "success" : "empty");
      } catch (error) {
        if (requestIdRef.current !== requestId || timedOut) {
          return;
        }
        if (controller.signal.aborted) {
          return;
        }

        requestActiveRef.current = false;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load products. Please try again.",
        );
        setStatus("error");
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    loadProducts();

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
      if (requestIdRef.current === requestId) {
        requestIdRef.current += 1;
        requestActiveRef.current = false;
      }
    };
  }, [retryCount]);

  function retryLoading() {
    if (requestActiveRef.current) {
      return;
    }
    setRetryCount((count) => count + 1);
  }

  function useOfflineProducts() {
    if (requestActiveRef.current) {
      return;
    }
    setProducts(offlineProducts);
    setDataSource("offline");
    setErrorMessage("");
    setStatus("success");
  }

  function addToCart(product) {
    setCartState((current) => ({
      ...current,
      entries: addCartItem(current.entries, product),
    }));
  }

  function changeQuantity(productId, change) {
    setCartState((current) => ({
      ...current,
      entries: changeCartQuantity(current.entries, productId, change),
    }));
  }

  function removeFromCart(productId) {
    setCartState((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== productId),
    }));
  }

  function clearCart() {
    setCartState((current) => ({ ...current, entries: [] }));
  }

  const categories = [...new Set(products.map((product) => product.category))].sort(
    (first, second) => first.localeCompare(second),
  );
  const visibleProducts = getVisibleProducts(
    products,
    searchQuery,
    selectedCategory,
    sortOrder,
  );
  const averagePrice =
    visibleProducts.reduce((total, product) => total + product.price, 0) /
    (visibleProducts.length || 1);
  const averageRating =
    visibleProducts.reduce((total, product) => total + product.rating, 0) /
    (visibleProducts.length || 1);
  const cartSummary = getCartSummary(cart);
  const hasActiveFilters =
    searchQuery !== "" || selectedCategory !== "all" || sortOrder !== "featured";
  const canDiscover = status === "success" && products.length > 0;
  const statusLabel =
    dataSource === "offline"
      ? "Offline sample"
      : status === "success" || status === "empty"
        ? "Public demo data"
        : status === "error"
          ? "Unable to load"
          : "Loading products";

  return (
    <main className="shopsphere">
      <header className="site-header">
        <a className="brand" href="#" aria-label="ShopSphere home">
          <span className="brand__mark" aria-hidden="true">
            S
          </span>
          <span className="brand__name">
            Web<span>Shop</span>
          </span>
        </a>
        <div className="site-header__tools">
          <a
            className="cart-button"
            href="#shopping-cart"
            aria-label={`Cart, ${cartSummary.itemCount} items`}
          >
            <span aria-hidden="true">♧</span>
            <span>Cart</span>
            <span className="cart-button__count">{cartSummary.itemCount}</span>
          </a>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="eyebrow">A little more you</p>
          <h1 id="hero-title">
            Good finds.
            <br />
            <span>Brighten the everyday.</span>
          </h1>
          <p className="hero__description">
            Thoughtful picks for your space, your plans, and everywhere in
            between.
          </p>
          <div className="hero__badges">
            <span className={`data-badge data-badge--${status}`}>
              <span className="data-badge__dot" aria-hidden="true" />
              {statusLabel}
            </span>
            <span className="price-disclaimer">Demo pricing in USD</span>
          </div>
        </div>
        <div className="hero__art" aria-hidden="true">
          <div className="hero__sun" />
          <div className="hero__shape hero__shape--one">✳</div>
          <div className="hero__shape hero__shape--two">✦</div>
          <div className="hero__tile">
            <span>CURATED</span>
            <strong>for your<br />next thing</strong>
            <span className="hero__tile-sparkle">✳</span>
          </div>
        </div>
      </section>

      <section className="summary" aria-label="Product summary">
        <SummaryCard
          label="Visible products"
          value={visibleProducts.length}
          detail={
            dataSource === "offline"
              ? `of ${products.length} offline samples`
              : `of ${products.length} loaded products`
          }
          icon="◫"
        />
        <SummaryCard
          label="Average price"
          value={visibleProducts.length ? formatPrice(averagePrice) : "--"}
          detail="demo pricing in USD"
          icon="$"
        />
        <SummaryCard
          label="Average rating"
          value={visibleProducts.length ? averageRating.toFixed(2) : "--"}
          detail="out of 5.0 stars"
          icon="★"
        />
      </section>

      <section className="discovery" aria-label="Product discovery controls">
        <div className="discovery__heading">
          <div>
            <p className="eyebrow">The good stuff</p>
            <h2>Find your next favorite</h2>
          </div>
          <p className="discovery__count">
            Showing <strong>{visibleProducts.length}</strong> of{" "}
            <strong>{products.length}</strong> loaded products
          </p>
        </div>
        <div className="discovery__controls">
          <label>
            Search loaded products by title
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search loaded titles"
              disabled={!canDiscover}
              aria-describedby="controls-note"
            />
          </label>
          <label>
            Category in loaded products
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              disabled={!canDiscover}
              aria-describedby="controls-note"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort loaded products
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              disabled={!canDiscover}
              aria-describedby="controls-note"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating-desc">Rating: high to low</option>
            </select>
          </label>
          <button
            className="discovery__clear"
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSortOrder("featured");
            }}
            disabled={!hasActiveFilters}
          >
            Clear filters
          </button>
        </div>
        <p className="controls-note" id="controls-note">
          Search and filters apply only to the products currently loaded here,
          not the full catalog. Prices are demo values in USD. Cart is disabled
          in this preview.
        </p>
      </section>

      <section className="products-area" aria-label="Shop products">
        {status === "loading" && (
          <div className="products-message" role="status" aria-live="polite">
            Loading public products…
          </div>
        )}
        {status === "error" && (
          <div className="products-message products-message--error" role="alert">
            <p>{errorMessage}</p>
            <div className="products-message__actions">
              <button type="button" onClick={retryLoading}>
                Retry
              </button>
              <button
                className="products-message__secondary"
                type="button"
                onClick={useOfflineProducts}
              >
                Use offline sample products
              </button>
            </div>
          </div>
        )}
        {status === "empty" && (
          <div className="products-message" role="status" aria-live="polite">
            No public products were returned for this subset.
          </div>
        )}
        {status === "success" && (
          <>
            {dataSource === "offline" && (
              <p className="offline-notice" role="status">
                Showing offline sample products. These are not live catalog
                data.
              </p>
            )}
            {products.length > 0 && visibleProducts.length === 0 && (
              <div className="products-message" role="status" aria-live="polite">
                No loaded products match these filters. Clear filters to see all
                loaded products.
              </div>
            )}
            {visibleProducts.length > 0 && (
              <div className="product-grid">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section
        className="cart-panel"
        id="shopping-cart"
        aria-labelledby="cart-title"
      >
        <div className="cart-panel__heading">
          <div>
            <p className="eyebrow">Your selection</p>
            <h2 id="cart-title">Shopping cart</h2>
          </div>
          <button
            className="cart-panel__clear"
            type="button"
            onClick={clearCart}
            disabled={cart.length === 0}
          >
            Clear cart
          </button>
        </div>
        {cartState.notice && (
          <p className="cart-panel__notice" role="status">
            {cartState.notice}
          </p>
        )}
        {cart.length === 0 ? (
          <p className="cart-panel__empty" role="status">
            Your cart is empty. Add a product to get started.
          </p>
        ) : (
          <ul className="cart-list">
            {cart.map((entry) => (
              <li className="cart-item" key={entry.id}>
                <div className="cart-item__details">
                  <h3>{entry.title}</h3>
                  <p>{formatPrice(entry.price)} each</p>
                </div>
                <div className="cart-item__actions">
                  <div
                    className="quantity-control"
                    role="group"
                    aria-label={`Quantity for ${entry.title}`}
                  >
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${entry.title}`}
                      onClick={() => changeQuantity(entry.id, -1)}
                    >
                      −
                    </button>
                    <output aria-live="polite">{entry.quantity}</output>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${entry.title}`}
                      onClick={() => changeQuantity(entry.id, 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="cart-item__remove"
                    type="button"
                    onClick={() => removeFromCart(entry.id)}
                    aria-label={`Remove ${entry.title} from cart`}
                  >
                    Remove
                  </button>
                </div>
                <strong className="cart-item__total">
                  {formatPrice(
                    (Math.round(entry.price * 100) * entry.quantity) / 100,
                  )}
                </strong>
              </li>
            ))}
          </ul>
        )}
        <div className="cart-panel__subtotal">
          <span>
            Subtotal{" "}
            <span className="cart-panel__item-count">
              ({cartSummary.itemCount} items)
            </span>
          </span>
          <strong>{formatPrice(cartSummary.subtotalCents / 100)}</strong>
        </div>
        <p className="cart-panel__disclaimer">
          Demo subtotal only. No orders, payments, tax, shipping, or checkout.
        </p>
      </section>

      <footer className="site-footer">
        <span>WebShop</span>
        <span>Made for finding your kind of everyday.</span>
      </footer>
    </main>
  );
}

export default App;
