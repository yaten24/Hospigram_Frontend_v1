// Guided booking (/book): 1 choose hospital or lab, 2 pick a provider, 3 book a slot.
// The step lives in the URL (?kind=hospital|lab&provider=<id>) so back/forward and the login redirect keep your place.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ChevronRight, FlaskConical, Home as HomeIcon, Hospital, MapPin, SearchX, Siren } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, Pagination, SearchInput, Select, Skeleton, cx } from "../../components/ui";
import BookingForm from "../../components/BookingForm";
import { ProviderCover } from "../../components/ProviderCard";
import { publicApi } from "../../lib/api";
import { CITIES, KIND_LABEL, useDebounced, useLoad } from "../../lib/format";

const STEPS = ["Type of care", "Choose provider", "Pick a slot"];
const KINDS = [
  { kind: "hospital", icon: Hospital, title: "Hospital visit", text: "OPD consultations, specialists and hospital services.", tone: "bg-brand-50 text-brand-600", ring: "hover:border-brand-300" },
  { kind: "lab", icon: FlaskConical, title: "Lab test or scan", text: "Blood tests, X-Ray, ultrasound and more. Home collection available at many labs.", tone: "bg-care-50 text-care-700", ring: "hover:border-care-500" },
];

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.25, ease: [0.2, 0.8, 0.2, 1] },
};

