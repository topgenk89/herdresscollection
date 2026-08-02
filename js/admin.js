/* ============================================================
   TERRA Rental — Admin JS (Tab, Produk, Order, Setting)
   ============================================================ */

/* --- AUTHENTICATION (Supabase Auth) --- */
async function checkAuth() {
  if (!supabaseClient) {
    if (sessionStorage.getItem("terra_admin_auth") === "true") {
      document.getElementById("loginScreen").style.display = "none";
      document.getElementById("adminContent").hidden = false;
      return true;
    }
    return false;
  }

  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    if (session) {
      document.getElementById("loginScreen").style.display = "none";
      document.getElementById("adminContent").hidden = false;
      return true;
    } else {
      document.getElementById("loginScreen").style.display = "flex";
      document.getElementById("adminContent").hidden = true;
      return false;
    }
  } catch (err) {
    console.error("Auth check error:", err);
    document.getElementById("loginScreen").style.display = "flex";
    return false;
  }
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("loginBtn");
  const errDiv = document.getElementById("loginError");
  const email = document.getElementById("loginUser").value;
  const pass = document.getElementById("loginPass").value;

  btn.disabled = true;
  btn.textContent = "Loading...";

  if (!supabaseClient) {
    if (email === "admin@terra.com" && pass === "admin") {
      sessionStorage.setItem("terra_admin_auth", "true");
      errDiv.hidden = true;
      checkAuth();
    } else {
      errDiv.textContent = "Email atau password salah (Coba: admin@terra.com / admin)";
      errDiv.hidden = false;
    }
    btn.disabled = false;
    btn.textContent = "Masuk";
    return;
  }

  // Proses Login Supabase
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: pass,
    });

    if (error) {
      console.error("Supabase Auth Error:", error);
      throw error;
    }

    console.log("Login Berhasil, menyimpan sesi...");
    errDiv.hidden = true;

    // Paksa reload halaman agar state JS mereset dengan sempurna membawa sesi baru
    window.location.reload();

  } catch (err) {
    console.error("Catch Block Error:", err);
    errDiv.innerHTML = "<strong>Gagal login:</strong> " + (err.message || err);
    errDiv.hidden = false;
    btn.disabled = false;
    btn.textContent = "Masuk";
  }
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  } else {
    sessionStorage.removeItem("terra_admin_auth");
  }
  document.getElementById("loginForm").reset();
  document.getElementById("loginScreen").hidden = false;
  document.getElementById("adminContent").hidden = true;
});

/* --- UI HELPERS --- */
const banner = document.getElementById("statusBanner");
function showBanner(msg, type = "info") {
  banner.hidden = false;
  banner.textContent = msg;
  banner.className = "admin-banner admin-banner--" + type;
  setTimeout(() => banner.hidden = true, 5000);
}
function labelCat(c) { return (typeof catName === "function") ? catName(c) : c; }

/* Isi semua dropdown & filter kategori/koleksi dari data taksonomi */
function populateTaxonomyControls() {
  // Dropdown kategori di form produk
  const pCat = document.getElementById("pCat");
  if (pCat) {
    const cur = pCat.value;
    pCat.innerHTML = CATEGORIES.map(c => `<option value="${c.slug}">${c.name}</option>`).join("");
    if (cur) pCat.value = cur;
  }
  // Dropdown koleksi di form produk
  const pColl = document.getElementById("pCollection");
  if (pColl) {
    const cur = pColl.value;
    pColl.innerHTML = `<option value="">— Tanpa koleksi —</option>` +
      COLLECTIONS.map(c => `<option value="${c.slug}">${c.name}</option>`).join("");
    if (cur) pColl.value = cur;
  }
  // Filter kategori di daftar produk
  const fCat = document.getElementById("filterCat");
  if (fCat) {
    fCat.innerHTML = `<option value="all">Semua Kategori</option>` +
      CATEGORIES.map(c => `<option value="${c.slug}">${c.name}</option>`).join("");
  }
}

