ALTER TABLE "expenses" ADD COLUMN "split_target" text DEFAULT 'ALL';--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "split_group_id" integer;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_split_group_id_sub_groups_id_fk" FOREIGN KEY ("split_group_id") REFERENCES "public"."sub_groups"("id") ON DELETE no action ON UPDATE no action;