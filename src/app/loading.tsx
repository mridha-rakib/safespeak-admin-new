export default function Loading() {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <div
        role="status"
        aria-label="Loading"
        className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary"
      />
    </div>
  );
}