/* Ubah teks jadi slug: "Gaun Anak" -> "gaun-anak" */
function toSlug(str) {
  return (str || "").toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/* Format input angka jadi ribuan dengan titik */
function formatInputNumber(e) {
  let val = e.target.value.replace(/\D/g, "");
  if (val) {
    e.target.value = new Intl.NumberFormat("id-ID").format(val);
  } else {
    e.target.value = "";
  }
}
function parseInputNumber(val) {
  return parseInt((val || "").toString().replace(/\D/g, ""), 10) || 0;
}

document.getElementById("pPrice")?.addEventListener("input", formatInputNumber);
document.getElementById("pExtraDay")?.addEventListener("input", formatInputNumber);
document.getElementById("pWas")?.addEventListener("input", formatInputNumber);

/* --- TABS LOGIC --- */
document.querySelectorAll(".admin-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".admin-tab-content").forEach(c => c.hidden = true);
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).hidden = false;
  });
});

/* ============================================================
   TAB 1: KELOLA PRODUK (Tambah, Edit, Hapus, Filter, Search)
   ============================================================ */
let currentFilter = "all";
let currentSearch = "";

const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const previewImg = document.getElementById("previewImg");
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;
  previewImg.src = URL.createObjectURL(file);
  preview.hidden = false;
});

function renderAdminList() {
  const list = document.getElementById("adminList");
  let filtered = PRODUCTS.filter(p => currentFilter === "all" || p.cat === currentFilter);
  if (currentSearch) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(currentSearch.toLowerCase()));
  }

  document.getElementById("prodCount").textContent = "(" + filtered.length + ")";

  if (!filtered.length) {
    list.innerHTML = `<p class="admin-empty">Tidak ada produk ditemukan.</p>`;
    return;
  }
  list.innerHTML = filtered.map(p => `
    <div class="admin-item">
      <img src="${p.img}" alt="${p.name}" />
      <div class="admin-item__info">
        <b>${p.name}</b>
        <small>${labelCat(p.cat)} · ${rupiah(p.price)}/4 hari ${p.extra_day ? '(denda dadakan: '+rupiah(p.extra_day)+'/hr)' : ''}</small>
        <div>
          <span class="status-badge st-${p.status || 'tersedia'}">${p.status || 'Tersedia'}</span>
          <span style="font-size:11px; color:#888; margin-left:6px;">Ukuran: ${(p.sizes || []).join(', ')}</span>
        </div>
      </div>
      <div class="admin-item__actions">
        <button class="admin-edit" data-edit="${p.id}">Edit</button>
        <button class="admin-del" data-del="${p.id}">Hapus</button>
      </div>
    </div>`).join("");
}

document.getElementById("filterCat").addEventListener("change", e => { currentFilter = e.target.value; renderAdminList(); });
document.getElementById("searchProduct").addEventListener("input", e => { currentSearch = e.target.value; renderAdminList(); });

/* SETUP FORM UNTUK EDIT */
const form = document.getElementById("productForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");

