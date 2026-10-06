import { content, type SiteContent } from '@/components/site/content';
import { defaultLocale, type Locale } from './types';

export function parseLocale(value: unknown): Locale | null {
  return value === 'ka' || value === 'en' ? value : null;
}

export function getContent(lang: Locale): SiteContent {
  return content[lang] ?? content[defaultLocale];
}

export function localeHref(lang: Locale): string {
  return lang === 'ka' ? '/' : '/en';
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function deepKeys(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => deepKeys(v, `${prefix}[${i}]`));
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => deepKeys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [`${prefix}=${typeof value}`];
}
