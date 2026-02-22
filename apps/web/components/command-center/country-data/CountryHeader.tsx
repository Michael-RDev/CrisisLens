"use client";

import { CalendarClock, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/command-center/country-data/StatusBadge";

type CountryHeaderProps = {
  country: string;
  iso3: string;
  riskLabel: string;
  fundingStatus: string;
  generatedAt: string;
};

export function CountryHeader({
  country,
  iso3,
  riskLabel,
  fundingStatus,
  generatedAt
}: CountryHeaderProps) {
  return (
    <header className="rounded-xl border border-[#31546d] bg-[#112738] p-3">
      <p className="m-0 text-xs uppercase tracking-[0.08em] text-[#9eb8ca]">Country Data</p>
      <p className="m-0 mt-1 text-lg font-semibold leading-tight text-[#edf7ff]">{country}</p>
      <p className="m-0 mt-1 inline-flex items-center gap-1.5 text-xs text-[#bad0df]">
        <MapPin className="h-3.5 w-3.5" />
        {iso3}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge label={riskLabel} kind="risk" />
        <StatusBadge label={fundingStatus} kind="funding" />
      </div>
      <p className="m-0 mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#9ab5c8]">
        <CalendarClock className="h-3.5 w-3.5" />
        Last refresh {new Date(generatedAt).toLocaleTimeString()}
      </p>
    </header>
  );
}

