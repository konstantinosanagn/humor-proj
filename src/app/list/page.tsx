"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";

type CaptionRow = Record<string, unknown>;

function isComplexValue(val: unknown): boolean {
  if (Array.isArray(val)) return true;
  if (typeof val === "object" && val !== null) return true;
  if (typeof val === "string" && val.length > 80) return true;
  return false;
}

function formatCellValue(val: unknown): string {
  if (typeof val === "object" && val !== null) return JSON.stringify(val);
  return String(val ?? "\u2014");
}

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

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }, []);

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

    async function fetchTable() {
      setLoading(true);
      setError(null);
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
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="glass-pill-dark inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-gray-600 no-underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Back to voting
          </Link>
          <Link
            href="/upload"
            className="glass-pill-dark inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-gray-600 no-underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Upload
          </Link>
        </div>
        <button
          onClick={handleSignOut}
          className="glass-pill-dark flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-gray-600 cursor-pointer"
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
                  const display = formatCellValue(val);
                  const cellClass = isComplexValue(val) ? "text-xs break-all" : "text-sm";
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
