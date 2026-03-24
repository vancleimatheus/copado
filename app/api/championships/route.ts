// ============================================================
// app/api/championships/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ChampionshipFormat } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { uniqueSlug } from "@/lib/slugify";

const createChampionshipSchema = z.object({
  name: z.string().min(3).max(100),
  format: z.nativeEnum(ChampionshipFormat),
  numTeams: z.number().int().min(2).max(64),
  startDate: z.string().datetime().optional(),
  description: z.string().max(500).optional(),
});

// GET /api/championships
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const championships = await prisma.championship.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { teams: true, rounds: true } } },
  });

  return NextResponse.json({ data: championships });
}

// POST /api/championships
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createChampionshipSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { name, format, numTeams, startDate, description } = parsed.data;
  const slug = await uniqueSlug(prisma, name);

  const championship = await prisma.championship.create({
    data: {
      ownerId: user.id,
      name, slug, format, numTeams, description,
      startDate: startDate ? new Date(startDate) : undefined,
    },
  });

  return NextResponse.json({ data: championship }, { status: 201 });
}
