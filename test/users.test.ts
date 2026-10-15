import { describe, expect, it, beforeEach } from "bun:test";
import { app } from "../src/index";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";

describe("Users & Sessions API (Elysia + MySQL)", () => {
  const testEmail = "fahmi@localhost";
  const testPassword = "rahasia";

  beforeEach(async () => {
    // Bersihkan data user test (cascade akan menghapus sessions terkait)
    await db.delete(users).where(eq(users.email, testEmail));
  });

  describe("POST /api/users (Registration)", () => {
    it("harus menolak request tanpa name, email, atau password", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      );

      expect(response.status).toBe(422);
    });

    it("harus menolak format email yang tidak valid", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "invalid-email",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it("harus berhasil registrasi user baru", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Fahmi",
            email: testEmail,
            password: testPassword,
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: "OK" });
    });

    it("harus gagal jika email sudah terdaftar", async () => {
      // Registrasi pertama
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Fahmi",
            email: testEmail,
            password: testPassword,
          }),
        })
      );

      // Registrasi kedua dengan email yang sama
      const res = await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Fahmi Kedua",
            email: testEmail,
            password: "password_lain",
          }),
        })
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ error: "Email sudah terdaftar" });
    });
  });

  describe("POST /api/users/login (Login & Sessions)", () => {
    beforeEach(async () => {
      // Siapkan user aktif untuk login test
      await app.handle(
        new Request("http://localhost/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Fahmi",
            email: testEmail,
            password: testPassword,
          }),
        })
      );
    });

    it("1. Harus berhasil login dan mengembalikan token UUID", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
          }),
        })
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(typeof body.data).toBe("string");
      expect(body.data.length).toBeGreaterThan(10);

      // Verifikasi token tersimpan di tabel sessions
      const sessionRecords = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, body.data));

      expect(sessionRecords.length).toBe(1);
      expect(sessionRecords[0]?.token).toBe(body.data);
    });

    it("2. Harus gagal login jika password salah", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: testEmail,
            password: "password-salah",
          }),
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Email atau Password Salah" });
    });

    it("3. Harus gagal login jika email tidak terdaftar", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "tidak-ada@localhost",
            password: testPassword,
          }),
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Email atau Password Salah" });
    });
  });
});
