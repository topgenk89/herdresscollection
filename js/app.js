/* ============================================================
   Herdress Collection — shared data + interactions
   Sewa dress · checkout ke WhatsApp · produk dari Supabase
   ============================================================ */

/* PRODUCTS diisi saat runtime: dari Supabase bila tersedia,
   jika tidak pakai SEED_PRODUCTS (mode demo). */
let PRODUCTS = [];
let CATEGORIES = [];
let COLLECTIONS = [];
let MENU = [];

/* Preset rentang harga (dipakai menu & filter shop) */
const PRICE_PRESETS = {
  "0-100000": "Di bawah Rp100rb",
  "100000-200000": "Rp100rb – Rp200rb",
  "200000-400000": "Rp200rb – Rp400rb",
  "400000-": "Di atas Rp400rb",
};

/* Tag khusus yang tersedia */
const TAGS = {
  "hijab": "Hijab Friendly",
  "pregnant": "Pregnant Friendly",
};

/* Kategori bawaan (fallback saat Supabase belum ada tabel categories) */
const DEFAULT_CATEGORIES = [
  { slug: "pesta", name: "Gaun Pesta", ord: 1 },
  { slug: "kebaya", name: "Kebaya", ord: 2 },
  { slug: "bridesmaid", name: "Bridesmaid", ord: 3 },
  { slug: "pengantin", name: "Pengantin", ord: 4 },
];

const rupiah = n => "Rp" + Number(n || 0).toLocaleString("id-ID");

/* Minimal hari sewa (harga dasar produk = paket untuk durasi ini) */
window.MIN_RENTAL_DAYS = 4;
const MIN_RENTAL_DAYS = window.MIN_RENTAL_DAYS;

/* Hitung total sewa berbasis blok/paket (per 4 hari).
   Misal: 1-4 hari = 1x harga paket; 5-8 hari = 2x harga paket. */
function rentalTotal(basePrice, days) {
  const d = Math.max(1, parseInt(days, 10) || 1);
  const blocks = Math.ceil(d / MIN_RENTAL_DAYS);
  return Number(basePrice || 0) * blocks;
}

/* ---------- Muat kategori & koleksi ---------- */
async function loadTaxonomy() {
  // Kategori
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("categories").select("*").order("ord", { ascending: true });
      if (!error && data && data.length) CATEGORIES = data;
    } catch (err) { /* ignore */ }
    try {
      const { data, error } = await supabaseClient.from("collections").select("*").order("ord", { ascending: true });
      if (!error && data) COLLECTIONS = data;
    } catch (err) { /* ignore */ }
  }

  if (!CATEGORIES.length) {
    const localCat = JSON.parse(localStorage.getItem("terra_categories") || "null");
    CATEGORIES = localCat && localCat.length ? localCat : DEFAULT_CATEGORIES.slice();
  }
  if (!COLLECTIONS.length) {
    COLLECTIONS = JSON.parse(localStorage.getItem("terra_collections") || "[]");
  }
  return { CATEGORIES, COLLECTIONS };
}

/* Cari nama kategori dari slug */
function catName(slug) {
  const c = CATEGORIES.find(x => x.slug === slug);
  return c ? c.name : slug;
}

/* ---------- Menu Navigasi Dinamis ---------- */

/* Menu bawaan bila admin belum menyusun menu sendiri.
   Tipe item: 'link' (url langsung), 'cat', 'collection', 'tag', 'price', 'group' */
function defaultMenu() {
  const menu = [
    { label: "Beranda", type: "link", value: "index.html" },
    { label: "Katalog", type: "link", value: "shop.html" },
    { label: "Kategori", type: "group", children: CATEGORIES.map(c => ({ label: c.name, type: "cat", value: c.slug })) },
  ];
  // Tampilkan dropdown Koleksi hanya jika ada koleksi
  if (COLLECTIONS && COLLECTIONS.length) {
    menu.push({ label: "Collection", type: "group", children: COLLECTIONS.map(c => ({ label: c.name, type: "collection", value: c.slug })) });
  }
  return menu;
}

