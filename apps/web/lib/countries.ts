import worldCountries from "world-countries";

export type CountryRef = {
  iso3: string;
  name: string;
  ccn3?: string;
  latlng?: [number, number];
};

const refs: CountryRef[] = (worldCountries as Array<{
  cca3: string;
  ccn3?: string;
  latlng?: [number, number];
  name?: { common?: string };
}>).map((country) => ({
  iso3: country.cca3,
  name: country.name?.common ?? country.cca3,
  ccn3: country.ccn3,
  latlng: country.latlng
}));

export const allCountriesSorted = [...refs].sort((a, b) => a.name.localeCompare(b.name));

export const countryByIso3 = new Map(allCountriesSorted.map((country) => [country.iso3, country]));

export const iso3ByCcn3 = new Map(
  allCountriesSorted
    .filter((country) => Boolean(country.ccn3))
    .map((country) => [country.ccn3 as string, country.iso3])
);
