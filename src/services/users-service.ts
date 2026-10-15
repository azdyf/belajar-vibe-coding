import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, type NewUser } from "../db/schema";

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export class UsersService {
  static async register(dto: RegisterDTO) {
    // 1. Cek apakah email sudah terdaftar
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (existingUsers.length > 0) {
      throw new Error("Email sudah terdaftar");
    }

    // 2. Hash password menggunakan bcrypt bawaan Bun
    const hashedPassword = await Bun.password.hash(dto.password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    // 3. Simpan data user ke database
    await db.insert(users).values({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    return "OK";
  }

  static async getAll() {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users);
  }
}
