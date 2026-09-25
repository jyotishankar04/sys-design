import { bigserial, index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const urlsTable = pgTable("urls", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  originalUrl: text("original_url").notNull(),
  title: text("title"),
  shortCode: varchar("short_code", { length: 20 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shortCodesIndex = index("short_code_idx").on(urlsTable.shortCode);
