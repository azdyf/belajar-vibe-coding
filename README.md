# Belajar Vibe Coding - Backend

Project backend menggunakan **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **MySQL**.

## 🛠️ Tech Stack
- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [ElysiaJS](https://elysiajs.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: MySQL (`mysql2`)
- **Language**: TypeScript

## 📂 Struktur Project
```
.
├── drizzle/              # Migration files yang digenerate oleh Drizzle Kit
├── src/
│   ├── db/
│   │   ├── index.ts      # Koneksi database MySQL dengan Drizzle pool
│   │   └── schema.ts     # Definisi skema tabel (users)
│   ├── routes/
│   │   └── users.ts      # Endpoint /users (GET & POST)
│   └── index.ts          # Entry point server Elysia
├── .env.example          # Template konfigurasi environment
├── drizzle.config.ts     # Konfigurasi Drizzle Kit
├── package.json
└── tsconfig.json
```

## 🚀 Memulai

### 1. Install Dependencies
```bash
bun install
```

### 2. Konfigurasi Environment
Salin file `.env.example` ke `.env` dan sesuaikan kredensial MySQL Anda:
```bash
cp .env.example .env
```

### 3. Database Migration
Generate dan jalankan migrasi database menggunakan Drizzle Kit:
```bash
# Generate file migrasi baru berdasarkan skema
bun run db:generate

# Push skema langsung ke database (development)
bun run db:push

# Atau jalankan file migrasi
bun run db:migrate

# Membuka Drizzle Studio GUI (opsional)
bun run db:studio
```

### 4. Menjalankan Server
```bash
# Mode development (dengan watch/hot reload)
bun run dev

# Mode production
bun run start
```

Server akan aktif di `http://localhost:3000`.

## 📡 Endpoints
- `GET /` : Health check & status server
- `GET /users` : Mengambil daftar semua user dari database MySQL
- `POST /users` : Menambahkan user baru (`name`, `email`)
