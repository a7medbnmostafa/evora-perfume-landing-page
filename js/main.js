document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // 1. ELEMENTS
  // =========================================================

  const mobileMenuBtn =
    document.getElementById("mobile-menu-btn");

  const mobileMenu =
    document.getElementById("mobile-menu");

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

  const quizGenderOptions =
    document.getElementById(
      "quiz-gender-options"
    );

  const quizFamilyOptions =
    document.getElementById(
      "quiz-family-options"
    );

  const quizVibeOptions =
    document.getElementById(
      "quiz-vibe-options"
    );

  const quizResult =
    document.getElementById("quiz-result");

  const quizResultCard =
    document.getElementById(
      "quiz-result-card"
    );

  const quizAddToCartBtn =
    document.getElementById(
      "quiz-add-to-cart"
    );

  const bestsellersGrid =
    document.getElementById(
      "bestsellers-grid"
    );

  // =========================================================
  // 2. GLOBAL DATA
  // =========================================================

  let perfumeCatalog = [];
  let fragranceFamilies = [];
  let genders = [];
  let tiers = [];

  let selectedPerfume = null;

  const CART_KEY = "evora_cart";

  // =========================================================
  // 3. LOAD PERFUMES DATA
  // =========================================================

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

    perfumeCatalog = Array.isArray(
      data.products
    )
      ? data.products
      : [];

    fragranceFamilies = Array.isArray(
      data.fragranceFamilies
    )
      ? data.fragranceFamilies
      : [];

    genders = Array.isArray(
      data.genders
    )
      ? data.genders
      : [];

    tiers = Array.isArray(
      data.tiers
    )
      ? data.tiers
      : [];
  } catch (error) {
    console.error(
      "ÉVORA: Failed to load perfumes.json.",
      error
    );

    return;
  }

  // =========================================================
  // 4. CART SYSTEM
  // =========================================================

  /**
   * قراءة السلة
   */
  const getCart = () => {
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
  };

  /**
   * حفظ السلة
   */
  const saveCart = (cart) => {
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
  };

  /**
   * حساب عدد القطع
   */
  const getCartCount = (
    cart = getCart()
  ) => {
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
  };

  /**
   * تحديث كل عدادات السلة
   */
  const updateCartBadge = () => {
    const cart = getCart();

    const count =
      getCartCount(cart);

    document
      .querySelectorAll(
        ".cart-badge, #nav-cart-count"
      )
      .forEach((badge) => {
        badge.textContent = count;

        badge.classList.toggle(
          "hidden",
          count === 0
        );
      });
  };

  /**
   * إضافة منتج للسلة
   *
   * product:
   * المنتج نفسه من perfumes.json
   *
   * quantity:
   * الكمية المطلوبة
   */
  const addProductToCart = (
    product,
    quantity = 1
  ) => {
    if (!product?.id) {
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
      /*
       * نخزن الـ ID والكمية فقط.
       * بيانات المنتج نفسها تأتي دائمًا
       * من perfumes.json.
       */
      cart.push({
        id: product.id,
        qty: qtyToAdd,
      });
    }

    const saved = saveCart(cart);

    if (saved) {
      updateCartBadge();
    }

    return saved;
  };

  /**
   * إضافة باستخدام Product ID
   */
  const addToCart = (
    productId,
    quantity = 1
  ) => {
    const product =
      perfumeCatalog.find(
        (item) =>
          String(item.id) ===
          String(productId)
      );

    if (!product) {
      console.warn(
        `ÉVORA: Product "${productId}" not found in perfumes.json.`
      );

      return false;
    }

    return addProductToCart(
      product,
      quantity
    );
  };

  /**
   * تعديل كمية منتج
   */
  const updateCartItemQuantity = (
    productId,
    quantity
  ) => {
    const cart = getCart();

    const item =
      cart.find(
        (cartItem) =>
          String(cartItem.id) ===
          String(productId)
      );

    if (!item) {
      return false;
    }

    const newQuantity = Math.max(
      0,
      Number(quantity) || 0
    );

    if (newQuantity === 0) {
      const newCart =
        cart.filter(
          (cartItem) =>
            String(cartItem.id) !==
            String(productId)
        );

      saveCart(newCart);
    } else {
      item.qty = newQuantity;

      saveCart(cart);
    }

    updateCartBadge();

    return true;
  };

  /**
   * حذف منتج
   */
  const removeFromCart = (
    productId
  ) => {
    const cart = getCart();

    const newCart =
      cart.filter(
        (item) =>
          String(item.id) !==
          String(productId)
      );

    saveCart(newCart);

    updateCartBadge();

    return true;
  };

  /**
   * تفريغ السلة
   */
  const clearCart = () => {
    saveCart([]);

    updateCartBadge();

    return true;
  };

  // =========================================================
  // 5. GLOBAL CART API
  // =========================================================

  window.EvoraCart = {
    getCart,
    saveCart,
    getCartCount,
    addToCart,
    addProductToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    updateCartBadge,
  };

  /*
   * Compatibility API
   *
   * عشان أي كود قديم عندك
   * بيستخدم addToCart يفضل شغال.
   */
  window.addToCart = addToCart;

  window.addProductToCart = (
    productOrId,
    quantity = 1
  ) => {
    if (
      typeof productOrId ===
      "string"
    ) {
      return addToCart(
        productOrId,
        quantity
      );
    }

    if (
      productOrId &&
      typeof productOrId ===
        "object"
    ) {
      return addProductToCart(
        productOrId,
        quantity
      );
    }

    return false;
  };

  // =========================================================
  // 6. MOBILE MENU
  // =========================================================

  mobileMenuBtn?.addEventListener(
    "click",
    () => {
      mobileMenu?.classList.toggle(
        "hidden"
      );
    }
  );

  mobileMenu
    ?.querySelectorAll("a")
    .forEach((link) => {
      link.addEventListener(
        "click",
        () => {
          mobileMenu.classList.add(
            "hidden"
          );
        }
      );
    });

  // =========================================================
  // 7. SMOOTH ANCHOR LINKS
  // =========================================================

  document
    .querySelectorAll(
      'a[href^="#"]'
    )
    .forEach((link) => {
      link.addEventListener(
        "click",
        (event) => {
          const targetId =
            link.getAttribute(
              "href"
            );

          if (
            !targetId ||
            targetId === "#"
          ) {
            return;
          }

          const target =
            document.querySelector(
              targetId
            );

          if (!target) {
            return;
          }

          event.preventDefault();

          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      );
    });

  // =========================================================
  // 8. PRODUCT PAGE NAVIGATION
  // =========================================================

  const openProductPage = (
    productId
  ) => {
    if (!productId) {
      return;
    }

    window.location.href =
      `pages/product.html?id=${encodeURIComponent(
        productId
      )}`;
  };

  // =========================================================
  // 9. QUIZ
  // =========================================================

  let quizStep = 1;

  let selectedGender = null;
  let selectedFamily = null;
  let selectedVibe = null;

  const vibeFamilyMap = {
    elegant: [
      "زهري",
      "حلو",
      "شرقي",
    ],

    bold: [
      "خشبي",
      "دخاني",
      "عودي",
    ],

    light: [
      "منعش",
      "زهري",
    ],

    mysterious: [
      "شرقي",
      "دخاني",
      "عودي",
    ],
  };

  const familyIcons = {
    شرقي: "fa-solid fa-moon",
    خشبي: "fa-solid fa-tree",
    حلو: "fa-solid fa-candy-cane",
    منعش: "fa-solid fa-wind",
    دخاني: "fa-solid fa-smog",
    عودي: "fa-solid fa-fire",
    زهري: "fa-solid fa-spa",
  };

  /**
   * تحديث خطوات الـ Quiz
   */
  const showQuizStep = (
    step
  ) => {
    quizStep = step;

    document
      .querySelectorAll(
        "[data-quiz-step]"
      )
      .forEach((element) => {
        const elementStep =
          Number(
            element.dataset.quizStep
          );

        element.classList.toggle(
          "hidden",
          elementStep !== step
        );
      });
  };

  /**
   * بناء اختيارات الـ Gender
   */
  const renderQuizGenderOptions =
    () => {
      if (!quizGenderOptions) {
        return;
      }

      quizGenderOptions.innerHTML =
        genders
          .map(
            (gender) => `
              <button
                type="button"
                data-quiz-gender="${gender.id}"
                class="quiz-gender-option group p-4 rounded-2xl border border-brand-gold/10 bg-brand-emeraldDark hover:border-brand-gold/40 transition-all duration-300"
              >
                <span class="block text-white font-bold">
                  ${gender.label}
                </span>
              </button>
            `
          )
          .join("");
    };

  /**
   * بناء اختيارات العائلات
   */
  const renderQuizFamilyOptions =
    () => {
      if (!quizFamilyOptions) {
        return;
      }

      quizFamilyOptions.innerHTML =
        fragranceFamilies
          .map(
            (family) => `
              <button
                type="button"
                data-quiz-family="${family}"
                class="quiz-family-option group p-4 rounded-2xl border border-brand-gold/10 bg-brand-emeraldDark hover:border-brand-gold/40 transition-all duration-300"
              >
                <span class="w-10 h-10 mx-auto mb-2 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                  <i class="${
                    familyIcons[
                      family
                    ] ||
                    "fa-solid fa-sparkles"
                  } text-brand-gold"></i>
                </span>

                <span class="block text-white font-bold">
                  ${family}
                </span>
              </button>
            `
          )
          .join("");
    };

  /**
   * اختيار النوع
   */
  quizGenderOptions?.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-quiz-gender]"
        );

      if (!button) {
        return;
      }

      selectedGender =
        button.dataset.quizGender;

      document
        .querySelectorAll(
          "[data-quiz-gender]"
        )
        .forEach((item) => {
          item.classList.remove(
            "border-brand-gold",
            "bg-brand-gold/10"
          );
        });

      button.classList.add(
        "border-brand-gold",
        "bg-brand-gold/10"
      );

      showQuizStep(2);
    }
  );

  /**
   * اختيار العائلة
   */
  quizFamilyOptions?.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-quiz-family]"
        );

      if (!button) {
        return;
      }

      selectedFamily =
        button.dataset.quizFamily;

      document
        .querySelectorAll(
          "[data-quiz-family]"
        )
        .forEach((item) => {
          item.classList.remove(
            "border-brand-gold",
            "bg-brand-gold/10"
          );
        });

      button.classList.add(
        "border-brand-gold",
        "bg-brand-gold/10"
      );

      showQuizStep(3);
    }
  );

  /**
   * اختيار الـ Vibe
   */
  quizVibeOptions?.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-quiz-vibe]"
        );

      if (!button) {
        return;
      }

      selectedVibe =
        button.dataset.quizVibe;

      showQuizResult();
    }
  );

  /**
   * حساب نتيجة الـ Quiz
   */
  const getQuizResult = () => {
    if (!perfumeCatalog.length) {
      return null;
    }

    const scoredProducts =
      perfumeCatalog.map(
        (perfume) => {
          let score = 0;

          if (
            selectedGender &&
            perfume.gender ===
              selectedGender
          ) {
            score += 5;
          }

          if (
            selectedFamily &&
            Array.isArray(
              perfume.families
            ) &&
            perfume.families.includes(
              selectedFamily
            )
          ) {
            score += 5;
          }

          if (
            selectedVibe &&
            Array.isArray(
              vibeFamilyMap[
                selectedVibe
              ]
            )
          ) {
            const matches =
              vibeFamilyMap[
                selectedVibe
              ].filter(
                (family) =>
                  Array.isArray(
                    perfume.families
                  ) &&
                  perfume.families.includes(
                    family
                  )
              ).length;

            score += matches * 2;
          }

          if (
            perfume.isFeatured
          ) {
            score += 1;
          }

          if (
            perfume.isBestseller
          ) {
            score += 1;
          }

          return {
            perfume,
            score,
          };
        }
      );

    scoredProducts.sort(
      (a, b) =>
        b.score - a.score
    );

    return (
      scoredProducts[0]
        ?.perfume || null
    );
  };

  /**
   * عرض نتيجة الـ Quiz
   */
  const showQuizResult = () => {
    selectedPerfume =
      getQuizResult();

    if (!selectedPerfume) {
      return;
    }

    if (quizResult) {
      quizResult.classList.remove(
        "hidden"
      );
    }

    if (quizResultCard) {
      const image =
        selectedPerfume.image
          ? selectedPerfume.image.startsWith(
              "../"
            ) ||
            selectedPerfume.image.startsWith(
              "./"
            ) ||
            selectedPerfume.image.startsWith(
              "/"
            )
            ? selectedPerfume.image
            : selectedPerfume.image
          : "";

      quizResultCard.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">

          <div class="overflow-hidden rounded-2xl">
            <img
              src="${image}"
              alt="${selectedPerfume.name}"
              class="w-full h-72 object-cover"
              onerror="this.onerror=null;this.src='assets/img/evora.jpeg';"
            />
          </div>

          <div>
            <p class="text-brand-gold text-sm mb-2">
              العطر المقترح لك
            </p>

            <h3 class="text-2xl md:text-3xl font-bold text-white">
              ${selectedPerfume.name}
            </h3>

            <p class="text-white/50 mt-1">
              ${selectedPerfume.latin || ""}
            </p>

            <p class="text-white/70 mt-4 leading-8">
              ${selectedPerfume.desc || ""}
            </p>

            <p class="text-brand-gold text-xl font-bold mt-5">
              ${Number(
                selectedPerfume.price || 0
              ).toLocaleString(
                "ar-EG"
              )} ج.م
            </p>
          </div>

        </div>
      `;

      quizResultCard
        .querySelector("img")
        ?.setAttribute(
          "src",
          getMainPageImage(
            selectedPerfume.image
          )
        );
    }

    if (
      quizResult &&
      quizResult.scrollIntoView
    ) {
      quizResult.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  /**
   * زر إضافة نتيجة الاختبار للسلة
   */
  quizAddToCartBtn?.addEventListener(
    "click",
    () => {
      if (!selectedPerfume) {
        return;
      }

      const added =
        addProductToCart(
          selectedPerfume,
          1
        );

      if (added) {
        showMainToast(
          `تمت إضافة ${selectedPerfume.name} إلى السلة`
        );
      }
    }
  );

  // =========================================================
  // 10. BESTSELLERS
  // =========================================================

  const getMainPageImage = (
    image
  ) => {
    if (!image) {
      return "assets/img/evora.jpeg";
    }

    if (
      image.startsWith("../")
    ) {
      return image.replace(
        "../",
        ""
      );
    }

    if (
      image.startsWith("./")
    ) {
      return image.replace(
        "./",
        ""
      );
    }

    if (
      image.startsWith("/")
    ) {
      return image.substring(1);
    }

    return image;
  };

  const renderBestsellers = () => {
    if (!bestsellersGrid) {
      return;
    }

    const bestsellers =
      perfumeCatalog
        .filter(
          (perfume) =>
            perfume.isBestseller ===
            true
        )
        .slice(0, 4);

    bestsellersGrid.innerHTML =
      bestsellers
        .map(
          (perfume) => `
            <article
              class="group relative overflow-hidden rounded-2xl bg-brand-emeraldDark border border-brand-gold/10 hover:border-brand-gold/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
            >

              <div class="relative aspect-[4/5] overflow-hidden">

                <img
                  src="${getMainPageImage(
                    perfume.image
                  )}"
                  alt="${perfume.name}"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  onerror="this.onerror=null;this.src='assets/img/evora.jpeg';"
                />

                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

                <span class="absolute top-4 right-4 px-3 py-1 rounded-full bg-brand-gold text-brand-emeraldDark text-xs font-bold">
                  الأكثر مبيعًا
                </span>

              </div>

              <div class="p-5">

                <h3 class="text-lg font-bold text-white">
                  ${perfume.name}
                </h3>

                <p class="text-sm text-white/40 mt-1">
                  ${perfume.latin || ""}
                </p>

                <div class="flex flex-wrap gap-1.5 mt-3">
                  ${
                    Array.isArray(
                      perfume.families
                    )
                      ? perfume.families
                          .map(
                            (family) => `
                              <span class="px-2 py-1 rounded-lg bg-brand-gold/5 border border-brand-gold/10 text-brand-gold text-[11px]">
                                ${family}
                              </span>
                            `
                          )
                          .join("")
                      : ""
                  }
                </div>

                <div class="flex items-center justify-between gap-3 mt-5">

                  <span class="text-lg font-bold text-brand-gold">
                    ${Number(
                      perfume.price || 0
                    ).toLocaleString(
                      "ar-EG"
                    )} ج.م
                  </span>

                  <div class="flex items-center gap-2">

                    <button
                      type="button"
                      data-bestseller-details="${perfume.id}"
                      class="bestseller-details-btn w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-xl border border-brand-gold/20 text-brand-gold hover:bg-brand-gold hover:text-brand-emeraldDark transition-all"
                      aria-label="تفاصيل المنتج"
                    >
                      <i class="fa-solid fa-eye"></i>
                    </button>

                    <button
                      type="button"
                      data-bestseller-add="${perfume.id}"
                      class="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-xl bg-brand-gold text-brand-emeraldDark hover:scale-105 transition-all"
                      aria-label="إضافة إلى السلة"
                    >
                      <i class="fa-solid fa-cart-plus"></i>
                    </button>

                  </div>

                </div>

              </div>

            </article>
          `
        )
        .join("");
  };

  bestsellersGrid?.addEventListener(
    "click",
    (event) => {
      const detailsButton =
        event.target.closest(
          "[data-bestseller-details]"
        );

      const addButton =
        event.target.closest(
          "[data-bestseller-add]"
        );

      if (detailsButton) {
        openProductPage(
          detailsButton.dataset
            .bestsellerDetails
        );

        return;
      }

      if (addButton) {
        const product =
          perfumeCatalog.find(
            (item) =>
              String(item.id) ===
              String(
                addButton.dataset
                  .bestsellerAdd
              )
          );

        if (!product) {
          return;
        }

        const added =
          addProductToCart(
            product,
            1
          );

        if (added) {
          showMainToast(
            `تمت إضافة ${product.name} إلى السلة`
          );
        }
      }
    }
  );

  // =========================================================
  // 11. FAMILY FILTER NAVIGATION
  // =========================================================

  window.filterByFamily = (
    family
  ) => {
    if (!family) {
      return;
    }

    window.location.href =
      `pages/shop.html?family=${encodeURIComponent(
        family
      )}`;
  };

  // =========================================================
  // 12. CART EVENTS
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
  // 13. TOAST
  // =========================================================

  const showMainToast = (
    message
  ) => {
    let container =
      document.getElementById(
        "main-toast-container"
      );

    if (!container) {
      container =
        document.createElement(
          "div"
        );

      container.id =
        "main-toast-container";

      container.className =
        "fixed bottom-5 left-5 z-[9999] flex flex-col gap-2";

      document.body.appendChild(
        container
      );
    }

    const toast =
      document.createElement("div");

    toast.className =
      "px-5 py-3 rounded-xl bg-brand-emeraldDark border border-brand-gold/20 text-white shadow-2xl text-sm";

    toast.textContent = message;

    container.appendChild(toast);

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
  // 14. EXPOSE GLOBAL DATA
  // =========================================================

  window.evoraPerfumes =
    perfumeCatalog;

  window.evoraFragranceFamilies =
    fragranceFamilies;

  window.evoraGenders =
    genders;

  window.evoraTiers =
    tiers;

  // =========================================================
  // 15. INITIALIZE
  // =========================================================

  renderQuizGenderOptions();

  renderQuizFamilyOptions();

  renderBestsellers();

  updateCartBadge();

  console.log(
    "ÉVORA main.js initialized successfully."
  );
});