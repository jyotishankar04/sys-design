import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { urlsTable } from "../../db/schema";
import { generateShortCode } from "../../utils";
import { eq } from "drizzle-orm";

export class ShortensService {
  constructor(private db: NodePgDatabase) {}

  async create(originalUrl: string, title?: string) {
      for(let attempt = 0; attempt < 3; attempt++) {
        const shortCode = generateShortCode();
        try {
          const [url] = await this.db.insert(urlsTable).values({
            shortCode,
            originalUrl,
            title
          }).returning()

          return {
            shortCode,
            originalUrl,
            title: url.title,
          }
        } catch (error) {
          if (attempt === 2) throw error
        }
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

  async getAll() {
    const rows = await this.db.select().from(urlsTable)
    return rows.map((row) => ({
      id: row.id.toString(),
      originalUrl: row.originalUrl,
      title: row.title,
      shortCode: row.shortCode,
      createdAt: row.createdAt,
    }))
  }
}
