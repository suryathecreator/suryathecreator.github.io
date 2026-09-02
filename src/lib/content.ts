import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { parseBibTeX } from './bibtex';
import { getConfig } from './config';
import type { Publication } from './types';

const root = (...p: string[]) => path.resolve(process.cwd(), ...p);

function readYaml<T>(relPath: string, fallback: T): T {
  try {
    return (yaml.parse(fs.readFileSync(root(relPath), 'utf-8')) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

/* ── News ─────────────────────────────────────────────── */

export interface NewsEntry { date: string; text: string; logo?: string; logo_alt?: string; }
export interface NewsMonth { month: string; entries: NewsEntry[]; }
export interface NewsYear { year: string; months: NewsMonth[]; }

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

/** News grouped by year, then by month, newest first. */
export function getNews(): NewsYear[] {
  const raw = readYaml<NewsEntry[]>('src/content/news.yml', []);
  const sorted = raw
    .filter(n => n && n.date && n.text)
    .map(n => ({ ...n, date: String(n.date) }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const years: NewsYear[] = [];
  for (const entry of sorted) {
    const [y, m] = entry.date.split('-');
    const monthLabel = MONTHS[parseInt(m ?? '1', 10) - 1] ?? '';
    let year = years.find(g => g.year === y);
    if (!year) { year = { year: y, months: [] }; years.push(year); }
    let month = year.months.find(g => g.month === monthLabel);
    if (!month) { month = { month: monthLabel, entries: [] }; year.months.push(month); }
    month.entries.push(entry);
  }
  return years;
}

/* ── Academic timeline (education, positions, …) ──────── */

export interface TimelineEntry {
  start: number | string;
  end: number | string;
  logo?: string;
  logo_alt?: string;
  institution: string;
  detail?: string;
  note?: string;
}

export function getTimeline(): TimelineEntry[] {
  return readYaml<TimelineEntry[]>('src/content/timeline.yml', []);
}

/* ── Publications ─────────────────────────────────────── */

export function getPublications(): Publication[] {
  const config = getConfig();
  try {
    const bib = fs.readFileSync(root('src/content/publications', config.publications.bibtex_file), 'utf-8');
    const all = parseBibTeX(bib);
    const selected = all.filter(p => p.selected);
    return selected.length > 0 ? selected : all;
  } catch {
    return [];
  }
}

/* ── Bio prose ────────────────────────────────────────── */

export function getBio(): string {
  try {
    return fs.readFileSync(root('src/content/about.md'), 'utf-8').trim();
  } catch {
    return '';
  }
}
