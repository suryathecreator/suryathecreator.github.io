import { describe, it, expect, vi, beforeEach } from 'vitest';

const YAML = `
site:
  title: Test
  description: Test
  url: https://test.com
  language: en
profile:
  name: Test Person
  name_cn: 测试
  position: Researcher
  affiliation: Dept
  university: Uni
  email: test@test.com
  avatar: /test.jpg
  interests: Test interests.
social:
  github: https://github.com/test
nav:
  - label: Home
    label_cn: 首页
    path: /
  - label: Personal
    label_cn: 杂记
    path: /personal
sections:
  news:
    title: Latest News
    title_cn: 近况
publications:
  author_name: Test Person
  bibtex_file: papers.bib
`;

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('node:fs', () => ({ default: { readFileSync: () => YAML } }));
  });

  it('getNav returns the navigation declared in site.config.yml', async () => {
    const { getNav } = await import('../config');
    expect(getNav().map(n => n.path)).toEqual(['/', '/personal']);
  });

  it('getSection returns a heading with its Chinese annotation', async () => {
    const { getSection } = await import('../config');
    expect(getSection('news')).toEqual({ title: 'Latest News', title_cn: '近况' });
  });

  it('getSection falls back to the raw name for unknown sections', async () => {
    const { getSection } = await import('../config');
    expect(getSection('nope').title).toBe('nope');
  });
});
