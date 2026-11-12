ALTER TABLE "portal_page" DROP CONSTRAINT "portal_page_template_id_portal_template_id_fk";
--> statement-breakpoint
ALTER TABLE "portal_page" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "portal_page" DROP COLUMN "template_id";