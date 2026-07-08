CREATE TYPE "public"."data_scope" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
ALTER TABLE "role" ADD COLUMN "data_scope" "data_scope" DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "role" ADD COLUMN "is_system_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "role" ADD COLUMN "creator_id" uuid;--> statement-breakpoint
ALTER TABLE "role" ADD COLUMN "updater_id" uuid;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_updater_id_user_id_fk" FOREIGN KEY ("updater_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
