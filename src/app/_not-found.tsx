// src/app/_not-found.tsx
// NO 'use client' directive for this one

export default function NotFound() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Page Not Found</h2>
      <p style={{ fontSize: '1rem', color: '#666' }}>
        The page you are looking for does not exist.
      </p>
    </div>
  );
}