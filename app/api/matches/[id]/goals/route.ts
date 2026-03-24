// ============================================================
// app/api/matches/[id]/goals/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";

const goalSchema = z.object({
  playerId: z.string().uuid(),
  teamId: z.string().uuid(),
  minute: z.number().int().min(1).max(120).optional(),
  ownGoal: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: matchId } = await params;

  const match = await prisma.match.findFirst({
    where: { id: matchId },
    include: { round: { include: { championship: true } } },
  });

  if (!match)
    return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 });
  if (match.round.championship.ownerId !== user.id)
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = goalSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const goal = await prisma.goal.create({
    data: { matchId, ...parsed.data },
    include: { player: true, team: true },
  });

  return NextResponse.json({ data: goal }, { status: 201 });
}
