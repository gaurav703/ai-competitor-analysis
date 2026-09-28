CREATE TABLE "llm_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"prompt_version" text NOT NULL,
	"model" text NOT NULL,
	"output" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "llm_cache" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "llm_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"task" text NOT NULL,
	"prompt_version" text NOT NULL,
	"model" text NOT NULL,
	"input" jsonb NOT NULL,
	"raw_output" text,
	"error" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "llm_failures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "llm_failures_workspace_id_idx" ON "llm_failures" USING btree ("workspace_id");