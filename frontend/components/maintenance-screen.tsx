const MaintenanceScreen = () => {
  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,rgba(41,40,89,0.45),rgba(8,7,12,0.95))] text-white flex items-center justify-center px-6 py-16">
      <div className="relative max-w-md w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.45)] overflow-hidden">
        <div className="absolute -top-20 -right-20 h-56 w-56 bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-48 w-48 bg-accent/30 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center gap-6 px-8 py-12">
          <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-10 w-10 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M3 8l9-5 9 5v8l-9 5-9-5V8z"
              />
            </svg>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-white/60">
              Under Maintenance
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight">
              We&apos;ll Be Right Back
            </h1>
          </div>

          <p className="text-base text-white/70 ">
            We&apos;re tuning the experience and will be online again shortly.
            In the meantime, feel free to follow our channels for status
            updates.
          </p>

          <div className="w-full rounded-2xl border border-white/15 bg-black/30 px-5 py-4 text-left">
            <p className="text-xs text-white/50">Status</p>
            <p className="text-white font-medium">Maintenance mode active</p>
            <p className="text-xs text-white/50 mt-1">
              Backend endpoint not configured.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
