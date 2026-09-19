document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // CONSTANTS
  // =========================================================
  const CART_KEY = "evora_cart";
  const WA_NUMBER = "201151275116"; // 01151275116
  const FALLBACK_IMG = "../assets/img/evora.jpeg";

  // =========================================================
  // HELPERS
  // =========================================================
  const getProductImage = (path) => {
    if (!path) return FALLBACK_IMG;
    if (
      path.startsWith("../") ||
      path.startsWith("./") ||
      path.startsWith("/") ||
      path.startsWith("http")
    )
      return path;
    return `../${path}`;
  };

  const escapeAttr = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const formatPrice = (p) => Number(p || 0).toLocaleString("ar-EG");

  // =========================================================
  // LOAD JSON
  // =========================================================
  let perfumeCatalog = [];
  let fragranceFamilies = [];
  let genders = [];
  let tiers = [];

  try {
    const res = await fetch("../data/perfumes.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    perfumeCatalog = Array.isArray(data.products) ? data.products : [];
    fragranceFamilies = Array.isArray(data.fragranceFamilies) ? data.fragranceFamilies : [];
    genders = Array.isArray(data.genders) ? data.genders : [];
    tiers = Array.isArray(data.tiers) ? data.tiers : [];
  } catch (e) {
    console.error("ÉVORA: Failed to load perfumes.json.", e);
    return;
  }

  // =========================================================
  // CART
  // =========================================================
  const getCart = () => {
    try {
      const c = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(c) ? c : [];
    } catch { return []; }
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

  const addToCart = (productId, qty = 1) => {
    const product = perfumeCatalog.find(
      (p) => String(p.id) === String(productId)
    );
    if (!product) {
      console.warn("ÉVORA: product not found:", productId);
      return false;
    }
    const cart = getCart();
    const existing = cart.find((c) => String(c.id) === String(product.id));
    if (existing) existing.qty += Math.max(1, Number(qty) || 1);
    else cart.push({ id: product.id, qty: Math.max(1, Number(qty) || 1) });
    saveCart(cart);
    return true;
  };

  window.EvoraCart = { getCart, saveCart, addToCart, updateCartBadge };
  window.addToCart = addToCart; // compat

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
  const menuBtn = document.getElementById("menu-btn") || document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  menuBtn?.addEventListener("click", () => mobileMenu?.classList.toggle("hidden"));
  mobileMenu?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => mobileMenu.classList.add("hidden"))
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
  // QUIZ
  // =========================================================
  const QS = {
    steps: {
      1: document.getElementById("step-1"),
      2: document.getElementById("step-2"),
      3: document.getElementById("step-3"),
    },
    result: document.getElementById("quiz-result-step"),
    progress: document.getElementById("progress-bar-fill"),
    indicator: document.getElementById("step-indicator-text"),
    prev: document.getElementById("prev-btn"),
    next: document.getElementById("next-btn"),
    familyBox: document.getElementById("quiz-family-options"),
    resultWrap: document.getElementById("quiz-result-image-wrapper"),
    resultImg: document.getElementById("quiz-result-image"),
    resultName: document.getElementById("quiz-result-name"),
    resultLatin: document.getElementById("quiz-result-latin"),
    resultDesc: document.getElementById("quiz-result-description"),
    resultGender: document.getElementById("quiz-result-gender"),
    resultPrice: document.getElementById("quiz-result-price"),
    resultFamilies: document.getElementById("quiz-result-families"),
    addBtn: document.getElementById("quiz-add-to-cart"),
    restartBtn: document.getElementById("quiz-restart-button"),
  };

  const state = { step: 1, gender: null, family: null, vibe: null };
  let quizProduct = null;

  const updateQuizUI = () => {
    Object.entries(QS.steps).forEach(([n, el]) =>
      el?.classList.toggle("hidden", Number(n) !== state.step)
    );
    QS.result?.classList.add("hidden");

    if (QS.progress)
      QS.progress.style.width = `${(state.step / 3) * 100}%`;
    if (QS.indicator)
      QS.indicator.textContent = `السؤال ${state.step} من 3`;
    if (QS.prev) QS.prev.classList.toggle("invisible", state.step === 1);
    if (QS.next) QS.next.classList.remove("hidden");

    const hasSelection =
      (state.step === 1 && state.gender) ||
      (state.step === 2 && state.family) ||
      (state.step === 3 && state.vibe);

    if (QS.next) {
      QS.next.disabled = !hasSelection;
      QS.next.classList.toggle("bg-brand-gold", hasSelection);
      QS.next.classList.toggle("bg-brand-gold/30", !hasSelection);
      QS.next.classList.toggle("cursor-not-allowed", !hasSelection);
    }
  };

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
    paintSelection(el);
    updateQuizUI();
  };

  // Global for inline onclick (step 3 buttons in HTML)
  window.selectOptionUI = (step, el) => selectOption(step, el.dataset.value, el);

  // Step 1 buttons
  document.querySelectorAll(".opt-btn-1").forEach((btn) =>
    btn.addEventListener("click", () =>
      selectOption(1, btn.dataset.value, btn)
    )
  );

  // Render Step 2 family buttons dynamically
  const renderQuizFamilies = () => {
    if (!QS.familyBox) return;
    QS.familyBox.innerHTML = fragranceFamilies
      .map(
        (f) => `
      <button type="button" data-value="${escapeAttr(f)}"
        class="opt-btn-2 group relative p-4 rounded-xl border border-brand-gold/20 bg-brand-emerald/40 hover:border-brand-gold/60 text-sm font-semibold text-brand-cream transition-all flex items-center justify-center gap-2">
        <span>${escapeAttr(f)}</span>
        <i class="fa-solid fa-check check-icon hidden text-brand-gold text-xs mr-auto"></i>
      </button>`
      )
      .join("");

    QS.familyBox.querySelectorAll(".opt-btn-2").forEach((btn) =>
      btn.addEventListener("click", () =>
        selectOption(2, btn.dataset.value, btn)
      )
    );
  };
  renderQuizFamilies();

  // Navigation
  QS.next?.addEventListener("click", () => {
    if (state.step < 3) {
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

  // Scoring
  const VIBE_MAP = {
    elegant: ["زهري", "حلو", "شرقي"],
    bold: ["خشبي", "دخاني", "عودي"],
    light: ["منعش", "زهري"],
    mysterious: ["شرقي", "دخاني", "عودي"],
  };

  const computeResult = () => {
    if (!perfumeCatalog.length) return null;
    const scored = perfumeCatalog.map((p) => {
      let s = 0;
      if (state.gender && p.gender === state.gender) s += 5;
      if (state.family && p.families?.includes(state.family)) s += 5;
      if (state.vibe && VIBE_MAP[state.vibe]) {
        s += VIBE_MAP[state.vibe].filter((f) =>
          p.families?.includes(f)
        ).length * 2;
      }
      if (p.isFeatured) s += 1;
      if (p.isBestseller) s += 1;
      return { p, s };
    });
    scored.sort((a, b) => b.s - a.s);
    return scored[0]?.p || null;
  };

  const showQuizResult = () => {
    const product = computeResult();
    if (!product) {
      showToast("لا توجد منتجات لعرض نتيجة");
      return;
    }
    quizProduct = product;

    Object.values(QS.steps).forEach((el) => el?.classList.add("hidden"));
    QS.result?.classList.remove("hidden");
    QS.prev?.classList.add("invisible");
    QS.next?.classList.add("hidden");
    if (QS.indicator) QS.indicator.textContent = "النتيجة";
    if (QS.progress) QS.progress.style.width = "100%";

    if (QS.resultImg) {
      QS.resultImg.src = getProductImage(product.image);
      QS.resultImg.alt = product.name;
      QS.resultImg.onerror = () => (QS.resultImg.src = FALLBACK_IMG);
    }
    QS.resultWrap?.classList.remove("hidden");
    if (QS.resultName) QS.resultName.textContent = product.name || "";
    if (QS.resultLatin) QS.resultLatin.textContent = product.latin || "";
    if (QS.resultDesc) QS.resultDesc.textContent = product.desc || "";

    const gLabel =
      genders.find((g) => g.id === product.gender)?.label || product.gender;
    if (QS.resultGender) QS.resultGender.textContent = gLabel;
    if (QS.resultPrice)
      QS.resultPrice.textContent = `${formatPrice(product.price)} ج.م`;

    if (QS.resultFamilies) {
      QS.resultFamilies.innerHTML = (product.families || [])
        .map(
          (f) =>
            `<span class="px-2 py-1 rounded-lg bg-brand-gold/5 border border-brand-gold/10 text-brand-gold text-[11px]">${escapeAttr(f)}</span>`
        )
        .join("");
    }

    QS.result?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  QS.addBtn?.addEventListener("click", () => {
    if (!quizProduct) return;
    if (addToCart(quizProduct.id, 1))
      showToast(`تمت إضافة ${quizProduct.name} إلى السلة`);
  });

  QS.restartBtn?.addEventListener("click", () => {
    state.step = 1;
    state.gender = null;
    state.family = null;
    state.vibe = null;
    quizProduct = null;
    document
      .querySelectorAll("#quiz .opt-btn-1, #quiz .opt-btn-2, #quiz .opt-btn-3")
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
              ${(p.families || []).map((f) => `<span class="px-2 py-1 rounded-lg bg-brand-gold/5 border border-brand-gold/10 text-brand-gold text-[11px]">${escapeAttr(f)}</span>`).join("")}
            </div>
            <div class="flex items-center justify-between gap-3 mt-5">
              <span class="text-lg font-bold text-brand-gold">${formatPrice(p.price)} ج.م</span>
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
    const p = perfumeCatalog.find((x) => String(x.id) === String(btn.dataset.add));
    if (p && addToCart(p.id, 1)) showToast(`تمت إضافة ${p.name} إلى السلة`);
  });

  // =========================================================
  // SIGNATURE PRODUCT (dynamic from JSON)
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
    set("signature-title", `${sig.name} — ${sig.latin || ""}`);
    set("signature-desc", sig.desc || "");
    set("signature-top-notes", (sig.notes?.top || []).join("، "));
    set("signature-heart-notes", (sig.notes?.heart || []).join("، "));
    set("signature-base-notes", (sig.notes?.base || []).join("، "));
    set("signature-price", `${formatPrice(sig.price)} ج.م`);

    const addBtn = document.getElementById("signature-add-btn");
    if (addBtn) {
      addBtn.onclick = () => {
        if (addToCart(sig.id, 1)) showToast(`تمت إضافة ${sig.name} إلى السلة`);
      };
    }
    const details = document.getElementById("signature-details-link");
    if (details) details.href = `product.html?id=${encodeURIComponent(sig.id)}`;
  };
  renderSignature();

  // =========================================================
  // FAMILY FILTER (navigate to shop)
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