"use client";

import { Suspense, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Sparkles, LogIn } from "lucide-react";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import DropZone from "@/components/upload/DropZone";
import PhotoGrid from "@/components/upload/PhotoGrid";
import StyleSelector from "@/components/upload/StyleSelector";
import ModeSelector from "@/components/upload/ModeSelector";
import PropertyInfoForm from "@/components/upload/PropertyInfoForm";
import Button from "@/components/ui/Button";
import AuthButton from "@/components/auth/AuthButton";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useUpload } from "@/hooks/useUpload";
import Link from "next/link";

function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update } = useSession();

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      update();
      router.replace("/", { scroll: false });
    }
  }, [searchParams, update, router]);

  return null;
}

export default function Home() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const uploadRef = useRef<HTMLDivElement>(null);
  const {
    photos, style, mode, visiteForm, maxPhotos,
    isUploading, error, uploadProgress,
    addFiles, removePhoto, setStyle, setMode, setVisiteForm, submit, canSubmit,
  } = useUpload();

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async () => {
    const projectId = await submit();
    if (projectId) {
      router.push(`/project/${projectId}`);
    }
  };

  return (
    <div className="min-h-screen">
      <Suspense>
        <CheckoutSuccess />
      </Suspense>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <a href="/" className="text-lg font-bold text-gradient-gold">
            VIMIMO
          </a>
          <div className="flex items-center gap-3">
            {session && (
              <Link
                href="/pricing"
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Crédits
              </Link>
            )}
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      <div className="pt-14">
        <Hero onStart={scrollToUpload} />
        <Features />

        {/* Upload section */}
        <section
          ref={uploadRef}
          className="mx-auto max-w-3xl px-6 pb-24 pt-8"
        >
          {authStatus === "loading" ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-muted animate-spin" />
            </div>
          ) : !session ? (
            <div className="text-center space-y-4 py-12">
              <h2 className="text-2xl font-bold">Créer un projet</h2>
              <p className="text-sm text-muted">
                Connectez-vous pour commencer votre premier projet de staging
              </p>
              <Link href="/login">
                <Button variant="primary" size="lg">
                  <LogIn className="mr-2 h-5 w-5" />
                  Se connecter
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Créer un projet</h2>
                <p className="mt-2 text-sm text-muted">
                  Uploadez vos photos et choisissez un style
                </p>
              </div>

              <ModeSelector selected={mode} onSelect={setMode} />
              <DropZone onFiles={addFiles} disabled={isUploading} maxPhotos={maxPhotos} />
              <PhotoGrid photos={photos} onRemove={removePhoto} />
              <StyleSelector selected={style} onSelect={setStyle} />

              {mode === "video_visite" && (
                <PropertyInfoForm value={visiteForm} onChange={setVisiteForm} />
              )}

              {error && (
                <p className="text-center text-sm text-red-500">
                  {error === "Crédits insuffisants" ? (
                    <span>
                      Crédits insuffisants.{" "}
                      <Link href="/pricing" className="text-icon-accent hover:underline">
                        Acheter des crédits
                      </Link>
                    </span>
                  ) : (
                    error
                  )}
                </p>
              )}

              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  size="lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      {mode === "video_visite" ? "Lancer la Video Visite" : "Lancer le staging"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
