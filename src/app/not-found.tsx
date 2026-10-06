// One 404 for the whole site. The admin screens call notFound() for a wrong secret, and unknown URLs land here too,
// so a visitor cannot tell "this path is an admin path" from "this path does not exist".
export default function NotFound() {
  return (
    <main style={{ padding: '4rem 1rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.25rem' }}>404</h1>
      <p>This page could not be found.</p>
    </main>
  );
}
