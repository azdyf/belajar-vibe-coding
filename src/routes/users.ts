import { Elysia, t } from "elysia";
import { db } from "../db";
import { users } from "../db/schema";

export const userRoutes = new Elysia({ prefix: "/users" })
  .get("/", async () => {
    const allUsers = await db.select().from(users);
    return {
      success: true,
      data: allUsers,
    };
  })
  .post(
    "/",
    async ({ body, set }) => {
      try {
        await db.insert(users).values({
          name: body.name,
          email: body.email,
        });
        set.status = 201;
        return {
          success: true,
          message: "User created successfully",
        };
      } catch (error: any) {
        set.status = 400;
        return {
          success: false,
          error: error.message || "Failed to create user",
        };
      }
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String({ format: "email" }),
      }),
    }
  );

