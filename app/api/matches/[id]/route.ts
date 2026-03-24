// ============================================================
// app/api/matches/[id]/route.ts — Lançar resultado
// Recalcula classificação automaticamente após salvar
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";

async function recalcStanding(championshipId: string, teamId: string) {
  const matches = await prisma.match.findMany({
    where: {
      status: "ENCERRADA",
      round: { championshipId },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
  });

  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;

  for (const m of matches) {
    const isHome = m.homeTeamId === teamId;
    const my = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const their = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
    gf += my;
    ga += their;
    if (my > their) wins++;
    else if (my === their) draws++;
    else losses++;
  }

  await prisma.standing.upsert({
    where: { teamId },
    update: {
      played: wins + draws + losses,
      wins, draws, losses,
      goalsFor: gf, goalsAgainst: ga,
      points: wins * 3 + draws,
    },
    create: {
      championshipId, teamId,
      played: wins + draws + losses,
      wins, draws, losses,
      goalsFor: gf, goalsAgainst: ga,
      points: wins * 3 + draws,
    },
  });
}

const matchResultSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  matchDatetime: z.string().datetime().optional(),
  location: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const parsed = matchResultSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      ...parsed.data,
      status: "ENCERRADA",
      matchDatetime: parsed.data.matchDatetime
        ? new Date(parsed.data.matchDatetime)
        : undefined,
    },
  });

  // Recalcula os dois times em paralelo
  await Promise.all([
    recalcStanding(match.round.championshipId, match.homeTeamId),
    recalcStanding(match.round.championshipId, match.awayTeamId),
  ]);

  return NextResponse.json({ data: updated });
}