/* Pastikan menu selalu punya dropdown Kategori yang sinkron dengan database.
   Meski admin sudah menyimpan menu kustom, grup kategori tetap diperbarui
   agar kategori baru otomatis muncul di navigasi. */
function ensureCategoryMenu(menu) {
  if (!CATEGORIES || !CATEGORIES.length) return menu;
  const liveChildren = CATEGORIES.map(c => ({ label: c.name, type: "cat", value: c.slug }));
  // Cari grup yang isinya kategori (punya minimal 1 child bertipe 'cat')
  const catGroup = menu.find(m => m.type === "group" && (m.children || []).some(ch => ch.type === "cat"));
  if (catGroup) {
    catGroup.children = liveChildren; // segarkan isinya
  } else {
    // Sisipkan grup Kategori setelah item Katalog (atau di awal)
    const idx = menu.findIndex(m => m.type === "link" && (m.value || "").includes("shop"));
    const group = { label: "Kategori", type: "group", children: liveChildren };
    menu.splice(idx >= 0 ? idx + 1 : menu.length, 0, group);
  }
  return menu;
}

/* Ubah 1 item menu jadi URL tujuan */
function menuHref(item) {
  switch (item.type) {
    case "cat":        return `shop.html?cat=${item.value}`;
    case "collection": return `shop.html?collection=${item.value}`;
    case "tag":        return `shop.html?tag=${item.value}`;
    case "price":      return `shop.html?price=${item.value}`;
    case "link":       return item.value || "#";
    default:           return "#";
  }
}

async function loadMenu() {
  if (supabaseClient) {
    try {
      const { data } = await supabaseClient.from("settings").select("*").eq("id", "menu_json").maybeSingle();
      if (data && data.value) MENU = JSON.parse(data.value);
    } catch (err) { /* ignore */ }
  } else {
    const local = localStorage.getItem("terra_menu_json");
    if (local) { try { MENU = JSON.parse(local); } catch { MENU = []; } }
  }
  if (!MENU || !MENU.length) MENU = defaultMenu();
  MENU = ensureCategoryMenu(MENU);
  return MENU;
}

/* Render menu navigasi (desktop & mobile) dari MENU tree */
function renderNav() {
  // Desktop: item biasa jadi <a>, item bertipe group jadi dropdown
  document.querySelectorAll(".nav").forEach(nav => {
    nav.innerHTML = MENU.map(item => {
      if (item.type === "group" && item.children && item.children.length) {
        const sub = item.children.map(ch => `<a href="${menuHref(ch)}">${ch.label}</a>`).join("");
        return `<div class="nav-dd"><a href="#" class="nav-dd__trigger">${item.label} ▾</a><div class="nav-dd__menu">${sub}</div></div>`;
      }
      return `<a href="${menuHref(item)}">${item.label}</a>`;
    }).join("");
  });

  // Mobile: flat, group jadi label + sub-item
  document.querySelectorAll(".mobile-nav").forEach(mnav => {
    let html = `
      <div class="mobile-nav__head">
        <span class="mobile-nav__brand">HERDRESS</span>
        <button class="mobile-nav__close" aria-label="Tutup menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="mobile-nav__links">`;
    html += MENU.map(item => {
      if (item.type === "group" && item.children && item.children.length) {
        // Grup jadi accordion yang bisa dibuka-tutup
        const subLinks = item.children.map(ch => `<a href="${menuHref(ch)}">${ch.label}</a>`).join("");
        return `
          <div class="mobile-dd">
            <button class="mobile-dd__trigger" type="button">
              <span>${item.label}</span>
              <svg class="mobile-dd__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="mobile-dd__panel">${subLinks}</div>
          </div>`;
      }
      return `<a href="${menuHref(item)}">${item.label}</a>`;
    }).join("");
    html += `</div>`;
    mnav.innerHTML = html;
    mnav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => mnav.classList.remove("open")));
    mnav.querySelector(".mobile-nav__close")?.addEventListener("click", () => mnav.classList.remove("open"));
    // Toggle accordion dropdown
    mnav.querySelectorAll(".mobile-dd__trigger").forEach(btn => {
      btn.addEventListener("click", () => btn.closest(".mobile-dd").classList.toggle("open"));
    });
  });
}

