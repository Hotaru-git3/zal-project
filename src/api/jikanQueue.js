// src/api/jikanQueue.js

const API_BASE_URL = 'https://api.jikan.moe/v4';
const REQUEST_DELAY = 700;     // Jeda antar batch (turun dari 1000ms)
const RATE_LIMIT_DELAY = 5000; // Jeda jika kena rate limit
const TIMEOUT_DURATION = 15000;
const PARALLEL_REQUESTS = 3;   // Proses 3 request sekaligus

let requestQueue = [];
let isProcessing = false;

/**
 * Memproses antrean request dalam batch paralel.
 */
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) {
    isProcessing = false; // Pastikan reset jika antrean kosong
    return;
  }
  isProcessing = true;

  // 1. Ambil batch request sebanyak PARALLEL_REQUESTS
  const batch = [];
  for (let i = 0; i < PARALLEL_REQUESTS && requestQueue.length > 0; i++) {
    batch.push(requestQueue.shift());
  }

  let nextProcessDelay = REQUEST_DELAY;

  // 2. Jalankan semua request di batch secara paralel
  const promises = batch.map(async ({ endpoint, resolve, reject, controller }) => {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AnimeList-App/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        console.warn(`Rate limit hit for ${endpoint}. Re-queueing...`);
        // Masukkan kembali ke *awal* antrean untuk dicoba lagi
        requestQueue.unshift({ endpoint, resolve, reject, controller });
        // Paksa jeda lebih lama untuk batch berikutnya
        nextProcessDelay = RATE_LIMIT_DELAY;
      } else if (response.ok) {
        const result = await response.json();
        resolve(result.data); // Langsung kirim 'data' nya
      } else {
        throw new Error(`HTTP ${response.status} (${response.statusText}) for ${url}`);
      }

    } catch (err) {
      let error = err;
      if (err.name === 'AbortError') {
        error = new Error('Request timeout. Please try again');
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        error = new Error('Network error. Please check your connection');
      }
      
      console.error(`Fetch error for ${endpoint}:`, error);
      reject(error);
    }
  });

  // 3. Tunggu semua request di batch selesai
  await Promise.allSettled(promises);

  // 4. Jadwalkan proses batch berikutnya setelah jeda
  setTimeout(() => {
    isProcessing = false;
    processQueue(); // Panggil lagi untuk memproses batch berikutnya
  }, nextProcessDelay);
}

/**
 * Fungsi publik untuk menambahkan request ke antrean.
 * (TETAP SAMA)
 */
export const queuedFetch = (endpoint) => {
  const controller = new AbortController();
  
  return new Promise((resolve, reject) => {
    requestQueue.push({ endpoint, resolve, reject, controller });
    if (!isProcessing) {
      processQueue();
    }
  });
};