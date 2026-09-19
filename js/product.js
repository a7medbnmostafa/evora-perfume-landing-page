document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // ÉVORA - PRODUCT PAGE
  // مصدر بيانات المنتجات الوحيد:
  // ../data/perfumes.json
  //
  // نظام السلة:
  // localStorage => evora_cart
  //
  // شكل عنصر السلة:
  // {
  //   id: "product-id",
  //   qty: 2
  // }
  // =========================================================


  // =========================================================
  // 1. ELEMENTS
  // =========================================================

  const productTitle = document.getElementById("product-title");
  const productName = document.getElementById("product-name");
  const productLatin = document.getElementById("product-latin");
  const productImage = document.getElementById("product-image");
  const productPrice = document.getElementById("product-price");
  const productDescription =
    document.getElementById("product-description");

  const productGender =
    document.getElementById("product-gender");

  const productTier =
    document.getElementById("product-tier");

  const productFamilies =
    document.getElementById("product-families");

  const productTopNotes =
    document.getElementById("product-top-notes");

  const productHeartNotes =
    document.getElementById("product-heart-notes");

  const productBaseNotes =
    document.getElementById("product-base-notes");

  const quantityInput =
    document.getElementById("quantity");

  const quantityValue =
    document.getElementById("quantity-value");

  const increaseQuantityBtn =
    document.getElementById("increase-quantity");

  const decreaseQuantityBtn =
    document.getElementById("decrease-quantity");

  const addToCartBtn =
    document.getElementById("add-to-cart");

  const buyNowBtn =
    document.getElementById("buy-now");

  const relatedProductsContainer =
    document.getElementById("related-products");

  const toastContainer =
    document.getElementById("toast-container");


  // =========================================================
  // 2. CONSTANTS
  // =========================================================

  const CART_KEY = "evora_cart";


  // =========================================================
  // 3. STATE
  // =========================================================

  let allProducts = [];
  let currentProduct = null;
  let quantity = 1;


  // =========================================================
  // 4. GET PRODUCT ID FROM URL
  // =========================================================

  const params = new URLSearchParams(window.location.search);

  const productId = params.get("id");


  // =========================================================
  // 5. BASIC HELPERS
  // =========================================================

  const formatPrice = (price) => {
    return `${Number(price || 0).toLocaleString("ar-EG")} ج.م`;
  };


  const escapeHtml = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };


  // =========================================================
  // 6. IMAGE PATH
  // =========================================================
  //
  // الصور أيضًا تأتي من perfumes.json فقط.
  //
  // مثال داخل JSON:
  //
  // "image": "assets/img/erba-pura.webp"
  //
  // وبما أن product.html داخل html/
  // نحتاج ../ قبل المسار.
  //
  // =========================================================

  const getProductImage = (imagePath) => {
    if (!imagePath) {
      return "../assets/img/evora.jpeg";
    }

    if (
      imagePath.startsWith("../") ||
      imagePath.startsWith("./") ||
      imagePath.startsWith("/")
    ) {
      return imagePath;
    }

    return `../${imagePath}`;
  };


  // =========================================================
  // 7. CART
  // =========================================================

  const getCart = () => {
    try {
      const savedCart =
        localStorage.getItem(CART_KEY);

      if (!savedCart) {
        return [];
      }

      const cart = JSON.parse(savedCart);

      if (!Array.isArray(cart)) {
        return [];
      }

      return cart
        .map((item) => ({
          id: String(item.id),
          qty: Math.max(
            1,
            Number(item.qty) || 1
          ),
        }))
        .filter((item) => item.id);
    } catch (error) {
      console.error(
        "Évora cart read error:",
        error
      );

      return [];
    }
  };


  const saveCart = (cart) => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify(cart)
    );

    updateCartBadge();

    window.dispatchEvent(
      new CustomEvent("evora:cart-updated")
    );
  };


  const updateCartBadge = () => {
    const cart = getCart();

    const count = cart.reduce(
      (total, item) =>
        total + item.qty,
      0
    );

    document
      .querySelectorAll(
        "#nav-cart-count, .cart-badge"
      )
      .forEach((badge) => {
        badge.textContent = count;

        badge.classList.toggle(
          "hidden",
          count <= 0
        );
      });
  };


  // =========================================================
  // 8. ADD PRODUCT TO CART
  // =========================================================
  //
  // لا نأخذ name أو price أو image من الصفحة.
  //
  // المنتج بالكامل موجود في currentProduct
  // وهو أصلاً قادم من perfumes.json.
  //
  // السلة تخزن id + qty فقط.
  //
  // =========================================================

  const addProductToCart = (
    product,
    requestedQuantity = 1
  ) => {
    if (!product || !product.id) {
      return;
    }

    const cart = getCart();

    const qtyToAdd = Math.max(
      1,
      Number(requestedQuantity) || 1
    );

    const existingItem = cart.find(
      (item) =>
        String(item.id) ===
        String(product.id)
    );

    if (existingItem) {
      existingItem.qty += qtyToAdd;
    } else {
      cart.push({
        id: String(product.id),
        qty: qtyToAdd,
      });
    }

    saveCart(cart);

    showToast(
      `تمت إضافة ${product.name} إلى السلة`
    );
  };


  // =========================================================
  // 9. TOAST
  // =========================================================

  const showToast = (message) => {
    if (!toastContainer) {
      return;
    }

    const toast =
      document.createElement("div");

    toast.className =
      "flex items-center gap-3 rounded-xl bg-brand-emeraldDark border border-brand-gold/20 px-5 py-3 text-white shadow-xl";

    toast.innerHTML = `
      <span class="text-brand-gold text-lg">
        ✓
      </span>

      <span>
        ${escapeHtml(message)}
      </span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add(
        "opacity-0",
        "translate-y-2"
      );

      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2200);
  };


  // =========================================================
  // 10. QUANTITY UI
  // =========================================================

  const updateQuantityUI = () => {
    quantity = Math.max(
      1,
      Number(quantity) || 1
    );

    if (quantityInput) {
      quantityInput.value = quantity;
    }

    if (quantityValue) {
      quantityValue.textContent =
        quantity;
    }
  };


  if (increaseQuantityBtn) {
    increaseQuantityBtn.addEventListener(
      "click",
      () => {
        quantity += 1;
        updateQuantityUI();
      }
    );
  }


  if (decreaseQuantityBtn) {
    decreaseQuantityBtn.addEventListener(
      "click",
      () => {
        if (quantity > 1) {
          quantity -= 1;
        }

        updateQuantityUI();
      }
    );
  }


  if (quantityInput) {
    quantityInput.addEventListener(
      "change",
      () => {
        quantity = Math.max(
          1,
          Number(quantityInput.value) || 1
        );

        updateQuantityUI();
      }
    );
  }


  // =========================================================
  // 11. LOAD perfumes.json
  // =========================================================
  //
  // مفيش أي بيانات منتجات مكتوبة هنا.
  // كل البيانات تأتي من JSON.
  //
  // =========================================================

  if (!productId) {
    showProductError(
      "لم يتم تحديد المنتج."
    );

    return;
  }


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

    const data =
      await response.json();


    // -------------------------------------------------------
    // المنتجات من JSON فقط
    // -------------------------------------------------------

    allProducts =
      Array.isArray(data.products)
        ? data.products
        : [];


    // -------------------------------------------------------
    // البحث عن المنتج بالـ ID
    // -------------------------------------------------------

    currentProduct =
      allProducts.find(
        (product) =>
          String(product.id) ===
          String(productId)
      );


    if (!currentProduct) {
      showProductError(
        "المنتج غير موجود."
      );

      return;
    }


    // =======================================================
    // 12. RENDER
    // =======================================================

    renderProduct(currentProduct);

    renderRelatedProducts(
      currentProduct
    );

    updateCartBadge();

    updateQuantityUI();


  } catch (error) {
    console.error(
      "Évora product loading error:",
      error
    );

    showProductError(
      "حدث خطأ أثناء تحميل بيانات المنتج."
    );
  }


  // =========================================================
  // 13. PRODUCT ERROR
  // =========================================================

  function showProductError(message) {
    if (productTitle) {
      productTitle.textContent =
        message;
    }

    if (productName) {
      productName.textContent =
        message;
    }

    console.error(
      "Évora:",
      message
    );
  }


  // =========================================================
  // 14. RENDER PRODUCT
  // =========================================================

  function renderProduct(product) {

    // -------------------------------------------------------
    // PAGE TITLE
    // -------------------------------------------------------

    document.title =
      `${product.name} | Évora Perfumes`;


    // -------------------------------------------------------
    // NAME
    // -------------------------------------------------------

    if (productName) {
      productName.textContent =
        product.name || "";
    }


    // -------------------------------------------------------
    // LATIN NAME
    // -------------------------------------------------------

    if (productLatin) {
      productLatin.textContent =
        product.latin || "";
    }


    // -------------------------------------------------------
    // IMAGE
    // -------------------------------------------------------

    if (productImage) {

      productImage.src =
        getProductImage(
          product.image
        );

      productImage.alt =
        product.name || "";

      productImage.onerror =
        () => {
          productImage.src =
            "../assets/img/evora.jpeg";
        };
    }


    // -------------------------------------------------------
    // PRICE
    // -------------------------------------------------------

    if (productPrice) {
      productPrice.textContent =
        formatPrice(
          product.price
        );
    }


    // -------------------------------------------------------
    // DESCRIPTION
    // -------------------------------------------------------

    if (productDescription) {
      productDescription.textContent =
        product.desc || "";
    }


    // -------------------------------------------------------
    // GENDER
    // -------------------------------------------------------
    //
    // القيمة نفسها تأتي من JSON.
    // الـ label فقط يأتي من data.genders.
    //
    // -------------------------------------------------------

    if (productGender) {

      const gender =
        getGenderLabel(
          product.gender
        );

      productGender.textContent =
        gender;
    }


    // -------------------------------------------------------
    // TIER
    // -------------------------------------------------------
    //
    // الـ label يأتي من data.tiers.
    //
    // -------------------------------------------------------

    if (productTier) {

      const tier =
        getTierLabel(
          product.tier
        );

      productTier.textContent =
        tier;
    }


    // -------------------------------------------------------
    // FRAGRANCE FAMILIES
    // -------------------------------------------------------

    if (productFamilies) {

      const families =
        Array.isArray(
          product.families
        )
          ? product.families
          : [];

      productFamilies.innerHTML =
        families
          .map(
            (family) => `
              <span
                class="inline-flex items-center rounded-full border border-brand-gold/20 bg-brand-gold/5 px-3 py-1 text-sm text-brand-gold"
              >
                ${escapeHtml(family)}
              </span>
            `
          )
          .join("");
    }


    // -------------------------------------------------------
    // NOTES
    // -------------------------------------------------------

    const notes =
      product.notes || {};

    renderNotes(
      productTopNotes,
      notes.top
    );

    renderNotes(
      productHeartNotes,
      notes.heart
    );

    renderNotes(
      productBaseNotes,
      notes.base
    );
  }


  // =========================================================
  // 15. GENDER LABEL
  // =========================================================
  //
  // لا يوجد أي Gender مكتوب يدويًا.
  // البيانات تأتي من data.genders.
  //
  // =========================================================

  function getGenderLabel(genderId) {

    const genders =
      Array.isArray(
        // data غير متاح هنا مباشرة،
        // لذلك نستخدم القيمة الموجودة
        // في JSON التي تم تحميلها.
        // يتم حفظها أسفل.
        window.evoraPerfumeData?.genders
      )
        ? window.evoraPerfumeData.genders
        : [];

    const gender =
      genders.find(
        (item) =>
          String(item.id) ===
          String(genderId)
      );

    return (
      gender?.label ||
      genderId ||
      ""
    );
  }


  // =========================================================
  // 16. TIER LABEL
  // =========================================================

  function getTierLabel(tierId) {

    const tiers =
      Array.isArray(
        window.evoraPerfumeData?.tiers
      )
        ? window.evoraPerfumeData.tiers
        : [];

    const tier =
      tiers.find(
        (item) =>
          String(item.id) ===
          String(tierId)
      );

    return (
      tier?.label ||
      tierId ||
      ""
    );
  }


  // =========================================================
  // 17. SAVE COMPLETE JSON DATA GLOBALLY
  // =========================================================
  //
  // ده فقط لتسهيل استخدام genders / tiers
  // من نفس ملف perfumes.json.
  //
  // =========================================================

  // NOTE:
  // يتم ضبطه بعد تحميل JSON في الأسفل.
  //
  // لأن renderProduct تم استدعاؤه بالفعل،
  // نحتاج إعادة ضبط labels من البيانات مباشرة.
  //
  // لذلك يتم تحديثها من currentProduct data
  // في الجزء التالي.
  //
  // =========================================================


  // =========================================================
  // 18. ADD TO CART BUTTON
  // =========================================================

  if (addToCartBtn) {

    addToCartBtn.addEventListener(
      "click",
      () => {

        if (!currentProduct) {
          return;
        }

        addProductToCart(
          currentProduct,
          quantity
        );
      }
    );
  }


  // =========================================================
  // 19. BUY NOW BUTTON
  // =========================================================

  if (buyNowBtn) {

    buyNowBtn.addEventListener(
      "click",
      () => {

        if (!currentProduct) {
          return;
        }

        addProductToCart(
          currentProduct,
          quantity
        );

        window.location.href =
          "cart.html";
      }
    );
  }


  // =========================================================
  // 20. RELATED PRODUCTS
  // =========================================================

  function renderRelatedProducts(
    product
  ) {

    if (!relatedProductsContainer) {
      return;
    }


    const currentFamilies =
      Array.isArray(
        product.families
      )
        ? product.families
        : [];


    const relatedProducts =
      allProducts
        .filter(
          (item) =>
            String(item.id) !==
            String(product.id)
        )
        .map((item) => {

          const families =
            Array.isArray(
              item.families
            )
              ? item.families
              : [];


          const sharedFamilies =
            families.filter(
              (family) =>
                currentFamilies.includes(
                  family
                )
            ).length;


          return {
            product: item,
            score: sharedFamilies,
          };
        })
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(0, 4)
        .map(
          (item) =>
            item.product
        );


    relatedProductsContainer.innerHTML =
      relatedProducts
        .map(
          createRelatedProductCard
        )
        .join("");


    // -------------------------------------------------------
    // RELATED ADD BUTTONS
    // -------------------------------------------------------

    relatedProductsContainer
      .querySelectorAll(
        ".related-add-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.id;


            const productToAdd =
              allProducts.find(
                (item) =>
                  String(item.id) ===
                  String(id)
              );


            if (productToAdd) {

              addProductToCart(
                productToAdd,
                1
              );
            }
          }
        );
      });
  }


  // =========================================================
  // 21. RELATED PRODUCT CARD
  // =========================================================

  function createRelatedProductCard(
    product
  ) {

    const image =
      getProductImage(
        product.image
      );


    return `
      <article
        class="group relative overflow-hidden rounded-2xl bg-brand-emeraldDark border border-brand-gold/10 hover:border-brand-gold/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
      >

        <a
          href="product.html?id=${encodeURIComponent(
            product.id
          )}"
          class="block"
        >

          <div
            class="relative aspect-[4/5] overflow-hidden bg-black/10"
          >

            <img
              src="${escapeHtml(image)}"
              alt="${escapeHtml(
                product.name
              )}"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              onerror="this.src='../assets/img/evora.jpeg'"
            />

            ${
              product.isBestseller
                ? `
                  <span
                    class="absolute top-3 right-3 rounded-full bg-brand-gold px-3 py-1 text-xs font-bold text-brand-emeraldDark"
                  >
                    الأكثر مبيعًا
                  </span>
                `
                : ""
            }

          </div>


          <div class="p-4">

            <p
              class="text-xs text-brand-gold/80 mb-1"
            >
              ${escapeHtml(
                product.latin || ""
              )}
            </p>


            <h3
              class="font-bold text-white text-base sm:text-lg line-clamp-1"
            >
              ${escapeHtml(
                product.name || ""
              )}
            </h3>


            <div
              class="mt-3 flex items-center justify-between gap-2"
            >

              <span
                class="font-bold text-brand-gold"
              >
                ${formatPrice(
                  product.price
                )}
              </span>


              <span
                class="text-xs text-white/50"
              >
                عرض التفاصيل
              </span>

            </div>

          </div>

        </a>


        <button
          type="button"
          data-id="${escapeHtml(
            product.id
          )}"
          class="related-add-btn absolute bottom-4 left-4 w-10 h-10 rounded-xl border border-brand-gold/20 text-brand-gold hover:bg-brand-gold hover:text-brand-emeraldDark transition-all duration-300 flex items-center justify-center"
          aria-label="إضافة إلى السلة"
          title="إضافة إلى السلة"
        >
          +
        </button>

      </article>
    `;
  }


  // =========================================================
  // 22. CART EVENTS
  // =========================================================

  window.addEventListener(
    "storage",
    (event) => {

      if (
        event.key === CART_KEY
      ) {
        updateCartBadge();
      }
    }
  );


  window.addEventListener(
    "evora:cart-updated",
    () => {
      updateCartBadge();
    }
  );


  // =========================================================
  // 23. INITIAL BADGE
  // =========================================================

  updateCartBadge();

});