/* ---------- Muat produk ---------- */
async function loadProducts() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("id", { ascending: true });
      if (error) throw error;
      if (data && data.length) {
        PRODUCTS = data.map(normalizeProduct);
        return PRODUCTS;
      }
    } catch (err) {
      console.warn("Gagal memuat dari Supabase, memakai data contoh:", err.message);
    }
  }

  // Fallback / demo (simpan di localStorage browser agar bisa dites lintas halaman)
  const localAdded = JSON.parse(localStorage.getItem("terra_demo_products") || "[]");
  const localDeleted = JSON.parse(localStorage.getItem("terra_demo_deleted") || "[]");

  const activeSeeds = SEED_PRODUCTS.filter(p => !localDeleted.includes(p.id));
  const combined = [...activeSeeds, ...localAdded];

  PRODUCTS = combined.map(normalizeProduct);
  return PRODUCTS;
}

/* Samakan bentuk data dari Supabase (kolom bisa berupa teks) */
function normalizeProduct(p) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand || "Herdress Collection",
    price: Number(p.price) || 0,
    extra_day: p.extra_day ? Number(p.extra_day) : 0,
    was: p.was ? Number(p.was) : null,
    cat: p.cat || "pesta",
    collection: p.collection || null,
    tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === "string" && p.tags ? p.tags.split(",").map(s=>s.trim()).filter(Boolean) : []),
    badge: p.badge || null,
    status: p.status || "tersedia",
    sizes: Array.isArray(p.sizes) ? p.sizes : (typeof p.sizes === "string" ? p.sizes.split(",").map(s=>s.trim()) : ["S","M","L"]),
    img: p.img || "https://placehold.co/700x900/E7DED2/2B2622?text=Dress",
    img_gallery: Array.isArray(p.img_gallery) ? p.img_gallery : [],
    alt: p.alt || p.img || "https://placehold.co/700x900/E7DED2/2B2622?text=Dress",
    demoData: p.demoData
  };
}

/* ---------- Kartu produk ---------- */
function cardHTML(p) {
  let badgeHTML = "";
  let isAvailable = (p.status === "tersedia");

  if (!isAvailable) {
    badgeHTML = `<span class="tag" style="background:#fbeecd; color:#8a5a12;">${p.status === 'disewa' ? 'Sedang Disewa' : 'Di-Laundry'}</span>`;
  } else if (p.badge) {
    badgeHTML = `<span class="tag ${p.badge === "Promo" ? "tag--sale" : ""}">${p.badge}</span>`;
  }

  const price = p.was
    ? `<div class="card__price"><s>${rupiah(p.was)}</s><span class="now">${rupiah(p.price)}</span> <small>/${MIN_RENTAL_DAYS} hari</small></div>`
    : `<div class="card__price">${rupiah(p.price)} <small>/${MIN_RENTAL_DAYS} hari</small></div>`;

  const quickSizes = isAvailable
    ? (p.sizes || []).slice(0,4).map(s => `<button data-add="${p.id}" data-size="${s}">${s}</button>`).join("")
    : `<span style="font-size:12px; color:var(--ink-soft); padding:8px;">Tidak Tersedia</span>`;

  return `
    <article class="card ${isAvailable ? '' : 'card--unavailable'}">
      <a href="product.html?id=${p.id}" class="card__media">
        ${badgeHTML}
        <img class="main" src="${p.img}" alt="${p.name}" loading="lazy" />
        <img class="alt" src="${p.alt}" alt="" loading="lazy" />
      </a>
      <button class="wish" aria-label="Simpan">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11Z"/></svg>
      </button>
      <div class="quick">
        ${quickSizes}
      </div>
      <a href="product.html?id=${p.id}" class="card__info">
        <span class="card__brand">${p.brand}</span>
        <span class="card__name">${p.name}</span>
        ${price}
      </a>
    </article>`;
}

