# 🌊 Black Shore

**Black Shore** adalah aplikasi manajemen keuangan pribadi dan asisten AI interaktif dengan antarmuka 3D. Dibangun dengan arsitektur *monorepo serverless* yang modern, sistem ini dioptimalkan untuk performa tinggi 
---

## 🏗️ Arsitektur & Tech Stack

| Layer | Teknologi | Catatan |
|---|---|---|
| **Package Manager** | [Bun](https://bun.sh/) | Untuk install & script frontend |
| **Frontend** | Next.js 15 (Static Export), Tailwind CSS, React Three Fiber | Hosted di **Vercel** |
| **Backend Framework** | [Hono](https://hono.dev/) (TypeScript) | Ringan, *edge-native* |
| **Backend Runtime (dev)** | **Node.js** | Wajib untuk Wrangler |
| **Backend Runtime (prod)** | Cloudflare Workers | Free tier 100k req/hari |
| **Database** | Cloudflare D1 (SQLite) | Free tier harian |
| **OAuth Storage** | Cloudflare KV | Menyimpan refresh token Google |
| **Authentication** | Google OAuth2 + Custom JWT Sessions | *Strict Whitelist Access* |
| **LLM** | Google Gemini API & Cloudflare Model API | Backup RTO jika request sedang padat |
| **Docs** | Google Docs API | Manual OAuth, tanpa library |
| **CI/CD** | GitHub Actions | Deploy otomatis ke Cloudflare & Vercel |

---

## 📂 Struktur Repository

```bash
black-shore/
├── apps/
│   ├── frontend/   # Next.js UI, 3D Environment, & Client-Side Route Protection
│   └── backend/    # Hono API, Cloudflare Workers, & Auth Logic
├── packages/       # Shared types and configurations (@black-shore/shared)
└── .github/        # GitHub Actions CI/CD workflows
```

---

## 🔐 Keamanan & Autentikasi

Akses ke Black Shore **dibatasi secara ketat**. Alur Google OAuth dicegat di *edge* melalui Cloudflare Workers. Hanya email yang sudah disetujui sebelumnya yang akan mendapatkan sesi JWT. Upaya akses tidak sah akan otomatis dialihkan dan ditolak sebelum masuk ke aplikasi.

### Aturan Penting (Pelajaran dari Debugging)

| Aturan | Alasan |
|---|---|
| **Wrangler WAJIB pakai Node.js**, bukan Bun | Bun tidak kompatibel dengan Wrangler |
| **OAuth pakai manual**, jangan pakai library | Library OAuth sering bermasalah di Workers |
| **D1 pakai mode `--remote`** | D1 lokal sering bermasalah di WSL/Fedora |
| **Curl pakai `127.0.0.1`**, bukan `localhost` | Menghindari masalah IPv6 |
| **Setelah ubah route, deploy ulang** | Route tidak terdaftar sampai di-deploy |
| **Cek `/debug/routes`** | Untuk verifikasi route terdaftar |
| **`access_type=offline` + `prompt=consent`** | Wajib agar dapat `refresh_token` |
| **Publish OAuth App** | Hindari refresh token expire 7 hari |
| **Tambah akun ke Test Users** | Hindari error 403 saat testing |

## 🚀 Pengembangan Lokal

### Prasyarat

- [Bun](https://bun.sh/) terinstall di sistem.
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-update/) terinstall (`npm i -g wrangler`).
- Akun Cloudflare (untuk D1 & KV).
- Google Cloud Project dengan OAuth 2.0 & Google Docs API aktif.

### 1. Install Dependencies

```bash
bun install
```

### 2. Environment Variables

Backend (apps/backend/.dev.vars):
```bash
ENVIRONMENT="development"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
JWT_SECRET="your_super_secret_jwt_key"
```

Frontend (apps/frontend/.env.local):
```bash
NEXT_PUBLIC_BACKEND_URL="http://localhost:8787"
```

### 3. Setup Database & KV
```bash
cd apps/backend
npx wrangler d1 create black-shore-db
npx wrangler d1 execute black-shore-db --remote --file=migrations/0001_initial.sql
npx wrangler kv namespace create OAUTH_KV
```

### 4. Jalankan Lokal
/root
```bash
bun run dev
```

## ☁️ Deployment (CI/CD)

Repositori ini menggunakan **GitHub Actions** untuk deployment otomatis sepenuhnya. Push ke branch `main` akan memicu workflow untuk membangun dan men-deploy backend ke Cloudflare Workers dan frontend sebagai *Static Export* ke Vercel.

### Required GitHub Secrets

Untuk mengaktifkan pipeline CI/CD, pastikan secrets berikut sudah dikonfigurasi di pengaturan repositori:

- `CLOUDFLARE_API_TOKEN` 
- `CLOUDFLARE_ACCOUNT_ID`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `JWT_SECRET` 
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