document.getElementById("adminList").addEventListener("click", async (e) => {
  // Tombol Edit
  const editBtn = e.target.closest("[data-edit]");
  if (editBtn) {
    const id = +editBtn.dataset.edit;
    const p = PRODUCTS.find(x => x.id === id);
    if(!p) return;

    document.getElementById("formTitle").textContent = "Edit Dress: " + p.name;
    document.getElementById("editId").value = p.id;
    document.getElementById("pName").value = p.name;
    document.getElementById("pCat").value = p.cat;
    if (document.getElementById("pCollection")) document.getElementById("pCollection").value = p.collection || "";
    document.getElementById("pStatus").value = p.status || "tersedia";
    document.getElementById("pPrice").value = p.price ? new Intl.NumberFormat("id-ID").format(p.price) : "";
    document.getElementById("pExtraDay").value = p.extra_day ? new Intl.NumberFormat("id-ID").format(p.extra_day) : "";
    document.getElementById("pWas").value = p.was ? new Intl.NumberFormat("id-ID").format(p.was) : "";
    document.getElementById("pBadge").value = p.badge || "";
    document.getElementById("pSizes").value = (p.sizes || ["S","M","L"]).join(", ");

    const pTags = document.getElementById("pTags");
    if (pTags) {
      pTags.querySelectorAll("input").forEach(cb => { cb.checked = (p.tags || []).includes(cb.value); });
    }

    previewImg.src = p.img;
    preview.hidden = false;
    imageInput.required = false; // Foto tidak wajib saat edit
    document.getElementById("imgReqText").hidden = true;
    document.getElementById("imgEditHelp").hidden = false;

    cancelEditBtn.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // Tombol Hapus
  const delBtn = e.target.closest("[data-del]");
  if (delBtn) {
    const id = +delBtn.dataset.del;
    const p = PRODUCTS.find(x => x.id === id);
    if (!confirm(`Hapus "${p?.name || "produk ini"}" secara permanen?`)) return;

    delBtn.disabled = true;
    try {
      if (!supabaseClient) {
        if (p.demoData) {
          let localAdded = JSON.parse(localStorage.getItem("terra_demo_products") || "[]");
          localAdded = localAdded.filter(x => x.id !== id);
          localStorage.setItem("terra_demo_products", JSON.stringify(localAdded));
        } else {
          const localDeleted = JSON.parse(localStorage.getItem("terra_demo_deleted") || "[]");
          localDeleted.push(id);
          localStorage.setItem("terra_demo_deleted", JSON.stringify(localDeleted));
        }
        await loadProducts(); renderAdminList();
        showBanner("✓ Dihapus (Tersimpan di browser).", "info");
        return;
      }

      // Hapus DB Supabase
      if (p.img && p.img.includes(`/${STORAGE_BUCKET}/`)) {
        const fname = p.img.split(`/${STORAGE_BUCKET}/`).pop().split("?")[0];
        await supabaseClient.storage.from(STORAGE_BUCKET).remove([fname]);
      }
      const { error } = await supabaseClient.from("products").delete().eq("id", id);
      if (error) throw error;
      await loadProducts(); renderAdminList();
      showBanner("✓ Produk dihapus.", "success");
    } catch (err) { showBanner("Gagal menghapus: " + err.message, "error"); }
  }
});

/* BATAL EDIT */
cancelEditBtn.addEventListener("click", () => {
  document.getElementById("formTitle").textContent = "Tambah Dress Baru";
  form.reset();
  document.getElementById("editId").value = "";
  preview.hidden = true;
  imageInput.required = true;
  document.getElementById("imgReqText").hidden = false;
  document.getElementById("imgEditHelp").hidden = true;
  cancelEditBtn.hidden = true;
});

/* SUBMIT TAMBAH / EDIT */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("submitBtn");
  const fd = new FormData(form);

  const editId = fd.get("editId");
  const name = (fd.get("name") || "").trim();
  const price = parseInputNumber(fd.get("price"));
  const extra_day = parseInputNumber(fd.get("extra_day"));
  const was = fd.get("was") ? parseInputNumber(fd.get("was")) : null;
  const cat = fd.get("cat");
  const collection = fd.get("collection") || null;
  const status = fd.get("status") || "tersedia";
  const badge = fd.get("badge") || null;
  const sizesRaw = (fd.get("sizes") || "").trim();
  const sizes = sizesRaw ? sizesRaw.split(",").map(s => s.trim()).filter(Boolean) : ["S","M"];
  const tags = fd.getAll("tags"); // Ambil array checkbox
  const file = fd.get("image");
  const g1 = fd.get("gallery1");
  const g2 = fd.get("gallery2");
  const g3 = fd.get("gallery3");

  submitBtn.disabled = true;
  submitBtn.textContent = "Menyimpan...";

  try {
    if (!supabaseClient) {
      showBanner("Fitur Tambah/Edit hanya berfungsi penuh setelah Supabase dihubungkan.", "warn");
      submitBtn.disabled = false; submitBtn.textContent = "Simpan Produk";
      return;
    }

    // Helper untuk upload gambar
    const uploadToSupabase = async (f, prefix) => {
      if (!f || f.size === 0) return null;
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${prefix}-${Date.now()}.${ext}`;
      const up = await supabaseClient.storage.from(STORAGE_BUCKET).upload(path, f, { upsert: false });
      if (up.error) throw up.error;
      return supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
    };

    // Upload foto utama BARU jika ada
    let imgUrl = await uploadToSupabase(file, 'dress');

    // Siapkan array foto galeri
    let newGallery = [];
    if (g1 && g1.size > 0) newGallery.push(await uploadToSupabase(g1, 'gal1'));
    if (g2 && g2.size > 0) newGallery.push(await uploadToSupabase(g2, 'gal2'));
    if (g3 && g3.size > 0) newGallery.push(await uploadToSupabase(g3, 'gal3'));

    const payload = { name, price, extra_day, was, cat, collection, status, badge, sizes, tags };
    if (imgUrl) { payload.img = imgUrl; payload.alt = imgUrl; }

    // Gabungkan array galeri lama dengan yang baru (khusus saat edit, jika ada tambahan)
    // Untuk penyederhanaan, foto galeri baru di form akan menambah / mengganti slot (tergantung implementasi)
    // Di sini kita timpa jika ada upload baru, jika tidak biarkan kosong / tidak diupdate.
    if (newGallery.length > 0) {
      // Jika edit dan mau append: ini butuh ambil state lama. Kita overwrite saja sesuai form.
      payload.img_gallery = newGallery;
    }

    if (editId) {
      // UPDATE
      const { error } = await supabaseClient.from("products").update(payload).eq("id", editId);
      if (error) throw error;
      showBanner("✓ Perubahan berhasil disimpan.", "success");
    } else {
      // INSERT
      payload.brand = "TERRA Rental";
      const { error } = await supabaseClient.from("products").insert([payload]);
      if (error) throw error;
      showBanner("✓ Dress baru berhasil ditambahkan.", "success");
    }

    await loadProducts();
    renderAdminList();
    cancelEditBtn.click(); // Reset form
  } catch (err) {
    showBanner("Gagal: " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Simpan Produk";
  }
});


/* ============================================================
   TAB: MENU BUILDER
   ============================================================ */

/* Refresh select options di tab menu */
function updateMenuSelects() {
  const tCat = document.getElementById("mTargetCat");
  const tColl = document.getElementById("mTargetColl");
  const pDrop = document.getElementById("mParent");
  if (!tCat) return;

  tCat.innerHTML = CATEGORIES.map(c => `<option value="${c.slug}">${c.name}</option>`).join("");
  tColl.innerHTML = COLLECTIONS.map(c => `<option value="${c.slug}">${c.name}</option>`).join("");

  let pOptions = `<option value="">— Menu Utama (Paling Luar) —</option>`;
  MENU.forEach((m, i) => {
    if (m.type === "group") pOptions += `<option value="${i}">${m.label} (Grup)</option>`;
  });
  pDrop.innerHTML = pOptions;
}

/* Ganti field target sesuai tipe */
document.getElementById("mType")?.addEventListener("change", e => {
  const val = e.target.value;
  ["mTargetCat", "mTargetColl", "mTargetTag", "mTargetPrice", "mTargetLink", "mTargetGroup"].forEach(id => {
    document.getElementById(id).hidden = true;
  });
  if (val === "cat") document.getElementById("mTargetCat").hidden = false;
  if (val === "collection") document.getElementById("mTargetColl").hidden = false;
  if (val === "tag") document.getElementById("mTargetTag").hidden = false;
  if (val === "price") document.getElementById("mTargetPrice").hidden = false;
  if (val === "link") document.getElementById("mTargetLink").hidden = false;
  if (val === "group") document.getElementById("mTargetGroup").hidden = false;
  document.getElementById("mParentWrap").hidden = (val === "group"); // Group tak bisa di dalam group
});

/* Render daftar menu builder */
function renderMenuBuilder() {
  const cont = document.getElementById("menuBuilder");
  if (!cont) return;
  if (!MENU.length) { cont.innerHTML = `<p class="admin-empty">Belum ada menu.</p>`; return; }

  let html = "";
  MENU.forEach((m, i) => {
    html += `
      <div class="menu-item" data-idx="${i}">
        <div class="menu-item__head">
          <div class="menu-item__info"><b>${m.label}</b> <span>${m.type === 'group' ? 'Dropdown' : '-> ' + m.value}</span></div>
          <div class="menu-item__actions">
            <button type="button" onclick="moveMenu(${i}, -1)">↑</button>
            <button type="button" onclick="moveMenu(${i}, 1)">↓</button>
            <button type="button" onclick="delMenu(${i})" style="color:#a12b2b;">X</button>
          </div>
        </div>`;
    if (m.type === "group") {
      html += `<div class="menu-sublist">`;
      if (m.children) m.children.forEach((c, j) => {
        html += `
          <div class="menu-item menu-item--sub">
            <div class="menu-item__info"><b>${c.label}</b> <span>-> ${c.value}</span></div>
            <div class="menu-item__actions">
              <button type="button" onclick="moveSub(${i}, ${j}, -1)">↑</button>
              <button type="button" onclick="moveSub(${i}, ${j}, 1)">↓</button>
              <button type="button" onclick="delSub(${i}, ${j})" style="color:#a12b2b;">X</button>
            </div>
          </div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  });
  cont.innerHTML = html;
  updateMenuSelects();
}

