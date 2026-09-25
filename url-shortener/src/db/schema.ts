import { bigserial, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const urlsTable = pgTable("urls", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  originalUrl: text("original_url").notNull(),
  title: text("title"),
  shortCode: varchar("short_code", { length: 20 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
