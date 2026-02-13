export function formatNumber(value: any): string {
  if (value == null || value === '' || value === 'null') return '—';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

export function formatPct(value: any): string {
  if (value == null) return '—';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return `${(num * 100).toFixed(2)}%`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
