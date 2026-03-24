import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function getAuthUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { userId: string };
    return prisma.user.findUnique({ where: { id: payload.userId } });
  } catch {
    return null;
  }
}