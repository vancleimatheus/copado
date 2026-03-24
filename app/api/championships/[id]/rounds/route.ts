// ============================================================
// app/api/championships/[id]/rounds/route.ts
// Geração automática — algoritmo round-robin
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function roundRobin(teamIds: string[]): [string, string][][] {
  const list = teamIds.length % 2 === 0 ? [...teamIds] : [...teamIds, "BYE"];
  const n = list.length;
  const rounds: [string, string][][] = [];

  for (let r = 0; r < n - 1; r++) {
    const matches: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      if (list[i] !== "BYE" && list[n - 1 - i] !== "BYE") {
        matches.push([list[i], list[n - 1 - i]]);
      }
    }
    rounds.push(matches);
    list.splice(1, 0, list.pop()!); // rotaciona mantendo o primeiro fixo
  }

  return rounds;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const championship = await prisma.championship.findFirst({
    where: { id, ownerId: user.id },
    include: { teams: true },
  });

  if (!championship)
    return NextResponse.json({ error: "Campeonato não encontrado" }, { status: 404 });
  if (championship.teams.length < 2)
    return NextResponse.json({ error: "Adicione ao menos 2 times" }, { status: 400 });

  const rounds = roundRobin(championship.teams.map((t) => t.id));

  await prisma.round.deleteMany({ where: { championshipId: id } });

  await prisma.$transaction(
    rounds.map((matches, i) =>
      prisma.round.create({
        data: {
          championshipId: id,
          number: i + 1,
          label: `Rodada ${i + 1}`,
          matches: {
            create: matches.map(([homeTeamId, awayTeamId]) => ({ homeTeamId, awayTeamId })),
          },
        },
      })
    )
  );

  const created = await prisma.round.findMany({
    where: { championshipId: id },
    include: { matches: { include: { homeTeam: true, awayTeam: true } } },
    orderBy: { number: "asc" },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
