'use client' // MUST be the first line, NO quotes around use client

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div>
          <h2>Something went wrong!</h2>
          <p>{error?.message || 'Unknown error'}</p>
          <button onClick={() => reset()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}