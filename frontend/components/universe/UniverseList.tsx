import { Universe } from '../../types/universe';
import UniverseCard from './UniverseCard';

interface Props {
  universes: Universe[];
  onDelete: (id: string) => void;
}

export default function UniverseList({ universes, onDelete }: Props) {
  if (universes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg mb-2">No universes yet</p>
        <p className="text-sm">Create your first universe to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {universes.map((u) => (
        <UniverseCard key={u.id} universe={u} onDelete={onDelete} />
      ))}
    </div>
  );
}