function renderGrid(el, items) {
  if (el) el.innerHTML = items.map(cardHTML).join("");
}

/* ---------- Keranjang Sewa (localStorage) ---------- */
const Cart = {
  key: "terra_rental_cart",
  get() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } },
  save(c) { localStorage.setItem(this.key, JSON.stringify(c)); this.render(); },
  add(id, size = "M", qty = 1) {
    const p = PRODUCTS.find(x => x.id === +id); if (!p) return;
    const cart = this.get();
    const found = cart.find(i => i.id === p.id && i.size === size);
    if (found) found.qty += qty;
    else cart.push({ id: p.id, name: p.name, price: p.price, extra_day: p.extra_day || 0, img: p.img, size, qty });
    this.save(cart);
    openCart();
  },
  setQty(id, size, delta) {
    const cart = this.get();
    const it = cart.find(i => i.id === id && i.size === size); if (!it) return;
    it.qty += delta;
    this.save(it.qty <= 0 ? cart.filter(i => i !== it) : cart);
  },
  remove(id, size) { this.save(this.get().filter(i => !(i.id === id && i.size === size))); },
  clear() { this.save([]); },
  count() { return this.get().reduce((s, i) => s + i.qty, 0); },
  /* Total paket dasar (durasi minimal) untuk semua item */
  total() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },
  /* Total sesuai durasi (sistem kelipatan paket) untuk semua item */
  totalForDays(days) {
    return this.get().reduce((s, i) => s + rentalTotal(i.price, days) * i.qty, 0);
  },
  render() {
    const c = this.get();
    const badge = document.getElementById("cartCount");
    if (badge) badge.textContent = this.count();
    const body = document.getElementById("cartBody");
    const foot = document.getElementById("cartFoot");
    if (!body) return;
    if (!c.length) {
      body.innerHTML = `<div class="drawer__empty">Keranjang rental masih kosong.<br/>Yuk pilih dress impianmu.</div>`;
      if (foot) foot.hidden = true;
      return;
    }
    body.innerHTML = c.map(i => {
      return `
      <div class="line-item">
        <img src="${i.img}" alt="${i.name}" />
        <div class="line-item__info">
          <b>${i.name}</b>
          <small>Ukuran ${i.size} · ${rupiah(i.price)}/${MIN_RENTAL_DAYS} hari</small>
          <div class="line-item__foot">
            <div class="qty">
              <button onclick="Cart.setQty(${i.id},'${i.size}',-1)" aria-label="Kurangi">−</button>
              <span>${i.qty}</span>
              <button onclick="Cart.setQty(${i.id},'${i.size}',1)" aria-label="Tambah">+</button>
            </div>
            <span>${rupiah(i.price * i.qty)}</span>
          </div>
        </div>
        <button class="remove" onclick="Cart.remove(${i.id},'${i.size}')" style="align-self:flex-start">Hapus</button>
      </div>`;
    }).join("");
    if (foot) { foot.hidden = false; updateCartEstimate(); }
  }
};