window.moveMenu = (idx, dir) => {
  if (idx + dir < 0 || idx + dir >= MENU.length) return;
  const temp = MENU[idx]; MENU[idx] = MENU[idx+dir]; MENU[idx+dir] = temp;
  renderMenuBuilder();
};
window.delMenu = (idx) => { if (confirm("Hapus menu ini?")) { MENU.splice(idx, 1); renderMenuBuilder(); } };

window.moveSub = (pIdx, idx, dir) => {
  const arr = MENU[pIdx].children;
  if (idx + dir < 0 || idx + dir >= arr.length) return;
  const temp = arr[idx]; arr[idx] = arr[idx+dir]; arr[idx+dir] = temp;
  renderMenuBuilder();
};
window.delSub = (pIdx, idx) => { if (confirm("Hapus sub-menu ini?")) { MENU[pIdx].children.splice(idx, 1); renderMenuBuilder(); } };

/* Tambah Menu */
document.getElementById("menuForm")?.addEventListener("submit", e => {
  e.preventDefault();
  const label = document.getElementById("mLabel").value.trim();
  const type = document.getElementById("mType").value;
  const parentIdx = document.getElementById("mParent").value;

  let val = "";
  if (type === "cat") val = document.getElementById("mTargetCat").value;
  if (type === "collection") val = document.getElementById("mTargetColl").value;
  if (type === "tag") val = document.getElementById("mTargetTag").value;
  if (type === "price") val = document.getElementById("mTargetPrice").value;
  if (type === "link") val = document.getElementById("mTargetLink").value;

  const newItem = { label, type, value: val };
  if (type === "group") newItem.children = [];

  if (parentIdx !== "" && type !== "group") {
    if (!MENU[parentIdx].children) MENU[parentIdx].children = [];
    MENU[parentIdx].children.push(newItem);
  } else {
    MENU.push(newItem);
  }

  e.target.reset();
  document.getElementById("mType").dispatchEvent(new Event("change"));
  renderMenuBuilder();
});

