const STATUS_COLORS: Record<string, string> = {
  creating: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  ready: 'bg-green-500/20 text-green-400 border-green-500/50',
  refreshing: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  error: 'bg-red-500/20 text-red-400 border-red-500/50',
  pending: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  ingesting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
};

export default function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>
      {status}
    </span>
  );
}
