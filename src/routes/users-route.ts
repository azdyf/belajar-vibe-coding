import { Elysia, t } from "elysia";
import { UsersService } from "../services/users-services";

// Regex sederhana untuk validasi email standar (mendukung domain umum maupun localhost/internal)
const emailPattern = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$|^[^\\s@]+@localhost$";

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
  );
