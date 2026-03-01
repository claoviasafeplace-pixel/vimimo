import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-8xl font-extrabold text-gradient-gold">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 max-w-md text-muted">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent-from px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Retour à l&apos;accueil
      </Link>
      <div className="mt-6 flex gap-4">
        <Link href="/" className="text-sm text-amber-400 hover:underline">Accueil</Link>
        <Link href="/pricing" className="text-sm text-amber-400 hover:underline">Tarifs</Link>
        <Link href="/commander" className="text-sm text-amber-400 hover:underline">Commander</Link>
      </div>
    </div>
  );
}
