import fs from "node:fs/promises";
import path from "node:path";
import { CountryMetrics, DataSnapshot, ProjectProfile } from "@/lib/types";

export async function loadCountryMetrics(): Promise<CountryMetrics[]> {
  const filePath = path.join(process.cwd(), "public", "data", "country-metrics.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as CountryMetrics[];
}

export async function loadSnapshot(): Promise<DataSnapshot> {
  const filePath = path.join(process.cwd(), "public", "data", "snapshot.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as DataSnapshot;
}

export async function loadProjectProfiles(): Promise<ProjectProfile[]> {
  const filePath = path.join(process.cwd(), "public", "data", "project-profiles.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as ProjectProfile[];
}
