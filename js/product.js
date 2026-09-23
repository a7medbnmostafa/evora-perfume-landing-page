document.addEventListener("DOMContentLoaded", async () => {
  const CART_KEY = "evora_cart";
  const WA_NUMBER = "201151275116";
  const FALLBACK_IMG = "assets/img/evora.jpeg";

  const params = new URLSearchParams(location.search);
  const productId = params.get("id");

  let allProducts = [];
  let gendersList = [];
  let tiersList = [];
  let sizesCatalog = []; // ← تعريفات الأحجام العامة من JSON
  let currentProduct = null;
  let currentSize = null; // ← الحجم المختار حاليًا { ml, price, sku, inStock }
  let quantity = 1;

  const $ = (id) => document.getElementById(id);

  const formatPrice = (p) => `${Number(p || 0).toLocaleString("ar-EG")} ج.م`;
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const getProductImage = (p) => {
    if (!p) return FALLBACK_IMG;
    if (p.startsWith("./") || p.startsWith("/") || p.startsWith("http"))
      return p;
    return p;
  };

  // ===================================================
  // TOAST
  // ===================================================
  const toastC = $("toast-container");
  const showToast = (msg) => {
    if (!toastC) return;
    const t = document.createElement("div");
    t.className =
      "flex items-center gap-3 rounded-xl bg-brand-emeraldDark border border-brand-gold/20 px-5 py-3 text-white shadow-xl transition-all duration-300";
    t.innerHTML = `<span class="text-brand-gold text-lg">✓</span><span>${esc(msg)}</span>`;
    toastC.appendChild(t);
    setTimeout(() => {
      t.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => t.remove(), 300);
    }, 2200);
  };

  // ===================================================
  // CART HELPERS
  // ===================================================
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
    updateCartBadge();
    window.dispatchEvent(new CustomEvent("evora:cart-updated"));
  };

  const updateCartBadge = () => {
    const n = getCart().reduce((t, i) => t + (Number(i.qty) || 0), 0);
    document.querySelectorAll("#nav-cart-count, .cart-badge").forEach((b) => {
      b.textContent = n;
      b.classList.toggle("hidden", n <= 0);
    });
  };

  /**
   * إضافة منتج للسلة مع دعم الحجم
   * - lineId = `{productId}__{ml}` لتمييز كل حجم كسطر مستقل
   * - يحفظ السعر وقت الإضافة لتجنب تغيّر السعر لاحقًا
   */
  const addProductToCart = (product, qty = 1, size = null) => {
    if (!product?.id) return;

    const q = Math.max(1, Number(qty) || 1);
    const sizeMl = size?.ml ?? null;
    const sizePrice = size?.price ?? product.price ?? 0;
    const lineId = sizeMl ? `${product.id}__${sizeMl}` : String(product.id);

    const cart = getCart();
    const existing = cart.find((c) => {
      // توافق عكسي: العناصر القديمة قد لا تحتوي على lineId
      const cLine = c.lineId || String(c.id);
      return cLine === lineId;
    });

    if (existing) {
      existing.qty = (Number(existing.qty) || 0) + q;
      // تحديث السعر في حال تغيّر
      existing.price = sizePrice;
      if (sizeMl) existing.size = sizeMl;
      if (!existing.lineId) existing.lineId = lineId;
    } else {
      cart.push({
        lineId,
        id: String(product.id),
        size: sizeMl,
        price: sizePrice,
        qty: q,
      });
    }

    saveCart(cart);
    const sizeLabel = sizeMl ? ` (${sizeMl} مل)` : "";
    showToast(`تمت إضافة ${product.name}${sizeLabel} إلى السلة`);
  };

  // ===================================================
  // LOAD DATA
  // ===================================================
  if (!productId) {
    document.title = "المنتج غير محدد | Évora";
    return;
  }

  try {
    const res = await fetch("data/perfumes.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allProducts = Array.isArray(data.products) ? data.products : [];
    gendersList = Array.isArray(data.genders) ? data.genders : [];
    tiersList = Array.isArray(data.tiers) ? data.tiers : [];
    sizesCatalog = Array.isArray(data.sizes) ? data.sizes : [];
  } catch (e) {
    console.error(e);
    return;
  }

  currentProduct = allProducts.find(
    (p) => String(p.id) === String(productId)
  );
  if (!currentProduct) {
    document.title = "المنتج غير موجود | Évora";
    const t = $("product-title");
    if (t) t.textContent = "المنتج غير موجود";
    return;
  }

  // ===================================================
  // SIZES RESOLUTION (with fallback for legacy products)
  // ===================================================
  const resolveSizes = (product) => {
    // 1. لو المنتج فيه sizes → استخدمها
    if (Array.isArray(product.sizes) && product.sizes.length) {
      return [...product.sizes].sort((a, b) => a.ml - b.ml);
    }
    // 2. لو لأ → fallback: حجم افتراضي 50 مل بسعر price القديم
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
    // 3. مفيش أي بيانات سعر
    return [];
  };

  const productSizes = resolveSizes(currentProduct);

  // تحديد الحجم الافتراضي: defaultSize من المنتج، أو 50، أو أول حجم
  const pickDefaultSize = () => {
    if (!productSizes.length) return null;
    const wanted = Number(currentProduct.defaultSize);
    if (wanted && productSizes.some((s) => s.ml === wanted)) {
      return productSizes.find((s) => s.ml === wanted);
    }
    if (productSizes.some((s) => s.ml === 50)) {
      return productSizes.find((s) => s.ml === 50);
    }
    // أول حجم متوفر
    return productSizes.find((s) => s.inStock !== false) || productSizes[0];
  };

  currentSize = pickDefaultSize();

  // ===================================================
  // SIZE SELECTOR RENDER
  // ===================================================
  const renderSizes = () => {
    const box = $("size-options");
    const wrapper = $("size-selector-wrapper");
    if (!box || !wrapper) return;

    // لو مفيش أحجام خالص (منتج غلط) → اخفي القسم
    if (!productSizes.length) {
      wrapper.classList.add("hidden");
      return;
    }

    box.innerHTML = productSizes
      .map((s) => {
        const isActive = currentSize && s.ml === currentSize.ml;
        const isOut = s.inStock === false;

        const baseClasses =
          "size-btn relative p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-0.5";
        const activeClasses = isActive
          ? "active border-brand-gold bg-brand-gold/15"
          : "border-brand-gold/20 bg-brand-emerald/40 hover:border-brand-gold/60";
        const outClasses = isOut
          ? "opacity-40 cursor-not-allowed"
          : "cursor-pointer";

        return `
        <button
          type="button"
          data-size="${s.ml}"
          class="${baseClasses} ${activeClasses} ${outClasses}"
          ${isOut ? "disabled" : ""}
          aria-label="${s.ml} مل - ${formatPrice(s.price)}"
        >
          <span class="block text-lg sm:text-xl font-black text-brand-gold leading-none">
            ${s.ml}
          </span>
          <span class="block text-[10px] text-brand-cream/60 mt-0.5">مل</span>
          <span class="block text-[10px] text-brand-cream/70 font-semibold mt-1">
            ${Number(s.price).toLocaleString("ar-EG")}
          </span>
          ${
            isOut
              ? `<span class="block text-[9px] text-red-400 mt-0.5">نفذ</span>`
              : ""
          }
        </button>`;
      })
      .join("");

    // ربط الأحداث
    box.querySelectorAll(".size-btn:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ml = Number(btn.dataset.size);
        const found = productSizes.find((s) => s.ml === ml);
        if (!found || found.inStock === false) return;
        currentSize = found;
        renderSizes();
        updatePriceDisplay();
        updateQty(); // يحدّث معاينة الإجمالي + رابط واتساب
      });
    });
  };

  // ===================================================
  // PRICE DISPLAY
  // ===================================================
  const updatePriceDisplay = () => {
    const priceEl = $("product-price");
    const perMlEl = $("price-per-ml");
    const labelEl = $("selected-size-label");
    const warningEl = $("size-stock-warning");

    if (!currentSize) {
      if (priceEl) priceEl.textContent = "--";
      if (perMlEl) perMlEl.textContent = "";
      if (labelEl) labelEl.textContent = "";
      return;
    }

    if (priceEl) priceEl.textContent = formatPrice(currentSize.price);

    if (perMlEl) {
      if (currentSize.ml > 0) {
        const perMl = currentSize.price / currentSize.ml;
        perMlEl.textContent = `(${perMl.toFixed(2)} ج.م/مل)`;
      } else {
        perMlEl.textContent = "";
      }
    }

    if (labelEl) {
      const meta = sizesCatalog.find((s) => s.ml === currentSize.ml);
      const desc = meta?.description ? ` — ${meta.description}` : "";
      labelEl.textContent = `الحجم المختار: ${currentSize.ml} مل${desc}`;
    }

    if (warningEl) {
      warningEl.classList.toggle("hidden", currentSize.inStock !== false);
    }
  };

  // ===================================================
  // RENDER PRODUCT
  // ===================================================
  const render = (p) => {
    document.title = `${p.name} | Évora Perfumes`;

    const bc = $("breadcrumb-product-name");
    if (bc) bc.textContent = p.name;

    const img = $("product-img");
    if (img) {
      img.src = getProductImage(p.image);
      img.alt = p.name;
      img.onerror = () => (img.src = FALLBACK_IMG);
    }

    const badge = $("product-badges");
    if (badge) {
      const badges = [];
      if (p.isBestseller)
        badges.push(
          `<span class="px-3 py-1 rounded-full bg-brand-gold text-brand-emeraldDark text-xs font-bold">الأكثر مبيعًا</span>`
        );
      const tier = tiersList.find((t) => t.id === p.tier);
      if (tier)
        badges.push(
          `<span class="px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold">${esc(
            tier.label
          )}</span>`
        );
      badge.innerHTML = badges.join("");
    }

    const gBadge = $("product-gender-badge");
    if (gBadge) {
      const g = gendersList.find((x) => x.id === p.gender);
      gBadge.textContent = g?.label || p.gender || "";
    }

    const t = $("product-title");
    if (t) t.textContent = p.name || "";

    const l = $("product-latin");
    if (l) l.textContent = p.latin || "";

    // السعر يُدار الآن عبر updatePriceDisplay()

    const desc = $("product-desc");
    if (desc) desc.textContent = p.desc || "";

    const famBox = $("product-families");
    if (famBox) {
      famBox.innerHTML = (p.families || [])
        .map(
          (f) =>
            `<span class="inline-flex items-center rounded-full border border-brand-gold/20 bg-brand-gold/5 px-3 py-1 text-sm text-brand-gold">${esc(
              f
            )}</span>`
        )
        .join("");
    }

    // Notes
    const renderNotes = (containerId, arr) => {
      const c = $(containerId);
      if (!c) return;
      c.innerHTML = (arr || [])
        .map(
          (n) =>
            `<span class="px-2 py-1 rounded-lg bg-brand-gold/5 border border-brand-gold/10 text-brand-gold text-[11px]">${esc(
              n
            )}</span>`
        )
        .join("");
    };
    renderNotes("notes-top", p.notes?.top);
    renderNotes("notes-heart", p.notes?.heart);
    renderNotes("notes-base", p.notes?.base);

    // Sizes
    renderSizes();
    updatePriceDisplay();

    // WhatsApp direct order (سيتحدث مع تغيّر الحجم/الكمية)
    updateQty();
  };

  // ===================================================
  // QUANTITY + TOTAL PREVIEW + WHATSAPP LINK
  // ===================================================
  const qtyVal = $("qty-val");
  const totalPreview = $("product-total-preview");

  const updateQty = () => {
    quantity = Math.max(1, Number(quantity) || 1);
    if (qtyVal) qtyVal.textContent = quantity;

    // معاينة الإجمالي
    if (totalPreview && currentSize) {
      const total = quantity * Number(currentSize.price || 0);
      totalPreview.textContent = formatPrice(total);
    } else if (totalPreview) {
      totalPreview.textContent = "--";
    }

    // تحديث رابط واتساب
    const wa = $("whatsapp-order-btn");
    if (wa && currentProduct && currentSize) {
      const sizeLine = `الحجم: ${currentSize.ml} مل`;
      const priceLine = `السعر للوحدة: ${formatPrice(currentSize.price)}`;
      const totalLine = `الإجمالي: ${formatPrice(
        quantity * Number(currentSize.price || 0)
      )}`;
      const msg =
        `مرحبًا Évora، أريد طلب:\n` +
        `• ${currentProduct.name}${
          currentProduct.latin ? " (" + currentProduct.latin + ")" : ""
        }\n` +
        `${sizeLine}\n` +
        `${priceLine}\n` +
        `الكمية: ${quantity}\n` +
        `${totalLine}`;
      wa.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    }
  };

  $("qty-plus")?.addEventListener("click", () => {
    quantity++;
    updateQty();
  });

  $("qty-minus")?.addEventListener("click", () => {
    if (quantity > 1) quantity--;
    updateQty();
  });

  // ===================================================
  // ADD TO CART
  // ===================================================
  $("add-to-cart-btn")?.addEventListener("click", () => {
    if (!currentProduct) return;
    if (!currentSize) {
      showToast("لا يوجد حجم متوفر لهذا العطر");
      return;
    }
    if (currentSize.inStock === false) {
      showToast("هذا الحجم غير متوفر حاليًا");
      return;
    }
    addProductToCart(currentProduct, quantity, currentSize);
  });

  // ===================================================
  // RELATED PRODUCTS
  // ===================================================
  const related = $("related-products-grid");

  const renderRelated = (p) => {
    if (!related) return;
    const fams = Array.isArray(p.families) ? p.families : [];
    const list = allProducts
      .filter((x) => String(x.id) !== String(p.id))
      .map((x) => ({
        p: x,
        s: (x.families || []).filter((f) => fams.includes(f)).length,
      }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map((x) => x.p);

    related.innerHTML = list
      .map((x) => {
        const img = getProductImage(x.image);

        // أقل سعر متاح لهذا المنتج للعرض
        const xSizes = resolveSizes(x);
        const minPrice = xSizes.length
          ? Math.min(...xSizes.map((s) => Number(s.price) || 0))
          : Number(x.price) || 0;
        const hasMultipleSizes = xSizes.length > 1;

        return `
        <article class="group relative overflow-hidden rounded-2xl bg-brand-emeraldDark border border-brand-gold/10 hover:border-brand-gold/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
          <a href="product.html?id=${encodeURIComponent(x.id)}" class="block">
            <div class="relative aspect-[4/5] overflow-hidden">
              <img src="${esc(img)}" alt="${esc(x.name)}"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                onerror="this.onerror=null;this.src='${FALLBACK_IMG}';" />
              ${
                x.isBestseller
                  ? `<span class="absolute top-3 right-3 rounded-full bg-brand-gold px-3 py-1 text-xs font-bold text-brand-emeraldDark">الأكثر مبيعًا</span>`
                  : ""
              }
            </div>
            <div class="p-4">
              <p class="text-xs text-brand-gold/80 mb-1">${esc(
                x.latin || ""
              )}</p>
              <h3 class="font-bold text-white text-base line-clamp-1">${esc(
                x.name
              )}</h3>
              <div class="mt-3 flex items-center justify-between gap-2">
                <div>
                  <span class="font-bold text-brand-gold">${formatPrice(
                    minPrice
                  )}</span>
                  ${
                    hasMultipleSizes
                      ? `<span class="text-[10px] text-brand-cream/50 mr-1">من</span>`
                      : ""
                  }
                </div>
              </div>
            </div>
          </a>
          <button type="button" data-add="${esc(x.id)}"
            class="absolute bottom-4 left-4 w-10 h-10 rounded-xl border border-brand-gold/20 text-brand-gold hover:bg-brand-gold hover:text-brand-emeraldDark transition-all flex items-center justify-center"
            aria-label="إضافة إلى السلة">
            <i class="fa-solid fa-cart-plus"></i>
          </button>
        </article>`;
      })
      .join("");
  };

  related?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    e.preventDefault();
    const p = allProducts.find((x) => String(x.id) === String(btn.dataset.add));
    if (!p) return;

    // لو للمنتج أحجام → استخدم الحجم الافتراضي أو أول حجم متوفر
    const pSizes = resolveSizes(p);
    let defaultSz = null;
    if (pSizes.length) {
      const wanted = Number(p.defaultSize);
      defaultSz =
        (wanted && pSizes.find((s) => s.ml === wanted)) ||
        pSizes.find((s) => s.ml === 50) ||
        pSizes.find((s) => s.inStock !== false) ||
        pSizes[0];
    }

    addProductToCart(p, 1, defaultSz);
  });

  // Footer links
  const waFooter = document.getElementById("footer-whatsapp");
  if (waFooter) waFooter.href = `https://wa.me/201151275116`;
  const phoneSpan = document.getElementById("footer-phone");
  if (phoneSpan) phoneSpan.textContent = "01151275116";

  // ===================================================
  // INIT
  // ===================================================
  render(currentProduct);
  renderRelated(currentProduct);
  updateQty();
  updateCartBadge();

  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY) updateCartBadge();
  });
});