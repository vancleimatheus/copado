# Guia de Deploy — Copado
## Next.js + Supabase + Vercel
### Do zero ao ar em ~2 horas

---

## Pré-requisitos

Antes de começar, você vai precisar de:

- **Node.js 18+** instalado ([nodejs.org](https://nodejs.org))
- **Git** instalado ([git-scm.com](https://git-scm.com))
- Conta gratuita no **GitHub** ([github.com](https://github.com))
- Conta gratuita no **Supabase** ([supabase.com](https://supabase.com))
- Conta gratuita na **Vercel** ([vercel.com](https://vercel.com))

Tempo estimado: **1h30–2h** na primeira vez.

---

## Etapa 1 — Criar o projeto Next.js (15 min)

Abra o terminal e execute:

```bash
npx create-next-app@latest copado \
  --typescript \
  --app \
  --tailwind \
  --eslint \
  --src-dir=false

cd copado
```

### 1.1 Instalar dependências

```bash
# Banco de dados e ORM
npm install prisma @prisma/client

# Validação de dados
npm install zod

# Autenticação
npm install bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken

# Geração de slug
npm install slugify

# Tipagens do Node
npm install -D @types/node
```

### 1.2 Copiar os arquivos gerados

Copie os arquivos que geramos para as seguintes pastas:

```
copado/
├── prisma/
│   └── schema.prisma          ← copiar schema.prisma aqui
├── app/
│   ├── c/[slug]/
│   │   └── page.tsx           ← copiar public-page.tsx aqui
│   └── dashboard/
│       └── page.tsx           ← copiar dashboard.tsx aqui
└── app/api/                   ← criar as rotas conforme api-routes.ts
```

### 1.3 Criar estrutura de pastas das APIs

```bash
mkdir -p app/api/auth/register
mkdir -p app/api/auth/login
mkdir -p app/api/championships
mkdir -p "app/api/championships/[id]"
mkdir -p "app/api/championships/[id]/teams"
mkdir -p "app/api/championships/[id]/rounds"
mkdir -p "app/api/championships/[id]/standings"
mkdir -p "app/api/matches/[id]"
mkdir -p "app/api/matches/[id]/goals"
mkdir -p "app/api/matches/[id]/cards"
mkdir -p "app/api/public/[slug]"
mkdir -p lib
```

---

## Etapa 2 — Configurar o Supabase (25 min)

### 2.1 Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e clique em **New project**
2. Escolha um nome: `copado`
3. Defina uma senha forte para o banco (guarde-a!)
4. Selecione região: **South America (São Paulo)** — menor latência no Brasil
5. Clique em **Create new project** e aguarde ~2 minutos

### 2.2 Criar um usuário dedicado para o Prisma (novo — recomendado pela Supabase)

A Supabase agora recomenda criar um usuário separado para o Prisma, em vez de usar o `postgres` diretamente. Isso dá mais controle de acesso e facilita o monitoramento.

1. No painel do Supabase, vá em **SQL Editor → New query**
2. Cole e execute o seguinte SQL (substitua `sua_senha_aqui` por uma senha forte):

```sql
-- Criar usuário dedicado para o Prisma
create user "prisma" with password 'sua_senha_aqui' bypassrls createdb;

-- Estender privilégios ao postgres (necessário para visualizar no Dashboard)
grant "prisma" to "postgres";

-- Conceder permissões no schema public
grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;
alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

### 2.3 Pegar as strings de conexão (novo formato)

A Supabase mudou onde ficam as strings de conexão para Prisma:

1. No painel do Supabase, clique em **Connect** (botão no topo)
2. Selecione a aba **ORMs**
3. Selecione **Prisma** no dropdown
4. Você verá **duas strings** — copie as duas:

**Transaction pooler** (porta 6543) — usada em runtime/produção:
```
postgres://prisma.SEU-PROJECT-REF:SUA-SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

**Session pooler** (porta 5432) — usada para migrations:
```
postgres://prisma.SEU-PROJECT-REF:SUA-SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

> **Atenção:** O formato do usuário agora é `prisma.PROJECT-REF` (com o ID do projeto junto), não apenas `prisma`. Copie exatamente como aparece no painel.

### 2.4 Pegar as chaves da API

1. Vá em **Settings → API**
2. Copie:
   - **Project URL** → será o `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → será o `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Etapa 3 — Configurar variáveis de ambiente (5 min)

Na raiz do projeto, crie o arquivo `.env`:

```bash
touch .env
```

Abra o arquivo e adicione (com as strings do passo 2.3):

```env
# ─── Prisma + Supabase (dois URLs obrigatórios) ───────────────
# Usado em runtime — transaction pooler, porta 6543
DATABASE_URL="postgres://prisma.SEU-REF:SUA-SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Usado nas migrations — session pooler, porta 5432
DIRECT_URL="postgres://prisma.SEU-REF:SUA-SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# ─── JWT ─────────────────────────────────────────────────────
JWT_SECRET="cole-aqui-uma-string-aleatoria-de-pelo-menos-32-caracteres"

# ─── Supabase ─────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://SEU-REF.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-anon-key-aqui"

# ─── App ──────────────────────────────────────────────────────
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### Por que dois URLs agora?

- **`DATABASE_URL`** usa o connection pooler de transação (porta 6543), ideal para ambientes serverless como a Vercel onde cada request pode abrir uma nova conexão. O parâmetro `?pgbouncer=true&connection_limit=1` é obrigatório aqui.
- **`DIRECT_URL`** usa conexão direta (porta 5432), necessária para o Prisma rodar migrations — o pooler de transação não suporta os comandos DDL das migrations.

### Gerar o JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Atualizar o schema.prisma para usar os dois URLs

Abra `prisma/schema.prisma` e certifique que o `datasource` está assim:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Proteger o .env

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

**⚠️ NUNCA faça commit do arquivo .env. Ele contém credenciais sensíveis.**

---

## Etapa 4 — Configurar o Prisma e criar as tabelas (15 min)

### 4.1 Inicializar o Prisma

```bash
npx prisma init
```

### 4.2 Substituir pelo schema completo

Copie o conteúdo do `schema.prisma` gerado para `prisma/schema.prisma`.
Confirme que o bloco `datasource db` tem o `directUrl` conforme mostrado acima.

### 4.3 Criar as tabelas no banco

```bash
npx prisma migrate dev --name init
```

O Prisma usará automaticamente o `DIRECT_URL` para rodar a migration e o `DATABASE_URL` para as operações normais. Se tudo correr bem:

```
✔ Generated Prisma Client
Your database is now in sync with your schema.
```

### 4.4 Gerar o Prisma Client

```bash
npx prisma generate
```

### 4.5 Verificar no Supabase

1. Vá em **Table Editor** no painel do Supabase
2. Você deve ver todas as tabelas criadas: `users`, `championships`, `teams`, etc.

### 4.6 Criar o singleton do Prisma Client

Crie o arquivo `lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### 4.7 Criar o helper de autenticação

Crie `lib/auth.ts`:

```typescript
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
```

### 4.8 Criar o helper de slug

Crie `lib/slugify.ts`:

```typescript
import slugify from "slugify";
import { PrismaClient } from "@prisma/client";

export async function uniqueSlug(
  prisma: PrismaClient,
  name: string
): Promise<string> {
  const base = slugify(name, { lower: true, strict: true, locale: "pt" });
  let slug = base;
  let i = 1;
  while (await prisma.championship.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
```

---

## Etapa 5 — Testar localmente (10 min)

### 5.1 Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

### 5.2 Testar as rotas com cURL

```bash
# Criar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Organizador",
    "email": "joao@teste.com",
    "password": "senha123"
  }'
```

```bash
# Guardar o token retornado
TOKEN="eyJ..."

# Criar campeonato
curl -X POST http://localhost:3000/api/championships \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Copa Teste 2025",
    "format": "PONTOS_CORRIDOS",
    "numTeams": 4
  }'
```

### 5.3 Abrir o Prisma Studio (opcional)

```bash
npx prisma studio
```

---

## Etapa 6 — Deploy na Vercel (20 min)

### 6.1 Criar repositório no GitHub

```bash
git init
git add .
git commit -m "feat: initial commit"

# Com GitHub CLI:
gh repo create copado --public --push --source=.

# Alternativa: criar manualmente em github.com e fazer o push
```

### 6.2 Conectar à Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **Add New → Project**
3. Encontre o repositório `copado` e clique em **Import**
4. Em **Framework Preset**, selecione **Next.js**
5. **Não clique em Deploy ainda** — configure as variáveis primeiro

### 6.3 Configurar variáveis de ambiente na Vercel

Na tela de configuração, clique em **Environment Variables** e adicione todas:

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | String do transaction pooler (porta 6543) com `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | String do session pooler (porta 5432) sem parâmetros extras |
| `JWT_SECRET` | Sua chave JWT gerada |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `NEXT_PUBLIC_BASE_URL` | `https://copado.vercel.app` (preencha após o primeiro deploy) |

### 6.4 Adicionar o postinstall ao package.json

Antes de fazer o deploy, adicione ao `package.json` para garantir que o Prisma Client seja gerado na Vercel:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "postinstall": "prisma generate"
}
```

### 6.5 Fazer o deploy

Clique em **Deploy** e aguarde ~3 minutos.

---

## Etapa 7 — Configurar domínio personalizado (opcional, 10 min)

Se quiser usar `copado.com.br`:

1. Registre o domínio no [Registro.br](https://registro.br) (~R$ 40/ano)
2. Na Vercel: **Settings → Domains → Add Domain**
3. Configure os registros DNS conforme indicado pela Vercel
4. Aguarde a propagação (5–30 minutos)

---

## Etapa 8 — Checklist pós-deploy ✓

- [ ] Página inicial carrega em `https://copado.vercel.app`
- [ ] `POST /api/auth/register` cria usuário com sucesso
- [ ] `POST /api/auth/login` retorna token JWT
- [ ] `POST /api/championships` cria campeonato
- [ ] Página pública `/c/[slug]` carrega sem login
- [ ] Pageview é registrada na tabela `page_views` ao acessar campeonato
- [ ] Página pública carrega em menos de 2s no celular (teste em 3G)
- [ ] `.env` **não** está no repositório GitHub

---

## Comandos úteis do dia a dia

```bash
# Desenvolvimento local
npm run dev

# Verificar tipos TypeScript (simula o build)
npm run build

# Visualizador do banco
npx prisma studio

# Criar nova migration após alterar o schema
npx prisma migrate dev --name nome-da-alteracao

# Apenas sincronizar schema sem migration (sem histórico — use com cuidado)
npx prisma db push

# Ver logs da Vercel em tempo real
vercel logs --follow

# Deploy manual sem push no GitHub
vercel --prod
```

---

## Custos mensais estimados (fase gratuita)

| Serviço | Plano gratuito | Limite |
|---------|---------------|--------|
| **Vercel** | Hobby (grátis) | 100GB bandwidth/mês |
| **Supabase** | Free tier | 500MB banco, 2GB transfer/mês |
| **Domínio .com.br** | — | ~R$ 3,50/mês (Registro.br) |

**Total: R$ 0–4/mês** até você ter escala relevante.

---

## Problemas comuns e soluções

### "Cannot connect to database" na migration
- Confirme que está usando o `DIRECT_URL` (porta 5432) no `directUrl` do schema
- O connection pooler (porta 6543) **não suporta migrations** — esse é o erro mais comum

### "PrismaClientInitializationError" em produção
- Confirme que o `postinstall` está no `package.json`
- Sem ele, a Vercel usa um Prisma Client em cache desatualizado

### "Prepared statement already exists" / erros de conexão em produção
- Adicione `?pgbouncer=true&connection_limit=1` ao `DATABASE_URL`
- Esses parâmetros são obrigatórios ao usar PgBouncer (Supavisor) no modo transação

### Build falha na Vercel com erro de TypeScript
- Rode `npm run build` localmente antes de fazer push — erros de tipo bloqueiam o build na Vercel

### "Invalid token" na API
- Confirme que o `JWT_SECRET` é idêntico no `.env` local e nas variáveis da Vercel
- Tokens expiram em 30 dias

### Migrations travadas / "drift detected"
- Se o banco foi modificado manualmente fora do Prisma, rode:
```bash
npx prisma migrate resolve --applied 0_init
```

---

## Próximos passos após o deploy

1. **Compartilhe o link** com os primeiros organizadores
2. **Monitore** as `page_views` no Prisma Studio para medir alcance viral
3. **Colete feedback** semanalmente com os primeiros usuários
4. **Itere rápido** — todo `git push` dispara deploy automático na Vercel

Lembre-se: **a meta dos primeiros 30 dias é ter 5 campeonatos ativos**, não um produto perfeito.
