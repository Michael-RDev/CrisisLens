"use client";

type GlobeCanvasProps = {
  children: React.ReactNode;
  overlays?: React.ReactNode;
};

export function GlobeCanvas({ children, overlays }: GlobeCanvasProps) {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#071522] text-[#eaf3f8]">
      <div className="absolute inset-0 z-0">{children}</div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_30%,rgba(139,193,230,0.14),transparent_55%),linear-gradient(180deg,rgba(5,16,27,0.08)_0%,rgba(5,16,27,0.2)_100%)]" />
      {overlays}
    </main>
  );
}

