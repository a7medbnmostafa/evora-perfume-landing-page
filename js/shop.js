document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // 1. ELEMENTS
  // =========================================================

  const searchInput =
    document.getElementById("shop-search-input");

  const genderContainer =
    document.getElementById(
      "gender-filters-container"
    );

  const familyContainer =
    document.getElementById(
      "family-filters-container"
    );

  const productsGrid =
    document.getElementById(
      "shop-products-grid"
    );

  const productsCount =
    document.getElementById(
      "products-count"
    );

  const sortSelect =
    document.getElementById(
      "shop-sort-select"
    );

  const noProductsMsg =
    document.getElementById(
      "no-products-msg"
    );

  const clearFiltersBtn =
    document.getElementById(
      "clear-filters-btn"
    );

  const toastContainer =
    document.getElementById(
      "toast-container"
    );

  // =========================================================
  // 2. STATE
  // =========================================================

  let products = [];
  let fragranceFamilies = [];
  let genders = [];

  let activeGender = "all";
  let activeFamily = "all";
  let searchTerm = "";
  let sortBy = "featured";

  const CART_KEY = "evora_cart";

  // =========================================================
  // 3. LOAD JSON
  // =========================================================

  async function loadProducts() {
    try {
      const response = await fetch(
        "../data/perfumes.json",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data = await response.json();

      products = Array.isArray(data.products)
        ? data.products
        : [];

      fragranceFamilies =
        Array.isArray(
          data.fragranceFamilies
        )
          ? data.fragranceFamilies
          : [];

      genders = Array.isArray(
        data.genders
      )
        ? data.genders
        : [];

      renderGenderFilters();
      renderFamilyFilters();

      applyFilters();
    } catch (error) {
      console.error(
        "ÉVORA: Failed to load perfumes.json.",
        error
      );

      showToast(
        "حدث خطأ أثناء تحميل المنتجات"
      );
    }
  }

  // =========================================================
  // 4. CART SYSTEM
  // =========================================================

  function getCart() {
    try {
      const storedCart =
        localStorage.getItem(CART_KEY);

      if (!storedCart) {
        return [];
      }

      const parsedCart =
        JSON.parse(storedCart);

      return Array.isArray(parsedCart)
        ? parsedCart
        : [];
    } catch (error) {
      console.error(
        "ÉVORA: Failed to read cart.",
        error
      );

      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(
        CART_KEY,
        JSON.stringify(cart)
      );

      window.dispatchEvent(
        new CustomEvent(
          "evora:cart-updated",
          {
            detail: {
              cart,
            },
          }
        )
      );

      return true;
    } catch (error) {
      console.error(
        "ÉVORA: Failed to save cart.",
        error
      );

      return false;
    }
  }

  function getCartCount() {
    const cart = getCart();

    return cart.reduce(
      (total, item) => {
        return (
          total +
          Math.max(
            0,
            Number(item.qty) || 0
          )
        );
      },
      0
    );
  }

  function updateCartCount() {
    const count =
      getCartCount();

    document
      .querySelectorAll(
        "#nav-cart-count, .cart-badge"
      )
      .forEach((badge) => {
        badge.textContent = count;

        badge.classList.toggle(
          "hidden",
          count === 0
        );
      });
  }

  function addProductToCart(
    productId,
    quantity = 1
  ) {
    const product =
      products.find(
        (item) =>
          String(item.id) ===
          String(productId)
      );

    if (!product) {
      console.warn(
        `ÉVORA: Product "${productId}" not found.`
      );

      return false;
    }

    const qtyToAdd = Math.max(
      1,
      Number(quantity) || 1
    );

    const cart = getCart();

    const existingProduct =
      cart.find(
        (item) =>
          String(item.id) ===
          String(product.id)
      );

    if (existingProduct) {
      existingProduct.qty =
        Math.max(
          1,
          Number(
            existingProduct.qty
          ) || 0
        ) + qtyToAdd;
    } else {
      cart.push({
        id: product.id,
        qty: qtyToAdd,
      });
    }

    const saved =
      saveCart(cart);

    if (saved) {
      updateCartCount();

      showToast(
        `تمت إضافة ${product.name} إلى السلة`
      );
    }

    return saved;
  }

  // =========================================================
  // 5. IMAGE
  // =========================================================

  function getProductImage(
    image
  ) {
    if (!image) {
      return "../assets/img/evora.jpeg";
    }

    if (
      image.startsWith("../") ||
      image.startsWith("./") ||
      image.startsWith("/")
    ) {
      return image;
    }

    /*
     * shop.html موجود داخل html/
     * لذلك assets/... تصبح ../assets/...
     */
    return `../${image}`;
  }

  // =========================================================
  // 6. FORMAT PRICE
  // =========================================================

  function formatPrice(price) {
    return Number(
      price || 0
    ).toLocaleString("ar-EG");
  }

  // =========================================================
  // 7. ESCAPE HTML
  // =========================================================

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  // =========================================================
  // 8. GENDER FILTERS
  // =========================================================

  function renderGenderFilters() {
    if (!genderContainer) {
      return;
    }

    const allButton = `
      <button
        type="button"
        data-gender="all"
        class="gender-filter px-4 py-2 rounded-xl border border-brand-gold/20 text-sm transition-all"
      >
        الكل
      </button>
    `;

    const genderButtons =
      genders
        .map(
          (gender) => `
            <button
              type="button"
              data-gender="${escapeHTML(
                gender.id
              )}"
              class="gender-filter px-4 py-2 rounded-xl border border-brand-gold/20 text-sm transition-all"
            >
              ${escapeHTML(
                gender.label
              )}
            </button>
          `
        )
        .join("");

    genderContainer.innerHTML =
      allButton +
      genderButtons;

    updateGenderFilterUI();
  }

  // =========================================================
  // 9. FAMILY FILTERS
  // =========================================================

  function renderFamilyFilters() {
    if (!familyContainer) {
      return;
    }

    const allButton = `
      <button
        type="button"
        data-family="all"
        class="family-filter px-4 py-2 rounded-xl border border-brand-gold/20 text-sm transition-all"
      >
        الكل
      </button>
    `;

    const familyButtons =
      fragranceFamilies
        .map(
          (family) => `
            <button
              type="button"
              data-family="${escapeHTML(
                family
              )}"
              class="family-filter px-4 py-2 rounded-xl border border-brand-gold/20 text-sm transition-all"
            >
              ${escapeHTML(
                family
              )}
            </button>
          `
        )
        .join("");

    familyContainer.innerHTML =
      allButton +
      familyButtons;

    updateFamilyFilterUI();
  }

  // =========================================================
  // 10. FILTER UI
  // =========================================================

  function updateGenderFilterUI() {
    document
      .querySelectorAll(
        ".gender-filter"
      )
      .forEach((button) => {
        const isActive =
          button.dataset.gender ===
          activeGender;

        button.classList.toggle(
          "bg-brand-gold",
          isActive
        );

        button.classList.toggle(
          "text-brand-emeraldDark",
          isActive
        );

        button.classList.toggle(
          "border-brand-gold",
          isActive
        );

        button.classList.toggle(
          "text-white",
          !isActive
        );
      });
  }

  function updateFamilyFilterUI() {
    document
      .querySelectorAll(
        ".family-filter"
      )
      .forEach((button) => {
        const isActive =
          button.dataset.family ===
          activeFamily;

        button.classList.toggle(
          "bg-brand-gold",
          isActive
        );

        button.classList.toggle(
          "text-brand-emeraldDark",
          isActive
        );

        button.classList.toggle(
          "border-brand-gold",
          isActive
        );

        button.classList.toggle(
          "text-white",
          !isActive
        );
      });
  }

  // =========================================================
  // 11. GENDER FILTER EVENT
  // =========================================================

  genderContainer?.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-gender]"
        );

      if (!button) {
        return;
      }

      activeGender =
        button.dataset.gender;

      updateGenderFilterUI();

      applyFilters();
    }
  );

  // =========================================================
  // 12. FAMILY FILTER EVENT
  // =========================================================

  familyContainer?.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-family]"
        );

      if (!button) {
        return;
      }

      activeFamily =
        button.dataset.family;

      updateFamilyFilterUI();

      applyFilters();
    }
  );

  // =========================================================
  // 13. SEARCH
  // =========================================================

  searchInput?.addEventListener(
    "input",
    () => {
      searchTerm =
        searchInput.value
          .trim()
          .toLowerCase();

      applyFilters();
    }
  );

  // =========================================================
  // 14. SORT
  // =========================================================

  sortSelect?.addEventListener(
    "change",
    () => {
      sortBy =
        sortSelect.value ||
        "featured";

      applyFilters();
    }
  );

  // =========================================================
  // 15. FILTER PRODUCTS
  // =========================================================

  function getFilteredProducts() {
    let filtered =
      [...products];

    // Gender
    if (
      activeGender !==
      "all"
    ) {
      filtered =
        filtered.filter(
          (product) =>
            product.gender ===
            activeGender
        );
    }

    // Family
    if (
      activeFamily !==
      "all"
    ) {
      filtered =
        filtered.filter(
          (product) =>
            Array.isArray(
              product.families
            ) &&
            product.families.includes(
              activeFamily
            )
        );
    }

    // Search
    if (searchTerm) {
      filtered =
        filtered.filter(
          (product) => {
            const searchableText =
              [
                product.name,
                product.latin,
                product.desc,
                product.gender,
                product.tier,
                ...(Array.isArray(
                  product.families
                )
                  ? product.families
                  : []),
                ...(Array.isArray(
                  product.notes?.top
                )
                  ? product.notes.top
                  : []),
                ...(Array.isArray(
                  product.notes?.heart
                )
                  ? product.notes.heart
                  : []),
                ...(Array.isArray(
                  product.notes?.base
                )
                  ? product.notes.base
                  : []),
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(
              searchTerm
            );
          }
        );
    }

    // Sort
    switch (sortBy) {
      case "bestseller":
        filtered.sort(
          (a, b) =>
            Number(
              b.isBestseller
            ) -
            Number(
              a.isBestseller
            )
        );
        break;

      case "price-low":
        filtered.sort(
          (a, b) =>
            Number(
              a.price || 0
            ) -
            Number(
              b.price || 0
            )
        );
        break;

      case "price-high":
        filtered.sort(
          (a, b) =>
            Number(
              b.price || 0
            ) -
            Number(
              a.price || 0
            )
        );
        break;

      case "featured":
      default:
        filtered.sort(
          (a, b) => {
            const featuredA =
              Number(
                a.isFeatured
              ) +
              Number(
                a.isBestseller
              );

            const featuredB =
              Number(
                b.isFeatured
              ) +
              Number(
                b.isBestseller
              );

            return (
              featuredB -
              featuredA
            );
          }
        );
        break;
    }

    return filtered;
  }

  // =========================================================
  // 16. APPLY FILTERS
  // =========================================================

  function applyFilters() {
    const filtered =
      getFilteredProducts();

    renderProducts(
      filtered
    );

    updateProductsCount(
      filtered.length
    );

    toggleEmptyState(
      filtered.length === 0
    );
  }

  // =========================================================
  // 17. RENDER PRODUCTS
  // =========================================================

  function renderProducts(
    filteredProducts
  ) {
    if (!productsGrid) {
      return;
    }

    if (
      !filteredProducts.length
    ) {
      productsGrid.innerHTML =
        "";

      return;
    }

    productsGrid.innerHTML =
      filteredProducts
        .map(
          (product) =>
            createProductCard(
              product
            )
        )
        .join("");
  }

  // =========================================================
  // 18. PRODUCT CARD
  // =========================================================

  function createProductCard(
    product
  ) {
    const image =
      getProductImage(
        product.image
      );

    const families =
      Array.isArray(
        product.families
      )
        ? product.families
        : [];

    return `
      <article
        class="group relative overflow-hidden rounded-2xl bg-brand-emeraldDark border border-brand-gold/10 hover:border-brand-gold/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
      >

        <!-- Product Image -->
        <a
          href="product.html?id=${encodeURIComponent(
            product.id
          )}"
          class="block relative aspect-[4/5] overflow-hidden"
        >

          <img
            src="${escapeHTML(
              image
            )}"
            alt="${escapeHTML(
              product.name
            )}"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onerror="this.onerror=null;this.src='../assets/img/evora.jpeg';"
          />

          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"></div>

          ${
            product.isBestseller
              ? `
                <span class="absolute top-4 right-4 px-3 py-1 rounded-full bg-brand-gold text-brand-emeraldDark text-xs font-bold">
                  الأكثر مبيعًا
                </span>
              `
              : ""
          }

        </a>

        <!-- Product Info -->
        <div class="p-5">

          <h3 class="text-lg font-bold text-white">
            ${escapeHTML(
              product.name
            )}
          </h3>

          <p class="text-sm text-white/40 mt-1">
            ${escapeHTML(
              product.latin || ""
            )}
          </p>

          <!-- Families -->
          <div class="flex flex-wrap gap-1.5 mt-3">
            ${families
              .map(
                (family) => `
                  <span class="px-2 py-1 rounded-lg bg-brand-gold/5 border border-brand-gold/10 text-brand-gold text-[11px]">
                    ${escapeHTML(
                      family
                    )}
                  </span>
                `
              )
              .join("")}
          </div>

          <!-- Description -->
          ${
            product.desc
              ? `
                <p class="text-sm text-white/50 leading-6 mt-3 line-clamp-2">
                  ${escapeHTML(
                    product.desc
                  )}
                </p>
              `
              : ""
          }

          <!-- Bottom -->
          <div class="flex items-center justify-between gap-3 mt-5">

            <span class="text-lg font-bold text-brand-gold">
              ${formatPrice(
                product.price
              )} ج.م
            </span>

            <div class="flex items-center gap-2">

              <!-- Details -->
              <a
                href="product.html?id=${encodeURIComponent(
                  product.id
                )}"
                class="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-xl border border-brand-gold/20 text-brand-gold hover:bg-brand-gold hover:text-brand-emeraldDark transition-all"
                aria-label="تفاصيل المنتج"
              >
                <i class="fa-solid fa-eye"></i>
              </a>

              <!-- Add -->
              <button
                type="button"
                data-add-to-cart="${escapeHTML(
                  product.id
                )}"
                class="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-xl bg-brand-gold text-brand-emeraldDark hover:scale-105 transition-all"
                aria-label="إضافة إلى السلة"
              >
                <i class="fa-solid fa-cart-plus"></i>
              </button>

            </div>

          </div>

        </div>

      </article>
    `;
  }

  // =========================================================
  // 19. ADD TO CART
  // =========================================================

  productsGrid?.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-add-to-cart]"
        );

      if (!button) {
        return;
      }

      const productId =
        button.dataset.addToCart;

      if (!productId) {
        return;
      }

      addProductToCart(
        productId,
        1
      );
    }
  );

  // =========================================================
  // 20. PRODUCTS COUNT
  // =========================================================

  function updateProductsCount(
    count
  ) {
    if (!productsCount) {
      return;
    }

    productsCount.textContent =
      count;
  }

  // =========================================================
  // 21. EMPTY STATE
  // =========================================================

  function toggleEmptyState(
    isEmpty
  ) {
    if (!noProductsMsg) {
      return;
    }

    noProductsMsg.classList.toggle(
      "hidden",
      !isEmpty
    );
  }

  // =========================================================
  // 22. CLEAR FILTERS
  // =========================================================

  clearFiltersBtn?.addEventListener(
    "click",
    () => {
      activeGender = "all";
      activeFamily = "all";
      searchTerm = "";
      sortBy = "featured";

      if (searchInput) {
        searchInput.value =
          "";
      }

      if (sortSelect) {
        sortSelect.value =
          "featured";
      }

      updateGenderFilterUI();
      updateFamilyFilterUI();

      applyFilters();
    }
  );

  // =========================================================
  // 23. URL FILTER
  // =========================================================

  function readURLFilters() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const family =
      params.get("family");

    const gender =
      params.get("gender");

    const search =
      params.get("search");

    if (
      family &&
      fragranceFamilies.includes(
        family
      )
    ) {
      activeFamily =
        family;
    }

    if (
      gender &&
      genders.some(
        (item) =>
          item.id === gender
      )
    ) {
      activeGender =
        gender;
    }

    if (search) {
      searchTerm =
        search.trim().toLowerCase();

      if (searchInput) {
        searchInput.value =
          search;
      }
    }

    updateGenderFilterUI();
    updateFamilyFilterUI();
  }

  // =========================================================
  // 24. TOAST
  // =========================================================

  function showToast(message) {
    if (!toastContainer) {
      return;
    }

    const toast =
      document.createElement(
        "div"
      );

    toast.className =
      "px-5 py-3 rounded-xl bg-brand-emeraldDark border border-brand-gold/20 text-white shadow-2xl text-sm transition-all duration-300";

    toast.textContent =
      message;

    toastContainer.appendChild(
      toast
    );

    setTimeout(() => {
      toast.classList.add(
        "opacity-0",
        "translate-y-2"
      );

      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2200);
  }

  // =========================================================
  // 25. CART SYNC
  // =========================================================

  window.addEventListener(
    "evora:cart-updated",
    () => {
      updateCartCount();
    }
  );

  window.addEventListener(
    "storage",
    (event) => {
      if (
        event.key === CART_KEY
      ) {
        updateCartCount();
      }
    }
  );

  // =========================================================
  // 26. GLOBAL SHOP DATA
  // =========================================================

  window.evoraShopProducts =
    products;

  // =========================================================
  // 27. INITIALIZE
  // =========================================================

  await loadProducts();

  readURLFilters();

  applyFilters();

  updateCartCount();
});