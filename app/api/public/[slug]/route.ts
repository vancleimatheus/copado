// ============================================================
// app/api/public/[slug]/route.ts
// Sem autenticação — dados da página pública compartilhável
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const championship = await prisma.championship.findUnique({
    where: { slug },
    include: {
      standings: {
        include: { team: true },
        orderBy: [{ points: "desc" }, { goalsFor: "desc" }, { goalsAgainst: "asc" }],
      },
      rounds: {
        orderBy: { number: "asc" },
        include: {
          matches: {
            include: {
              homeTeam: true,
              awayTeam: true,
              goals: {
                include: { player: true },
                orderBy: { minute: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!championship || championship.status === "RASCUNHO")
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Artilheiros
  const topScorers = await prisma.goal.groupBy({
    by: ["playerId"],
    where: {
      match: { round: { championshipId: championship.id } },
      ownGoal: false,
    },
    _count: { playerId: true },
    orderBy: { _count: { playerId: "desc" } },
    take: 10,
  });

  const scorerPlayers = await prisma.player.findMany({
    where: { id: { in: topScorers.map((s) => s.playerId) } },
    include: { team: true },
  });

  const artilheiros = topScorers.map((s) => ({
    goals: s._count.playerId,
    player: scorerPlayers.find((p) => p.id === s.playerId),
  }));

  // Pageview anônima (fire and forget — não bloqueia resposta)
  const visitorToken = req.cookies.get("visitor_token")?.value ?? crypto.randomUUID();
  const referer = req.headers.get("referer") ?? "";
  const source = referer.includes("whatsapp") ? "whatsapp"
    : referer.includes("instagram") ? "instagram"
    : referer.includes("facebook") ? "facebook"
    : "direct";

  prisma.pageView.create({
    data: { championshipId: championship.id, visitorToken, source },
  }).catch(() => {});

  const res = NextResponse.json({ data: { championship, artilheiros } });

  if (!req.cookies.get("visitor_token")) {
    res.cookies.set("visitor_token", visitorToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return res;
}
