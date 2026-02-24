"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f9fafb",
            padding: "1rem",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              borderRadius: "1rem",
              backgroundColor: "#fff",
              padding: "2rem",
              textAlign: "center",
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            }}
          >
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111", marginBottom: "0.5rem" }}>
              Erreur critique
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>
              L'application a rencontré une erreur inattendue.
            </p>
            <button
              onClick={reset}
              style={{
                width: "100%",
                padding: "0.625rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#fff",
                backgroundColor: "#000",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                marginBottom: "0.75rem",
              }}
            >
              Réessayer
            </button>
            <br />
            <a
              href="/"
              style={{ fontSize: "0.875rem", color: "#6b7280", textDecoration: "none" }}
            >
              Retour à l'accueil
            </a>
            {error.digest && (
              <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#9ca3af" }}>
                Réf: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
