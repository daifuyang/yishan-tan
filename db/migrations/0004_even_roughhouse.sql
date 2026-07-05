CREATE TYPE "public"."portal_theme_mode" AS ENUM('light', 'dark');--> statement-breakpoint
CREATE TABLE "portal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"domain" text,
	"logo_url" text,
	"theme_primary" text,
	"theme_mode" "portal_theme_mode" DEFAULT 'light' NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "portal_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "portal_default_unique_idx" ON "portal" USING btree ((true)) WHERE "portal"."is_default" = true AND "portal"."deleted_at" IS NULL;