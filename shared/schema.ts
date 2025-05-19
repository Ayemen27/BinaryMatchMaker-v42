import { pgTable, text, serial, integer, boolean, varchar, timestamp, pgEnum, foreignKey, uniqueIndex, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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
  lastLogin: timestamp("last_login"),
  avatar: text("avatar"),
  phoneNumber: text("phone_number"),
  isActive: boolean("is_active").default(true).notNull(),
});

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  userSettings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId]
  }),
  userNotifications: one(userNotificationSettings, {
    fields: [users.id],
    references: [userNotificationSettings.userId]
  }),
  userSignals: many(userSignals),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId]
  })
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  language: true,
});

// User Settings schema
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").default("dark").notNull(),
  defaultAsset: text("default_asset").default("BTC/USDT"),
  defaultTimeframe: text("default_timeframe").default("1h"),
  defaultPlatform: text("default_platform"),
  chartType: text("chart_type").default("candlestick"),
  showTradingTips: boolean("show_trading_tips").default(true),
  autoRefreshData: boolean("auto_refresh_data").default(true),
  refreshInterval: integer("refresh_interval").default(60), // In seconds
  // إعدادات الذكاء الاصطناعي
  useAiForSignals: boolean("use_ai_for_signals").default(true), // استخدام الذكاء الاصطناعي لتوليد الإشارات
  useCustomAiKey: boolean("use_custom_ai_key").default(false), // استخدام مفتاح OpenAI خاص
  openaiApiKey: text("openai_api_key"), // مفتاح API الخاص بـ OpenAI
  // إعدادات توليد الإشارات الإضافية
  enableOtcTrading: boolean("enable_otc_trading").default(false), // تفعيل التداول خارج السوق
  allowScheduledSignals: boolean("allow_scheduled_signals").default(true), // السماح بجدولة الإشارات عندما يكون السوق مغلق
  respectTimeframes: boolean("respect_timeframes").default(true), // احترام الإطار الزمني عند توليد إشارات جديدة
  lastSignalTime: timestamp("last_signal_time"), // وقت آخر إشارة تم توليدها
  preferredPlatforms: text("preferred_platforms").array(), // المنصات المفضلة
  preferredPairs: text("preferred_pairs").array(), // الأزواج المفضلة
  preferredTimeframes: text("preferred_timeframes").array(), // الأطر الزمنية المفضلة
  signalHistory: json("signal_history"), // تاريخ الإشارات الأخيرة المولدة
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: uniqueIndex("user_settings_user_id_idx").on(table.userId)
  };
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User Notification Settings
export const userNotificationSettings = pgTable("user_notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  signalAlerts: boolean("signal_alerts").default(true),
  marketUpdates: boolean("market_updates").default(true),
  accountAlerts: boolean("account_alerts").default(true),
  promotionalEmails: boolean("promotional_emails").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: uniqueIndex("user_notification_settings_user_id_idx").on(table.userId)
  };
});

export const insertUserNotificationSettingsSchema = createInsertSchema(userNotificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Subscriptions
export const subscriptionTypeEnum = pgEnum("subscription_type", ["free", "basic", "pro", "vip"]);

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: subscriptionTypeEnum("type").default("free").notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  dailySignalLimit: integer("daily_signal_limit").default(3), // For free users
  transactionId: text("transaction_id"),
  paymentMethod: text("payment_method"),
  amount: integer("amount"),
  currency: text("currency"),
  autoRenew: boolean("auto_renew").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: uniqueIndex("subscriptions_user_id_idx").on(table.userId)
  };
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
  platform: text("platform"),
  timeframe: text("timeframe"),
  analysis: json("analysis"), // Store additional analysis data in JSON format
  reason: text("reason"), // Reason for the signal
  createdBy: integer("created_by"), // Admin/System generated signals
  isPublic: boolean("is_public").default(true), // If false, only visible to the creator
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  result: signalResultEnum("result"),
});

// Signal relations
export const signalsRelations = relations(signals, ({ many }) => ({
  userSignals: many(userSignals)
}));

export const insertSignalSchema = createInsertSchema(signals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  result: true,
});

// User Signals (many-to-many relationship)
export const userSignals = pgTable("user_signals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  signalId: integer("signal_id").notNull().references(() => signals.id, { onDelete: "cascade" }),
  isFavorite: boolean("is_favorite").default(false),
  isTaken: boolean("is_taken").default(false), // If the user acted on this signal
  notes: text("notes"), // User's personal notes about this signal
  result: signalResultEnum("result"), // User's personal result with this signal
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    uniqueUserSignal: uniqueIndex("unique_user_signal_idx").on(table.userId, table.signalId)
  };
});

// User Signals relations
export const userSignalsRelations = relations(userSignals, ({ one }) => ({
  user: one(users, {
    fields: [userSignals.userId],
    references: [users.id]
  }),
  signal: one(signals, {
    fields: [userSignals.signalId],
    references: [signals.id]
  })
}));

export const insertUserSignalSchema = createInsertSchema(userSignals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User signal usage tracking
export const userSignalUsage = pgTable("user_signal_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").defaultNow().notNull(),
  signalsGenerated: integer("signals_generated").default(0),
  signalsViewed: integer("signals_viewed").default(0),
  analysisRequested: integer("analysis_requested").default(0),
});

// Notifications
export const notificationTypeEnum = pgEnum("notification_type", ["signal", "market", "account", "system"]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  link: text("link"), // Optional link to navigate to
  relatedId: integer("related_id"), // e.g. signal_id if it's a signal notification
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

// Market Data
export const marketData = pgTable("market_data", {
  id: serial("id").primaryKey(),
  asset: text("asset").notNull(),
  price: text("price").notNull(),
  change24h: text("change_24h"),
  high24h: text("high_24h"),
  low24h: text("low_24h"),
  volume24h: text("volume_24h"),
  marketCap: text("market_cap"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  dataSource: text("data_source"), // Where the data came from
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserNotificationSettings = typeof userNotificationSettings.$inferSelect;
export type InsertUserNotificationSettings = z.infer<typeof insertUserNotificationSettingsSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Signal = typeof signals.$inferSelect;
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type UserSignal = typeof userSignals.$inferSelect;
export type InsertUserSignal = z.infer<typeof insertUserSignalSchema>;
export type UserSignalUsage = typeof userSignalUsage.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type MarketData = typeof marketData.$inferSelect;
