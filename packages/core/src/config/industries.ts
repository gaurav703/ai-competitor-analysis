// Industry categories (spec §4). Industry only changes config, never the core pipeline.
export const INDUSTRY_CATEGORIES = [
  'software',
  'ecommerce',
  'food_hospitality',
  'retail',
  'services',
  'manufacturing',
  'real_estate',
  'healthcare',
  'education',
  'other',
] as const;

export type IndustryCategory = (typeof INDUSTRY_CATEGORIES)[number];

export const INDUSTRY_CATEGORY_LABELS: Record<IndustryCategory, string> = {
  software: 'Software / SaaS',
  ecommerce: 'E-commerce / D2C',
  food_hospitality: 'Food & hospitality',
  retail: 'Retail',
  services: 'Services',
  manufacturing: 'Manufacturing',
  real_estate: 'Real estate',
  healthcare: 'Healthcare',
  education: 'Education',
  other: 'Other',
};