function Stepper({ step, onStep }) {
  return (
    <ol className="grid grid-cols-3 gap-2 text-xs font-semibold sm:text-sm">
      {STEPS.map((label, i) => {
        const done = i < step;
        return (
          <li key={label}>
            <button
              type="button"
              disabled={!done}
              onClick={() => onStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={cx("flex w-full items-center gap-2 border-t-2 pt-2 text-left transition", i <= step ? "border-brand-600 text-brand-700" : "border-ink-200 text-ink-400", done && "hover:text-brand-800")}
            >
              <span className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-sm text-[11px]", done ? "bg-brand-600 text-white" : i === step ? "bg-brand-50 text-brand-700" : "bg-ink-100")}>
                {done ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
              </span>
              <span className="truncate">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- step 1
function ChooseKind({ onPick }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {KINDS.map((k) => (
        <button key={k.kind} type="button" onClick={() => onPick(k.kind)} className={cx("card card-hover group flex flex-col p-6 text-left", k.ring)}>
          <span className={cx("grid h-14 w-14 place-items-center rounded-md transition duration-300 group-hover:scale-105", k.tone)}>
            <k.icon className="h-7 w-7" aria-hidden="true" />
          </span>
          <span className="mt-5 font-display text-xl font-bold text-ink-900">{k.title}</span>
          <span className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-500">{k.text}</span>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
            Continue <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- step 2
function ProviderRow({ p, onPick }) {
  return (
    <li>
      <button type="button" onClick={() => onPick(p._id)} className="group flex w-full items-center gap-4 rounded-md p-3 text-left transition hover:bg-ink-50 focus-visible:bg-ink-50">
        <ProviderCover provider={p} className="h-16 w-16 shrink-0 rounded-md sm:h-20 sm:w-24" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display font-bold text-ink-900">{p.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
            {p.category && <span>{p.category}</span>}
            {p.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-brand-500" aria-hidden="true" /> {p.city}
              </span>
            )}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {p.kind === "lab" && p.homeCollection && (
              <Badge tone="care">
                <HomeIcon className="h-3 w-3" aria-hidden="true" /> Home collection
              </Badge>
            )}
            {p.kind !== "lab" && p.emergency && (
              <Badge tone="red">
                <Siren className="h-3 w-3" aria-hidden="true" /> 24×7
              </Badge>
            )}
            {(p.services || []).slice(0, 2).map((s) => (
              <Badge key={s} className="hidden sm:inline-flex">
                {s}
              </Badge>
            ))}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true" />
      </button>
    </li>
  );
}

function ChooseProvider({ kind, onPick }) {
  const [text, setText] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(text).trim();
  const meta = useLoad(() => publicApi.meta(), {});
  const cities = meta.data?.cities?.length ? meta.data.cities : CITIES;
  const list = useLoad(publicApi.providers, { kind, q, city, page, limit: 8 });
  const items = list.data?.items || [];
  const noun = kind === "lab" ? "labs" : "hospitals";
  return (
    <Card>
      <div className="grid gap-3 border-b border-ink-100 p-4 sm:grid-cols-[1fr_180px]">
        <SearchInput
          value={text}
          onChange={(v) => {
            setText(v);
            setPage(1);
          }}
          placeholder={kind === "lab" ? "Search labs, tests or scans" : "Search hospitals or departments"}
        />
        <Select
          aria-label="City"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </div>
      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <ul className="space-y-1 p-2">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-16 w-16 sm:h-20 sm:w-24" />
              <span className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </span>
            </li>
          ))}
        </ul>
      ) : !items.length ? (
        <EmptyState icon={SearchX} title={`No ${noun} found`} text="Try another name or city." />
      ) : (
        <>
          <ul className={cx("divide-y divide-ink-100 p-2 transition-opacity", list.loading && "opacity-60")}>
            {items.map((p) => (
              <ProviderRow key={p._id} p={p} onPick={onPick} />
            ))}
          </ul>
          <div className="border-t border-ink-100">
            <Pagination page={list.data.page || page} pages={list.data.pages || 1} total={list.data.total || 0} onPage={setPage} label={noun} />
          </div>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- step 3
function BookProvider({ id, onChange }) {
  const { data: p, loading, error, reload } = useLoad(publicApi.provider, id);
  if (loading && !p)
    return (
      <Card className="space-y-4 p-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  if (error || !p)
    return (
      <Card>
        {error && error.status !== 404 && error.status !== 400 ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <EmptyState icon={SearchX} title="We couldn't find this provider" text="Please choose another one." action={<Button variant="secondary" icon={ArrowLeft} onClick={() => onChange()}>Choose again</Button>} />
        )}
      </Card>
    );
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-4 border-b border-ink-100 bg-ink-50/60 p-4">
        <ProviderCover provider={p} className="h-14 w-14 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{KIND_LABEL[p.kind]}</p>
          <p className="truncate font-display font-bold text-ink-900">{p.name}</p>
          {p.city && <p className="truncate text-xs text-ink-500">{[p.address, p.city].filter(Boolean).join(", ")}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange(p.kind)}>
          Change
        </Button>
      </div>
      <div className="p-5 sm:p-6">
        <BookingForm provider={p} />
        <p className="mt-5 text-center text-xs text-ink-500">
          Want to know more first?{" "}
          <Link to={`/${p.kind === "lab" ? "labs" : "hospitals"}/${p._id}`} className="link">
            View full profile
          </Link>
        </p>
      </div>
    </Card>
  );
}

export default function Book() {
  const [params, setParams] = useSearchParams();
  const providerId = params.get("provider") || "";
  const rawKind = params.get("kind");
  const kind = rawKind === "lab" || rawKind === "hospital" ? rawKind : "";
  const step = providerId ? 2 : kind ? 1 : 0;

  const go = (next) => setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));
  const toStep = (i) => (i === 0 ? go({}) : i === 1 ? go({ kind }) : null);

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[360px] bg-gradient-to-b from-brand-50 via-white to-transparent" aria-hidden="true" />
      <div className="container-page relative max-w-3xl py-12 sm:py-16">
        <div className="text-center">
          <p className="eyebrow">Book an appointment</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Book care in three steps</h1>
          <p className="mt-3 text-ink-500">Free for patients. The provider confirms your slot, usually within a few hours.</p>
        </div>
        <div className="mt-8">
          <Stepper step={step} onStep={toStep} />
        </div>
        <div className="mt-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`${step}-${kind}-${providerId}`} {...slide}>
              {step === 0 && <ChooseKind onPick={(k) => go({ kind: k })} />}
              {step === 1 && (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold">Choose a {kind === "lab" ? "lab" : "hospital"}</h2>
                    <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => go({})}>
                      Back
                    </Button>
                  </div>
                  <ChooseProvider kind={kind} onPick={(id) => go({ kind, provider: id })} />
                </>
              )}
              {step === 2 && <BookProvider id={providerId} onChange={(k) => go({ kind: k || kind })} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
