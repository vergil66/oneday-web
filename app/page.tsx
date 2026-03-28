'use client'

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Download,
  Upload,
  Home,
  BookOpen,
  Plus,
  Trash2,
} from "lucide-react";

type LaneItem = {
  id: string;
  text: string;
  done: boolean;
};

type Entry = {
  id: string;
  date: string;
  title: string;
  location: string;
  conditions: string;
  place: string;
  awe: string;
  keep: LaneItem[];
  grow: LaneItem[];
  tend: LaneItem[];
  notes: string;
  closeHeld: string;
  closeMoved: string;
  closeCare: string;
  closeSurprised: string;
  closeCarryForward: string;
  closeNotes: string;
  updatedAt: string;
};

type WeeklyReflection = {
  id: string; // week start key
  weekStart: string;
  weekEnd: string;
  held: string;
  grew: string;
  tended: string;
  surprised: string;
  carryForward: string;
  notes: string;
};

type WeeklyMap = Record<string, WeeklyReflection>;

type EntryMap = Record<string, Entry>;
type ViewMode = "today" | "close" | "weekly" | "review" | "settings";
type LaneKey = "keep" | "grow" | "tend";

const STORAGE_KEY = "vct-oneday-entries-v2";
const WEEKLY_KEY = "vct-oneday-weekly-v1";

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(key: string, amount: number): string {
  const dt = parseDateKey(key);
  dt.setDate(dt.getDate() + amount);
  return formatDateKey(dt);
}

