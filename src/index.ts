import { Elysia } from "elysia";
import { userRoutes } from "./routes/users";

const port = Number(process.env.PORT) || 3000;

const app = new Elysia()
  .get("/", () => ({
    success: true,
    message: "Server is running smoothly with Elysia + Bun + Drizzle + MySQL",
    timestamp: new Date().toISOString(),
  }))
  .use(userRoutes)
  .listen(port);

console.log(`🦊 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;

