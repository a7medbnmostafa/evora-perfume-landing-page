document.addEventListener("DOMContentLoaded", async () => {
  const CART_KEY = "evora_cart";
  const WA_NUMBER = "201151275116";
  const FALLBACK_IMG = "../assets/img/evora.jpeg";

  const params = new URLSearchParams(location.search);
  const productId = params.get("id");

  let allProducts = [];
  let gendersList = [];
  let tiersList = [];
  let currentProduct = null;
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
    if (p.startsWith("../") || p.startsWith("./") || p.startsWith("/") || p.startsWith("http"))
      return p;
    return `../${p}`;
  };

  // ===================================================
  // TOAST
  // ===================================================
  const toastC = $("toast-container");
  const showToast = (msg) => {
    if (!toastC) return;
    const t = document.createElement("div");
    t.className =
      "flex items-center gap-3 rounded-xl bg-brand-emeraldDark border border-brand-gold/20 px-5 py-3 text-white shadow-xl";
    t.innerHTML = `<span class="text-brand-gold text-lg">✓</span><span>${esc(msg)}</span>`;
    toastC.appendChild(t);
    setTimeout(() => {
      t.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => t.remove(), 300);
    }, 2200);
  };

  // ===================================================
  // CART
  // ===================================================
  const getCart = () => {
    try {
      const c = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(c) ? c : [];
    } catch { return []; }
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
  const addProductToCart = (product, qty = 1) => {
    if (!product?.id) return;
    const cart = getCart();
    const existing = cart.find((c) => String(c.id) === String(product.id));
    if (existing) existing.qty += Math.max(1, Number(qty) || 1);
    else cart.push({ id: String(product.id), qty: Math.max(1, Number(qty) || 1) });
    saveCart(cart);
    showToast(`تمت إضافة ${product.name} إلى السلة`);
  };

  // ===================================================
  // LOAD DATA
  // ===================================================
  if (!productId) {
    document.title = "المنتج غير محدد | Évora";
    return;
  }

  try {
    const res = await fetch("../data/perfumes.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allProducts = Array.isArray(data.products) ? data.products : [];
    gendersList = Array.isArray(data.genders) ? data.genders : [];
    tiersList = Array.isArray(data.tiers) ? data.tiers : [];
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
        badges.push(`<span class="px-3 py-1 rounded-full bg-brand-gold text-brand-emeraldDark text-xs font-bold">الأكثر مبيعًا</span>`);
      const tier = tiersList.find((t) => t.id === p.tier);
      if (tier)
        badges.push(`<span class="px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold">${esc(tier.label)}</span>`);
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

    const price = $("product-price");
    if (price) price.textContent = formatPrice(p.price);

    const desc = $("product-desc");
    if (desc) desc.textContent = p.desc || "";

    const famBox = $("product-families");
    if (famBox) {
      famBox.innerHTML = (p.families || [])
        .map(
          (f) =>
            `<span class="inline-flex items-center rounded-full border border-brand-gold/20 bg-brand-gold/5 px-3 py-1 text-sm text-brand-gold">${esc(f)}</span>`
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
            `<span class="px-2 py-1 rounded-lg bg-brand-gold/5 border border-brand-gold/10 text-brand-gold text-[11px]">${esc(n)}</span>`
        )
        .join("");
    };
    renderNotes("notes-top", p.notes?.top);
    renderNotes("notes-heart", p.notes?.heart);
    renderNotes("notes-base", p.notes?.base);

    // WhatsApp direct order
    const wa = $("whatsapp-order-btn");
    if (wa) {
      const msg = `مرحبًا Évora، أريد طلب:\n• ${p.name}${p.latin ? " (" + p.latin + ")" : ""}\nالسعر: ${formatPrice(p.price)}\nالكمية: 1`;
      wa.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    }
  };

  // ===================================================
  // QUANTITY
  // ===================================================
  const qtyVal = $("qty-val");
  const updateQty = () => {
    quantity = Math.max(1, Number(quantity) || 1);
    if (qtyVal) qtyVal.textContent = quantity;
    // Update WhatsApp link quantity
    const wa = $("whatsapp-order-btn");
    if (wa && currentProduct) {
      const msg = `مرحبًا Évora، أريد طلب:\n• ${currentProduct.name}${currentProduct.latin ? " (" + currentProduct.latin + ")" : ""}\nالسعر: ${formatPrice(currentProduct.price)}\nالكمية: ${quantity}`;
      wa.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    }
  };
  $("qty-plus")?.addEventListener("click", () => { quantity++; updateQty(); });
  $("qty-minus")?.addEventListener("click", () => {
    if (quantity > 1) quantity--;
    updateQty();
  });

  // ===================================================
  // ADD TO CART
  // ===================================================
  $("add-to-cart-btn")?.addEventListener("click", () => {
    if (!currentProduct) return;
    addProductToCart(currentProduct, quantity);
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
        return `
        <article class="group relative overflow-hidden rounded-2xl bg-brand-emeraldDark border border-brand-gold/10 hover:border-brand-gold/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
          <a href="product.html?id=${encodeURIComponent(x.id)}" class="block">
            <div class="relative aspect-[4/5] overflow-hidden">
              <img src="${esc(img)}" alt="${esc(x.name)}"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                onerror="this.onerror=null;this.src='${FALLBACK_IMG}';" />
              ${x.isBestseller ? `<span class="absolute top-3 right-3 rounded-full bg-brand-gold px-3 py-1 text-xs font-bold text-brand-emeraldDark">الأكثر مبيعًا</span>` : ""}
            </div>
            <div class="p-4">
              <p class="text-xs text-brand-gold/80 mb-1">${esc(x.latin || "")}</p>
              <h3 class="font-bold text-white text-base line-clamp-1">${esc(x.name)}</h3>
              <div class="mt-3 flex items-center justify-between gap-2">
                <span class="font-bold text-brand-gold">${formatPrice(x.price)}</span>

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
    if (p) addProductToCart(p, 1);
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