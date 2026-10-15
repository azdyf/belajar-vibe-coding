import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, sessions } from "../db/schema";

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
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

  static async login(dto: LoginDTO) {
    // 1. Cari user berdasarkan email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (!user) {
      throw new Error("Email atau Password Salah");
    }

    // 2. Verifikasi password dengan hash bcrypt
    const isPasswordValid = await Bun.password.verify(dto.password, user.password);
    if (!isPasswordValid) {
      throw new Error("Email atau Password Salah");
    }

    // 3. Generate token UUID unik
    const token = crypto.randomUUID();

    // 4. Simpan session baru ke tabel sessions
    await db.insert(sessions).values({
      token,
      userId: user.id,
    });

    // 5. Kembalikan token
    return token;
  }

  static async getCurrentUser(token: string) {
    // 1. Cari sesi berdasarkan token
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    if (!session) {
      throw new Error("Unauthorized");
    }

    // 2. Cari data pengguna berdasarkan session.userId
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      throw new Error("Unauthorized");
    }

    // 3. Kembalikan data user tanpa password
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.createdAt.toISOString(),
    };
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
