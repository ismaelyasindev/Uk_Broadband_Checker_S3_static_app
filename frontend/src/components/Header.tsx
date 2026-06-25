import { isDemoMode } from '../lib/broadband';

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b hairline bg-paper/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          {/* Animated signal bars — the connectivity motif, alive on load. */}
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-paper shadow-lift">
            <span className="flex h-4 items-end gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-[3px] origin-bottom rounded-full bg-flare animate-bars"
                  style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </span>
          </span>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-bold tracking-tightest text-ink">
              Broadband<span className="text-flare">Check</span>
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-mute">
              UK availability
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            isDemoMode
              ? 'border-amber-300/60 bg-amber-50 text-amber-700'
              : 'border-emerald-300/60 bg-emerald-50 text-emerald-700'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isDemoMode ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
          {isDemoMode ? 'Demo data' : 'Live'}
        </span>
      </div>
    </header>
  );
}
