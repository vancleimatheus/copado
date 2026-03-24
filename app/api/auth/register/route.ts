// ============================================================
// app/api/auth/register/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { name, email, phone, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists)
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, phone, passwordHash } });
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });

  return NextResponse.json(
    { token, user: { id: user.id, name: user.name, email: user.email } },
    { status: 201 }
  );
}