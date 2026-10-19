import { describe, expect, it, beforeEach } from "bun:test";
import { app } from "../src/index";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";

// Shared helper function untuk registrasi dan login user test
async function registerAndLogin(name: string, email: string, password: string): Promise<string> {
  await app.handle(
    new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })
  );

  const loginRes = await app.handle(
    new Request("http://localhost/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );

  const loginJson: any = await loginRes.json();
  return loginJson.data;
}

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

  describe("GET /api/users/current (Get Current User)", () => {
    let validToken: string;

    beforeEach(async () => {
      validToken = await registerAndLogin("fahmi", testEmail, testPassword);
    });

    it("1. Harus berhasil mendapatkan profil user saat ini dengan token valid", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const body: any = await res.json();

      expect(body.data).toBeDefined();
      expect(body.data.name).toBe("fahmi");
      expect(body.data.email).toBe(testEmail);
      expect(typeof body.data.id).toBe("number");
      expect(typeof body.data.created_at).toBe("string");
      // Pastikan password tidak dibocorkan
      expect(body.data.password).toBeUndefined();
    });

    it("2. Harus mengembalikan 401 Unauthorized jika header Authorization tidak ada", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("3. Harus mengembalikan 401 Unauthorized jika token tidak diawali Bearer", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: validToken,
          },
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("4. Harus mengembalikan 401 Unauthorized jika token tidak valid atau tidak terdaftar", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: "Bearer token-palsu-12345",
          },
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });
  });

  describe("DELETE /api/users/logout (Logout User)", () => {
    let validToken: string;

    beforeEach(async () => {
      validToken = await registerAndLogin("fahmi", testEmail, testPassword);
    });

    it("1. Harus berhasil logout dengan token valid (Response: { data: 'OK' }) dan session terhapus", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ data: "OK" });

      // Verifikasi token session sudah terhapus dari tabel sessions di DB
      const sessionInDb = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, validToken));

      expect(sessionInDb.length).toBe(0);
    });

    it("2. Token yang sudah logout tidak dapat digunakan kembali", async () => {
      // Lakukan logout pertama
      const logoutRes = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );
      expect(logoutRes.status).toBe(200);

      // Coba akses current user dengan token yang sama -> harus 401 Unauthorized
      const currentRes = await app.handle(
        new Request("http://localhost/api/users/current", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );
      expect(currentRes.status).toBe(401);
      const currentBody = await currentRes.json();
      expect(currentBody).toEqual({ error: "Unauthorized" });

      // Coba logout lagi dengan token yang sama -> harus 401 Unauthorized
      const repeatLogoutRes = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );
      expect(repeatLogoutRes.status).toBe(401);
      const repeatLogoutBody = await repeatLogoutRes.json();
      expect(repeatLogoutBody).toEqual({ error: "Unauthorized" });
    });

    it("3. Harus mengembalikan 401 Unauthorized jika header Authorization tidak ada", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("4. Harus mengembalikan 401 Unauthorized jika token tidak valid", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: "Bearer token-palsu-ngawur",
          },
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });
  });
});
