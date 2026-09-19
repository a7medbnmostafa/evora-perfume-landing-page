document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // ELEMENTS
  // =========================================================

  const emptyCartView = document.getElementById("empty-cart-view");

  const cartContentView = document.getElementById("cart-content-view");

  const cartItemsContainer = document.getElementById("cart-items-container");

  const cartItemsCount = document.getElementById("cart-items-count");

  const cartTotalPrice = document.getElementById("cart-total-price");

  const clearCartBtn = document.getElementById("clear-cart-btn");

  const orderForm = document.getElementById("whatsapp-order-form");

  const fullNameInput = document.getElementById("full-name");

  const phoneInput = document.getElementById("phone-number");

  const governorateInput = document.getElementById("governorate");

  const markazInput = document.getElementById("markaz");

  const regionInput = document.getElementById("region");

  const landmarkInput = document.getElementById("landmark");

  const placeOrderBtn = document.getElementById("place-order-btn");

  const toastContainer = document.getElementById("toast-container");

  // =========================================================
  // STATE
  // =========================================================

  let products = [];

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  async function loadProducts() {
    try {
      const response = await fetch("../data/perfumes.json", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      products = Array.isArray(data.products) ? data.products : [];

      renderCart();
    } catch (error) {
      console.error("ÉVORA: Failed to load perfumes.json.", error);

      showToast("حدث خطأ أثناء تحميل بيانات المنتجات");
    }
  }

  // =========================================================
  // CART HELPERS
  // =========================================================

  function getCart() {
    try {
      const storedCart = localStorage.getItem("evora_cart");

      if (!storedCart) {
        return [];
      }

      const parsedCart = JSON.parse(storedCart);

      return Array.isArray(parsedCart) ? parsedCart : [];
    } catch (error) {
      console.error("ÉVORA: Failed to read cart.", error);

      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem("evora_cart", JSON.stringify(cart));

    window.dispatchEvent(
      new CustomEvent("evora:cart-updated", {
        detail: {
          cart,
        },
      }),
    );
  }

  function getProduct(productId) {
    return products.find((product) => String(product.id) === String(productId));
  }

  function getCartItems() {
    const cart = getCart();

    return cart
      .map((cartItem) => {
        const product = getProduct(cartItem.id);

        if (!product) {
          return null;
        }

        return {
          ...product,
          qty: Math.max(1, Number(cartItem.qty) || 1),
        };
      })
      .filter(Boolean);
  }

  // =========================================================
  // FORMAT
  // =========================================================

  function formatPrice(price) {
    return Number(price || 0).toLocaleString("ar-EG");
  }

  function getProductImage(image) {
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

    return `../${image}`;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =========================================================
  // RENDER CART
  // =========================================================

  function renderCart() {
    const items = getCartItems();

    if (items.length === 0) {
      emptyCartView?.classList.remove("hidden");
      cartContentView?.classList.add("hidden");

      updateNavCartCount(0);

      return;
    }

    emptyCartView?.classList.add("hidden");
    cartContentView?.classList.remove("hidden");

    renderCartItems(items);

    updateCartSummary(items);
  }

  // =========================================================
  // RENDER ITEMS
  // =========================================================

  function renderCartItems(items) {
    if (!cartItemsContainer) {
      return;
    }

    cartItemsContainer.innerHTML = items
      .map((item) => {
        const itemTotal = Number(item.price || 0) * Number(item.qty || 0);

        return `
          <article
            class="cart-item group flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-brand-emeraldDark border border-brand-gold/10"
            data-cart-item="${escapeHTML(item.id)}"
          >

            <!-- Image -->
            <a
              href="product.html?id=${encodeURIComponent(item.id)}"
              class="block w-full sm:w-28 h-28 shrink-0 overflow-hidden rounded-xl bg-brand-emerald"
            >
              <img
                src="${escapeHTML(getProductImage(item.image))}"
                alt="${escapeHTML(item.name)}"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onerror="this.onerror=null;this.src='../assets/img/evora.jpeg';"
              />
            </a>

            <!-- Info -->
            <div class="flex-1 min-w-0">

              <div class="flex items-start justify-between gap-3">

                <div>
                  <a
                    href="product.html?id=${encodeURIComponent(item.id)}"
                    class="text-lg font-bold text-white hover:text-brand-gold transition-colors"
                  >
                    ${escapeHTML(item.name)}
                  </a>

                  ${
                    item.latin
                      ? `
                        <p class="text-sm text-white/50 mt-1">
                          ${escapeHTML(item.latin)}
                        </p>
                      `
                      : ""
                  }
                </div>

                <button
                  type="button"
                  data-remove-item="${escapeHTML(item.id)}"
                  class="w-9 h-9 shrink-0 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition"
                  aria-label="حذف المنتج"
                >
                  <i class="fa-solid fa-trash"></i>
                </button>

              </div>

              <div class="mt-4 flex flex-wrap items-center justify-between gap-4">

                <!-- Quantity -->
                <div
                  class="inline-flex items-center rounded-xl border border-brand-gold/20 overflow-hidden"
                >

                  <button
                    type="button"
                    data-decrease-item="${escapeHTML(item.id)}"
                    class="w-10 h-10 text-white hover:bg-brand-gold/10 transition"
                    aria-label="تقليل الكمية"
                  >
                    <i class="fa-solid fa-minus text-xs"></i>
                  </button>

                  <span
                    class="w-10 text-center text-white font-bold"
                    data-item-quantity="${escapeHTML(item.id)}"
                  >
                    ${item.qty}
                  </span>

                  <button
                    type="button"
                    data-increase-item="${escapeHTML(item.id)}"
                    class="w-10 h-10 text-white hover:bg-brand-gold/10 transition"
                    aria-label="زيادة الكمية"
                  >
                    <i class="fa-solid fa-plus text-xs"></i>
                  </button>

                </div>

                <!-- Price -->
                <div class="text-right">

                  <p class="text-sm text-white/50">
                    ${formatPrice(item.price)} ج.م × ${item.qty}
                  </p>

                  <p class="mt-1 text-lg font-bold text-brand-gold">
                    ${formatPrice(itemTotal)} ج.م
                  </p>

                </div>

              </div>

            </div>

          </article>
        `;
      })
      .join("");
  }

  // =========================================================
  // SUMMARY
  // =========================================================

  function updateCartSummary(items) {
    const count = items.reduce(
      (total, item) => total + Number(item.qty || 0),
      0,
    );

    const total = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0,
    );

    if (cartItemsCount) {
      cartItemsCount.textContent = count;
    }

    if (cartTotalPrice) {
      cartTotalPrice.textContent = `${formatPrice(total)} ج.م`;
    }

    updateNavCartCount(count);
  }

  // =========================================================
  // NAV COUNT
  // =========================================================

  function updateNavCartCount(count) {
    document
      .querySelectorAll("#nav-cart-count, .cart-badge")
      .forEach((badge) => {
        badge.textContent = count;

        badge.classList.toggle("hidden", count === 0);
      });
  }

  // =========================================================
  // CART ACTIONS
  // =========================================================

  function changeQuantity(productId, change) {
    const cart = getCart();

    const item = cart.find(
      (cartItem) => String(cartItem.id) === String(productId),
    );

    if (!item) {
      return;
    }

    const currentQty = Math.max(1, Number(item.qty) || 1);

    const newQty = currentQty + change;

    if (newQty <= 0) {
      removeItem(productId);
      return;
    }

    item.qty = newQty;

    saveCart(cart);
    renderCart();
  }

  function removeItem(productId) {
    const cart = getCart();

    const newCart = cart.filter(
      (item) => String(item.id) !== String(productId),
    );

    saveCart(newCart);

    showToast("تم حذف المنتج من السلة");

    renderCart();
  }

  function clearCart() {
    saveCart([]);

    showToast("تم تفريغ السلة");

    renderCart();
  }

  // =========================================================
  // CART EVENTS
  // =========================================================

  cartItemsContainer?.addEventListener("click", (event) => {
    const increaseBtn = event.target.closest("[data-increase-item]");

    const decreaseBtn = event.target.closest("[data-decrease-item]");

    const removeBtn = event.target.closest("[data-remove-item]");

    if (increaseBtn) {
      changeQuantity(increaseBtn.dataset.increaseItem, 1);

      return;
    }

    if (decreaseBtn) {
      changeQuantity(decreaseBtn.dataset.decreaseItem, -1);

      return;
    }

    if (removeBtn) {
      removeItem(removeBtn.dataset.removeItem);
    }
  });

  clearCartBtn?.addEventListener("click", () => {
    const cart = getCart();

    if (!cart.length) {
      return;
    }

    clearCart();
  });

  // =========================================================
  // WHATSAPP ORDER
  // =========================================================

  orderForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const items = getCartItems();

    if (!items.length) {
      showToast("السلة فارغة");

      return;
    }

    const fullName = fullNameInput?.value.trim() || "";

    const phone = phoneInput?.value.trim() || "";

    const governorate = governorateInput?.value.trim() || "";

    const markaz = markazInput?.value.trim() || "";

    const region = regionInput?.value.trim() || "";

    const landmark = landmarkInput?.value.trim() || "";

    if (
      !fullName ||
      !phone ||
      !governorate ||
      !markaz ||
      !region ||
      !landmark
    ) {
      showToast("من فضلك أكمل بيانات الطلب");

      return;
    }

    const total = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0,
    );

    const orderDetails = items
      .map((item) => {
        const itemTotal = Number(item.price || 0) * Number(item.qty || 0);

        return `• ${item.name}
  ${item.qty} × ${formatPrice(item.price)} = ${formatPrice(itemTotal)} ج.م`;
      })
      .join("\n\n");

    const message = `طلب جديد من متجر Évora

الاسم: ${fullName}
رقم التواصل: ${phone}

تفاصيل الطلب:
${orderDetails}

الإجمالي: ${formatPrice(total)} ج.م

العنوان:
المحافظة: ${governorate}
المركز: ${markaz}
المنطقة: ${region}
علامة مميزة: ${landmark}`;

    const phoneNumber = "201151275116";

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message,
    )}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  });

  // =========================================================
  // TOAST
  // =========================================================

  function showToast(message) {
    if (!toastContainer) {
      return;
    }

    const toast = document.createElement("div");

    toast.className =
      "fixed bottom-5 left-5 z-[9999] max-w-sm rounded-xl bg-brand-emeraldDark border border-brand-gold/20 px-5 py-3 text-sm text-white shadow-2xl transition-all duration-300";

    toast.textContent = message;

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("opacity-100");
    });

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-2");

      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2500);
  }

  // =========================================================
  // EXTERNAL CART UPDATE
  // =========================================================

  window.addEventListener("evora:cart-updated", () => {
    renderCart();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === "evora_cart") {
      renderCart();
    }
  });

  // =========================================================
  // INIT
  // =========================================================

  updateNavCartCount(
    getCart().reduce((total, item) => total + Number(item.qty || 0), 0),
  );

  await loadProducts();
});
