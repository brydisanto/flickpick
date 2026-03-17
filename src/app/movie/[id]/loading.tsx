export default function MovieLoading() {
  return (
    <div className="bg-bg-primary">
      <div className="w-full h-[300px] sm:h-[400px] lg:h-[450px] bg-bg-tertiary animate-pulse" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 -mt-32 relative z-10">
          <div className="shrink-0 w-48 sm:w-56 mx-auto sm:mx-0">
            <div className="aspect-[2/3] rounded-[var(--radius-lg)] bg-bg-tertiary animate-pulse" />
          </div>
          <div className="flex-1 pt-2 space-y-4">
            <div className="h-10 w-3/4 bg-bg-tertiary rounded animate-pulse" />
            <div className="h-5 w-1/2 bg-bg-tertiary rounded animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 w-20 bg-bg-tertiary rounded-full animate-pulse" />
              ))}
            </div>
            <div className="flex gap-4 mt-4">
              <div className="w-16 h-16 bg-bg-tertiary rounded-[var(--radius-md)] animate-pulse" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center space-y-1">
                  <div className="h-6 w-12 bg-bg-tertiary rounded animate-pulse mx-auto" />
                  <div className="h-3 w-16 bg-bg-tertiary rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-10 space-y-3">
          <div className="h-6 w-32 bg-bg-tertiary rounded animate-pulse" />
          <div className="h-4 w-full bg-bg-tertiary rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-bg-tertiary rounded animate-pulse" />
          <div className="h-4 w-4/6 bg-bg-tertiary rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
