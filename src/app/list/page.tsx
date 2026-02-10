"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CaptionRow = Record<string, unknown>;

// Crackd domain model tables (from Supabase guide) + common variants
const TABLE_NAMES_TO_TRY = [
  // Core
  "profiles",
  "images",
  "captions",
  // Caption interaction
  "caption_likes",
  "caption_votes",
  "caption_saved",
  "shares",
  "share_to_destinations",
  "screenshots",
  // Moderation
  "reported_captions",
  "reported_images",
  // Caption generation / AI
  "caption_request",
  "llm_prompt_chains",
  "llm_model_responses",
  // Humor / Matrix
  "humor_flavor",
  "humor_flavor_steps",
  "humor_flavor_step_types",
  "humor_flavor_theme_mappings",
  "humor_themes",
  "llm_models",
  "llm_providers",
  "llm_input_types",
  "llm_output_types",
  // Community
  "communities",
  "community_contexts",
  "community_context_tags",
  "community_context_tag_mappings",
  // Studies
  "study_caption_mappings",
  "study_image_sets",
  "study_image_set_image_mappings",
  // Gen-Z & style
  "terms",
  "term_types",
  "news_snippets",
  "news_entities",
  "personalities",
  "transcripts",
  "transcript_personality_mappings",
  // Common use (images)
  "common_use_categories",
  "common_use_category_image_mappings",
  // Access / safety
  "allowed_signup_domains",
  "invitations",
  "bug_reports",
  "testflight_errors",
];

export default function ListPage() {
  const [selectedTable, setSelectedTable] = useState<string>("captions");
  const [data, setData] = useState<CaptionRow[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [foundTables, setFoundTables] = useState<{ name: string; rowCount: number }[]>([]);

  useEffect(() => {
    async function discoverTables() {
      const found: { name: string; rowCount: number }[] = [];
      for (const table of TABLE_NAMES_TO_TRY) {
        const { count, error: e } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        if (!e) {
          found.push({ name: table, rowCount: count ?? 0 });
        }
      }
      setFoundTables(found);
    }

    discoverTables();
  }, []);

  useEffect(() => {
    if (!selectedTable) return;

    setLoading(true);
    setError(null);

    async function fetchTable() {
      const { count, error: countErr } = await supabase
        .from(selectedTable)
        .select("*", { count: "exact", head: true });

      if (countErr) {
        setError(countErr.message);
        setLoading(false);
        return;
      }
      setTotalCount(count ?? 0);

      const { data: rows, error: err } = await supabase
        .from(selectedTable)
        .select("*");

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setData(rows ?? []);
      setLoading(false);
    }

    fetchTable();
  }, [selectedTable]);

  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-xl text-gray-600">Loading from Supabase...</p>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-8">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  const columns = data.length > 0 ? Object.keys(data[0]).filter((k) => k !== "id") : [];

  return (
    <div className="min-h-screen bg-white p-8">
      <Link href="/" className="inline-block text-gray-500 hover:text-gray-700 mb-4 font-medium">
        ← Back to meme viewer
      </Link>
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Crackd data</h1>
      <p className="text-gray-500 mb-6">
        Table <span className="font-mono text-gray-700">{selectedTable}</span>:{" "}
        <strong>{totalCount ?? "—"}</strong> rows. Click a table name above to switch.
      </p>

      {/* Crackd tables: click to load that table below */}
      <details open className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <summary className="cursor-pointer font-medium text-gray-700">
          Crackd tables (readable with your key): {foundTables.length} found — click to view
        </summary>
        <p className="text-sm text-gray-500 mt-2 mb-2">
          Core: profiles, images, captions. Plus caption interaction, humor flavors, studies, community, etc.
        </p>
        <ul className="text-sm font-mono space-y-1 flex flex-wrap gap-x-4 gap-y-1">
          {foundTables.map((t) => (
            <li key={t.name}>
              <button
                type="button"
                onClick={() => setSelectedTable(t.name)}
                className={`text-left hover:underline focus:outline-none focus:underline ${
                  selectedTable === t.name
                    ? "text-blue-700 font-semibold underline"
                    : "text-green-700 font-medium"
                }`}
              >
                {t.name}
              </button>
              <span className="text-gray-500"> — {t.rowCount} rows</span>
            </li>
          ))}
        </ul>
      </details>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading && <p className="text-gray-500 mb-4">Loading…</p>}

      {/* Card list */}
      <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {data.map((row, i) => (
          <li
            key={row.id != null ? String(row.id) : i}
            className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm hover:border-gray-300"
          >
            {columns.length > 0 ? (
              <div className="space-y-2 overflow-hidden">
                {columns.map((col) => {
                  const val = row[col];
                  const isArrayOrLong =
                    Array.isArray(val) ||
                    (typeof val === "object" && val !== null) ||
                    (typeof val === "string" && val.length > 80);
                  const display =
                    typeof val === "object" && val !== null ? JSON.stringify(val) : String(val ?? "—");
                  return (
                    <div key={col} className="min-w-0 overflow-hidden">
                      <span className="text-xs font-medium uppercase text-gray-400">{col}</span>
                      <div
                        className={`mt-0.5 max-h-28 overflow-auto rounded bg-white/60 px-2 py-1 text-gray-800 ${
                          isArrayOrLong ? "text-xs break-all" : "text-sm"
                        }`}
                        title={display.length > 200 ? display.slice(0, 200) + "…" : undefined}
                      >
                        {display}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="max-h-48 overflow-auto rounded bg-white/60 px-2 py-1 text-xs text-gray-600 break-all">
                {JSON.stringify(row)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
