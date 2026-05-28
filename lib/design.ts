export const COLORS = {
  bg: '#F8FAFC',
  ink: '#0F172A',
  accent: '#6366F1',
  overdue: '#EF4444',
  due: '#F59E0B',
  won: '#10B981',
  muted: '#64748B',
  border: '#E2E8F0',
} as const;

export const STAGES = [
  'exposure_scan',
  'gap_analysis',
  'policy_build',
  'origin_integration',
  'retainer',
  'partnership',
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  exposure_scan: 'Exposure Scan',
  gap_analysis: 'Gap Analysis',
  policy_build: 'Policy Build',
  origin_integration: 'ORIGIN Integration',
  retainer: 'Retainer',
  partnership: 'Partnership',
};

export const INDUSTRIES = [
  'music',
  'film_vfx',
  'gaming',
  'publishing',
  'advertising',
  'cross_sector',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  music: 'Music',
  film_vfx: 'Film / VFX',
  gaming: 'Gaming',
  publishing: 'Publishing',
  advertising: 'Advertising',
  cross_sector: 'Cross-sector',
};

export const STATUSES = ['active', 'stalled', 'won', 'lost', 'paused'] as const;
export type Status = (typeof STATUSES)[number];

export const MUSIC_SUB_TYPES = [
  'DIY+Own Backend',
  'DIY+No Backend',
  'Non-DIY+Own Backend',
  'Non-DIY+No Backend',
  'Inactive',
] as const;

// ============================================================================
// Post-workshop additions (15 May 2026)
// ============================================================================

export const TRACKS = ['partnership', 'consulting', 'audit'] as const;
export type Track = (typeof TRACKS)[number];

export const TRACK_LABELS: Record<Track, string> = {
  partnership: 'Partnership',
  consulting: 'Consulting',
  audit: 'Audit',
};

export const PRICING_TIERS = ['diagnostic', 'build', 'integrate', 'bespoke'] as const;
export type PricingTier = (typeof PRICING_TIERS)[number];

export const PRICING_TIER_LABELS: Record<PricingTier, string> = {
  diagnostic: 'Diagnostic',
  build: 'Build',
  integrate: 'Integrate',
  bespoke: 'Bespoke',
};

export const PRICING_TIER_ANCHORS: Record<PricingTier, string> = {
  diagnostic: '£6K',
  build: 'from £20K',
  integrate: 'from £50K',
  bespoke: 'bespoke',
};

export const ENGINE_PIPES = ['engine', 'pipe', 'both'] as const;
export type EnginePipe = (typeof ENGINE_PIPES)[number];

export const ENGINE_PIPE_LABELS: Record<EnginePipe, string> = {
  engine: 'Engine',
  pipe: 'Pipe',
  both: 'Engine + Pipe',
};
