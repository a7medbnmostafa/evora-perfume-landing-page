document.addEventListener("DOMContentLoaded", async () => {
  const CART_KEY = "evora_cart";

  const searchInput = document.getElementById("shop-search-input");
  const genderContainer = document.getElementById("gender-filters-container");
  const familyContainer = document.getElementById("family-filters-container");
  const productsGrid = document.getElementById("shop-products-grid");
  const productsCount = document.getElementById("products-count");
  const sortSelect = document.getElementById("shop-sort-select");
  const noProductsMsg = document.getElementById("no-products-msg");
  const clearFiltersBtn = document.getElementById("clear-filters-btn");
  const toastContainer = document.getElementById("toast-container");

  let products = [];
  let fragranceFamilies = [];
  let genders = [];
  let sizesCatalog = [];

  let activeGender = "all";
  let activeFamily = "all";
  let searchTerm = "";
  let sortBy = "featured";

  // ---------- LOAD ----------
  try {
    const res = await fetch("data/perfumes.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    products = data.products || [];
    fragranceFamilies = data.fragranceFamilies || [];
    genders = data.genders || [];
    sizesCatalog = data.sizes || [];
  } catch (e) {
    console.error(e);
    showToast("حدث خطأ أثناء تحميل المنتجات");
    return;
  }

  // ---------- SIZE HELPERS ----------
  const resolveSizes = (product) => {
    if (!product) return [];
    if (Array.isArray(product.sizes) && product.sizes.length) {
      return [...product.sizes].sort((a, b) => a.ml - b.ml);
    }
    if (product.price != null) {
      return [
        {
          ml: 50,
          price: Number(product.price),
          sku: `${String(product.id).toUpperCase()}-50`,
          inStock: true,
        },
      ];
    }
    return [];
  };

  const pickDefaultSize = (product) => {
    const sizes = resolveSizes(product);
    if (!sizes.length) return null;
    const wanted = Number(product.defaultSize);
    if (wanted && sizes.some((s) => s.ml === wanted)) {
      return sizes.find((s) => s.ml === wanted);
    }
    if (sizes.some((s) => s.ml === 50)) {
      return sizes.find((s) => s.ml === 50);
    }
    return sizes.find((s) => s.inStock !== false) || sizes[0];
  };

  const getMinPrice = (product) => {
    const sizes = resolveSizes(product);
    if (!sizes.length) return Number(product.price) || 0;
    return Math.min(...sizes.map((s) => Number(s.price) || 0));
  };

  // ---------- GRID COLS CLASS MAP (بدل dynamic classes) ----------
  const getColsClass = (n) => {
    if (n >= 4) return "grid-cols-4";
    if (n === 3) return "grid-cols-3";
    return "grid-cols-2";
  };

  // ---------- CART ----------
  const getCart = () => {
    try {
      const c = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(c) ? c : [];
    } catch {
      return [];
    }
  };
  const saveCart = (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
    window.dispatchEvent(new CustomEvent("evora:cart-updated"));
  };
  const updateCartCount = () => {
    const n = getCart().reduce((t, i) => t + (Number(i.qty) || 0), 0);
    document.querySelectorAll("#nav-cart-count, .cart-badge").forEach((b) => {
      b.textContent = n;
      b.classList.toggle("hidden", n === 0);
    });
  };

  const addProductToCart = (id, qty = 1, size = null) => {
    const p = products.find((x) => String(x.id) === String(id));
    if (!p) return;

    const q = Math.max(1, Number(qty) || 1);
    const chosenSize = size || pickDefaultSize(p);
    const sizeMl = chosenSize?.ml ?? null;
    const sizePrice = chosenSize?.price ?? p.price ?? 0;
    const lineId = sizeMl ? `${p.id}__${sizeMl}` : String(p.id);

    const cart = getCart();
    const e = cart.find((c) => {
      const cLine = c.lineId || (c.size ? `${c.id}__${c.size}` : String(c.id));
      return cLine === lineId;
    });

    if (e) {
      e.qty = (Number(e.qty) || 0) + q;
      e.price = sizePrice;
      if (sizeMl) e.size = sizeMl;
      if (!e.lineId) e.lineId = lineId;
    } else {
      cart.push({
        lineId,
        id: String(p.id),
        size: sizeMl,
        price: sizePrice,
        qty: q,
      });
    }

    saveCart(cart);
    const sizeLabel = sizeMl ? ` (${sizeMl} مل)` : "";
    showToast(`تمت إضافة ${p.name}${sizeLabel} إلى السلة`);
  };

  // ---------- IMAGE ----------
  const getProductImage = (p) => {
    if (!p) return "assets/img/evora.jpeg";
    if (p.startsWith("./") || p.startsWith("/") || p.startsWith("http"))
      return p;
    return p;
  };

  const formatPrice = (p) => Number(p || 0).toLocaleString("ar-EG");
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // ---------- GENDER FILTERS ----------
  const updateGenderUI = () => {
    document.querySelectorAll(".gender-btn").forEach((b) => {
      const isActive = b.dataset.filterGender === activeGender;
      b.classList.toggle("bg-brand-gold", isActive);
      b.classList.toggle("text-brand-emeraldDark", isActive);
      b.classList.toggle("border-brand-gold", isActive);
      b.classList.toggle("bg-brand-emeraldDark/60", !isActive);
      b.classList.toggle("text-brand-cream/80", !isActive);
      b.classList.toggle("border-brand-gold/20", !isActive);
    });
  };

  genderContainer?.addEventListener("click", (e) => {
    const btn = e.target.closest(".gender-btn");
    if (!btn) return;
    activeGender = btn.dataset.filterGender;
    updateGenderUI();
    applyFilters();
  });

  // ---------- FAMILY FILTERS ----------
  const renderFamilyButtons = () => {
    if (!familyContainer) return;
    const items = [{ id: "all", label: "الكل" }].concat(
      fragranceFamilies.map((f) => ({ id: f, label: f }))
    );
    familyContainer.innerHTML = items
      .map((it) => {
        const isActive = it.id === activeFamily;
        return `<button type="button" data-filter-family="${esc(it.id)}"
          class="family-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isActive
              ? "border-brand-gold bg-brand-gold text-brand-emeraldDark"
              : "border-brand-gold/20 bg-brand-emeraldDark/60 text-brand-cream/80 hover:border-brand-gold/60"
          }">${esc(it.label)}</button>`;
      })
      .join("");
  };

  familyContainer?.addEventListener("click", (e) => {
    const btn = e.target.closest(".family-btn");
    if (!btn) return;
    activeFamily = btn.dataset.filterFamily;
    renderFamilyButtons();
    applyFilters();
  });

  // ---------- SEARCH + SORT ----------
  searchInput?.addEventListener("input", () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    applyFilters();
  });
  sortSelect?.addEventListener("change", () => {
    sortBy = sortSelect.value || "featured";
    applyFilters();
  });

  // ---------- FILTER ----------
  const getFiltered = () => {
    let f = [...products];
    if (activeGender !== "all") f = f.filter((p) => p.gender === activeGender);
    if (activeFamily !== "all")
      f = f.filter((p) => p.families?.includes(activeFamily));
    if (searchTerm) {
      f = f.filter((p) => {
        const txt = [
          p.name,
          p.latin,
          p.desc,
          p.gender,
          p.tier,
          ...(p.families || []),
          ...(p.notes?.top || []),
          ...(p.notes?.heart || []),
          ...(p.notes?.base || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return txt.includes(searchTerm);
      });
    }
    switch (sortBy) {
      case "bestseller":
        f.sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller));
        break;
      case "price-low":
        f.sort((a, b) => getMinPrice(a) - getMinPrice(b));
        break;
      case "price-high":
        f.sort((a, b) => getMinPrice(b) - getMinPrice(a));
        break;
      default:
        f.sort(
          (a, b) =>
            Number(b.isFeatured) +
            Number(b.isBestseller) -
            (Number(a.isFeatured) + Number(a.isBestseller))
        );
    }
    return f;
  };

  // ---------- RENDER PRODUCTS ----------
  const renderProducts = (list) => {
    if (!productsGrid) return;
    if (!list.length) {
      productsGrid.innerHTML = "";
      return;
    }
    productsGrid.innerHTML = list
      .map((p) => {
        const img = getProductImage(p.image);
        const sizes = resolveSizes(p);
        const hasMultipleSizes = sizes.length > 1;
        const defaultSize = pickDefaultSize(p);

        // ⚠️ تم إصلاح الخطأ هنا: استخدام أقواس لتجنب SyntaxError
        const initialPrice =
          defaultSize?.price ?? (Number(p.price) || 0);

        // ---------- SIZE CHIPS ----------
        const sizeChips = hasMultipleSizes
          ? `
            <div class="mt-3 space-y-1.5">
              <span class="text-[10px] text-brand-cream/50 font-semibold inline-flex items-center gap-1">
                <i class="fa-solid fa-flask text-[8px]"></i>
                اختر الحجم:
              </span>
              <div class="grid ${getColsClass(sizes.length)} gap-1.5">
                ${sizes
                  .map((s) => {
                    const isActive = defaultSize?.ml === s.ml;
                    const isOut = s.inStock === false;
                    return `
                      <button
                        type="button"
                        data-size-chip="${s.ml}"
                        class="min-w-0 h-10 px-1 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center leading-none ${
                          isActive
                            ? "bg-brand-gold text-brand-emeraldDark border-brand-gold shadow-md shadow-brand-gold/20"
                            : "bg-brand-emerald/40 text-brand-cream/70 border-brand-gold/20 hover:border-brand-gold/60"
                        } ${isOut ? "opacity-30 cursor-not-allowed" : ""}"
                        ${isOut ? "disabled" : ""}
                        title="${s.ml} مل${isOut ? " — نفذ" : ""}"
                      >
                        <span>${s.ml}</span>
                        <span class="text-[8px] opacity-70 mt-0.5">مل</span>
                      </button>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `
          : "";

        return `
        <article
          class="group relative overflow-hidden rounded-2xl bg-brand-emeraldDark border border-brand-gold/10 hover:border-brand-gold/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl flex flex-col"
          data-product-id="${esc(p.id)}"
          data-selected-size="${defaultSize?.ml ?? ""}"
        >
          <a href="product.html?id=${encodeURIComponent(
            p.id
          )}" class="block relative aspect-[4/5] overflow-hidden">
            <img src="${esc(img)}" alt="${esc(p.name)}"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              onerror="this.onerror=null;this.src='assets/img/evora.jpeg';" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"></div>
            ${
              p.isBestseller
                ? `<span class="absolute top-4 right-4 px-3 py-1 rounded-full bg-brand-gold text-brand-emeraldDark text-xs font-bold">الأكثر مبيعًا</span>`
                : ""
            }
            ${
              hasMultipleSizes
                ? `<span class="absolute top-4 left-4 px-2 py-1 rounded-lg bg-brand-emeraldDark/90 backdrop-blur border border-brand-gold/30 text-brand-gold text-[10px] font-bold inline-flex items-center gap-1">
                    <i class="fa-solid fa-flask text-[8px]"></i>
                    ${sizes.length} أحجام
                  </span>`
                : ""
            }
          </a>

          <div class="p-5 flex-1 flex flex-col">
            <h3 class="text-lg font-bold text-white line-clamp-1">${esc(
              p.name
            )}</h3>
            <p class="text-sm text-white/40 mt-1 line-clamp-1">${esc(
              p.latin || ""
            )}</p>

            <div class="flex flex-wrap gap-1.5 mt-3">
              ${(p.families || [])
                .slice(0, 3)
                .map(
                  (f) =>
                    `<span class="px-2 py-1 rounded-lg bg-brand-gold/5 border border-brand-gold/10 text-brand-gold text-[11px]">${esc(
                      f
                    )}</span>`
                )
                .join("")}
            </div>

            <!-- SIZE CHIPS -->
            ${sizeChips}

            <!-- PRICE -->
            <div class="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-brand-gold/10">
              <div class="flex items-baseline gap-1" data-price-display>
                <span class="text-lg font-bold text-brand-gold">${formatPrice(
                  initialPrice
                )} <span class="text-xs">ج.م</span></span>
              </div>
              <div class="flex items-center gap-2">
                <a href="product.html?id=${encodeURIComponent(p.id)}"
                  class="w-10 h-10 inline-flex items-center justify-center rounded-xl border border-brand-gold/20 text-brand-gold hover:bg-brand-gold hover:text-brand-emeraldDark transition-all"
                  aria-label="تفاصيل المنتج">
                  <i class="fa-solid fa-eye text-sm"></i>
                </a>
                <button
                  type="button"
                  data-add-to-cart="${esc(p.id)}"
                  class="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-brand-gold text-brand-emeraldDark hover:scale-105 active:scale-95 transition-all"
                  aria-label="إضافة إلى السلة">
                  <i class="fa-solid fa-cart-plus text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        </article>`;
      })
      .join("");
  };

  const applyFilters = () => {
    const list = getFiltered();
    renderProducts(list);
    if (productsCount) productsCount.textContent = list.length;
    noProductsMsg?.classList.toggle("hidden", list.length !== 0);
  };

  // ---------- GRID EVENTS (Size chips + Add to cart) ----------
  productsGrid?.addEventListener("click", (e) => {
    // 1) SIZE CHIP CLICK
    const sizeBtn = e.target.closest("[data-size-chip]");
    if (sizeBtn) {
      e.preventDefault();
      const card = sizeBtn.closest("[data-product-id]");
      if (!card) return;

      const sizeMl = Number(sizeBtn.dataset.sizeChip);
      const productId = card.dataset.productId;
      const product = products.find((p) => String(p.id) === String(productId));
      if (!product) return;

      const sizes = resolveSizes(product);
      const sizeObj = sizes.find((s) => Number(s.ml) === sizeMl);
      if (!sizeObj || sizeObj.inStock === false) return;

      // Update active chip
      card.querySelectorAll("[data-size-chip]").forEach((b) => {
        const active = Number(b.dataset.sizeChip) === sizeMl;
        b.classList.toggle("bg-brand-gold", active);
        b.classList.toggle("text-brand-emeraldDark", active);
        b.classList.toggle("border-brand-gold", active);
        b.classList.toggle("shadow-md", active);
        b.classList.toggle("shadow-brand-gold/20", active);
        b.classList.toggle("bg-brand-emerald/40", !active);
        b.classList.toggle("text-brand-cream/70", !active);
        b.classList.toggle("border-brand-gold/20", !active);
      });

      // Update card selected size
      card.dataset.selectedSize = sizeMl;

      // Update price display inside card
      const priceEl = card.querySelector("[data-price-display]");
      if (priceEl) {
        priceEl.innerHTML = `<span class="text-lg font-bold text-brand-gold">${formatPrice(
          sizeObj.price
        )} <span class="text-xs">ج.م</span></span>`;
      }
      return;
    }

    // 2) ADD TO CART CLICK
    const addBtn = e.target.closest("[data-add-to-cart]");
    if (addBtn) {
      const card = addBtn.closest("[data-product-id]");
      if (!card) return;

      const productId = card.dataset.productId;
      const product = products.find((p) => String(p.id) === String(productId));
      if (!product) return;

      const sizeMl = Number(card.dataset.selectedSize);
      const sizes = resolveSizes(product);
      const sizeObj =
        sizes.find((s) => Number(s.ml) === sizeMl) || pickDefaultSize(product);

      addProductToCart(product.id, 1, sizeObj);
      return;
    }
  });

  clearFiltersBtn?.addEventListener("click", () => {
    activeGender = "all";
    activeFamily = "all";
    searchTerm = "";
    sortBy = "featured";
    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "featured";
    updateGenderUI();
    renderFamilyButtons();
    applyFilters();
  });

  // ---------- URL FILTERS ----------
  const readURL = () => {
    const p = new URLSearchParams(location.search);
    const fam = p.get("family");
    const gen = p.get("gender");
    const srch = p.get("search");
    if (fam && fragranceFamilies.includes(fam)) activeFamily = fam;
    if (gen && genders.some((g) => g.id === gen)) activeGender = gen;
    if (srch) {
      searchTerm = srch.toLowerCase();
      if (searchInput) searchInput.value = srch;
    }
  };

  // Footer links
  const waFooter = document.getElementById("footer-whatsapp");
  if (waFooter) waFooter.href = `https://wa.me/201151275116`;
  const phoneSpan = document.getElementById("footer-phone");
  if (phoneSpan) phoneSpan.textContent = "01151275116";

  // ---------- TOAST ----------
  function showToast(msg) {
    if (!toastContainer) return;
    const t = document.createElement("div");
    t.className =
      "px-5 py-3 rounded-xl bg-brand-emeraldDark border border-brand-gold/20 text-white shadow-2xl text-sm transition-all duration-300";
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => {
      t.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => t.remove(), 300);
    }, 2200);
  }

  // ---------- MOBILE MENU ----------
  const mbBtn = document.getElementById("mobile-menu-btn");
  const mbMenu = document.getElementById("mobile-menu");
  mbBtn?.addEventListener("click", () => mbMenu?.classList.toggle("hidden"));

  // ---------- INIT ----------
  readURL();
  updateGenderUI();
  renderFamilyButtons();
  applyFilters();
  updateCartCount();
  window.addEventListener("evora:cart-updated", updateCartCount);
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY) updateCartCount();
  });
});