/* Simpan Menu ke DB / Local */
document.getElementById("saveMenuBtn")?.addEventListener("click", async () => {
  const btn = document.getElementById("saveMenuBtn");
  btn.disabled = true; btn.textContent = "Menyimpan...";
  const jsonStr = JSON.stringify(MENU);

  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.from("settings").upsert([{ id: 'menu_json', value: jsonStr }]);
      if (error) throw error;
      showBanner("✓ Menu navigasi berhasil disimpan.", "success");
    } else {
      localStorage.setItem("terra_menu_json", jsonStr);
      showBanner("✓ Menu disimpan di browser (Demo).", "success");
    }
  } catch (err) { showBanner("Gagal menyimpan menu.", "error"); }
  btn.disabled = false; btn.textContent = "Simpan Perubahan";
});

/* ============================================================
   TAB 2: CATATAN SEWA (Orders)
   ============================================================ */
let ORDERS = [];

async function loadOrders() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from("orders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    ORDERS = data || [];
    renderOrders();
  } catch (err) { console.error("Gagal load orders", err); }
}

function renderOrders() {
  const tbody = document.getElementById("orderList");
  if (!ORDERS.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#888;">Belum ada catatan sewa.</td></tr>`;
    return;
  }
  tbody.innerHTML = ORDERS.map(o => `
    <tr>
      <td><b>${o.customer}</b></td>
      <td>${o.customer_phone ? `<a href="https://wa.me/${o.customer_phone}" target="_blank" style="color:var(--clay); text-decoration:underline;">${o.customer_phone}</a>` : '-'}</td>
      <td>${o.dress_name}</td>
      <td>${o.rent_start}</td>
      <td>${o.rent_end}</td>
      <td><span class="status-badge st-${o.status}">${o.status}</span></td>
      <td>
        ${o.status === 'berjalan' ? `<button onclick="completeOrder(${o.id})" class="btn btn--line" style="padding:4px 8px; font-size:10px;">Selesaikan</button>` : '-'}
      </td>
    </tr>
  `).join("");
}

