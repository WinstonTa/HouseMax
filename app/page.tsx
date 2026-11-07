// Placeholder page for the backend-only build. Frontend team: replace freely.
export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 720 }}>
      <h1>HouseMax backend</h1>
      <p>Prototype only. Not legal advice.</p>
      <ul>
        <li>
          <a href="/api/health">GET /api/health</a>
        </li>
        <li>
          <a href="/api/sample-project">GET /api/sample-project</a> (body for POST /api/evaluate)
        </li>
      </ul>
      <p>See docs/integration/ for the frontend integration guide.</p>
    </main>
  );
}
