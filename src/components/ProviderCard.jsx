// Provider card used in listings (hospitals, labs, tests) and the generated cover used when a provider has no photo.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FlaskConical, Home, Hospital, MapPin, Siren } from "lucide-react";
import { Badge, Button, Skeleton, cx } from "./ui";
import { KIND_LABEL } from "../lib/format";

const COVERS = [
  "from-brand-600 via-brand-700 to-ink-900",
  "from-care-600 via-care-700 to-ink-900",
  "from-ink-700 via-ink-800 to-ink-950",
  "from-brand-500 via-ink-800 to-ink-950",
  "from-care-500 via-ink-700 to-ink-900",
];

const hash = (s = "") => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const initialsOf = (name = "") =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "H";

const providerPath = (p) => `/${p.kind === "lab" ? "labs" : "hospitals"}/${p._id}`;

/** Photo cover, or a generated gradient cover with the kind icon and initials. */
export function ProviderCover({ provider, className, large }) {
  const [broken, setBroken] = useState(false);
  const Icon = provider.kind === "lab" ? FlaskConical : Hospital;
  if (provider.image && !broken) {
    return (
      <div className={cx("relative overflow-hidden bg-ink-100", className)}>
        <img src={provider.image} alt={`${provider.name}`} loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
      </div>
    );
  }
  return (
    <div className={cx("relative overflow-hidden bg-gradient-to-br", COVERS[hash(provider.name) % COVERS.length], className)} role="img" aria-label={`${provider.name} cover`}>
      <svg className="absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden="true">
        <defs>
          <pattern id={`plus-${provider._id || "x"}`} width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M14 8v12M8 14h12" stroke="white" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#plus-${provider._id || "x"})`} />
      </svg>
      <Icon className={cx("absolute -bottom-4 -right-4 text-white/10 transition duration-700 group-hover:scale-110", large ? "h-48 w-48" : "h-32 w-32")} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cx("grid place-items-center rounded-md border border-white/25 bg-white/10 font-display font-extrabold text-white backdrop-blur-sm", large ? "h-24 w-24 text-3xl" : "h-16 w-16 text-xl")}>
          {initialsOf(provider.name)}
        </span>
      </div>
    </div>
  );
}

export function ProviderBadges({ provider, className }) {
  return (
    <div className={cx("flex flex-wrap gap-1.5", className)}>
      {provider.kind === "lab" && provider.homeCollection && (
        <Badge tone="care">
          <Home className="h-3 w-3" aria-hidden="true" /> Home collection
        </Badge>
      )}
      {provider.kind !== "lab" && provider.emergency && (
        <Badge tone="red">
          <Siren className="h-3 w-3" aria-hidden="true" /> 24×7 emergency
        </Badge>
      )}
    </div>
  );
}

export default function ProviderCard({ provider, service }) {
  const services = provider.services || [];
  const shown = services.slice(0, 3);
  const path = providerPath(provider) + (service ? `?service=${encodeURIComponent(service)}` : "");
  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <Link to={path} tabIndex={-1} aria-hidden="true" className="relative block">
        <ProviderCover provider={provider} className="aspect-[16/9] w-full" />
        <span className="absolute left-3 top-3 rounded-sm bg-white/95 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-700 shadow-sm">{KIND_LABEL[provider.kind] || "Provider"}</span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug">
          <Link to={path} className="hover:text-brand-700">
            {provider.name}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-500">
          {provider.category && <span>{provider.category}</span>}
          {provider.category && provider.city && <span aria-hidden="true">·</span>}
          {provider.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
              {provider.city}
            </span>
          )}
        </p>
        {shown.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Services">
            {shown.map((s) => (
              <li key={s} className="rounded-sm bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-600 ring-1 ring-inset ring-ink-100">
                {s}
              </li>
            ))}
            {services.length > shown.length && <li className="px-1 py-0.5 text-xs font-semibold text-ink-400">+{services.length - shown.length} more</li>}
          </ul>
        )}
        <ProviderBadges provider={provider} className="mt-3" />
        <div className="mt-auto pt-5">
          <Button as={Link} to={path} variant="primary" iconRight={ArrowRight} className="w-full" aria-label={`View and book ${provider.name}`}>
            View & book
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ProviderCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="mt-4 h-10 w-full" />
      </div>
    </div>
  );
}
