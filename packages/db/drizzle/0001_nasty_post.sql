CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"locations" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"content" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"config" jsonb,
	"last_hash" text,
	"pending_hash" text,
	"last_fetched_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"embedding" vector(768),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offerings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "price_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"offering_id" uuid,
	"subject_type" text NOT NULL,
	"subject_id" uuid,
	"label" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text NOT NULL,
	"unit" text,
	"observed_at" timestamp with time zone NOT NULL,
	"source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event_offerings" (
	"event_id" uuid NOT NULL,
	"offering_id" uuid NOT NULL,
	CONSTRAINT "event_offerings_event_id_offering_id_pk" PRIMARY KEY("event_id","offering_id")
);
--> statement-breakpoint
ALTER TABLE "event_offerings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event_snapshots" (
	"event_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	CONSTRAINT "event_snapshots_event_id_snapshot_id_pk" PRIMARY KEY("event_id","snapshot_id")
);
--> statement-breakpoint
ALTER TABLE "event_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event_sources" (
	"event_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "event_sources_event_id_source_id_pk" PRIMARY KEY("event_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "event_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"competitor_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"structured" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"importance" text NOT NULL,
	"importance_reason" text NOT NULL,
	"dedup_key" text NOT NULL,
	"embedding" vector(768),
	"prompt_version" text,
	"occurred_at" timestamp with time zone,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "comparison_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"metric_id" text NOT NULL,
	"status" text NOT NULL,
	"competitors_ahead" text[] DEFAULT '{}' NOT NULL,
	"competitors_behind" text[] DEFAULT '{}' NOT NULL,
	"self_value" jsonb,
	"competitor_median" jsonb,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comparison_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "metric_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"dimension_key" text NOT NULL,
	"name" text NOT NULL,
	"value_type" text NOT NULL,
	"higher_is_better" boolean,
	"unit" text,
	"source_types" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "metric_definitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "metric_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"metric_id" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid,
	"value" jsonb,
	"origin" text NOT NULL,
	"confidence" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "metric_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"sections" jsonb NOT NULL,
	"delivered_at" timestamp with time zone,
	"channels" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "briefs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"offering_id" uuid NOT NULL,
	"competitors_with_it" text[] NOT NULL,
	"evidence_event_ids" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gaps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lag_item_events" (
	"lag_item_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "lag_item_events_lag_item_id_event_id_pk" PRIMARY KEY("lag_item_id","event_id")
);
--> statement-breakpoint
ALTER TABLE "lag_item_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lag_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"dimension_key" text NOT NULL,
	"metric_id" text,
	"offering_id" uuid,
	"title" text NOT NULL,
	"competitors_ahead" text[] DEFAULT '{}' NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_review_theme_ids" text[] DEFAULT '{}' NOT NULL,
	"trend" text NOT NULL,
	"impact" text NOT NULL,
	"impact_reason" text NOT NULL,
	"priority_score" numeric(10, 4) NOT NULL,
	"investigation" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lag_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pattern_events" (
	"pattern_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "pattern_events_pattern_id_event_id_pk" PRIMARY KEY("pattern_id","event_id")
);
--> statement-breakpoint
ALTER TABLE "pattern_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"theme" text NOT NULL,
	"competitor_count" integer NOT NULL,
	"window_days" integer NOT NULL,
	"summary" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patterns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "review_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"competitor_id" uuid,
	"theme" text NOT NULL,
	"sentiment" text NOT NULL,
	"mention_count" integer NOT NULL,
	"example_excerpts" text[] DEFAULT '{}' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_themes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scorecards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"scores" jsonb NOT NULL,
	"weights" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scorecards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "strength_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"dimension_key" text NOT NULL,
	"metric_id" text,
	"offering_id" uuid,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"competitors_behind" text[] DEFAULT '{}' NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"matched_competitor_weaknesses" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "strength_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "business_profile" jsonb;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_entries" ADD CONSTRAINT "price_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_entries" ADD CONSTRAINT "price_entries_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_entries" ADD CONSTRAINT "price_entries_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_offerings" ADD CONSTRAINT "event_offerings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_offerings" ADD CONSTRAINT "event_offerings_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_snapshots" ADD CONSTRAINT "event_snapshots_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_snapshots" ADD CONSTRAINT "event_snapshots_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sources" ADD CONSTRAINT "event_sources_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sources" ADD CONSTRAINT "event_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_results" ADD CONSTRAINT "comparison_results_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_values" ADD CONSTRAINT "metric_values_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gaps" ADD CONSTRAINT "gaps_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gaps" ADD CONSTRAINT "gaps_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lag_item_events" ADD CONSTRAINT "lag_item_events_lag_item_id_lag_items_id_fk" FOREIGN KEY ("lag_item_id") REFERENCES "public"."lag_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lag_item_events" ADD CONSTRAINT "lag_item_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lag_items" ADD CONSTRAINT "lag_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lag_items" ADD CONSTRAINT "lag_items_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_events" ADD CONSTRAINT "pattern_events_pattern_id_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_events" ADD CONSTRAINT "pattern_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_themes" ADD CONSTRAINT "review_themes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_themes" ADD CONSTRAINT "review_themes_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strength_items" ADD CONSTRAINT "strength_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strength_items" ADD CONSTRAINT "strength_items_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competitors_workspace_id_idx" ON "competitors" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "snapshots_workspace_id_idx" ON "snapshots" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "snapshots_source_id_idx" ON "snapshots" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "sources_workspace_id_idx" ON "sources" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sources_subject_idx" ON "sources" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "offerings_workspace_id_idx" ON "offerings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "price_entries_workspace_id_idx" ON "price_entries" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "price_entries_offering_id_idx" ON "price_entries" USING btree ("offering_id");--> statement-breakpoint
CREATE INDEX "price_entries_subject_idx" ON "price_entries" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "event_offerings_offering_id_idx" ON "event_offerings" USING btree ("offering_id");--> statement-breakpoint
CREATE INDEX "event_snapshots_snapshot_id_idx" ON "event_snapshots" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "event_sources_source_id_idx" ON "event_sources" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "events_workspace_id_idx" ON "events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "events_competitor_id_idx" ON "events" USING btree ("competitor_id");--> statement-breakpoint
CREATE INDEX "events_dedup_key_idx" ON "events" USING btree ("dedup_key");--> statement-breakpoint
CREATE INDEX "comparison_results_workspace_id_idx" ON "comparison_results" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "comparison_results_metric_id_idx" ON "comparison_results" USING btree ("metric_id");--> statement-breakpoint
CREATE INDEX "metric_definitions_workspace_id_idx" ON "metric_definitions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "metric_values_workspace_id_idx" ON "metric_values" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "metric_values_subject_idx" ON "metric_values" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "metric_values_metric_id_idx" ON "metric_values" USING btree ("metric_id");--> statement-breakpoint
CREATE INDEX "briefs_workspace_id_idx" ON "briefs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "gaps_workspace_id_idx" ON "gaps" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "lag_items_workspace_id_idx" ON "lag_items" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "lag_items_status_idx" ON "lag_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "patterns_workspace_id_idx" ON "patterns" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "review_themes_workspace_id_idx" ON "review_themes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "review_themes_competitor_id_idx" ON "review_themes" USING btree ("competitor_id");--> statement-breakpoint
CREATE INDEX "scorecards_workspace_id_idx" ON "scorecards" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "strength_items_workspace_id_idx" ON "strength_items" USING btree ("workspace_id");