import { Elysia, t } from "elysia";
import { UsersService } from "../services/users-services";

// Regex sederhana untuk validasi email standar (mendukung domain umum maupun localhost/internal)
const emailPattern = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$|^[^\\s@]+@localhost$";

// Helper function untuk ekstraksi Bearer token dari header Authorization
export function extractBearerToken(headers: Record<string, string | undefined>): string {
  const authorization = headers["authorization"];
  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authorization.slice(7).trim();
  if (!token) {
    throw new Error("Unauthorized");
  }
  return token;
}

export const usersRoute = new Elysia({ prefix: "/users" })
  .get("/", async () => {
    const data = await UsersService.getAll();
    return {
      success: true,
      data,
    };
  })
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const result = await UsersService.register(body);
        return {
          data: result,
        };
      } catch (error: any) {
        set.status = 400;
        return {
          error: error.message || "Gagal mendaftarkan user",
        };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.RegExp(emailPattern, {
          error: "Format email tidak valid",
        }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      try {
        const token = await UsersService.login(body);
        return {
          data: token,
        };
      } catch (error: any) {
        set.status = 400;
        return {
          error: error.message || "Gagal melakukan login",
        };
      }
    },
    {
      body: t.Object({
        email: t.RegExp(emailPattern, {
          error: "Format email tidak valid",
        }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )
  .get("/current", async ({ headers, set }) => {
    try {
      const token = extractBearerToken(headers);
      const user = await UsersService.getCurrentUser(token);
      return {
        data: user,
      };
    } catch (error: any) {
      set.status = 401;
      return {
        error: "Unauthorized",
      };
    }
  })
  .delete("/logout", async ({ headers, set }) => {
    try {
      const token = extractBearerToken(headers);
      const result = await UsersService.logout(token);
      return {
        data: result,
      };
    } catch (error: any) {
      set.status = 401;
      return {
        error: "Unauthorized",
      };
    }
  });
