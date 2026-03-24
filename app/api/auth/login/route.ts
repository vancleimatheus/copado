// ============================================================
// app/api/auth/login/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });
  return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}
