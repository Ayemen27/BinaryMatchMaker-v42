import { pgTable, text, serial, integer, boolean, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  subscriptionLevel: text("subscription_level").default("free").notNull(),
  subscriptionExpiry: timestamp("subscription_expiry"),
  language: text("language").default("ar").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

// Signal types enum
export const signalTypeEnum = pgEnum("signal_type", ["buy", "sell"]);

// Signal status enum
export const signalStatusEnum = pgEnum("signal_status", ["active", "completed"]);

// Signal result enum
export const signalResultEnum = pgEnum("signal_result", ["success", "failure"]);

// Signal schema
export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  asset: text("asset").notNull(),
  type: signalTypeEnum("type").notNull(),
  entryPrice: text("entry_price").notNull(),
  targetPrice: text("target_price").notNull(),
  stopLoss: text("stop_loss").notNull(),
  accuracy: integer("accuracy").notNull(),
  time: text("time").notNull(),
  status: signalStatusEnum("status").default("active").notNull(),
  indicators: text("indicators").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  result: signalResultEnum("result"),
});

export const insertSignalSchema = createInsertSchema(signals).omit({
  id: true,
  createdAt: true,
  result: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Signal = typeof signals.$inferSelect;
export type InsertSignal = z.infer<typeof insertSignalSchema>;
