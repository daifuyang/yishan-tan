CREATE TYPE "public"."storage_driver" AS ENUM('local', 'aliyun-oss', 'tencent-cos', 'aws-s3', 'qiniu', 'minio');--> statement-breakpoint
CREATE TABLE "storage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"driver" "storage_driver" NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"config" text NOT NULL,
	"description" text,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "storage_default_unique_idx" ON "storage" USING btree ((true)) WHERE "storage"."is_default" = true AND "storage"."deleted_at" IS NULL;