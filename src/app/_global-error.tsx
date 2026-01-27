// src/app/_global-error.tsx
'use client'; // MUST BE THE FIRST LINE

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
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Something went wrong!</h1>
          <p>{error?.message || 'An unknown error occurred'}</p>
          <button 
            onClick={() => reset()}
            style={{ 
              padding: '10px 20px', 
              background: '#0070f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}