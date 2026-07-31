/* ============================================================
   TERRA Rental — Konfigurasi Supabase
   ------------------------------------------------------------
   ISI 2 nilai di bawah ini dengan milik project Supabase Anda.
   Ambil di: Supabase Dashboard → Project Settings → API
   Lihat langkah lengkap di README-SETUP.md
   ============================================================ */

const SUPABASE_URL = "https://vdaikpxivrncsdmszcwy.supabase.co";      // contoh: https://abcdxyz.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkYWlrcHhpdnJuY3NkbXN6Y3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDg2MDQsImV4cCI6MjEwMDkyNDYwNH0.95hDVjBfDHEb62vRBt7UIEkbXk9NQKWaYY-phocf7vk";     // kunci "anon public"

/* Nomor WhatsApp tujuan pemesanan (format internasional, tanpa + atau spasi) */
const WHATSAPP_NUMBER = "6281234567890";               // GANTI dengan nomor Anda

/* Nama bucket penyimpanan gambar di Supabase Storage */
const STORAGE_BUCKET = "product-images";

/* ------------------------------------------------------------
   Inisialisasi client. Jika kredensial belum diisi, situs tetap
   berjalan memakai data contoh (mode demo, tanpa simpan permanen).
   ------------------------------------------------------------ */
const SUPABASE_READY =
  SUPABASE_URL.startsWith("http") && !SUPABASE_ANON_KEY.startsWith("GANTI");

let supabaseClient = null;
if (SUPABASE_READY && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  });
}

/* Data contoh — dipakai saat mode demo ATAU sebagai fallback bila
   tabel Supabase masih kosong. Harga = tarif sewa per hari (Rupiah). */
const SEED_PRODUCTS = [
  { id: 1, name: "Gaun Malam Satin Emerald", brand: "Herdress Collection", price: 250000, was: null, cat: "pesta", badge: "Baru",
    img: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=700&q=80",
    alt: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=700&q=80" },
  { id: 2, name: "Kebaya Modern Brokat", brand: "Herdress Collection", price: 300000, was: null, cat: "kebaya", badge: null,
    img: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=700&q=80",
    alt: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=700&q=80" },
  { id: 3, name: "Dress Bridesmaid Dusty Pink", brand: "Herdress Collection", price: 180000, was: 220000, cat: "bridesmaid", badge: "Promo",
    img: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=80",
    alt: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=700&q=80" },
  { id: 4, name: "Gaun Pengantin A-Line", brand: "Herdress Bridal", price: 750000, was: null, cat: "pengantin", badge: null,
    img: "https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=700&q=80",
    alt: "https://images.unsplash.com/photo-1519657337289-077653f724ed?auto=format&fit=crop&w=700&q=80" },
  { id: 5, name: "Cocktail Dress Merah", brand: "Herdress Collection", price: 200000, was: null, cat: "pesta", badge: "Baru",
    img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=700&q=80",
    alt: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=700&q=80" },
  { id: 6, name: "Gaun Prom Tulle Biru", brand: "Herdress Collection", price: 230000, was: null, cat: "pesta", badge: null,
    img: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=700&q=80",
    alt: "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=700&q=80" },
  { id: 7, name: "Kebaya Kutubaru Klasik", brand: "Herdress Collection", price: 275000, was: null, cat: "kebaya", badge: null,
    img: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=700&q=80",
    alt: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=700&q=80" },
  { id: 8, name: "Dress Bridesmaid Sage", brand: "Herdress Collection", price: 175000, was: 210000, cat: "bridesmaid", badge: "Promo",
    img: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=700&q=80",
    alt: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=80" },
];