function longLabel(key: string): string {
  const dt = parseDateKey(key);
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function smallLabel(key: string): string {
  const dt = parseDateKey(key);
  return dt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function snippet(text: string, max = 120): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).trim()}…`;
}

function sortedEntries(entries: EntryMap): Entry[] {
  return Object.values(entries).sort((a, b) => b.date.localeCompare(a.date));
}

function itemCount(entry: Entry): number {
  return entry.keep.length + entry.grow.length + entry.tend.length;
}

function makeEmptyEntry(date: string): Entry {
  return {
    id: date,
    date,
    title: "",
    location: "",
    conditions: "",
    place: "",
    awe: "",
    keep: [],
    grow: [],
    tend: [],
    notes: "",
    closeHeld: "",
    closeMoved: "",
    closeCare: "",
    closeSurprised: "",
    closeCarryForward: "",
    closeNotes: "",
    updatedAt: new Date().toISOString(),
  };
}

function createLaneItem(): LaneItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: "",
    done: false,
  };
}

function downloadText(
  filename: string,
  content: string,
  type = "application/json"
) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function OnedayWebPrototype() {
  const [weekly, setWeekly] = useState<WeeklyMap>({});
  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  const [entries, setEntries] = useState<EntryMap>({});
  const [currentDate, setCurrentDate] = useState<string>(todayKey);
  const [view, setView] = useState<ViewMode>("today");
  const [search, setSearch] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [isMounted, setIsMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const rawWeekly = localStorage.getItem(WEEKLY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as EntryMap;
      if (parsed && typeof parsed === "object") {
        setEntries(parsed);
      if (rawWeekly) {
        setWeekly(JSON.parse(rawWeekly));
      }
      }
    } catch (err) {
      console.error("Could not load Oneday entries", err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      localStorage.setItem(WEEKLY_KEY, JSON.stringify(weekly));
      setSaveState("saved");
    } catch (err) {
      console.error("Could not save Oneday entries", err);
    }
  }, [entries, weekly]);

  const currentEntry: Entry = entries[currentDate] ?? makeEmptyEntry(currentDate);

  function patchCurrentEntry(patch: Partial<Entry>) {
    setSaveState("saving");
    setEntries((prev) => {
      const existing = prev[currentDate] ?? makeEmptyEntry(currentDate);
      return {
        ...prev,
        [currentDate]: {
          ...existing,
          ...patch,
          id: currentDate,
          date: currentDate,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }

  function goToday() {
    setCurrentDate(todayKey);
    setView("today");
  }

  function goPreviousDay() {
    setCurrentDate((d) => addDays(d, -1));
    setView("today");
  }

  function goNextDay() {
    setCurrentDate((d) => addDays(d, 1));
    setView("today");
  }

  function removeCurrentEntry() {
    if (!entries[currentDate]) return;
    const ok = window.confirm(`Delete the entry for ${longLabel(currentDate)}?`);
    if (!ok) return;

    setEntries((prev) => {
      const copy = { ...prev };
      delete copy[currentDate];
      return copy;
    });
  }

  function addLaneItem(lane: LaneKey) {
    const nextItems = [...currentEntry[lane], createLaneItem()];
    patchCurrentEntry({ [lane]: nextItems } as Partial<Entry>);
  }

  function updateLaneItem(lane: LaneKey, id: string, patch: Partial<LaneItem>) {
    const nextItems = currentEntry[lane].map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    patchCurrentEntry({ [lane]: nextItems } as Partial<Entry>);
  }

  function removeLaneItem(lane: LaneKey, id: string) {
    const nextItems = currentEntry[lane].filter((item) => item.id !== id);
    patchCurrentEntry({ [lane]: nextItems } as Partial<Entry>);
  }

  function exportJson() {
    downloadText(
      `oneday-export-${formatDateKey(new Date())}.json`,
      JSON.stringify(entries, null, 2)
    );
  }

  function exportMarkdown() {
    const lines = sortedEntries(entries).flatMap((entry) => [
      `# ${entry.date}${entry.title ? ` — ${entry.title}` : ""}`,
      "",
      entry.location ? `**Location:** ${entry.location}` : "",
      entry.conditions ? `**Conditions:** ${entry.conditions}` : "",
      entry.place ? `**Place:** ${entry.place}` : "",
      entry.awe ? `**Awe:** ${entry.awe}` : "",
      "",
      "## Keep",
      ...entry.keep.map((item) => `- [${item.done ? "x" : " "}] ${item.text}`),
      "",
      "## Grow",
      ...entry.grow.map((item) => `- [${item.done ? "x" : " "}] ${item.text}`),
      "",
      "## Tend",
      ...entry.tend.map((item) => `- [${item.done ? "x" : " "}] ${item.text}`),
      "",
      entry.notes ? "## Notes" : "",
      entry.notes || "",
      "",
      "---",
      "",
    ]);

    downloadText(
      `oneday-export-${formatDateKey(new Date())}.md`,
      lines.filter(Boolean).join("\n"),
      "text/markdown"
    );
  }

  function importJsonFile(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as EntryMap;
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Invalid import file.");
        }
        setEntries((prev) => ({ ...prev, ...parsed }));
        alert("Import complete.");
      } catch (err) {
        console.error(err);
        alert("That file could not be imported.");
      }
    };

    reader.readAsText(file);
  }

  const filteredEntries = useMemo(() => {
    const all = sortedEntries(entries);
    const q = search.trim().toLowerCase();
    if (!q) return all;

    return all.filter((entry) => {
      return (
        entry.date.toLowerCase().includes(q) ||
        entry.title.toLowerCase().includes(q) ||
        entry.location.toLowerCase().includes(q) ||
        entry.conditions.toLowerCase().includes(q) ||
        entry.place.toLowerCase().includes(q) ||
        entry.awe.toLowerCase().includes(q) ||
        entry.notes.toLowerCase().includes(q) ||
        entry.keep.some((item) => item.text.toLowerCase().includes(q)) ||
        entry.grow.some((item) => item.text.toLowerCase().includes(q)) ||
        entry.tend.some((item) => item.text.toLowerCase().includes(q))
      );
    });
  }, [entries, search]);

  const lastUpdatedLabel = isMounted
    ? new Date(currentEntry.updatedAt).toLocaleString()
    : "—";

  function getWeekStart(dateKey: string): string {
    const d = parseDateKey(dateKey);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday start
    d.setDate(d.getDate() + diff);
    return formatDateKey(d);
  }

  function getWeekDates(startKey: string): string[] {
    return Array.from({ length: 7 }).map((_, i) => addDays(startKey, i));
  }

  const weekStart = getWeekStart(currentDate);
  const weekDates = getWeekDates(weekStart);
  const weekEnd = weekDates[6];

  const weeklyEntry: WeeklyReflection =
    weekly[weekStart] || {
      id: weekStart,
      weekStart,
      weekEnd,
      held: "",
      grew: "",
      tended: "",
      surprised: "",
      carryForward: "",
      notes: "",
    };

  function patchWeekly(patch: Partial<WeeklyReflection>) {
    setWeekly((prev) => ({
      ...prev,
      [weekStart]: {
        ...weeklyEntry,
        ...patch,
      },
    }));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50 to-amber-50/30 text-stone-900">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid gap-5 lg:grid-cols-[260px_1fr]"
        >
          <aside className="rounded-3xl border border-stone-200 bg-white/95 p-4 shadow-sm backdrop-blur lg:sticky lg:top-6 lg:h-fit">
            <div className="mb-4">
              <div className="text-xs uppercase tracking-[0.24em] text-stone-500">
                Vergil’s Coffee Table
              </div>
              <div className="mt-2 flex items-center gap-3">
                <img
                  src="/oneday_icon_1024.png"
                  alt="Oneday icon"
                  className="h-9 w-9 rounded-xl shadow-sm"
                />
                <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
                  Oneday
                </h1>
              </div>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                Begin with the day itself: where you are, what is true, and what must be kept,
                grown, or tended.
              </p>
            </div>
    
            <div className="grid gap-2">
              <button
                onClick={() => setView("today")}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm transition ${
                  view === "today"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 hover:bg-stone-200"
                }`}
              >
                <Home size={16} /> Today
              </button>
    
              <button
                onClick={() => setView("close")}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm transition ${
                  view === "close"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 hover:bg-stone-200"
                }`}
              >
                <BookOpen size={16} /> Close Day
              </button>
    
              <button
                onClick={() => setView("weekly")}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm transition ${
                  view === "weekly"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 hover:bg-stone-200"
                }`}
              >
                <CalendarDays size={16} /> Weekly
              </button>
    
              <button
                onClick={() => setView("review")}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm transition ${
                  view === "review"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 hover:bg-stone-200"
                }`}
              >
                <Search size={16} /> Review
              </button>
    
              <button
                onClick={() => setView("settings")}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm transition ${
                  view === "settings"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 hover:bg-stone-200"
                }`}
              >
                <Upload size={16} /> Export & Import
              </button>
            </div>
    
            <div className="mt-5 rounded-2xl bg-stone-100 p-3 text-sm text-stone-600">
              <div className="font-medium text-stone-800">Current day</div>
              <div className="mt-1">{smallLabel(currentDate)}</div>
              <div className="mt-3 text-xs uppercase tracking-wide text-stone-500">
                Autosave
              </div>
              <div className="mt-1">
                {saveState === "saving" ? "Saving…" : "Saved locally"}
              </div>
            </div>
          </aside>

          <main>
            {view === "today" && (
              <section className="rounded-3xl border border-stone-200 bg-white/95 p-4 shadow-sm backdrop-blur md:p-6">
                <div className="flex flex-col gap-4 border-b border-stone-200 pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
                      Today page
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
                      {longLabel(currentDate)}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={goPreviousDay}
                      className="rounded-2xl bg-stone-100 px-3 py-2 text-sm hover:bg-stone-200"
                    >
                      <span className="inline-flex items-center gap-2">
                        <ChevronLeft size={16} /> Previous
                      </span>
                    </button>

                    <button
                      onClick={goToday}
                      className="rounded-2xl bg-stone-900 px-3 py-2 text-sm text-white hover:opacity-90"
                    >
                      Today
                    </button>

                    <button
                      onClick={goNextDay}
                      className="rounded-2xl bg-stone-100 px-3 py-2 text-sm hover:bg-stone-200"
                    >
                      <span className="inline-flex items-center gap-2">
                        Next <ChevronRight size={16} />
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-stone-700">
                      A phrase for this day
                    </label>
                    <input
                      value={currentEntry.title}
                      onChange={(e) => patchCurrentEntry({ title: e.target.value })}
                      placeholder="If this day has a name"
                      className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition placeholder:text-stone-400 focus:border-stone-500"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <FieldCard
                      label="Location"
                      placeholder="Where are you?"
                      value={currentEntry.location}
                      onChange={(value) => patchCurrentEntry({ location: value })}
                    />
                    <FieldCard
                      label="Conditions"
                      placeholder="What are the conditions?"
                      value={currentEntry.conditions}
                      onChange={(value) => patchCurrentEntry({ conditions: value })}
                    />
                    <FieldCard
                      label="Place"
                      placeholder="What place are you in inwardly or outwardly?"
                      value={currentEntry.place}
                      onChange={(value) => patchCurrentEntry({ place: value })}
                    />
                    <FieldCard
                      label="Awe"
                      placeholder="Anything to notice with wonder?"
                      value={currentEntry.awe}
                      onChange={(value) => patchCurrentEntry({ awe: value })}
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    <LaneCard
                      title="KEEP"
                      subtitle="What must be held today?"
                      items={currentEntry.keep}
                      onAdd={() => addLaneItem("keep")}
                      onToggle={(id, done) => updateLaneItem("keep", id, { done })}
                      onTextChange={(id, text) => updateLaneItem("keep", id, { text })}
                      onRemove={(id) => removeLaneItem("keep", id)}
                    />

                    <LaneCard
                      title="GROW"
                      subtitle="What moves you toward who you’re becoming?"
                      items={currentEntry.grow}
                      onAdd={() => addLaneItem("grow")}
                      onToggle={(id, done) => updateLaneItem("grow", id, { done })}
                      onTextChange={(id, text) => updateLaneItem("grow", id, { text })}
                      onRemove={(id) => removeLaneItem("grow", id)}
                    />

                    <LaneCard
                      title="TEND"
                      subtitle="Who or what needs care today?"
                      items={currentEntry.tend}
                      onAdd={() => addLaneItem("tend")}
                      onToggle={(id, done) => updateLaneItem("tend", id, { done })}
                      onTextChange={(id, text) => updateLaneItem("tend", id, { text })}
                      onRemove={(id) => removeLaneItem("tend", id)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-stone-700">
                      Notes
                    </label>
                    <textarea
                      value={currentEntry.notes}
                      onChange={(e) => patchCurrentEntry({ notes: e.target.value })}
                      placeholder="Anything else that belongs to this day?"
                      className="min-h-[220px] w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-base leading-7 outline-none transition placeholder:text-stone-400 focus:border-stone-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4 text-sm text-stone-600">
                    <div>
                      Last updated {lastUpdatedLabel}
                    </div>
                    <div className="rounded-2xl bg-stone-100 px-3 py-2 text-stone-700">
                      {itemCount(currentEntry)} active items
                    </div>
                    <button
                      onClick={removeCurrentEntry}
                      className="inline-flex items-center gap-2 rounded-2xl bg-stone-100 px-3 py-2 text-sm text-stone-700 hover:bg-stone-200"
                    >
                      <Trash2 size={16} /> Delete entry
                    </button>
                  </div>
                </div>
              </section>
            )}

            {view === "close" && (
              <section className="rounded-3xl border border-stone-200 bg-white/95 p-4 shadow-sm backdrop-blur md:p-6">
                <div className="flex flex-col gap-4 border-b border-stone-200 pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
                      Close day
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
                      {longLabel(currentDate)}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                      Revisit the day through what was kept, what moved, and what still needs care.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setView("today")}
                      className="rounded-2xl bg-stone-100 px-3 py-2 text-sm hover:bg-stone-200"
                    >
                      Return to Today
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard label="Phrase" value={currentEntry.title || "No phrase yet"} />
                    <SummaryCard label="Location" value={currentEntry.location || "No location yet"} />
                    <SummaryCard label="Conditions" value={currentEntry.conditions || "No conditions yet"} />
                    <SummaryCard label="Place" value={currentEntry.place || "No place yet"} />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <CloseLaneSummary
                      title="KEEP"
                      subtitle="What was held today?"
                      items={currentEntry.keep}
                    />
                    <CloseLaneSummary
                      title="GROW"
                      subtitle="What moved, even a little?"
                      items={currentEntry.grow}
                    />
                    <CloseLaneSummary
                      title="TEND"
                      subtitle="What still needs care?"
                      items={currentEntry.tend}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <ClosePromptCard
                      label="What held today?"
                      value={currentEntry.closeHeld}
                      onChange={(value) => patchCurrentEntry({ closeHeld: value })}
                    />
                    <ClosePromptCard
                      label="What moved, even a little?"
                      value={currentEntry.closeMoved}
                      onChange={(value) => patchCurrentEntry({ closeMoved: value })}
                    />
                    <ClosePromptCard
                      label="What still needs care?"
                      value={currentEntry.closeCare}
                      onChange={(value) => patchCurrentEntry({ closeCare: value })}
                    />
                    <ClosePromptCard
                      label="What surprised you?"
                      value={currentEntry.closeSurprised}
                      onChange={(value) => patchCurrentEntry({ closeSurprised: value })}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
                    <ClosePromptCard
                      label="What will you carry into tomorrow?"
                      value={currentEntry.closeCarryForward}
                      onChange={(value) => patchCurrentEntry({ closeCarryForward: value })}
                      rows={5}
                    />

                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">
                        Closing note
                      </label>
                      <textarea
                        value={currentEntry.closeNotes}
                        onChange={(e) => patchCurrentEntry({ closeNotes: e.target.value })}
                        placeholder="Close the day in your own words."
                        className="min-h-[180px] w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-base leading-7 outline-none transition placeholder:text-stone-400 focus:border-stone-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4 text-sm text-stone-600">
                    <div>Last updated {lastUpdatedLabel}</div>
                    <div className="rounded-2xl bg-stone-100 px-3 py-2 text-stone-700">
                      {itemCount(currentEntry)} items revisited
                    </div>
                  </div>
                </div>
              </section>
            )}

            {view === "weekly" && (
              <section className="rounded-3xl border border-stone-200 bg-white/95 p-4 shadow-sm backdrop-blur md:p-6">
                <div className="border-b border-stone-200 pb-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
                    Weekly reflection
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Week of {longLabel(weekStart)}
                  </h2>
                </div>

                <div className="mt-5 grid gap-3">
                  {weekDates.map((d) => {
                    const e = entries[d];
                    return (
                      <div
                        key={d}
                        className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3 text-sm"
                      >
                        <div className="font-medium">{longLabel(d)}</div>
                        <div className="text-stone-600">
                          {e ? `${itemCount(e)} items` : "No entry"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <ClosePromptCard
                    label="What held across the week?"
                    value={weeklyEntry.held}
                    onChange={(v) => patchWeekly({ held: v })}
                  />
                  <ClosePromptCard
                    label="What grew across the week?"
                    value={weeklyEntry.grew}
                    onChange={(v) => patchWeekly({ grew: v })}
                  />
                  <ClosePromptCard
                    label="What needed tending again and again?"
                    value={weeklyEntry.tended}
                    onChange={(v) => patchWeekly({ tended: v })}
                  />
                  <ClosePromptCard
                    label="What surprised you this week?"
                    value={weeklyEntry.surprised}
                    onChange={(v) => patchWeekly({ surprised: v })}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.2fr]">
                  <ClosePromptCard
                    label="What will you carry into next week?"
                    value={weeklyEntry.carryForward}
                    onChange={(v) => patchWeekly({ carryForward: v })}
                    rows={5}
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-stone-700">
                      Weekly note
                    </label>
                    <textarea
                      value={weeklyEntry.notes}
                      onChange={(e) => patchWeekly({ notes: e.target.value })}
                      className="min-h-[180px] w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-base leading-7 outline-none transition focus:border-stone-500"
                    />
                  </div>
                </div>
              </section>
            )}

            {view === "review" && (
              <section className="rounded-3xl border border-stone-200 bg-white/95 p-4 shadow-sm backdrop-blur md:p-6">
                <div className="flex flex-col gap-4 border-b border-stone-200 pb-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
                      Review
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold">Recent days</h2>
                  </div>

                  <div className="relative w-full md:max-w-sm">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                      size={16}
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search entries"
                      className="w-full rounded-2xl border border-stone-300 px-10 py-3 text-sm outline-none transition focus:border-stone-500"
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {filteredEntries.length === 0 ? (
                    <div className="rounded-2xl bg-stone-100 p-5 text-sm text-stone-600">
                      No entries found yet.
                    </div>
                  ) : (
                    filteredEntries.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => {
                          setCurrentDate(entry.date);
                          setView("today");
                        }}
                        className="rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:border-stone-400 hover:shadow-sm"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="text-sm font-medium text-stone-900">
                              {longLabel(entry.date)}
                            </div>
                            <div className="mt-1 text-sm text-stone-700">
                              {entry.title || "No title yet"}
                            </div>
                          </div>

                          <div className="text-xs uppercase tracking-wide text-stone-500">
                            {itemCount(entry)} items
                          </div>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-stone-600">
                          {snippet(entry.notes || entry.awe || entry.conditions || "No notes yet.")}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </section>
            )}

            {view === "settings" && (
              <section className="rounded-3xl border border-stone-200 bg-white/95 p-4 shadow-sm backdrop-blur md:p-6">
                <div className="border-b border-stone-200 pb-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
                    Local-first
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold">Export & Import</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                    Today Page is ready. Next we can add Close Day and Weekly Reflection as separate views in this same structure.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-stone-100 p-4">
                    <div className="text-base font-medium">Export</div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Download your entries as JSON for re-import, or as Markdown for reading and archiving.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={exportJson}
                        className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-2 text-sm text-white hover:opacity-90"
                      >
                        <Download size={16} /> Export JSON
                      </button>

                      <button
                        onClick={exportMarkdown}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm text-stone-800 hover:bg-stone-200"
                      >
                        <Download size={16} /> Export Markdown
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-stone-100 p-4">
                    <div className="text-base font-medium">Import</div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Import a prior Oneday JSON export. Imported entries merge into the current set by date.
                    </p>
                    <div className="mt-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) importJsonFile(file);
                          e.currentTarget.value = "";
                        }}
                      />

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-2 text-sm text-white hover:opacity-90"
                      >
                        <Upload size={16} /> Import JSON
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </main>
        </motion.div>
    
            <footer className="mt-8 pb-4">
              <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 rounded-3xl border border-stone-200 bg-white/85 px-6 py-5 text-center shadow-sm backdrop-blur">
                <img
                  src="/VCT.png"
                  alt="Vergil’s Coffee Table logo"
                  className="h-10 w-auto"
                />
                <div className="text-sm font-medium text-stone-700">
                  Powered by Vergil’s Coffee Table
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-stone-500">
                  A Framework for Intentional Learning
                </div>
                <a
                  href="https://apps.vergilscoffeetable.com"
                  className="text-sm text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline"
                >
                  Return to Apps
                </a>
              </div>
            </footer>
      </div>
    </div>
  );
}

function FieldCard({
  label,
  placeholder,
  value,
  onChange,
  inherited = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  inherited?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 shadow-sm">
      <label className="mb-2 block text-sm font-medium text-stone-700">{label}</label>
    
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-2xl border px-4 py-3 outline-none transition placeholder:text-stone-400 focus:border-stone-500 ${
          inherited
            ? "border-stone-200 bg-stone-50 text-stone-500"
            : "border-stone-300 bg-white text-stone-900"
        }`}
      />
    
      {inherited && value && (
        <div className="mt-2 text-xs italic text-stone-400">carried from previous day</div>
      )}
    </div>
  );
}
function LaneCard({
  title,
  subtitle,
  items,
  onAdd,
  onToggle,
  onTextChange,
  onRemove,
}: {
  title: string;
  subtitle: string;
  items: LaneItem[];
  onAdd: () => void;
  onToggle: (id: string, done: boolean) => void;
  onTextChange: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const tone =
    title === "KEEP"
      ? "border-orange-200 bg-orange-50/80"
      : title === "GROW"
      ? "border-green-200 bg-green-50/80"
      : "border-sky-200 bg-sky-50/80";
  
  const addTone =
    title === "KEEP"
      ? "ring-orange-200"
      : title === "GROW"
      ? "ring-green-200"
      : "ring-sky-200";
  
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-600">
            {title}
          </div>
          <div className="mt-2 text-sm leading-7 text-stone-700">{subtitle}</div>
        </div>
    
        <button
          onClick={onAdd}
          className={`inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-stone-700 shadow-sm ring-1 hover:bg-stone-50 ${addTone}`}
        >
          <Plus size={16} /> Add
        </button>
      </div>
    
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-4 text-sm text-stone-500">
            Nothing here yet.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm"
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => onToggle(item.id, e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-stone-300"
              />
              <textarea
                value={item.text}
                onChange={(e) => onTextChange(item.id, e.target.value)}
                placeholder="Add an item"
                rows={3}
                className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-stone-400 focus:border-stone-500"
              />
              <button
                onClick={() => onRemove(item.id)}
                className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                aria-label={`Remove ${title} item`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
      <div className="text-xs uppercase tracking-[0.14em] text-stone-500">{label}</div>
      <div className="mt-2 text-sm leading-6 text-stone-800">{value}</div>
    </div>
  );
}

function CloseLaneSummary({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: LaneItem[];
}) {
  const tone =
    title === "KEEP"
      ? "border-orange-200 bg-orange-50/70"
      : title === "GROW"
      ? "border-green-200 bg-green-50/70"
      : "border-sky-200 bg-sky-50/70";
  
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-600">
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-stone-700">{subtitle}</div>
    
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-4 text-sm text-stone-500">
            Nothing recorded here yet.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/80 bg-white/90 p-3 text-sm leading-6 text-stone-800 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.done}
                  readOnly
                  className="mt-1 h-4 w-4 rounded border-stone-300"
                />
                <div className={item.done ? "text-stone-500 line-through" : "text-stone-800"}>
                  {item.text || "No text yet."}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
    </div>
  );
}

function ClosePromptCard({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-stone-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-base leading-7 outline-none transition placeholder:text-stone-400 focus:border-stone-500"
      />
    </div>
  );
}
