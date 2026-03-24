-- CreateEnum
CREATE TYPE "ChampionshipFormat" AS ENUM ('PONTOS_CORRIDOS', 'MATA_MATA', 'GRUPOS_E_MATA_MATA');

-- CreateEnum
CREATE TYPE "ChampionshipStatus" AS ENUM ('RASCUNHO', 'INSCRICOES_ABERTAS', 'EM_ANDAMENTO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'VOLANTE', 'MEIA', 'ATACANTE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('AGENDADA', 'EM_ANDAMENTO', 'ENCERRADA', 'CANCELADA', 'WO');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('AMARELO', 'VERMELHO', 'AMARELO_VERMELHO');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDENTE', 'ENVIADO', 'FALHOU');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ATIVA', 'CANCELADA', 'INADIMPLENTE', 'TRIAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "championships" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "format" "ChampionshipFormat" NOT NULL,
    "num_teams" INTEGER NOT NULL,
    "status" "ChampionshipStatus" NOT NULL DEFAULT 'RASCUNHO',
    "start_date" TIMESTAMP(3),
    "description" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "championships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "championship_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manager_name" TEXT NOT NULL,
    "manager_phone" TEXT,
    "shield_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER,
    "position" "PlayerPosition",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "championship_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3),

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "home_team_id" TEXT NOT NULL,
    "away_team_id" TEXT NOT NULL,
    "home_score" INTEGER,
    "away_score" INTEGER,
    "status" "MatchStatus" NOT NULL DEFAULT 'AGENDADA',
    "match_datetime" TIMESTAMP(3),
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "minute" INTEGER,
    "own_goal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "type" "CardType" NOT NULL,
    "minute" INTEGER,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standings" (
    "id" TEXT NOT NULL,
    "championship_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "goals_for" INTEGER NOT NULL DEFAULT 0,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "championship_id" TEXT NOT NULL,
    "visitor_token" TEXT NOT NULL,
    "source" TEXT,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_notifications" (
    "id" TEXT NOT NULL,
    "championship_id" TEXT NOT NULL,
    "match_id" TEXT,
    "recipient_phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDENTE',
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_monthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "max_championships" INTEGER NOT NULL DEFAULT 1,
    "whatsapp_notify" BOOLEAN NOT NULL DEFAULT false,
    "advanced_stats" BOOLEAN NOT NULL DEFAULT false,
    "multiple_admins" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "current_period_end" TIMESTAMP(3),
    "gateway_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "championships_slug_key" ON "championships"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_championship_id_number_key" ON "rounds"("championship_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "standings_team_id_key" ON "standings"("team_id");

-- CreateIndex
CREATE INDEX "page_views_championship_id_viewed_at_idx" ON "page_views"("championship_id", "viewed_at");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- AddForeignKey
ALTER TABLE "championships" ADD CONSTRAINT "championships_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_championship_id_fkey" FOREIGN KEY ("championship_id") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_championship_id_fkey" FOREIGN KEY ("championship_id") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_championship_id_fkey" FOREIGN KEY ("championship_id") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_championship_id_fkey" FOREIGN KEY ("championship_id") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notifications" ADD CONSTRAINT "whatsapp_notifications_championship_id_fkey" FOREIGN KEY ("championship_id") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
