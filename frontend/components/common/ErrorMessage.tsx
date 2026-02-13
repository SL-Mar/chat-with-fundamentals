export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
      {message}
    </div>
  );
}
