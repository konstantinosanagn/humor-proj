"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";

type CaptionRow = Record<string, unknown>;

const CRACKD_TABLE_NAMES = [
  "profiles", "images", "captions",
  "caption_likes", "caption_votes", "caption_saved", "shares", "share_to_destinations", "screenshots",
  "reported_captions", "reported_images",
  "caption_request", "llm_prompt_chains", "llm_model_responses",
  "humor_flavor", "humor_flavor_steps", "humor_flavor_step_types", "humor_flavor_theme_mappings", "humor_themes",
  "llm_models", "llm_providers", "llm_input_types", "llm_output_types",
  "communities", "community_contexts", "community_context_tags", "community_context_tag_mappings",
  "study_caption_mappings", "study_image_sets", "study_image_set_image_mappings",
  "terms", "term_types", "news_snippets", "news_entities", "personalities", "transcripts", "transcript_personality_mappings",
  "common_use_categories", "common_use_category_image_mappings",
  "allowed_signup_domains", "invitations", "bug_reports", "testflight_errors",
];

export default function ListPage() {
  const [selectedTable, setSelectedTable] = useState<string>("captions");
  const [data, setData] = useState<CaptionRow[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [foundTables, setFoundTables] = useState<{ name: string; rowCount: number }[]>([]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  useEffect(() => {
    async function discoverTables() {
      const found: { name: string; rowCount: number }[] = [];
      for (const table of CRACKD_TABLE_NAMES) {
        const { count, error: e } = await getSupabase().from(table).select("*", { count: "exact", head: true });
        if (!e) found.push({ name: table, rowCount: count ?? 0 });
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
      const sb = getSupabase();
      const { count, error: countErr } = await sb.from(selectedTable).select("*", { count: "exact", head: true });
      if (countErr) {
        setError(countErr.message);
        setLoading(false);
        return;
      }
      setTotalCount(count ?? 0);

      const { data: rows, error: err } = await sb.from(selectedTable).select("*");
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
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-gray-500 hover:text-gray-700 font-medium">
          ← Back to meme viewer
        </Link>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Crackd data</h1>
      <p className="text-gray-500 mb-6">
        Table <span className="font-mono text-gray-700">{selectedTable}</span>:{" "}
        <strong>{totalCount ?? "—"}</strong> rows. Click a table name above to switch.
      </p>

      <details open className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <summary className="cursor-pointer font-medium text-gray-700">
          Crackd tables: {foundTables.length} found — click to view
        </summary>
        <p className="text-sm text-gray-500 mt-2 mb-2">
          Core: profiles, images, captions. Plus caption interaction, humor flavors, studies, community.
        </p>
        <ul className="text-sm font-mono space-y-1 flex flex-wrap gap-x-4 gap-y-1">
          {foundTables.map((t) => {
            const isSelected = selectedTable === t.name;
            const btnClass = isSelected ? "text-blue-700 font-semibold underline" : "text-green-700 font-medium";
            return (
              <li key={t.name}>
                <button
                  type="button"
                  onClick={() => setSelectedTable(t.name)}
                  className={`text-left hover:underline focus:outline-none focus:underline ${btnClass}`}
                >
                  {t.name}
                </button>
                <span className="text-gray-500"> — {t.rowCount} rows</span>
              </li>
            );
          })}
        </ul>
      </details>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading && <p className="text-gray-500 mb-4">Loading…</p>}

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
                  const display = typeof val === "object" && val !== null ? JSON.stringify(val) : String(val ?? "—");
                  const isLong = Array.isArray(val) || (typeof val === "object" && val !== null) || (typeof val === "string" && val.length > 80);
                  const cellClass = isLong ? "text-xs break-all" : "text-sm";
                  return (
                    <div key={col} className="min-w-0 overflow-hidden">
                      <span className="text-xs font-medium uppercase text-gray-400">{col}</span>
                      <div
                        className={`mt-0.5 max-h-28 overflow-auto rounded bg-white/60 px-2 py-1 text-gray-800 ${cellClass}`}
                        title={display.length > 200 ? `${display.slice(0, 200)}…` : undefined}
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
