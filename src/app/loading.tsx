export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-44 rounded-xl skeleton" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-44 rounded-2xl skeleton" />
        <div className="h-44 rounded-2xl skeleton" />
      </div>
      <div className="h-72 rounded-2xl skeleton" />
    </div>
  );
}
