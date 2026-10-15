import { Elysia } from "elysia";
import { usersRoute } from "./routes/users-route";

const port = Number(process.env.PORT) || 3000;

export const app = new Elysia()
  .get("/", () => ({
    success: true,
    message: "Server is running smoothly with Elysia + Bun + Drizzle + MySQL",
    timestamp: new Date().toISOString(),
  }))
  .group("/api", (app) => app.use(usersRoute));

if (import.meta.main) {
  app.listen(port);
  console.log(`🦊 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`);
}

export type App = typeof app;

