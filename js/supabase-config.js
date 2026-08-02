/* ============================================================
   Herdress Collection — Konfigurasi Supabase
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

/* Data contoh telah dihapus (situs hanya akan menampilkan produk dari Supabase) */
const SEED_PRODUCTS = [];
