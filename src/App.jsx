import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const PRODUCTS_URL = "https://dummyjson.com/products?limit=24";
const REQUEST_TIMEOUT_MS = 10_000;

const offlineProducts = [
  {
    id: 1,
    title: "Soundwave Wireless Headphones",
    price: 79.99,
    category: "Tech",
    rating: 4.7,
    thumbnail: "",
  },
  {
    id: 2,
    title: "Everyday Insulated Tumbler",
    price: 34.5,
    category: "Home",
    rating: 4.5,
    thumbnail: "",
  },
  {
    id: 3,
    title: "Weekend Trail Backpack",
    price: 129,
    category: "Outdoors",
    rating: 4.8,
    thumbnail: "",
  },
  {
    id: 4,
    title: "Desk Glow Table Lamp",
    price: 58,
    category: "Home",
    rating: 4.3,
    thumbnail: "",
  },
  {
    id: 5,
    title: "Pocket Notes Set of Three",
    price: 24.99,
    category: "Workspace",
    rating: 4.6,
    thumbnail: "",
  },
  {
    id: 6,
    title: "Coastline Mini Speaker",
    price: 89.95,
    category: "Tech",
    rating: 4.4,
    thumbnail: "",
  },
  {
    id: 7,
    title: "Field Day Water Bottle",
    price: 42,
    category: "Outdoors",
    rating: 4.2,
    thumbnail: "",
  },
  {
    id: 8,
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

function ProductCard({ product }) {
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
          disabled
          aria-describedby="controls-note"
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
  const requestIdRef = useRef(0);
  const requestActiveRef = useRef(false);

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

  const averagePrice =
    products.reduce((total, product) => total + product.price, 0) /
    (products.length || 1);
  const averageRating =
    products.reduce((total, product) => total + product.rating, 0) /
    (products.length || 1);
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
            Shop<span>Sphere</span>
          </span>
        </a>
        <div className="site-header__tools">
          <label className="search-field">
            <span className="search-field__icon" aria-hidden="true">
              ⌕
            </span>
            <span className="visually-hidden">Search products</span>
            <input
              type="search"
              placeholder="Search products"
              disabled
              aria-describedby="controls-note"
            />
          </label>
          <button
            className="cart-button"
            type="button"
            disabled
            aria-describedby="controls-note"
          >
            <span aria-hidden="true">♧</span>
            <span>Cart</span>
            <span className="cart-button__count">0</span>
          </button>
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
          label="In this collection"
          value={products.length}
          detail={
            dataSource === "offline"
              ? "offline sample products"
              : "products in this loaded subset"
          }
          icon="◫"
        />
        <SummaryCard
          label="Average price"
          value={products.length ? formatPrice(averagePrice) : "—"}
          detail="demo pricing in USD"
          icon="$"
        />
        <SummaryCard
          label="Average rating"
          value={products.length ? averageRating.toFixed(2) : "—"}
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
            Showing <strong>{products.length}</strong> loaded products
          </p>
        </div>
        <div className="discovery__controls">
          <label>
            Category
            <select disabled aria-describedby="controls-note" defaultValue="all">
              <option value="all">All categories</option>
            </select>
          </label>
          <label>
            Sort by
            <select disabled aria-describedby="controls-note" defaultValue="featured">
              <option value="featured">Featured</option>
            </select>
          </label>
        </div>
        <p className="controls-note" id="controls-note">
          Search, filters, sorting, and cart are disabled in this preview.
          Prices are demo values in USD; this page shows only the loaded subset,
          not the full catalog.
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
            {products.length > 0 && (
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <footer className="site-footer">
        <span>ShopSphere</span>
        <span>Made for finding your kind of everyday.</span>
      </footer>
    </main>
  );
}

export default App;
