import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

export interface NavItem { label: string; label_cn?: string; path: string; }
export interface SectionHeading { title: string; title_cn?: string; }

export interface SiteConfig {
  site: { title: string; description: string; url: string; language: string };
  profile: {
    name: string;
    name_cn?: string;
    position: string;
    affiliation: string;
    university: string;
    email: string;
    avatar: string;
    interests: string;
  };
  social: Record<string, string>;
  nav: NavItem[];
  sections: Record<string, SectionHeading>;
  publications: { author_name: string; bibtex_file: string };
  analytics?: { google_analytics?: string };
}

let _config: SiteConfig | null = null;

export function getConfig(): SiteConfig {
  if (_config) return _config;
  const configPath = path.resolve(process.cwd(), 'site.config.yml');
  const configFile = fs.readFileSync(configPath, 'utf-8');
  _config = yaml.parse(configFile) as SiteConfig;
  return _config;
}

/** Navigation is declared explicitly in site.config.yml — kept deliberately tiny. */
export function getNav(): NavItem[] {
  return getConfig().nav ?? [];
}

export function getSection(name: string): SectionHeading {
  return getConfig().sections?.[name] ?? { title: name };
}
