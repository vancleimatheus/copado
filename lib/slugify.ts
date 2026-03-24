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