document.getElementById("orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabaseClient) { showBanner("Konfigurasi Supabase dulu untuk mencatat pesanan.", "error"); return; }

  const fd = new FormData(e.target);
  const payload = {
    customer: fd.get("customer"),
    dress_name: fd.get("dress_name"),
    rent_start: fd.get("rent_start"),
    rent_end: fd.get("rent_end"),
    status: 'berjalan'
  };

  const btn = document.getElementById("saveOrderBtn");
  btn.disabled = true;
  try {
    const { error } = await supabaseClient.from("orders").insert([payload]);
    if (error) throw error;
    e.target.reset();
    showBanner("✓ Pesanan dicatat.", "success");
    await loadOrders();
  } catch (err) { showBanner("Gagal mencatat: " + err.message, "error"); }
  btn.disabled = false;
});

window.completeOrder = async function(id) {
  if (!confirm("Tandai pesanan ini selesai (dress sudah dikembalikan)?")) return;
  try {
    const { error } = await supabaseClient.from("orders").update({status: 'selesai'}).eq("id", id);
    if (error) throw error;
    await loadOrders();
  } catch (err) { showBanner("Gagal update status", "error"); }
}


/* ============================================================
   TAB 3: PENGATURAN (Settings)
   ============================================================ */
async function loadSettings() {
  if (!supabaseClient) {
    document.getElementById("setTopbar").value = localStorage.getItem("terra_setting_topbar") || "Sewa dress mulai Rp175.000/hari · Pesan langsung via WhatsApp";
    document.getElementById("setWa").value = localStorage.getItem("terra_setting_wa") || "6281234567890";
    return;
  }
  try {
    const { data, error } = await supabaseClient.from("settings").select("*");
    if (error) throw error;
    data.forEach(s => {
      if (s.id === 'topbar_text') document.getElementById("setTopbar").value = s.value;
      if (s.id === 'wa_number') document.getElementById("setWa").value = s.value;
    });
  } catch (err) { console.error("Gagal load setting", err); }
}

document.getElementById("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tb = document.getElementById("setTopbar").value;
  const wa = document.getElementById("setWa").value;
  const btn = document.getElementById("saveSettingsBtn");
  btn.disabled = true;

  try {
    if (!supabaseClient) {
      localStorage.setItem("terra_setting_topbar", tb);
      localStorage.setItem("terra_setting_wa", wa);
      showBanner("✓ Pengaturan disimpan di browser (Mode Demo).", "success");
    } else {
      await supabaseClient.from("settings").upsert([
        { id: 'topbar_text', value: tb },
        { id: 'wa_number', value: wa }
      ]);
      showBanner("✓ Pengaturan website diperbarui.", "success");
    }
  } catch (err) { showBanner("Gagal simpan pengaturan.", "error"); }
  btn.disabled = false;
});


/* ============================================================
   TAB: KATEGORI & KOLEKSI
   ============================================================ */
