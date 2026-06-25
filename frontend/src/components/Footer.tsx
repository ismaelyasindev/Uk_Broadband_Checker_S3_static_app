export function Footer() {
  return (
    <footer className="mt-20 border-t hairline">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-xs text-ink-mute sm:px-8">
        <p className="text-ink-soft">
          Speeds shown are the highest predicted speeds at a location and may
          differ from speeds actually received.
        </p>
        <p>
          Demo project — postcode validation by{' '}
          <a
            className="font-semibold text-flare-deep underline-offset-2 hover:underline"
            href="https://postcodes.io"
            target="_blank"
            rel="noreferrer"
          >
            postcodes.io
          </a>
          . Not affiliated with Ofcom.
        </p>
      </div>
    </footer>
  );
}
