import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { CoinNovaIcon } from "@/components/glass/Logo";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsStandalone(true);
      return;
    }

    // Check if user previously dismissed
    if (localStorage.getItem("coinnova-pwa-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("coinnova-pwa-dismissed", "1");
  };

  if (isStandalone || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4">
      <div className="glass-strong rounded-2xl border border-primary/30 p-4 shadow-glow-primary/10">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <CoinNovaIcon className="w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Install CoinNova</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Add to your home screen for instant access and a native app experience.
            </div>
            <button
              onClick={handleInstall}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-background text-xs font-semibold hover:opacity-90 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