/* ---------- Checkout ke WhatsApp + Auto Insert Order ---------- */
async function checkoutWhatsApp() {
  const items = Cart.get();
  if (!items.length) { alert("Keranjang rental masih kosong."); return; }

  const nama = (document.getElementById("coName")?.value || "").trim();
  const phone = (document.getElementById("coPhone")?.value || "").trim();
  const tglMulai = document.getElementById("coStart")?.value || "";
  const durasi = document.getElementById("coDays")?.value || "1";

  if (!nama) { alert("Mohon isi nama pemesan."); document.getElementById("coName")?.focus(); return; }
  if (!phone) { alert("Mohon isi No. WhatsApp Anda."); document.getElementById("coPhone")?.focus(); return; }
  if (!tglMulai) { alert("Mohon pilih tanggal mulai rental."); document.getElementById("coStart")?.focus(); return; }

  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) { checkoutBtn.disabled = true; checkoutBtn.textContent = "Memproses..."; }

  const hari = Math.max(MIN_RENTAL_DAYS, parseInt(durasi, 10) || MIN_RENTAL_DAYS);
  const dateStart = new Date(tglMulai + "T00:00:00");

  // Hitung tanggal kembali (Tgl Mulai + durasi)
  const dateEnd = new Date(dateStart);
  dateEnd.setDate(dateEnd.getDate() + hari);
  const tglKembaliIso = dateEnd.toISOString().split("T")[0];

  const tanggalFmt = dateStart.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  // 1. Auto-Insert ke Supabase Orders
  if (supabaseClient) {
    try {
      // Bikin satu entri order per item di keranjang
      const orderPayloads = items.map(i => ({
        customer: nama,
        customer_phone: phone,
        dress_name: `${i.name} (Size: ${i.size}) x${i.qty}`,
        rent_start: tglMulai,
        rent_end: tglKembaliIso,
        status: 'berjalan'
      }));
      await supabaseClient.from("orders").insert(orderPayloads);
    } catch (err) {
      console.warn("Gagal auto-insert pesanan ke DB:", err);
      // Lanjutkan saja ke WA meskipun insert DB gagal (agar customer tidak ngehang)
    }
  }

  // 2. Susun Pesan WhatsApp
  let msg = `Halo Herdress Collection! 👗\n\nSaya ingin merental dress berikut:\n\n`;
  items.forEach((i, n) => {
    const subtotal = rentalTotal(i.price, hari) * i.qty;
    const extraInfo = i.extra_day ? `\n   • Info Perpanjangan/Extra: ${rupiah(i.extra_day)}/hari` : "";
    msg += `${n + 1}. ${i.name}\n   • Ukuran: ${i.size}\n   • Jumlah: ${i.qty}\n   • Harga: ${rupiah(i.price)} / ${MIN_RENTAL_DAYS} hari${extraInfo}\n   • Subtotal (${hari} hari): ${rupiah(subtotal)}\n\n`;
  });
  const estimasiTotal = Cart.totalForDays(hari);
  msg += `----------------------------------\n`;
  msg += `Nama pemesan : ${nama}\n`;
  msg += `No. WhatsApp : ${phone}\n`;
  msg += `Tanggal rental : ${tanggalFmt}\n`;
  msg += `Durasi rental  : ${hari} hari (min. ${MIN_RENTAL_DAYS} hari)\n`;
  msg += `Estimasi total : ${rupiah(estimasiTotal)}\n`;
  msg += `----------------------------------\n\n`;
  msg += `Mohon info ketersediaan & langkah selanjutnya. Terima kasih! 🙏`;

  // 3. Buka WhatsApp
  let waNumber = WHATSAPP_NUMBER;
  if (!supabaseClient) {
    waNumber = localStorage.getItem("terra_setting_wa") || waNumber;
  } else {
    waNumber = window.GLOBAL_WA_NUMBER || waNumber;
  }

  if (checkoutBtn) { checkoutBtn.disabled = false; checkoutBtn.textContent = "Pesan via WhatsApp"; }
  Cart.clear(); // Bersihkan keranjang setelah pesan
  closeCart();

  const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

/* ---------- Pengaturan Tampilan Depan ---------- */
async function loadFrontSettings() {
  let tb = "Rental dress mulai Rp50.000 / 4 hari · Pesan langsung via WhatsApp";
  let wa = WHATSAPP_NUMBER;

  if (!supabaseClient) {
    tb = localStorage.getItem("terra_setting_topbar") || tb;
    wa = localStorage.getItem("terra_setting_wa") || wa;
  } else {
    try {
      const { data } = await supabaseClient.from("settings").select("*");
      if (data) {
        data.forEach(s => {
          if (s.id === 'topbar_text') tb = s.value;
          if (s.id === 'wa_number') wa = s.value;
        });
      }
    } catch (err) { /* ignore */ }
  }

  window.GLOBAL_WA_NUMBER = wa;

  const topbars = document.querySelectorAll(".topbar");
  topbars.forEach(el => { el.textContent = tb; });

  const waLinks = document.querySelectorAll("a[href^='https://wa.me/']");
  waLinks.forEach(el => { el.href = `https://wa.me/${wa}`; });
}