function renderTaxoLists() {
  // Kategori
  const catList = document.getElementById("catList");
  if (catList) {
    catList.innerHTML = CATEGORIES.length ? CATEGORIES.map(c => `
      <div class="admin-item">
        ${c.img ? `<img src="${c.img}" alt="${c.name}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" />` : `<div style="width:50px; height:50px; background:#eee; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:9px; color:#aaa;">No foto</div>`}
        <div class="admin-item__info">
          <b>${c.name}</b>
          <small>slug: ${c.slug}</small>
        </div>
        <div class="admin-item__actions">
          <button class="admin-edit" data-photocat="${c.slug}">${c.img ? 'Ganti Foto' : 'Upload Foto'}</button>
          <input type="file" accept="image/*" data-photoinput="${c.slug}" hidden />
          <button class="admin-del" data-delcat="${c.slug}">Hapus</button>
        </div>
      </div>`).join("") : `<p class="admin-empty">Belum ada kategori.</p>`;
  }
  // Koleksi
  const collList = document.getElementById("collList");
  if (collList) {
    collList.innerHTML = COLLECTIONS.length ? COLLECTIONS.map(c => `
      <div class="admin-item">
        <div class="admin-item__info">
          <b>${c.name}</b>
          <small>${c.description || "slug: " + c.slug}</small>
        </div>
        <div class="admin-item__actions">
          <button class="admin-del" data-delcoll="${c.slug}">Hapus</button>
        </div>
      </div>`).join("") : `<p class="admin-empty">Belum ada koleksi.</p>`;
  }
}

/* Simpan kategori/koleksi ke localStorage saat mode demo */
function saveDemoTaxo() {
  localStorage.setItem("terra_categories", JSON.stringify(CATEGORIES));
  localStorage.setItem("terra_collections", JSON.stringify(COLLECTIONS));
}

/* Tambah Kategori */
document.getElementById("catForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Loading...";

  const fd = new FormData(e.target);
  const name = (fd.get("name") || "").trim();
  const file = fd.get("image");
  if (!name) { btn.disabled = false; btn.textContent = "+ Tambah"; return; }

  const slug = toSlug(name);
  const existing = CATEGORIES.find(c => c.slug === slug);
  // Kalau kategori sudah ada TAPI tanpa foto baru, tolak. Kalau ada foto baru, lanjut (update foto).
  if (existing && !(file && file.size > 0)) {
    showBanner("Kategori sudah ada. Pilih foto untuk memperbarui gambarnya.", "error");
    btn.disabled = false; btn.textContent = "+ Tambah"; return;
  }

  try {
    let imgUrl = null;
    if (supabaseClient) {
      if (file && file.size > 0) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `cat-${slug}-${Date.now()}.${ext}`;
        const up = await supabaseClient.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
        if (up.error) throw up.error;
        imgUrl = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
      }

      if (existing) {
        // UPDATE foto kategori yang sudah ada
        const payload = {};
        if (imgUrl) payload.img = imgUrl;
        const { error } = await supabaseClient.from("categories").update(payload).eq("slug", slug);
        if (error) throw error;
      } else {
        // INSERT kategori baru
        const ord = CATEGORIES.length + 1;
        const payload = { slug, name, ord };
        if (imgUrl) payload.img = imgUrl;
        const { error } = await supabaseClient.from("categories").insert([payload]);
        if (error) throw error;
      }
    } else {
      if (existing) { existing.img = imgUrl; }
      else { CATEGORIES.push({ slug, name, ord: CATEGORIES.length + 1, img: null }); }
      saveDemoTaxo();
    }
    await loadTaxonomy();
    populateTaxonomyControls();
    renderTaxoLists();
    e.target.reset();
    showBanner(existing ? "✓ Foto kategori diperbarui." : "✓ Kategori ditambahkan.", "success");
  } catch (err) {
    showBanner("Gagal: " + err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "+ Tambah";
  }
});

/* Tambah Koleksi */
document.getElementById("collForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = (fd.get("name") || "").trim();
  const description = (fd.get("description") || "").trim();
  if (!name) return;
  const slug = toSlug(name);
  if (COLLECTIONS.some(c => c.slug === slug)) { showBanner("Koleksi sudah ada.", "error"); return; }

  try {
    if (supabaseClient) {
      const ord = COLLECTIONS.length + 1;
      const { error } = await supabaseClient.from("collections").insert([{ slug, name, description, ord }]);
      if (error) throw error;
    } else {
      COLLECTIONS.push({ slug, name, description, ord: COLLECTIONS.length + 1 });
      saveDemoTaxo();
    }
    await loadTaxonomy();
    populateTaxonomyControls();
    renderTaxoLists();
    e.target.reset();
    showBanner("✓ Koleksi ditambahkan.", "success");
  } catch (err) { showBanner("Gagal: " + err.message, "error"); }
});

