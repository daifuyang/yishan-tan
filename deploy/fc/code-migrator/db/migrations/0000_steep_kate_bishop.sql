CREATE TYPE "public"."attachment_category" AS ENUM('image', 'video', 'document', 'audio', 'other');--> statement-breakpoint
CREATE TYPE "public"."data_scope" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
CREATE TYPE "public"."menu_type" AS ENUM('group', 'menu', 'action');--> statement-breakpoint
CREATE TYPE "public"."portal_theme_mode" AS ENUM('light', 'dark');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('enabled', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."storage_driver" AS ENUM('local', 'aliyun-oss', 'tencent-cos', 'aws-s3', 'qiniu', 'minio');--> statement-breakpoint
CREATE TYPE "public"."user_gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role_kind" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"password" text,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" text DEFAULT 'default' NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"reference_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_request" timestamp with time zone,
	"last_refill_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"rate_limit_enabled" boolean DEFAULT true NOT NULL,
	"rate_limit_max" text,
	"rate_limit_time_window" text,
	"refill_interval" text,
	"refill_amount" text,
	"remaining" text,
	"request_count" text DEFAULT '0' NOT NULL,
	"permissions" text,
	"metadata" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "department" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"leader_id" uuid,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dict_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_code" text NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"extra" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dict_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "dict_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "login_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"username" text,
	"status" text NOT NULL,
	"message" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"path" text,
	"component" text,
	"icon" text,
	"type" "menu_type" DEFAULT 'menu' NOT NULL,
	"permission" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
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
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"department_id" uuid NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"data_scope" "data_scope" DEFAULT '1' NOT NULL,
	"is_system_default" boolean DEFAULT false NOT NULL,
	"creator_id" uuid,
	"updater_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "role_menu" (
	"role_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_menu_role_id_menu_id_pk" PRIMARY KEY("role_id","menu_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
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
CREATE TABLE "sys_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sys_option_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"username" text NOT NULL,
	"display_name" text,
	"phone" text,
	"role" "user_role_kind" DEFAULT 'member' NOT NULL,
	"dept_id" uuid,
	"gender" "user_gender",
	"birth_date" timestamp,
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "user_post" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_post_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_role_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_reference_id_user_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_storage_id_storage_id_fk" FOREIGN KEY ("storage_id") REFERENCES "public"."storage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_leader_id_user_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_log" ADD CONSTRAINT "login_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_updater_id_user_id_fk" FOREIGN KEY ("updater_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_menu" ADD CONSTRAINT "role_menu_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_menu" ADD CONSTRAINT "role_menu_menu_id_menu_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_dept_id_department_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_post" ADD CONSTRAINT "user_post_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_post" ADD CONSTRAINT "user_post_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portal_default_unique_idx" ON "portal" USING btree ((true)) WHERE "portal"."is_default" = true AND "portal"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "storage_default_unique_idx" ON "storage" USING btree ((true)) WHERE "storage"."is_default" = true AND "storage"."deleted_at" IS NULL;