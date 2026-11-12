CREATE TYPE "public"."portal_article_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."portal_template_type" AS ENUM('article', 'page');--> statement-breakpoint
CREATE TABLE "portal_article" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text,
	"summary" text,
	"content" text NOT NULL,
	"cover_image" text,
	"status" "portal_article_status" DEFAULT 'draft' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"publish_time" timestamp with time zone,
	"attributes" jsonb,
	"tags" jsonb,
	"template_id" uuid,
	"creator_id" uuid,
	"updater_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "portal_article_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "portal_article_category" (
	"article_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portal_article_category_article_id_category_id_pk" PRIMARY KEY("article_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "portal_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"parent_id" uuid,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"description" text,
	"creator_id" uuid,
	"updater_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "portal_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "portal_page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"path" text NOT NULL,
	"content" text NOT NULL,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"attributes" jsonb,
	"publish_time" timestamp with time zone,
	"template_id" uuid,
	"creator_id" uuid,
	"updater_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "portal_page_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "portal_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "portal_template_type" NOT NULL,
	"schema" jsonb,
	"config" jsonb,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"is_system_default" boolean DEFAULT false NOT NULL,
	"creator_id" uuid,
	"updater_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "portal_article" ADD CONSTRAINT "portal_article_template_id_portal_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."portal_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_article" ADD CONSTRAINT "portal_article_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_article" ADD CONSTRAINT "portal_article_updater_id_user_id_fk" FOREIGN KEY ("updater_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_article_category" ADD CONSTRAINT "portal_article_category_article_id_portal_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."portal_article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_article_category" ADD CONSTRAINT "portal_article_category_category_id_portal_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."portal_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_category" ADD CONSTRAINT "portal_category_parent_id_portal_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."portal_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_category" ADD CONSTRAINT "portal_category_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_category" ADD CONSTRAINT "portal_category_updater_id_user_id_fk" FOREIGN KEY ("updater_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_page" ADD CONSTRAINT "portal_page_template_id_portal_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."portal_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_page" ADD CONSTRAINT "portal_page_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_page" ADD CONSTRAINT "portal_page_updater_id_user_id_fk" FOREIGN KEY ("updater_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_template" ADD CONSTRAINT "portal_template_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_template" ADD CONSTRAINT "portal_template_updater_id_user_id_fk" FOREIGN KEY ("updater_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portal_article_status_idx" ON "portal_article" USING btree ("status");--> statement-breakpoint
CREATE INDEX "portal_article_publish_time_idx" ON "portal_article" USING btree ("publish_time");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_category_parent_name_unique_idx" ON "portal_category" USING btree ("parent_id","name");--> statement-breakpoint
CREATE INDEX "portal_category_status_idx" ON "portal_category" USING btree ("status");--> statement-breakpoint
CREATE INDEX "portal_page_status_idx" ON "portal_page" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_template_type_name_unique_idx" ON "portal_template" USING btree ("type","name");--> statement-breakpoint
CREATE INDEX "portal_template_status_idx" ON "portal_template" USING btree ("status");