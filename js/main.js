document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // CONSTANTS
  // =========================================================
  const CART_KEY = "evora_cart";
  const WA_NUMBER = "201151275116"; // 01151275116
  const FALLBACK_IMG = "assets/img/evora.jpeg";
  const TOTAL_STEPS = 4;
  const STEP_LABELS = ["النوع", "العائلة", "الإحساس", "المناسبة"];
  const MAX_SCORE = 22; // للـ match percentage

  // =========================================================
  // HELPERS
  // =========================================================
  const getProductImage = (path) => {
    if (!path) return FALLBACK_IMG;
    if (
      path.startsWith("./") ||
      path.startsWith("/") ||
      path.startsWith("http")
    )
      return path;
    return path;
  };

  const escapeAttr = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const formatPrice = (p) => Number(p || 0).toLocaleString("ar-EG");

  const getColsClass = (n) => {
    if (n >= 4) return "grid-cols-4";
    if (n === 3) return "grid-cols-3";
    return "grid-cols-2";
  };

  // =========================================================
  // LOAD JSON
  // =========================================================
  let perfumeCatalog = [];
  let fragranceFamilies = [];
  let genders = [];
  let tiers = [];
  let sizesCatalog = [];
  let occasionsCatalog = [];

  try {
    const res = await fetch("data/perfumes.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    perfumeCatalog = Array.isArray(data.products) ? data.products : [];
    fragranceFamilies = Array.isArray(data.fragranceFamilies)
      ? data.fragranceFamilies
      : [];
    genders = Array.isArray(data.genders) ? data.genders : [];
    tiers = Array.isArray(data.tiers) ? data.tiers : [];
    sizesCatalog = Array.isArray(data.sizes) ? data.sizes : [];
    occasionsCatalog = Array.isArray(data.occasions) ? data.occasions : [];
  } catch (e) {
    console.error("ÉVORA: Failed to load perfumes.json.", e);
    return;
  }

  // =========================================================
  // SIZE RESOLUTION
  // =========================================================
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

  // =========================================================
  // CART
  // =========================================================
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
    window.dispatchEvent(new CustomEvent("evora:cart-updated"));
    updateCartBadge();
  };

  const getCartCount = () =>
    getCart().reduce((t, i) => t + (Number(i.qty) || 0), 0);

  const updateCartBadge = () => {
    const n = getCartCount();
    document.querySelectorAll(".cart-badge, #nav-cart-count").forEach((b) => {
      b.textContent = n;
      b.classList.toggle("hidden", n === 0);
    });
  };

  const addToCart = (productId, qty = 1, size = null) => {
    const product = perfumeCatalog.find(
      (p) => String(p.id) === String(productId),
    );
    if (!product) {
      console.warn("ÉVORA: product not found:", productId);
      return false;
    }

    const q = Math.max(1, Number(qty) || 1);
    const chosenSize = size || pickDefaultSize(product);
    const sizeMl = chosenSize?.ml ?? null;
    const sizePrice = chosenSize?.price ?? product.price ?? 0;
    const lineId = sizeMl ? `${product.id}__${sizeMl}` : String(product.id);

    const cart = getCart();
    const existing = cart.find((c) => {
      const cLine = c.lineId || (c.size ? `${c.id}__${c.size}` : String(c.id));
      return cLine === lineId;
    });

    if (existing) {
      existing.qty = (Number(existing.qty) || 0) + q;
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
    return true;
  };

  window.EvoraCart = {
    getCart,
    saveCart,
    addToCart,
    updateCartBadge,
    resolveSizes,
    pickDefaultSize,
  };
  window.addToCart = addToCart;

  // =========================================================
  // TOAST
  // =========================================================
  const showToast = (msg) => {
    let c = document.getElementById("main-toast-container");
    if (!c) {
      c = document.createElement("div");
      c.id = "main-toast-container";
      c.className = "fixed bottom-5 left-5 z-[9999] flex flex-col gap-2";
      document.body.appendChild(c);
    }
    const t = document.createElement("div");
    t.className =
      "px-5 py-3 rounded-xl bg-brand-emeraldDark border border-brand-gold/20 text-white shadow-2xl text-sm transition-all duration-300";
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => {
      t.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => t.remove(), 300);
    }, 2200);
  };

  // =========================================================
  // MOBILE MENU
  // =========================================================
  const menuBtn =
    document.getElementById("menu-btn") ||
    document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  menuBtn?.addEventListener("click", () =>
    mobileMenu?.classList.toggle("hidden"),
  );
  mobileMenu
    ?.querySelectorAll("a")
    .forEach((a) =>
      a.addEventListener("click", () => mobileMenu.classList.add("hidden")),
    );

  // =========================================================
  // SMOOTH ANCHORS
  // =========================================================
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // =========================================================
  // QUIZ — DOM REFS
  // =========================================================
  const QS = {
    steps: {
      1: document.getElementById("step-1"),
      2: document.getElementById("step-2"),
      3: document.getElementById("step-3"),
      4: document.getElementById("step-4"),
    },
    result: document.getElementById("quiz-result-step"),
    loading: document.getElementById("quiz-loading"),
    loadingText: document.getElementById("quiz-loading-text"),
    resultBox: document.getElementById("quiz-top-results"),
    progress: document.getElementById("progress-bar-fill"),
    indicator: document.getElementById("step-indicator-text"),
    percentage: document.getElementById("step-percentage"),
    stepper: document.getElementById("quiz-stepper"),
    prev: document.getElementById("prev-btn"),
    next: document.getElementById("next-btn"),
    familyBox: document.getElementById("quiz-family-options"),
    occasionBox: document.getElementById("quiz-occasion-options"),
    restartBtn: document.getElementById("quiz-restart-button"),
  };

  // =========================================================
  // QUIZ — STATE
  // =========================================================
  const state = {
    step: 1,
    gender: null,
    family: null,
    vibe: null,
    occasion: null,
  };

  // =========================================================
  // QUIZ — STEPPER RENDER
  // =========================================================
  const renderStepper = () => {
    if (!QS.stepper) return;
    QS.stepper.innerHTML = STEP_LABELS.map((label, i) => {
      const n = i + 1;
      const isDone = n < state.step;
      const isActive = n === state.step;

      const circleClass = isDone
        ? "bg-brand-gold border-brand-gold text-brand-emeraldDark"
        : isActive
          ? "bg-brand-gold/20 border-brand-gold text-brand-gold shadow-lg shadow-brand-gold/30"
          : "bg-brand-emerald/40 border-brand-gold/20 text-brand-cream/40";

      const labelClass = isActive
        ? "text-brand-gold"
        : isDone
          ? "text-brand-gold/70"
          : "text-brand-cream/40";

      return `
        <div class="flex flex-col items-center gap-1.5">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${circleClass}">
            ${isDone ? '<i class="fa-solid fa-check text-[10px]"></i>' : n}
          </div>
          <span class="text-[10px] font-bold transition-colors ${labelClass}">${label}</span>
        </div>
      `;
    }).join("");
  };

  // =========================================================
  // QUIZ — UPDATE UI
  // =========================================================
  const updateQuizUI = () => {
    Object.entries(QS.steps).forEach(([n, el]) =>
      el?.classList.toggle("hidden", Number(n) !== state.step),
    );
    QS.loading?.classList.add("hidden");
    QS.result?.classList.add("hidden");

    if (QS.indicator)
      QS.indicator.textContent = `السؤال ${state.step} من ${TOTAL_STEPS}`;
    if (QS.percentage)
      QS.percentage.textContent = `${Math.round(
        (state.step / TOTAL_STEPS) * 100,
      )}%`;
    if (QS.progress)
      QS.progress.style.width = `${(state.step / TOTAL_STEPS) * 100}%`;

    if (QS.prev) QS.prev.classList.toggle("invisible", state.step === 1);
    if (QS.next) QS.next.classList.remove("hidden");

    const hasSelection =
      (state.step === 1 && state.gender) ||
      (state.step === 2 && state.family) ||
      (state.step === 3 && state.vibe) ||
      (state.step === 4 && state.occasion);

    if (QS.next) {
      QS.next.disabled = !hasSelection;
      QS.next.classList.toggle("bg-brand-gold", hasSelection);
      QS.next.classList.toggle("bg-brand-gold/30", !hasSelection);
      QS.next.classList.toggle("cursor-not-allowed", !hasSelection);

      const btnText = QS.next.querySelector("span");
      if (btnText) {
        btnText.textContent =
          state.step === TOTAL_STEPS ? "اعرض النتيجة" : "التالي";
      }
    }

    renderStepper();
  };

  // =========================================================
  // QUIZ — SELECTION UI
  // =========================================================
  const paintSelection = (el) => {
    if (!el) return;
    const parent = el.parentElement;
    if (parent) {
      parent.querySelectorAll("button").forEach((b) => {
        b.classList.remove("border-brand-gold", "bg-brand-gold/10");
        b.querySelector(".check-icon")?.classList.add("hidden");
      });
    }
    el.classList.add("border-brand-gold", "bg-brand-gold/10");
    el.querySelector(".check-icon")?.classList.remove("hidden");
  };

  const selectOption = (step, value, el) => {
    if (step === 1) state.gender = value;
    if (step === 2) state.family = value;
    if (step === 3) state.vibe = value;
    if (step === 4) state.occasion = value;
    paintSelection(el);
    updateQuizUI();
  };

  window.selectOptionUI = (step, el) =>
    selectOption(step, el.dataset.value, el);

  // Step 1
  document.querySelectorAll(".opt-btn-1").forEach((btn) =>
    btn.addEventListener("click", () =>
      selectOption(1, btn.dataset.value, btn),
    ),
  );

  // =========================================================
  // QUIZ — FAMILIES RENDER
  // =========================================================
  const renderQuizFamilies = () => {
    if (!QS.familyBox) return;
    QS.familyBox.innerHTML = fragranceFamilies
      .map(
        (f) => `
      <button type="button" data-value="${escapeAttr(f)}"
        class="opt-btn-2 group relative p-4 rounded-xl border border-brand-gold/20 bg-brand-emerald/40 hover:border-brand-gold/60 text-sm font-semibold text-brand-cream transition-all flex items-center justify-center gap-2">
        <span>${escapeAttr(f)}</span>
        <i class="fa-solid fa-check check-icon hidden text-brand-gold text-xs mr-auto"></i>
      </button>`,
      )
      .join("");

    QS.familyBox
      .querySelectorAll(".opt-btn-2")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          selectOption(2, btn.dataset.value, btn),
        ),
      );
  };
  renderQuizFamilies();

  // =========================================================
  // QUIZ — OCCASIONS RENDER (NEW)
  // =========================================================
  const renderQuizOccasions = () => {
    if (!QS.occasionBox) return;

    const occ = occasionsCatalog.length
      ? occasionsCatalog
      : [
          { id: "daily", label: "استخدام يومي", icon: "fa-sun", families: ["منعش", "زهري"] },
          { id: "work", label: "العمل / الرسمي", icon: "fa-briefcase", families: ["خشبي", "زهري"] },
          { id: "date", label: "مناسبة زوجية ", icon: "fa-heart", families: ["حلو", "شرقي", "زهري"] },
          { id: "evening", label: "سهرة / مناسبات", icon: "fa-moon", families: ["عودي", "دخاني", "شرقي"] },
          { id: "summer", label: "صيف / انتعاش", icon: "fa-umbrella-beach", families: ["منعش", "حلو"] },
          { id: "winter", label: "شتاء / دفء", icon: "fa-snowflake", families: ["عودي", "دخاني", "حلو"] },
        ];

    QS.occasionBox.innerHTML = occ
      .map(
        (o) => `
      <button type="button" data-value="${escapeAttr(o.id)}"
        class="opt-btn-4 group relative p-4 rounded-xl border border-brand-gold/20 bg-brand-emerald/40 hover:border-brand-gold/60 text-sm font-semibold text-brand-cream transition-all flex items-center justify-center gap-2 text-center">
        <i class="fa-solid ${escapeAttr(o.icon || "fa-star")} text-brand-gold"></i>
        <span>${escapeAttr(o.label)}</span>
        <i class="fa-solid fa-check check-icon hidden text-brand-gold text-xs mr-auto"></i>
      </button>`,
      )
      .join("");

    QS.occasionBox
      .querySelectorAll(".opt-btn-4")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          selectOption(4, btn.dataset.value, btn),
        ),
      );
  };
  renderQuizOccasions();

  // =========================================================
  // QUIZ — NAVIGATION
  // =========================================================
  QS.next?.addEventListener("click", () => {
    if (state.step < TOTAL_STEPS) {
      state.step++;
      updateQuizUI();
    } else {
      showQuizResult();
    }
  });

  QS.prev?.addEventListener("click", () => {
    if (state.step > 1) {
      state.step--;
      updateQuizUI();
    }
  });

  // =========================================================
  // QUIZ — VIBE MAP
  // =========================================================
  const VIBE_MAP = {
    elegant: ["زهري", "حلو", "شرقي"],
    bold: ["خشبي", "دخاني", "عودي"],
    light: ["منعش", "زهري"],
    mysterious: ["شرقي", "دخاني", "عودي"],
  };

  // =========================================================
  // QUIZ — COMPUTE TOP 3
  // =========================================================
  const computeTop3 = () => {
    if (!perfumeCatalog.length) return [];

    const scored = perfumeCatalog.map((p) => {
      let score = 0;
      const reasons = [];

      // Gender
      if (state.gender) {
        if (p.gender === state.gender) {
          score += 5;
          reasons.push("يناسب النوع المختار");
        } else if (p.gender === "unisex") {
          score += 2;
          reasons.push("يناسب الجميع");
        }
      }

      // Family
      if (state.family && p.families?.includes(state.family)) {
        score += 5;
        reasons.push(`من عائلة ${state.family}`);
      }

      // Vibe
      if (state.vibe && VIBE_MAP[state.vibe]) {
        const matches = VIBE_MAP[state.vibe].filter((f) =>
          p.families?.includes(f),
        ).length;
        if (matches) {
          score += matches * 3;
          reasons.push("يطابق إحساسك المفضل");
        }
      }

      // Occasion
      if (state.occasion) {
        const occ = occasionsCatalog.find((o) => o.id === state.occasion);
        if (occ && Array.isArray(occ.families)) {
          const matches = occ.families.filter((f) =>
            p.families?.includes(f),
          ).length;
          if (matches) {
            score += matches * 2;
            reasons.push(`مناسب لـ${occ.label}`);
          }
        }
      }

      // Bonuses
      if (p.isFeatured) score += 1;
      if (p.isBestseller) score += 1;

      return { p, score, reasons };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).filter((r) => r.score > 0);
  };

  // =========================================================
  // QUIZ — RENDER TOP RESULTS
  // =========================================================
  const renderTopResults = (results) => {
    if (!QS.resultBox) return;

    const rankColors = [
      "from-yellow-400 to-yellow-600",
      "from-gray-300 to-gray-500",
      "from-amber-600 to-amber-800",
    ];

    QS.resultBox.innerHTML = results
      .map((r, i) => {
        const p = r.p;
        const rank = i + 1;
        const matchPercent = Math.min(
          98,
          Math.round((r.score / MAX_SCORE) * 100),
        );
        const sizes = resolveSizes(p);
        const defaultSize = pickDefaultSize(p);
        const initialPrice = defaultSize?.price ?? (Number(p.price) || 0);
        const hasMultipleSizes = sizes.length > 1;

        const sizeChips = hasMultipleSizes
          ? `
            <div class="grid ${getColsClass(sizes.length)} gap-1.5 mt-2">
              ${sizes
                .map((s) => {
                  const isActive = defaultSize?.ml === s.ml;
                  const isOut = s.inStock === false;
                  return `
                    <button type="button" data-result-size="${s.ml}"
                      class="min-w-0 h-9 px-1 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center leading-none ${
                        isActive
                          ? "bg-brand-gold text-brand-emeraldDark border-brand-gold"
                          : "bg-brand-emerald/40 text-brand-cream/70 border-brand-gold/20 hover:border-brand-gold/60"
                      } ${isOut ? "opacity-30 cursor-not-allowed" : ""}"
                      ${isOut ? "disabled" : ""}>
                      <span>${s.ml}</span>
                      <span class="text-[8px] opacity-70 mt-0.5">مل</span>
                    </button>`;
                })
                .join("")}
            </div>`
          : "";

        const reasonsBadges = r.reasons
          .slice(0, 3)
          .map(
            (reason) =>
              `<span class="px-2 py-0.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[10px] font-semibold">${escapeAttr(
                reason,
              )}</span>`,
          )
          .join("");

        return `
          <article class="relative overflow-hidden rounded-2xl bg-brand-emeraldDark border border-brand-gold/20 hover:border-brand-gold/50 transition-all duration-300 hover:-translate-y-1 shadow-xl flex flex-col"
            data-result-product-id="${escapeAttr(p.id)}"
            data-result-selected-size="${defaultSize?.ml ?? ""}">

            <!-- Rank -->
            <div class="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-gradient-to-br ${
              rankColors[i] || rankColors[2]
            } flex items-center justify-center text-brand-emeraldDark font-black text-sm shadow-lg">
              ${rank}
            </div>

            <!-- Image -->
            <a href="product.html?id=${encodeURIComponent(
              p.id,
            )}" class="block relative aspect-[4/5] overflow-hidden">
              <img src="${escapeAttr(getProductImage(p.image))}" alt="${escapeAttr(p.name)}"
                class="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
                onerror="this.onerror=null;this.src='${FALLBACK_IMG}';" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
            </a>

            <div class="p-4 space-y-2 flex-1 flex flex-col">
              <div>
                <h4 class="text-base font-bold text-white line-clamp-1">${escapeAttr(p.name)}</h4>
                <p class="text-[11px] text-white/40 line-clamp-1">${escapeAttr(p.latin || "")}</p>
              </div>

              <!-- Match bar -->
              <div class="space-y-1">
                <div class="flex items-center justify-between text-[10px]">
                  <span class="text-brand-cream/60">نسبة التطابق</span>
                  <span class="text-brand-gold font-bold">${matchPercent}%</span>
                </div>
                <div class="h-1.5 bg-brand-emerald/60 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-l from-brand-gold to-brand-goldLight transition-all duration-1000" style="width: ${matchPercent}%"></div>
                </div>
              </div>

              <!-- Reasons -->
              <div class="flex flex-wrap gap-1">${reasonsBadges}</div>

              <!-- Size chips -->
              ${sizeChips}

              <!-- Price -->
              <div class="flex items-baseline gap-1 pt-1" data-result-price-display>
                <span class="text-lg font-bold text-brand-gold">${formatPrice(
                  initialPrice,
                )} <span class="text-xs">ج.م</span></span>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 pt-2 mt-auto">
                <button type="button" data-result-add="${escapeAttr(p.id)}"
                  class="flex-1 bg-brand-gold hover:bg-brand-goldDark text-brand-emeraldDark font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95">
                  <i class="fa-solid fa-cart-plus"></i>
                  <span>أضف للسلة</span>
                </button>
                <a href="product.html?id=${encodeURIComponent(p.id)}"
                  class="w-10 h-10 flex items-center justify-center rounded-xl border border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-brand-emeraldDark transition-all"
                  aria-label="التفاصيل">
                  <i class="fa-solid fa-eye text-xs"></i>
                </a>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  };

  // =========================================================
  // QUIZ — SHOW RESULT (with loading animation)
  // =========================================================
  const showQuizResult = async () => {
    const top3 = computeTop3();
    if (!top3.length) {
      showToast("لا توجد منتجات لعرض نتيجة");
      return;
    }

    // Hide steps + show loading
    Object.values(QS.steps).forEach((el) => el?.classList.add("hidden"));
    QS.result?.classList.add("hidden");
    QS.loading?.classList.remove("hidden");
    QS.prev?.classList.add("invisible");
    QS.next?.classList.add("hidden");

    if (QS.indicator) QS.indicator.textContent = "النتيجة";
    if (QS.percentage) QS.percentage.textContent = "100%";
    if (QS.progress) QS.progress.style.width = "100%";
    renderStepper();

    // Cycle loading messages
    const loadingTexts = [
      "نقارن اختياراتك مع مجموعتنا...",
      "نحسب درجة التطابق...",
      "نختار أفضل 3 عطور لك...",
    ];
    let idx = 0;
    if (QS.loadingText) QS.loadingText.textContent = loadingTexts[0];

    const interval = setInterval(() => {
      idx = (idx + 1) % loadingTexts.length;
      if (QS.loadingText) QS.loadingText.textContent = loadingTexts[idx];
    }, 500);

    await new Promise((r) => setTimeout(r, 1500));
    clearInterval(interval);

    QS.loading?.classList.add("hidden");
    QS.result?.classList.remove("hidden");
    renderTopResults(top3);

    QS.result?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // =========================================================
  // QUIZ — RESULT CARD EVENTS (size chips + add to cart)
  // =========================================================
  QS.resultBox?.addEventListener("click", (e) => {
    // 1) Size chip click
    const sizeBtn = e.target.closest("[data-result-size]");
    if (sizeBtn) {
      e.preventDefault();
      const card = sizeBtn.closest("[data-result-product-id]");
      if (!card) return;

      const sizeMl = Number(sizeBtn.dataset.resultSize);
      const productId = card.dataset.resultProductId;
      const product = perfumeCatalog.find(
        (p) => String(p.id) === String(productId),
      );
      if (!product) return;

      const sizes = resolveSizes(product);
      const sizeObj = sizes.find((s) => Number(s.ml) === sizeMl);
      if (!sizeObj || sizeObj.inStock === false) return;

      // Update active chip
      card.querySelectorAll("[data-result-size]").forEach((b) => {
        const active = Number(b.dataset.resultSize) === sizeMl;
        b.classList.toggle("bg-brand-gold", active);
        b.classList.toggle("text-brand-emeraldDark", active);
        b.classList.toggle("border-brand-gold", active);
        b.classList.toggle("bg-brand-emerald/40", !active);
        b.classList.toggle("text-brand-cream/70", !active);
        b.classList.toggle("border-brand-gold/20", !active);
      });

      card.dataset.resultSelectedSize = sizeMl;

      // Update price display
      const priceEl = card.querySelector("[data-result-price-display]");
      if (priceEl) {
        priceEl.innerHTML = `<span class="text-lg font-bold text-brand-gold">${formatPrice(
          sizeObj.price,
        )} <span class="text-xs">ج.م</span></span>`;
      }
      return;
    }

    // 2) Add to cart click
    const addBtn = e.target.closest("[data-result-add]");
    if (addBtn) {
      const card = addBtn.closest("[data-result-product-id]");
      if (!card) return;

      const productId = card.dataset.resultProductId;
      const product = perfumeCatalog.find(
        (p) => String(p.id) === String(productId),
      );
      if (!product) return;

      const sizeMl = Number(card.dataset.resultSelectedSize);
      const sizes = resolveSizes(product);
      const sizeObj =
        sizes.find((s) => Number(s.ml) === sizeMl) || pickDefaultSize(product);

      if (addToCart(product.id, 1, sizeObj)) {
        const label = sizeObj?.ml ? ` (${sizeObj.ml} مل)` : "";
        showToast(`تمت إضافة ${product.name}${label} إلى السلة`);
      }
    }
  });

  // =========================================================
  // QUIZ — RESTART
  // =========================================================
  QS.restartBtn?.addEventListener("click", () => {
    state.step = 1;
    state.gender = null;
    state.family = null;
    state.vibe = null;
    state.occasion = null;

    document
      .querySelectorAll(
        "#quiz .opt-btn-1, #quiz .opt-btn-2, #quiz .opt-btn-3, #quiz .opt-btn-4",
      )
      .forEach((b) => {
        b.classList.remove("border-brand-gold", "bg-brand-gold/10");
        b.querySelector(".check-icon")?.classList.add("hidden");
      });

    QS.next?.classList.remove("hidden");
    updateQuizUI();
  });

  updateQuizUI();

  // =========================================================
  // BESTSELLERS
  // =========================================================
  const bestGrid = document.getElementById("bestsellers-grid");

  const renderBestsellers = () => {
    if (!bestGrid) return;
    const list = perfumeCatalog.filter((p) => p.isBestseller).slice(0, 4);

    bestGrid.innerHTML = list
      .map((p) => {
        const img = getProductImage(p.image);
        const sizes = resolveSizes(p);
        const minPrice = Math.min(
          ...sizes.map((s) => Number(s.price) || 0),
          Number(p.price) || 0,
        );
        const hasMultipleSizes = sizes.length > 1;

        return `
        <article class="group relative overflow-hidden rounded-2xl bg-brand-emeraldDark border border-brand-gold/10 hover:border-brand-gold/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
          <a href="product.html?id=${encodeURIComponent(p.id)}" class="block relative aspect-[4/5] overflow-hidden">
            <img src="${escapeAttr(img)}" alt="${escapeAttr(p.name)}"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              onerror="this.onerror=null;this.src='${FALLBACK_IMG}';" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
            <span class="absolute top-4 right-4 px-3 py-1 rounded-full bg-brand-gold text-brand-emeraldDark text-xs font-bold">الأكثر مبيعًا</span>
          </a>
          <div class="p-5">
            <h3 class="text-lg font-bold text-white">${escapeAttr(p.name)}</h3>
            <p class="text-sm text-white/40 mt-1">${escapeAttr(p.latin || "")}</p>
            <div class="flex flex-wrap gap-1.5 mt-3">
              ${(p.families || [])
                .map(
                  (f) =>
                    `<span class="px-2 py-1 rounded-lg bg-brand-gold/5 border border-brand-gold/10 text-brand-gold text-[11px]">${escapeAttr(f)}</span>`,
                )
                .join("")}
            </div>
            <div class="flex items-center justify-between gap-3 mt-5">
              <div class="flex items-baseline gap-1">
                ${hasMultipleSizes ? `<span class="text-[11px] text-brand-cream/60">من</span>` : ""}
                <span class="text-lg font-bold text-brand-gold">${formatPrice(minPrice)} ج.م</span>
              </div>
              <div class="flex items-center gap-2">
                <a href="product.html?id=${encodeURIComponent(p.id)}"
                  class="w-11 h-11 inline-flex items-center justify-center rounded-xl border border-brand-gold/20 text-brand-gold hover:bg-brand-gold hover:text-brand-emeraldDark transition-all"
                  aria-label="تفاصيل المنتج"><i class="fa-solid fa-eye"></i></a>
                <button type="button" data-add="${escapeAttr(p.id)}"
                  class="w-11 h-11 inline-flex items-center justify-center rounded-xl bg-brand-gold text-brand-emeraldDark hover:scale-105 transition-all"
                  aria-label="إضافة إلى السلة"><i class="fa-solid fa-cart-plus"></i></button>
              </div>
            </div>
          </div>
        </article>`;
      })
      .join("");
  };
  renderBestsellers();

  bestGrid?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    const p = perfumeCatalog.find(
      (x) => String(x.id) === String(btn.dataset.add),
    );
    if (!p) return;

    const defaultSz = pickDefaultSize(p);
    if (addToCart(p.id, 1, defaultSz)) {
      const label = defaultSz?.ml ? ` (${defaultSz.ml} مل)` : "";
      showToast(`تمت إضافة ${p.name}${label} إلى السلة`);
    }
  });

  // =========================================================
  // SIGNATURE PRODUCT
  // =========================================================
  const renderSignature = () => {
    const sig =
      perfumeCatalog.find((p) => p.id === "madawi") ||
      perfumeCatalog.find((p) => p.isFeatured) ||
      perfumeCatalog[0];

    if (!sig) return;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    const img = document.getElementById("signature-img");
    if (img) {
      img.src = getProductImage(sig.image);
      img.alt = sig.name;
      img.onerror = () => (img.src = FALLBACK_IMG);
    }

    set("signature-main-title", `${sig.name} — ${sig.latin || ""}`);
    set("signature-title", `${sig.name} — ${sig.latin || ""}`);
    set("signature-desc", sig.desc || "");
    set("signature-top-notes", (sig.notes?.top || []).join("، "));
    set("signature-heart-notes", (sig.notes?.heart || []).join("، "));
    set("signature-base-notes", (sig.notes?.base || []).join("، "));

    const sigSizes = resolveSizes(sig);
    const minPrice = Math.min(
      ...sigSizes.map((s) => Number(s.price) || 0),
      Number(sig.price) || 0,
    );
    const hasMultiple = sigSizes.length > 1;
    set(
      "signature-price",
      hasMultiple
        ? `من ${formatPrice(minPrice)} ج.م`
        : `${formatPrice(minPrice)} ج.م`,
    );

    const addBtn = document.getElementById("signature-add-btn");
    if (addBtn) {
      addBtn.onclick = () => {
        const defaultSz = pickDefaultSize(sig);
        if (addToCart(sig.id, 1, defaultSz)) {
          const label = defaultSz?.ml ? ` (${defaultSz.ml} مل)` : "";
          showToast(`تمت إضافة ${sig.name}${label} إلى السلة`);
        }
      };
    }

    const details = document.getElementById("signature-details-link");
    if (details)
      details.href = `product.html?id=${encodeURIComponent(sig.id)}`;
  };

  renderSignature();

  // =========================================================
  // FAMILY FILTER
  // =========================================================
  window.filterByFamily = (family) => {
    if (!family) return;
    window.location.href = `shop.html?family=${encodeURIComponent(family)}`;
  };

  // =========================================================
  // FOOTER WHATSAPP
  // =========================================================
  const waFooter = document.getElementById("footer-whatsapp");
  if (waFooter) waFooter.href = `https://wa.me/${WA_NUMBER}`;

  const phoneSpan = document.getElementById("footer-phone");
  if (phoneSpan) phoneSpan.textContent = "01151275116";

  // =========================================================
  // INIT
  // =========================================================
  updateCartBadge();
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY) updateCartBadge();
  });
  window.addEventListener("evora:cart-updated", updateCartBadge);

  console.log("ÉVORA main.js initialized.");
});