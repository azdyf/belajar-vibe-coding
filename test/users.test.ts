import { describe, expect, it } from "bun:test";
import { usersRoute } from "../src/routes/users-route";

describe("Users Route Validation", () => {
  it("harus menolak request tanpa name, email, atau password", async () => {
    const response = await usersRoute.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(422);
  });

  it("harus menolak format email yang tidak valid", async () => {
    const response = await usersRoute.handle(
      new Request("http://localhost/users", {
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
});
