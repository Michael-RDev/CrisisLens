export function TopTabs() {
  return (
    <section className="mt-2 flex gap-1 overflow-x-auto border-b border-[#335066] pb-2">
      <button className="whitespace-nowrap rounded-lg border-b-2 border-[#f2a73d] px-3 py-1.5 text-sm text-[#e9f3fb]">Global View</button>
      <button className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[#91a8b9]">Overlooked Index</button>
      <button className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[#91a8b9]">Project Outliers</button>
      <button className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[#91a8b9]">What-if Allocation</button>
      <button className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[#91a8b9]">Genie Query</button>
    </section>
  );
}
