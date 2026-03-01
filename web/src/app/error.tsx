"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 text-center shadow-lg border border-border">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Une erreur est survenue
        </h2>
        <p className="mb-6 text-sm text-muted">
          {process.env.NODE_ENV === 'development' ? error.message : "Une erreur inattendue s'est produite. Veuillez réessayer."}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full rounded-lg gradient-gold px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Retour à l&apos;accueil
          </a>
        </div>

        {error.digest && (
          <p className="mt-4 text-xs text-muted">
            Réf: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
