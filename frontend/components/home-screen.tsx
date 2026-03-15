"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Flame,
  Gamepad2,
  Gem,
  RefreshCw,
  Settings,
  Sparkles,
  User,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type { Socket } from "socket.io-client";

import {
  fetchHomeSnapshot,
  loginLocalDev,
  signupLocalDev,
  verifyTelegramAndGetToken,
} from "@/lib/api";
import { closeSocket, connectSocket } from "@/lib/socket";
import { getTelegramInitData, initTelegramWebApp } from "@/lib/telegram";
import type { HomeSnapshot } from "@/types/home";

type LoadingState = "boot" | "ready" | "error";
type DevAuthMode = "login" | "signup";

const FALLBACK_TOKEN_KEY = "mella_token";

function tabIcon(key: string) {
  if (key === "play") return <Gamepad2 size={18} />;
  if (key === "wallet") return <Wallet size={18} />;
  if (key === "profile") return <User size={18} />;
  return <Settings size={18} />;
}

function roomIcon(index: number) {
  const icons = [
    <Crown key="crown" size={42} />,
    <Gem key="gem" size={42} />,
    <Sparkles key="sparkles" size={42} />,
    <Flame key="flame" size={42} />,
  ];
  return icons[index % icons.length] ?? <Sparkles size={42} />;
}

