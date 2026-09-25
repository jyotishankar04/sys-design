import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { urlsTable } from "../../db/schema";
import { generateShortCode } from "../../utils";
import { eq } from "drizzle-orm";

export class ShortensService {
  constructor(private db: NodePgDatabase) {}

  async create(originalUrl: string, title?: string) {
    const [row] = await this.db.insert(urlsTable).values({
      originalUrl,
      shortCode: "pending",
      title,
    }).returning({
      id: urlsTable.id,
      title: urlsTable.title
    })

    const shortCode = generateShortCode();

    await this.db.update(urlsTable).set({
      shortCode
    }).where(eq(urlsTable.id, row.id))

    return {
      shortCode,
      originalUrl,
      title: row.title,
    }
  }

  async get(shortCode: string) {
    const [row] = await this.db.select().from(urlsTable).where(eq(urlsTable.shortCode, shortCode))
    return {
      id: row.id.toString(),
      originalUrl: row.originalUrl,
      title: row.title,
      shortCode: row.shortCode,
      createdAt: row.createdAt,
    }
  }
}
