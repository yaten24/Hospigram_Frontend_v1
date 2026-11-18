// Hospital / lab profile with the booking panel (/hospitals/:id, /labs/:id).
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarCheck, CheckCircle2, Clock, ExternalLink, FlaskConical, Hospital, MapPin, Navigation, Phone, SearchX, ShieldCheck, Siren } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, Reveal, Skeleton } from "../../components/ui";
import BookingForm from "../../components/BookingForm";
import { ProviderBadges, ProviderCover } from "../../components/ProviderCard";
import { publicApi } from "../../lib/api";
import { KIND_LABEL, useLoad } from "../../lib/format";

const listPath = (kind) => (kind === "lab" ? "/labs" : "/hospitals");
const telLink = (phone) => `tel:${String(phone).replace(/[^\d+]/g, "")}`;
const mapsLink = (p) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.name, p.address, p.city, p.pincode].filter(Boolean).join(", "))}`;

function Section({ title, icon: Icon, children, delay }) {
  return (
    <Reveal delay={delay}>
      <Card className="p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          {Icon && <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />}
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </Card>
    </Reveal>
  );
}

function Header({ p, kind }) {
  const KindIcon = kind === "lab" ? FlaskConical : Hospital;
  return (
    <section className="bg-white">
      <div className="relative">
        <ProviderCover provider={p} large className="h-48 w-full sm:h-64 lg:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/10 to-transparent" aria-hidden="true" />
        <div className="container-page absolute inset-x-0 top-4">
          <Link to={listPath(kind)} className="inline-flex items-center gap-1.5 rounded-sm bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-ink-800 shadow-sm backdrop-blur hover:bg-white">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All {kind === "lab" ? "labs" : "hospitals"}
          </Link>
        </div>
      </div>
      <div className="container-page relative -mt-14 pb-6">
        <Reveal className="card p-5 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={kind === "lab" ? "care" : "brand"}>
                  <KindIcon className="h-3 w-3" aria-hidden="true" /> {KIND_LABEL[kind]}
                </Badge>
                <Badge tone="sky">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verified
                </Badge>
                <ProviderBadges provider={p} />
              </div>
              <h1 className="mt-3 text-2xl font-extrabold sm:text-4xl">{p.name}</h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-500">
                {p.category && <span>{p.category}</span>}
                {p.category && p.city && <span aria-hidden="true">·</span>}
                {p.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-brand-500" aria-hidden="true" /> {p.city}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:shrink-0">
              <Button as="a" href="#book" icon={CalendarCheck} className="lg:hidden">
                Book now
              </Button>
              {p.phone && (
                <Button as="a" href={telLink(p.phone)} variant="secondary" icon={Phone}>
                  Call
                </Button>
              )}
              <Button as="a" href={mapsLink(p)} target="_blank" rel="noreferrer" variant="secondary" icon={Navigation}>
                Directions
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Details({ p, kind }) {
  const services = p.services || [];
  return (
    <div className="space-y-5">
      <Section title={`About this ${kind === "lab" ? "lab" : "hospital"}`}>
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">{p.description || `${p.name} is a verified ${kind === "lab" ? "diagnostic lab" : "hospital"} on Hospigram${p.city ? ` in ${p.city}` : ""}. Book a slot online and the team will confirm your visit.`}</p>
        {(p.homeCollection || p.emergency) && (
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {kind === "lab" && p.homeCollection && (
              <li className="flex items-center gap-2 rounded-md bg-care-50 px-3 py-2 font-semibold text-care-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Home sample collection available
              </li>
            )}
            {kind !== "lab" && p.emergency && (
              <li className="flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 font-semibold text-brand-700">
                <Siren className="h-4 w-4" aria-hidden="true" /> 24×7 emergency services
              </li>
            )}
          </ul>
        )}
      </Section>

      {services.length > 0 && (
        <Section title={kind === "lab" ? "Tests & scans" : "Departments & services"} icon={kind === "lab" ? FlaskConical : Hospital} delay={0.05}>
          <ul className="flex flex-wrap gap-2">
            {services.map((s) => (
              <li key={s} className="inline-flex items-center gap-1.5 rounded-sm border border-ink-100 bg-ink-50 px-2.5 py-1.5 text-sm font-medium text-ink-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-care-600" aria-hidden="true" /> {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Section title="Location" icon={MapPin} delay={0.1}>
          <address className="text-sm not-italic leading-relaxed text-ink-600">
            {p.address || "-"}
            {(p.city || p.pincode) && <br />}
            {[p.city, p.pincode].filter(Boolean).join(" - ")}
          </address>
          <a href={mapsLink(p)} target="_blank" rel="noreferrer" className="link mt-3 inline-flex items-center gap-1.5 text-sm">
            Open in Google Maps <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </Section>
        <Section title="Timings & contact" icon={Clock} delay={0.15}>
          <p className="text-sm text-ink-600">{p.timings || "Please call to confirm timings."}</p>
          {p.phone && (
            <a href={telLink(p.phone)} className="link mt-3 inline-flex items-center gap-1.5 text-sm">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {p.phone}
            </a>
          )}
          {kind !== "lab" && p.emergency && <p className="mt-3 text-xs text-ink-500">For a medical emergency call 112 or go straight to the emergency department.</p>}
        </Section>
      </div>
    </div>
  );
}

function BookingPanel({ p, defaultService }) {
  return (
    <aside id="book" className="scroll-mt-24 lg:sticky lg:top-24">
      <Card className="overflow-hidden">
        <div className="border-b border-ink-100 bg-gradient-to-r from-brand-50 to-white px-5 py-4">
          <p className="eyebrow">Book a visit</p>
          <h2 className="mt-1 text-lg font-bold">Choose a date and time</h2>
        </div>
        <div className="p-5">
          <BookingForm provider={p} defaultService={defaultService} />
        </div>
      </Card>
    </aside>
  );
}

function LoadingView() {
  return (
    <div>
      <Skeleton className="h-48 w-full rounded-none sm:h-64" />
      <div className="container-page -mt-14 space-y-5 pb-16">
        <div className="card space-y-3 p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    </div>
  );
}

function NotFoundView({ kind }) {
  return (
    <div className="container-page py-16">
      <div className="card mx-auto max-w-lg">
        <EmptyState
          icon={SearchX}
          title={`We couldn't find this ${kind === "lab" ? "lab" : "hospital"}`}
          text="It may have been removed, or the link is incorrect."
          action={
            <Button as={Link} to={listPath(kind)} icon={ArrowLeft}>
              Browse {kind === "lab" ? "labs" : "hospitals"}
            </Button>
          }
        />
      </div>
    </div>
  );
}

export default function ProviderDetail({ kind }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data: p, loading, error, reload } = useLoad(publicApi.provider, id);

  if (loading && !p) return <LoadingView />;
  if (error) {
    if (error.status === 404 || error.status === 400) return <NotFoundView kind={kind} />;
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-lg">
          <ErrorState error={error} onRetry={reload} />
        </div>
      </div>
    );
  }
  if (!p) return <NotFoundView kind={kind} />;
  if (p.kind && p.kind !== kind) return <Navigate to={`${listPath(p.kind)}/${p._id}`} replace />;

  return (
    <>
      <Header p={p} kind={kind} />
      <div className="container-page pb-20">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
          <Details p={p} kind={kind} />
          <BookingPanel p={p} defaultService={params.get("service")} />
        </div>
      </div>
    </>
  );
}
