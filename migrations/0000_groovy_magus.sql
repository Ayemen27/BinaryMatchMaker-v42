CREATE TYPE "public"."notification_type" AS ENUM('signal', 'market', 'account', 'system');--> statement-breakpoint
CREATE TYPE "public"."signal_result" AS ENUM('success', 'failure');--> statement-breakpoint
CREATE TYPE "public"."signal_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."signal_type" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."subscription_type" AS ENUM('free', 'basic', 'pro', 'vip');--> statement-breakpoint
CREATE TABLE "market_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset" text NOT NULL,
	"price" text NOT NULL,
	"change_24h" text,
	"high_24h" text,
	"low_24h" text,
	"volume_24h" text,
	"market_cap" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"data_source" text
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"link" text,
	"related_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset" text NOT NULL,
	"type" "signal_type" NOT NULL,
	"entry_price" text NOT NULL,
	"target_price" text NOT NULL,
	"stop_loss" text NOT NULL,
	"accuracy" integer NOT NULL,
	"time" text NOT NULL,
	"status" "signal_status" DEFAULT 'active' NOT NULL,
	"indicators" text[] NOT NULL,
	"platform" text,
	"timeframe" text,
	"analysis" json,
	"reason" text,
	"created_by" integer,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"result" "signal_result"
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "subscription_type" DEFAULT 'free' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"daily_signal_limit" integer DEFAULT 3,
	"transaction_id" text,
	"payment_method" text,
	"amount" integer,
	"currency" text,
	"auto_renew" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notification_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email_notifications" boolean DEFAULT true,
	"push_notifications" boolean DEFAULT true,
	"signal_alerts" boolean DEFAULT true,
	"market_updates" boolean DEFAULT true,
	"account_alerts" boolean DEFAULT true,
	"promotional_emails" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"theme" text DEFAULT 'dark' NOT NULL,
	"default_asset" text DEFAULT 'BTC/USDT',
	"default_timeframe" text DEFAULT '1h',
	"default_platform" text,
	"chart_type" text DEFAULT 'candlestick',
	"show_trading_tips" boolean DEFAULT true,
	"auto_refresh_data" boolean DEFAULT true,
	"refresh_interval" integer DEFAULT 60,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_signal_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"signals_generated" integer DEFAULT 0,
	"signals_viewed" integer DEFAULT 0,
	"analysis_requested" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "user_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"signal_id" integer NOT NULL,
	"is_favorite" boolean DEFAULT false,
	"is_taken" boolean DEFAULT false,
	"notes" text,
	"result" "signal_result",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"full_name" text,
	"subscription_level" text DEFAULT 'free' NOT NULL,
	"subscription_expiry" timestamp,
	"language" text DEFAULT 'ar' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login" timestamp,
	"avatar" text,
	"phone_number" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_signal_usage" ADD CONSTRAINT "user_signal_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_signals" ADD CONSTRAINT "user_signals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_signals" ADD CONSTRAINT "user_signals_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_notification_settings_user_id_idx" ON "user_notification_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_id_idx" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_signal_idx" ON "user_signals" USING btree ("user_id","signal_id");