/* Perbarui estimasi total di keranjang sesuai durasi yang dipilih */
function updateCartEstimate() {
  const daysInput = document.getElementById("coDays");
  const days = Math.max(MIN_RENTAL_DAYS, parseInt(daysInput?.value, 10) || MIN_RENTAL_DAYS);
  const totalEl = document.getElementById("cartTotal");
  if (totalEl) totalEl.textContent = rupiah(Cart.totalForDays(days));
  const daysLbl = document.getElementById("cartDaysLbl");
  if (daysLbl) daysLbl.textContent = days;
}

/* ---------- Drawer + menu ---------- */
function openCart() { document.getElementById("cartDrawer")?.classList.add("open"); document.getElementById("overlay")?.classList.add("open"); }
function closeCart() { document.getElementById("cartDrawer")?.classList.remove("open"); document.getElementById("overlay")?.classList.remove("open"); }

document.addEventListener("DOMContentLoaded", async () => {
  Cart.render();

  document.getElementById("cartOpen")?.addEventListener("click", openCart);
  document.getElementById("cartClose")?.addEventListener("click", closeCart);
  document.getElementById("overlay")?.addEventListener("click", closeCart);
  document.getElementById("checkoutBtn")?.addEventListener("click", checkoutWhatsApp);

  const burger = document.getElementById("burger");
  const mnav = document.getElementById("mobileNav");
  burger?.addEventListener("click", () => mnav?.classList.toggle("open"));
  mnav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => mnav.classList.remove("open")));

  // set tanggal minimum = hari ini
  const startInput = document.getElementById("coStart");
  if (startInput) startInput.min = new Date().toISOString().split("T")[0];

  // durasi rental: minimal MIN_RENTAL_DAYS, recalc estimasi saat diubah
  const daysInput = document.getElementById("coDays");
  if (daysInput) {
    daysInput.min = MIN_RENTAL_DAYS;
    if ((parseInt(daysInput.value, 10) || 0) < MIN_RENTAL_DAYS) daysInput.value = MIN_RENTAL_DAYS;
    daysInput.addEventListener("input", updateCartEstimate);
    daysInput.addEventListener("change", () => {
      if ((parseInt(daysInput.value, 10) || 0) < MIN_RENTAL_DAYS) daysInput.value = MIN_RENTAL_DAYS;
      updateCartEstimate();
    });
  }

  // add-to-cart via quick buttons (event delegation)
  document.body.addEventListener("click", e => {
    const btn = e.target.closest("[data-add]");
    if (btn) { e.preventDefault(); Cart.add(btn.dataset.add, btn.dataset.size); }
  });

  // Muat pengaturan, taksonomi, menu & produk
  await loadFrontSettings();
  await loadTaxonomy();
  await loadMenu();
  renderNav();
  await loadProducts();

  // Ambil hanya produk yang tersedia (status === 'tersedia')
  const availableProducts = PRODUCTS.filter(p => p.status === 'tersedia');

  // Urutkan untuk 'Baru Tersedia' (id terbaru)
  const newProducts = [...availableProducts].sort((a,b) => b.id - a.id).slice(0, 4);
  renderGrid(document.getElementById("featuredGrid"), newProducts);

  // Ambil untuk 'Favorit' (4 produk lain yang berbeda)
  const bestProducts = availableProducts.filter(p => !newProducts.includes(p)).slice(0, 4);
  // Fallback jika total produk < 8
  const displayBest = bestProducts.length > 0 ? bestProducts : availableProducts.slice(0, 4);
  renderGrid(document.getElementById("bestGrid"), displayBest);

  // Page-specific hooks
  window.__initIndex?.();
  window.__initShop?.();
  window.__initProduct?.();
  window.__initCollections?.();
});
