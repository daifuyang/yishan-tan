CREATE TABLE "menu_permission" (
	"menu_id" uuid NOT NULL,
	"permission_code" text NOT NULL,
	CONSTRAINT "menu_permission_menu_id_permission_code_pk" PRIMARY KEY("menu_id","permission_code")
);
--> statement-breakpoint
CREATE TABLE "role_permission" (
	"role_id" uuid NOT NULL,
	"permission_code" text NOT NULL,
	CONSTRAINT "role_permission_role_id_permission_code_pk" PRIMARY KEY("role_id","permission_code")
);
--> statement-breakpoint
ALTER TABLE "menu_permission" ADD CONSTRAINT "menu_permission_menu_id_menu_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;