CREATE TABLE "portal_page_schema_backup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"draft_schema" jsonb,
	"published_schema" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_site_layout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"draft_header_schema" jsonb,
	"published_header_schema" jsonb,
	"draft_footer_schema" jsonb,
	"published_footer_schema" jsonb,
	"publish_time" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"creator_id" uuid,
	"updater_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portal_site_layout_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "portal_page_schema_backup" ADD CONSTRAINT "portal_page_schema_backup_page_id_portal_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."portal_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_site_layout" ADD CONSTRAINT "portal_site_layout_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_site_layout" ADD CONSTRAINT "portal_site_layout_updater_id_user_id_fk" FOREIGN KEY ("updater_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portal_page_schema_backup_page_reason_idx" ON "portal_page_schema_backup" USING btree ("page_id","reason");