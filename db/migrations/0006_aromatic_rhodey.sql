CREATE TYPE "public"."attachment_category" AS ENUM('image', 'video', 'document', 'audio', 'other');--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploader_id" uuid,
	"storage_id" uuid,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"category" "attachment_category" DEFAULT 'other' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_storage_id_storage_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storage"("id") ON DELETE set null ON UPDATE no action;