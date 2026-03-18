export default function ProfileLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      {/* Profile Header skeleton */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
        <div className="w-24 h-24 rounded-full bg-bg-tertiary" />
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div className="h-8 w-48 bg-bg-tertiary rounded mx-auto sm:mx-0" />
          <div className="h-4 w-32 bg-bg-tertiary rounded mx-auto sm:mx-0" />
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
            <div className="h-5 w-20 bg-bg-tertiary rounded" />
            <div className="h-5 w-24 bg-bg-tertiary rounded" />
            <div className="h-5 w-28 bg-bg-tertiary rounded" />
            <div className="h-6 w-28 bg-bg-tertiary rounded-full" />
          </div>
        </div>
      </div>

      {/* Poster grid skeleton */}
      <div className="h-6 w-36 bg-bg-tertiary rounded mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="aspect-[2/3] rounded-[var(--radius-md)] bg-bg-tertiary"
          />
        ))}
      </div>
    </div>
  );
}