/* Ganti / Upload Foto Kategori (klik tombol -> buka file picker) */
document.getElementById("tab-taxo")?.addEventListener("click", (e) => {
  const photoBtn = e.target.closest("[data-photocat]");
  if (photoBtn) {
    const slug = photoBtn.dataset.photocat;
    const input = document.querySelector(`[data-photoinput="${slug}"]`);
    if (input) input.click();
  }
});

/* Saat file dipilih -> upload & update kolom img kategori */
document.getElementById("tab-taxo")?.addEventListener("change", async (e) => {
  const input = e.target.closest("[data-photoinput]");
  if (!input) return;
  const slug = input.dataset.photoinput;
  const file = input.files[0];
  if (!file) return;

  const btn = document.querySelector(`[data-photocat="${slug}"]`);
  if (btn) { btn.disabled = true; btn.textContent = "Mengunggah..."; }

  try {
    if (!supabaseClient) { showBanner("Hubungkan Supabase dulu untuk upload foto.", "error"); return; }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `cat-${slug}-${Date.now()}.${ext}`;
    const up = await supabaseClient.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
    if (up.error) throw up.error;
    const imgUrl = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;

    const { error } = await supabaseClient.from("categories").update({ img: imgUrl }).eq("slug", slug);
    if (error) throw error;

    await loadTaxonomy();
    renderTaxoLists();
    showBanner("✓ Foto kategori diperbarui.", "success");
  } catch (err) {
    showBanner("Gagal upload foto: " + err.message, "error");
    if (btn) { btn.disabled = false; btn.textContent = "Ganti Foto"; }
  }
});

/* Hapus Kategori / Koleksi (event delegation) */
document.getElementById("tab-taxo")?.addEventListener("click", async (e) => {
  const delCat = e.target.closest("[data-delcat]");
  const delColl = e.target.closest("[data-delcoll]");

  if (delCat) {
    const slug = delCat.dataset.delcat;
    if (!confirm(`Hapus kategori "${catName(slug)}"? Produk lama tetap ada tapi kategorinya jadi kosong.`)) return;
    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.from("categories").delete().eq("slug", slug);
        if (error) throw error;
      } else {
        CATEGORIES = CATEGORIES.filter(c => c.slug !== slug);
        saveDemoTaxo();
      }
      await loadTaxonomy(); populateTaxonomyControls(); renderTaxoLists();
      showBanner("✓ Kategori dihapus.", "success");
    } catch (err) { showBanner("Gagal: " + err.message, "error"); }
  }

  if (delColl) {
    const slug = delColl.dataset.delcoll;
    if (!confirm("Hapus koleksi ini?")) return;
    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.from("collections").delete().eq("slug", slug);
        if (error) throw error;
      } else {
        COLLECTIONS = COLLECTIONS.filter(c => c.slug !== slug);
        saveDemoTaxo();
      }
      await loadTaxonomy(); populateTaxonomyControls(); renderTaxoLists();
      showBanner("✓ Koleksi dihapus.", "success");
    } catch (err) { showBanner("Gagal: " + err.message, "error"); }
  }
});


/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  checkAuth();
  await loadTaxonomy();
  await loadMenu();
  populateTaxonomyControls();
  renderTaxoLists();
  renderMenuBuilder();
  await loadProducts();
  renderAdminList();

  if (!supabaseClient) {
    const note = document.getElementById("modeNote");
    note.innerHTML = "⚠ <b>Mode demo aktif.</b> Supabase belum terhubung. Edit & Pesanan tidak akan tersimpan permanen. Buka <code>README-SETUP.md</code> untuk setup cloud.";
    note.classList.add("admin-note--warn");
  } else {
    document.getElementById("modeNote").hidden = true;
    loadOrders();
  }
  loadSettings();
});
