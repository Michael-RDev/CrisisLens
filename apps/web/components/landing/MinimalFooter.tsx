export function MinimalFooter() {
  return (
    <footer className="mx-auto mt-12 flex w-full max-w-6xl flex-col items-center justify-between gap-2 border-t border-[#5f8aa833] px-4 pb-8 pt-5 text-xs text-[#9cb8cb] sm:flex-row sm:px-6 lg:px-8" role="contentinfo">
      <a href="mailto:team@crisislens.org" className="transition hover:text-[#d8ebf8]">
        team@crisislens.org
      </a>
      <p className="m-0">© {new Date().getFullYear()} CrisisLens</p>
    </footer>
  );
}
