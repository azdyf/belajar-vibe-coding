import { Elysia, t } from "elysia";
import { UsersService } from "../services/users-service";

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
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
    }
  );