export function HomeScreen() {
  const router = useRouter();
  const [state, setState] = useState<LoadingState>("boot");
  const [showDevAuth, setShowDevAuth] = useState(false);
  const [devAuthMode, setDevAuthMode] = useState<DevAuthMode>("login");
  const [devEmail, setDevEmail] = useState("");
  const [devPassword, setDevPassword] = useState("");
  const [devFirstName, setDevFirstName] = useState("");
  const [devReferralCode, setDevReferralCode] = useState("DEVAGENT");
  const [error, setError] = useState<string>("");
  const [snapshot, setSnapshot] = useState<HomeSnapshot | null>(null);

  useEffect(() => {
    let alive = true;
    let socket: Socket | null = null;

    async function boot() {
      try {
        initTelegramWebApp();

        const initData = getTelegramInitData();
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem(FALLBACK_TOKEN_KEY)
            : null;

        if (!initData && !stored) {
          setShowDevAuth(true);
          setState("error");
          setError("local_auth_required");
          return;
        }

        const token = initData
          ? await verifyTelegramAndGetToken(initData)
          : stored || "";

        if (!token) {
          throw new Error("missing_auth_token");
        }

        localStorage.setItem(FALLBACK_TOKEN_KEY, token);

        const initial = await fetchHomeSnapshot(token);
        if (!alive) return;

        setSnapshot(initial);
        setState("ready");

        socket = connectSocket(token);
        socket.emit("get_home");

        socket.on("home_snapshot", (incoming: HomeSnapshot) => {
          setSnapshot((prev) => {
            if (!prev) return incoming;
            if (incoming.version > prev.version) return incoming;
            return prev;
          });
        });

        socket.on("home_snapshot_failed", () => {
          setError("Live updates paused.");
        });
      } catch (err) {
        if (!alive) return;
        if (err instanceof Error && err.message === "missing_auth_token") {
          setShowDevAuth(true);
        }
        setState("error");
        setError(err instanceof Error ? err.message : "load_failed");
      }
    }

    void boot();

    return () => {
      alive = false;
      if (socket) {
        socket.removeAllListeners();
      }
      closeSocket();
    };
  }, []);

  const home = snapshot?.home;

  const roomRows = useMemo(() => {
    if (!home) return [];
    return home.rooms;
  }, [home]);

  async function openRoom(room: {
    roomId: string;
    sessionId: string | null;
    title: string;
  }) {
    void room.sessionId;
    void room.title;
    router.push(`/rooms/${room.roomId}`);
  }

  if (state === "boot") {
    return (
      <main className="min-h-screen bg-star-grid p-4 text-white">
        <div className="star-noise fixed inset-0 pointer-events-none" />
        <div className="relative mx-auto mt-40 max-w-md rounded-2xl border border-cyan-500/20 bg-[#05112a]/80 p-6 text-center shadow-glow">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Mella Bingo
          </p>
          <p className="mt-3 text-lg font-semibold">Loading your Mini App...</p>
        </div>
      </main>
    );
  }

  if (state === "error") {
    if (showDevAuth) {
      return (
        <main className="min-h-screen bg-star-grid p-4 text-white">
          <div className="relative mx-auto mt-20 max-w-md rounded-2xl border border-cyan-400/30 bg-[#05112a]/90 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/90">
              Local Dev Mode
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              {devAuthMode === "login" ? "Login" : "Sign Up"}
            </h2>
            <p className="mt-1 text-sm text-cyan-100/75">
              Use email/password to test end-to-end without Telegram bot setup.
            </p>

            <form
              className="mt-4 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");

                try {
                  const token =
                    devAuthMode === "login"
                      ? await loginLocalDev({
                          email: devEmail,
                          password: devPassword,
                        })
                      : await signupLocalDev({
                          email: devEmail,
                          password: devPassword,
                          firstName: devFirstName || undefined,
                          referralCode: devReferralCode || undefined,
                        });

                  localStorage.setItem(FALLBACK_TOKEN_KEY, token);
                  const initial = await fetchHomeSnapshot(token);
                  setSnapshot(initial);
                  setState("ready");
                  setShowDevAuth(false);
                } catch {
                  setError(
                    devAuthMode === "login"
                      ? "Local login failed. Check credentials or enable LOCAL_DEV_AUTH_ENABLED."
                      : "Local signup failed. Email may already exist.",
                  );
                }
              }}
            >
              <input
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-cyan-400/30 bg-[#03112c] px-3 py-2 text-sm text-white outline-none"
              />
              <input
                value={devPassword}
                onChange={(e) => setDevPassword(e.target.value)}
                type="password"
                required
                minLength={6}
                placeholder="password"
                className="w-full rounded-lg border border-cyan-400/30 bg-[#03112c] px-3 py-2 text-sm text-white outline-none"
              />
              {devAuthMode === "signup" ? (
                <>
                  <input
                    value={devFirstName}
                    onChange={(e) => setDevFirstName(e.target.value)}
                    type="text"
                    placeholder="first name (optional)"
                    className="w-full rounded-lg border border-cyan-400/30 bg-[#03112c] px-3 py-2 text-sm text-white outline-none"
                  />
                  <input
                    value={devReferralCode}
                    onChange={(e) =>
                      setDevReferralCode(e.target.value.toUpperCase())
                    }
                    type="text"
                    placeholder="referral code (e.g. DEVAGENT)"
                    className="w-full rounded-lg border border-cyan-400/30 bg-[#03112c] px-3 py-2 text-sm text-white outline-none"
                  />
                </>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-lg bg-[#1d63ff] px-4 py-3 text-sm font-bold tracking-[0.1em]"
              >
                {devAuthMode === "login" ? "LOGIN" : "SIGN UP"}
              </button>
            </form>

            <button
              className="mt-3 text-xs text-cyan-200/85 underline"
              onClick={() =>
                setDevAuthMode((prev) =>
                  prev === "login" ? "signup" : "login",
                )
              }
            >
              {devAuthMode === "login"
                ? "No account? Create one"
                : "Already have an account? Login"}
            </button>

            {error ? (
              <p className="mt-2 text-xs text-amber-200">{error}</p>
            ) : null}
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-star-grid p-4 text-white">
        <div className="relative mx-auto mt-28 max-w-md rounded-2xl border border-red-400/30 bg-[#2a0b1a]/80 p-6">
          <p className="text-base font-semibold">Could not load home screen</p>
          <p className="mt-2 text-sm text-red-100">
            {error || "Unknown error"}
          </p>
        </div>
      </main>
    );
  }

  if (!home) {
    return (
      <main className="min-h-screen bg-star-grid p-4 text-white">
        <div className="relative mx-auto mt-28 max-w-md rounded-2xl border border-red-400/30 bg-[#2a0b1a]/80 p-6">
          <p className="text-base font-semibold">Could not load home screen</p>
          <p className="mt-2 text-sm text-red-100">home_data_missing</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-star-grid text-white">
      <div className="star-noise fixed inset-0 pointer-events-none" />
      <div className="relative mx-auto max-w-md px-4 pb-28 pt-4">
        <header className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-[34px] font-bold leading-none tracking-tight">
              {home.user.greetingTitle}
            </h1>
            <p className="mt-1 text-sm uppercase tracking-[0.15em] text-cyan-100/80">
              {home.user.greetingSubtitle}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-full border border-cyan-400/40 bg-[#052047] p-3 shadow-glow"
              aria-label="refresh"
            >
              <RefreshCw size={18} />
            </button>
            <button className="rounded-full bg-[#0a8fff] px-4 py-3 text-xs font-bold tracking-[0.14em] text-white shadow-glow">
              + DEPOSIT
            </button>
          </div>
        </header>

        <section className="card-ring rounded-3xl bg-gradient-to-br from-[#4f7fff] via-[#4c69ff] to-[#6248ff] p-5 shadow-glow">
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-50/85">
            {home.ui.balanceCard.title}
          </p>
          <p className="mt-1 text-5xl font-bold leading-none tracking-wide">
            {home.wallet.currency}{" "}
            <span className="text-4xl">{home.wallet.balanceLabel}</span>
          </p>
          <p className="mt-5 text-xs font-semibold tracking-[0.2em] text-cyan-50/85">
            {home.ui.balanceCard.bonusTitle}
          </p>
          <p className="mt-1 text-3xl font-bold">
            {home.wallet.bonusLabel} {home.wallet.currency}
          </p>
          <p className="mt-3 text-right text-4xl font-bold text-white/25">
            {home.ui.balanceCard.brandWatermark}
          </p>
        </section>

        <button className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-cyan-400/60 bg-[#02133a]/80 px-4 py-3 text-sm font-semibold tracking-[0.12em] text-cyan-50">
          <Users size={16} />
          <span>{home.ui.inviteCta.label}</span>
        </button>

        <section className="mt-7">
          <div className="mb-4 flex items-center gap-2 text-cyan-100/90">
            <Zap size={18} />
            <h2 className="text-2xl font-semibold tracking-wide">
              {home.ui.section.roomsTitle}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {roomRows.map((room, index) => (
              <article
                key={room.roomId}
                className="relative cursor-pointer overflow-hidden rounded-3xl p-4 shadow-glow"
                style={{
                  background: `linear-gradient(165deg, ${room.style.gradientFrom}, ${room.style.gradientTo})`,
                }}
                onClick={() => openRoom(room)}
              >
                <p className="text-[11px] font-semibold tracking-[0.16em] text-white/85">
                  {room.codeName}
                </p>
                <p className="mt-3 text-4xl font-black leading-none tracking-wide">
                  {room.priceLabel}
                </p>
                <button
                  className="mt-14 rounded-full bg-cyan-200/25 px-5 py-2 text-xs font-bold tracking-[0.12em]"
                  onClick={(e) => {
                    e.stopPropagation();
                    openRoom(room);
                  }}
                >
                  {room.ctaLabel}
                </button>
                <div className="pointer-events-none absolute -bottom-5 -right-2 text-5xl drop-shadow-[0_5px_14px_rgba(0,0,0,0.28)]">
                  {roomIcon(index)}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-cyan-400/20 bg-[#0a0820]/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))] pt-2 backdrop-blur">
        <ul className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {home.ui.tabs.map((tab) => (
            <li key={tab.key}>
              <button
                className={`flex w-full flex-col items-center rounded-xl py-2 text-xs ${
                  tab.active ? "bg-[#112855] text-cyan-200" : "text-cyan-100/75"
                }`}
              >
                <span className="text-lg">{tabIcon(tab.key)}</span>
                <span>{tab.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {error ? (
        <div className="fixed right-3 top-3 z-30 rounded-lg bg-amber-400/20 px-3 py-2 text-xs text-amber-100">
          {error}
        </div>
      ) : null}
    </main>
  );
}
