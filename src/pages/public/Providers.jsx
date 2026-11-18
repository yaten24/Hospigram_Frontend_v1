// Hospital and lab listings (/hospitals, /labs). Filters live in the URL query string.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FlaskConical, Hospital, MapPin, RotateCcw, SearchX, ShieldCheck, Siren, Home as HomeIcon } from "lucide-react";
import { Button, Checkbox, EmptyState, ErrorState, Pagination, Reveal, SearchInput, Select, cx } from "../../components/ui";
import ProviderCard, { ProviderCardSkeleton } from "../../components/ProviderCard";
import { publicApi } from "../../lib/api";
import { CITIES, HOSPITAL_SERVICES, LAB_SERVICES, useDebounced, useLoad } from "../../lib/format";

const LIMIT = 12;

const COPY = {
  hospital: {
    icon: Hospital,
    eyebrow: "Hospitals",
    title: "Find a hospital near you",
    text: "Verified hospitals and clinics across Delhi NCR. Compare departments and book an OPD visit in minutes.",
    search: "Search hospitals or departments",
    noun: "hospitals",
    services: HOSPITAL_SERVICES,
    tone: "from-brand-50",
    accent: "bg-brand-50 text-brand-600",
  },
  lab: {
    icon: FlaskConical,
    eyebrow: "Diagnostic labs",
    title: "Book lab tests and scans",
    text: "Verified pathology labs and imaging centres. Many offer home sample collection at a time that suits you.",
    search: "Search labs, tests or scans",
    noun: "labs",
    services: LAB_SERVICES,
    tone: "from-care-50",
    accent: "bg-care-50 text-care-700",
  },
};

function PageHero({ c, total }) {
  return (
    <section className={cx("relative overflow-hidden bg-gradient-to-b via-white to-transparent", c.tone)}>
      <c.icon className="absolute -right-10 -top-6 h-64 w-64 text-ink-900/[0.03]" aria-hidden="true" />
      <div className="container-page relative pb-8 pt-12 sm:pt-16">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">
            <c.icon className="h-4 w-4" aria-hidden="true" /> {c.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">{c.title}</h1>
          <p className="mt-3 text-base text-ink-500 sm:text-lg">{c.text}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-600">
            <ShieldCheck className="h-4 w-4 text-care-600" aria-hidden="true" />
            {total != null ? `${total.toLocaleString("en-IN")} verified ${c.noun}` : `Only verified ${c.noun} are listed`}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Filters({ kind, c, text, setText, city, service, homeCollection, emergency, cities, services, update, active, clear }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_200px]">
        <SearchInput value={text} onChange={setText} placeholder={c.search} />
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <Select aria-label="City" value={city} onChange={(e) => update({ city: e.target.value })} className="pl-9">
            <option value="">All cities</option>
            {cities.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </div>
        <Select aria-label="Service" value={service} onChange={(e) => update({ service: e.target.value })}>
          <option value="">All services</option>
          {services.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
        {kind === "lab" ? (
          <Checkbox label={<span className="inline-flex items-center gap-1.5"><HomeIcon className="h-4 w-4 text-care-600" aria-hidden="true" /> Home sample collection</span>} checked={homeCollection} onChange={(e) => update({ homeCollection: e.target.checked ? "1" : "" })} />
        ) : (
          <Checkbox label={<span className="inline-flex items-center gap-1.5"><Siren className="h-4 w-4 text-brand-600" aria-hidden="true" /> 24×7 emergency</span>} checked={emergency} onChange={(e) => update({ emergency: e.target.checked ? "1" : "" })} />
        )}
        {active > 0 && (
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={clear}>
            Clear filters ({active})
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Providers({ kind }) {
  const c = COPY[kind];
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const city = params.get("city") || "";
  const service = params.get("service") || "";
  const homeCollection = kind === "lab" && params.get("homeCollection") === "1";
  const emergency = kind === "hospital" && params.get("emergency") === "1";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const topRef = useRef(null);

  /** Merge changes into the query string; any filter change goes back to page 1. */
  const update = useCallback(
    (patch, opts) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) (v ? p.set(k, v) : p.delete(k));
          if (!("page" in patch)) p.delete("page");
          return p;
        },
        opts
      ),
    [setParams]
  );

  // Search text: typed locally, pushed to the URL after a short pause, and refreshed when the URL changes (back/forward).
  const [text, setText] = useState(q);
  const debounced = useDebounced(text);
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    if (q !== debounced.trim()) setText(q);
  }
  const pushed = useRef(debounced);
  useEffect(() => {
    if (debounced === pushed.current) return;
    pushed.current = debounced;
    if (debounced.trim() !== q) update({ q: debounced.trim() }, { replace: true });
  }, [debounced, q, update]);

  const meta = useLoad(() => publicApi.meta(), {});
  const cities = meta.data?.cities?.length ? meta.data.cities : CITIES;
  const services = meta.data?.services?.length ? meta.data.services : c.services;

  const list = useLoad(publicApi.providers, { kind, q, city, service, homeCollection: homeCollection ? 1 : "", emergency: emergency ? 1 : "", page, limit: LIMIT });
  const items = list.data?.items || [];
  const active = [q, city, service, homeCollection, emergency].filter(Boolean).length;
  const clear = () => {
    setText("");
    setParams({});
  };
  const goPage = (p) => {
    update({ page: p > 1 ? String(p) : "" });
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <PageHero c={c} total={active === 0 && list.data ? list.data.total : null} />
      <div className="container-page pb-20">
        <Filters kind={kind} c={c} text={text} setText={setText} city={city} service={service} homeCollection={homeCollection} emergency={emergency} cities={cities} services={services} update={update} active={active} clear={clear} />

        <div ref={topRef} className="scroll-mt-24 pt-8">
          {list.error ? (
            <div className="card">
              <ErrorState error={list.error} onRetry={list.reload} />
            </div>
          ) : list.loading && !list.data ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <ProviderCardSkeleton key={i} />
              ))}
            </div>
          ) : !items.length ? (
            <div className="card">
              <EmptyState
                icon={SearchX}
                title={`No ${c.noun} found`}
                text={active ? "Try a different search, city or service, or clear the filters." : `New ${c.noun} are being verified. Please check back soon.`}
                action={
                  active ? (
                    <Button variant="secondary" icon={RotateCcw} onClick={clear}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button as={Link} to={kind === "lab" ? "/hospitals" : "/labs"} variant="secondary">
                      Browse {kind === "lab" ? "hospitals" : "labs"} instead
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <>
              <div className={cx("grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3", list.loading && "opacity-60")} aria-busy={list.loading}>
                {items.map((p, i) => (
                  <Reveal key={p._id} delay={0.04 * (i % 3)}>
                    <ProviderCard provider={p} service={service} />
                  </Reveal>
                ))}
              </div>
              <div className="mt-6">
                <Pagination page={list.data.page || page} pages={list.data.pages || 1} total={list.data.total || 0} onPage={goPage} label={c.noun} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
