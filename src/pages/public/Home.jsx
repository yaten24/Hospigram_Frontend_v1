// Landing page (/).
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bone,
  Building2,
  CalendarCheck,
  ClipboardList,
  Droplets,
  FlaskConical,
  HeartPulse,
  Home as HomeIcon,
  Hospital,
  Lock,
  MapPin,
  Phone,
  Radio,
  Search,
  ShieldCheck,
  Siren,
  Sparkles,
  Stethoscope,
  Timer,
} from "lucide-react";
import { Button, Reveal, SectionHeading, Select, cx } from "../../components/ui";
import ProviderCard from "../../components/ProviderCard";
import { publicApi } from "../../lib/api";
import { CITIES, useLoad } from "../../lib/format";

const HERO_IMAGES = ["/images/healthcare-1.jpg", "/images/healthcare-2.jpg", "/images/healthcare-3.jpg"];

// ---------------------------------------------------------------- hero
function HeroBackground() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % HERO_IMAGES.length), 7000);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink-950" aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.img
          key={i}
          src={HERO_IMAGES[i]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: reduce ? 1.04 : 1.14 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.6, ease: "easeInOut" }, scale: { duration: 9, ease: "linear" } }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/75 to-ink-950/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-ink-950/30" />
    </div>
  );
}

function HeroSearch({ cities }) {
  const navigate = useNavigate();
  const [kind, setKind] = useState("hospital");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (city) p.set("city", city);
    const s = p.toString();
    navigate(`/${kind === "lab" ? "labs" : "hospitals"}${s ? `?${s}` : ""}`);
  };
  return (
    <form onSubmit={submit} role="search" className="rounded-lg bg-white p-2 shadow-2xl shadow-ink-950/40">
      <div className="flex gap-1 p-1" role="tablist" aria-label="What are you looking for">
        {[
          ["hospital", "Hospitals", Hospital],
          ["lab", "Diagnostic labs", FlaskConical],
        ].map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={cx("relative flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-semibold transition", kind === k ? "text-brand-700" : "text-ink-500 hover:text-ink-800")}
          >
            {kind === k && <motion.span layoutId="hero-kind" className="absolute inset-0 rounded-sm bg-brand-50" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <Icon className="relative h-4 w-4" aria-hidden="true" />
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-2 p-1 sm:grid-cols-[1fr_190px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={kind === "lab" ? "Search labs, tests or scans" : "Search hospitals or services"}
            placeholder={kind === "lab" ? "Lab name or test, e.g. Thyroid" : "Hospital or service, e.g. Cardiology"}
            className="input h-12 pl-9"
          />
        </div>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-brand-500" aria-hidden="true" />
          <Select aria-label="City" value={city} onChange={(e) => setCity(e.target.value)} className="h-12 pl-9">
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
        <Button type="submit" size="lg" icon={Search} className="h-12">
          Search
        </Button>
      </div>
    </form>
  );
}

function Hero({ meta }) {
  const cities = meta?.cities?.length ? meta.cities : CITIES;
  return (
    <section className="relative isolate overflow-hidden">
      <HeroBackground />
      <div className="container-page relative pb-24 pt-16 sm:pb-32 sm:pt-24 lg:pt-28">
        <div className="max-w-2xl">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur sm:text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-care-500" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-care-500" />
            </span>
            Verified providers across Delhi NCR
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }} className="mt-5 text-4xl font-extrabold leading-[1.08] !text-white sm:text-5xl lg:text-6xl">
            Book hospital visits and lab tests <span className="text-brand-400">in minutes.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16 }} className="mt-5 max-w-xl text-base leading-relaxed text-ink-200 sm:text-lg">
            Find verified hospitals and diagnostic labs near you, pick a time that suits you, and get home sample collection where available. No queues, no phone tag.
          </motion.p>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.26 }} className="mt-9 max-w-3xl">
          <HeroSearch cities={cities} />
        </motion.div>
        <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-200">
          {[
            [BadgeCheck, "Every partner verified"],
            [HomeIcon, "Home sample collection"],
            [CalendarCheck, "Free to book"],
          ].map(([Icon, t]) => (
            <li key={t} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-care-500" aria-hidden="true" /> {t}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- live counts
function Counter({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return undefined;
    const c = animate(0, value, { duration: 1.4, ease: [0.2, 0.8, 0.2, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [inView, value]);
  return <span ref={ref}>{shown.toLocaleString("en-IN")}</span>;
}

function Stats({ meta }) {
  if (!meta) return null;
  const items = [
    { label: "Verified hospitals", value: meta.hospitals || 0, icon: Hospital },
    { label: "Diagnostic labs", value: meta.labs || 0, icon: FlaskConical },
    { label: "Cities covered", value: (meta.cities || []).length, icon: MapPin },
    { label: "Services listed", value: (meta.services || []).length, icon: Stethoscope },
  ].filter((x) => x.value > 0);
  if (!items.length) return null;
  return (
    <section className="relative z-10 -mt-12">
      <div className="container-page">
        <Reveal className={cx("card grid", items.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : items.length === 3 ? "grid-cols-1 sm:grid-cols-3" : items.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
          {items.map((s) => (
            <div key={s.label} className="flex items-center gap-3 border-ink-100 p-4 sm:p-5 lg:[&:not(:first-child)]:border-l">
              <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-600 sm:grid">
                <s.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
                  <Counter value={s.value} />
                </p>
                <p className="text-xs font-semibold text-ink-500 sm:text-sm">{s.label}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- categories
const CATEGORIES = [
  { to: "/hospitals", label: "Hospitals", text: "OPD visits and specialists", icon: Hospital, tone: "bg-brand-50 text-brand-600" },
  { to: "/labs", label: "Diagnostic labs", text: "Tests, scans and reports", icon: FlaskConical, tone: "bg-care-50 text-care-700" },
  { to: "/tests?service=X-Ray", label: "X-Ray", text: "Quick bone and chest imaging", icon: Bone, tone: "bg-sky-50 text-sky-700" },
  { to: "/tests?service=Ultrasound", label: "Ultrasound", text: "Abdomen, pelvis, pregnancy", icon: Radio, tone: "bg-violet-50 text-violet-700" },
  { to: "/tests?service=Blood%20Test", label: "Blood tests", text: "CBC, sugar, thyroid and more", icon: Droplets, tone: "bg-brand-50 text-brand-600" },
  { to: "/tests?service=Full%20Body%20Checkup", label: "Full body checkup", text: "A complete health picture", icon: HeartPulse, tone: "bg-amber-50 text-amber-700" },
];

function Categories() {
  return (
    <section className="container-page py-20">
      <SectionHeading eyebrow="Start here" title="What do you need today?" text="Choose a category to see verified providers near you." />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((c, i) => (
          <Reveal key={c.label} delay={0.05 * i}>
            <Link to={c.to} className="card card-hover group flex h-full flex-col p-4 sm:p-5">
              <span className={cx("grid h-12 w-12 place-items-center rounded-md transition duration-300 group-hover:scale-110", c.tone)}>
                <c.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="mt-4 font-display text-[15px] font-bold text-ink-900">{c.label}</span>
              <span className="mt-0.5 text-xs leading-snug text-ink-500">{c.text}</span>
              <ArrowRight className="mt-3 h-4 w-4 text-ink-300 transition group-hover:translate-x-1 group-hover:text-brand-600" aria-hidden="true" />
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- how it works
function Steps() {
  const steps = [
    { icon: Search, title: "Search", text: "Find a verified hospital or lab by name, service or city." },
    { icon: CalendarCheck, title: "Book a slot", text: "Pick a date and time. Add home sample collection for lab tests." },
    { icon: ClipboardList, title: "Visit and track", text: "The provider confirms your booking. Track everything in My bookings." },
  ];
  return (
    <section className="border-y border-ink-100 bg-white py-20">
      <div className="container-page">
        <SectionHeading eyebrow="How it works" title="Three simple steps" text="Booking care should be as easy as booking a cab." />
        <div className="relative mt-12">
          <div className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-brand-200 via-ink-200 to-care-100 md:block" aria-hidden="true" />
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} delay={0.1 * i} className="text-center">
                <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-md bg-ink-900 text-white shadow-lift">
                  <s.icon className="h-7 w-7" aria-hidden="true" />
                  <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white ring-4 ring-white">{i + 1}</span>
                </span>
                <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
                <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-ink-500">{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
        <div className="mt-10 text-center">
          <Button as={Link} to="/how-it-works" variant="secondary" iconRight={ArrowRight}>
            Learn more
          </Button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- featured
function Featured() {
  const { data, loading, error } = useLoad(() => publicApi.providers({ limit: 6 }), {});
  const items = data?.items || [];
  if (loading || error || !items.length) return null;
  return (
    <section className="container-page py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading align="left" eyebrow="Featured" title="Trusted providers near you" text="A few of the verified hospitals and labs on Hospigram." />
        <div className="flex gap-2">
          <Button as={Link} to="/hospitals" variant="secondary" size="sm">
            All hospitals
          </Button>
          <Button as={Link} to="/labs" variant="secondary" size="sm">
            All labs
          </Button>
        </div>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => (
          <Reveal key={p._id} delay={0.06 * (i % 3)}>
            <ProviderCard provider={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- trust
function WhyUs() {
  const points = [
    { icon: ShieldCheck, title: "Verified partners only", text: "Our team checks every hospital and lab before it is listed." },
    { icon: Timer, title: "Book in under 2 minutes", text: "No calls, no waiting on hold. Pick a slot and you are done." },
    { icon: HomeIcon, title: "Home sample collection", text: "Many labs collect samples from your home at the time you choose." },
    { icon: Lock, title: "Your data stays private", text: "Your details are shared only with the provider you book." },
    { icon: Sparkles, title: "Free for patients", text: "Hospigram does not charge you a booking fee." },
    { icon: Phone, title: "Real people to help", text: "Call or write to our support team if anything goes wrong." },
  ];
  return (
    <section className="relative overflow-hidden bg-ink-950 py-20 text-white">
      <div className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-brand-600/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-care-600/15 blur-3xl" aria-hidden="true" />
      <div className="container-page relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow !text-brand-300">Why Hospigram</p>
          <h2 className="mt-2 text-3xl font-extrabold !text-white sm:text-4xl">Care you can count on</h2>
          <p className="mt-3 text-ink-300">Built for families in Delhi NCR who want simple, honest access to good healthcare.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {points.map((p, i) => (
            <Reveal key={p.title} delay={0.05 * i} className="rounded-lg border border-white/10 bg-white/[0.04] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-brand-600/20 text-brand-300">
                <p.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold !text-white">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{p.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- partners
function PartnerBand() {
  return (
    <section className="container-page py-20">
      <Reveal className="relative overflow-hidden rounded-lg bg-gradient-to-br from-care-600 to-care-700 p-8 text-white sm:p-12">
        <Building2 className="absolute -bottom-8 -right-8 h-56 w-56 text-white/10" aria-hidden="true" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-care-100">For hospitals & labs</p>
            <h2 className="mt-2 text-3xl font-extrabold !text-white sm:text-4xl">Run a hospital or diagnostic lab?</h2>
            <p className="mt-3 max-w-xl text-care-50">List your facility on Hospigram for free. Receive bookings from patients near you and manage them from one simple dashboard.</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button as={Link} to="/partners" variant="light" size="lg" iconRight={ArrowRight}>
              Partner with us
            </Button>
            <Button as={Link} to="/how-it-works#partners" size="lg" variant="ghost" className="border border-white/40 !text-white hover:!bg-white/10">
              How it works
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------- team
const TEAM = [
  { name: "Yatendra Singh", role: "Co-founder & Technology", photo: "/images/Yaten.jpeg", pos: "50% 30%", text: "Leads product and engineering, keeping booking simple and reliable." },
  { name: "Akash Gupta", role: "Co-founder & Operations", photo: "/images/Aakash.jpeg", pos: "50% 22%", text: "Leads partnerships and operations, onboarding and verifying providers." },
];

function Team() {
  return (
    <section className="border-t border-ink-100 bg-white py-20">
      <div className="container-page">
        <SectionHeading eyebrow="Leadership" title="Built by the team at Ownsite" text="A small Delhi NCR team on a mission to make good healthcare easier to reach." />
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={0.1 * i} className="card card-hover group overflow-hidden">
              <div className="relative aspect-square overflow-hidden bg-ink-900">
                <img src={m.photo} alt={`${m.name}, ${m.role}`} loading="lazy" style={{ objectPosition: m.pos }} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/50 to-transparent" aria-hidden="true" />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold">{m.name}</h3>
                <p className="text-sm font-semibold text-brand-600">{m.role}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{m.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- emergency
function Emergency() {
  return (
    <section className="bg-brand-700 text-white">
      <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-center sm:flex-row sm:text-left">
        <div className="flex flex-col items-center gap-3 text-sm sm:flex-row sm:text-base">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-white/30" aria-hidden="true" />
            <Siren className="relative h-5 w-5" aria-hidden="true" />
          </span>
          <p>
            <strong className="font-display">In an emergency, call 112</strong> or go to the nearest hospital. Hospigram is for planned visits and tests.
          </p>
        </div>
        <Button as="a" href="tel:112" variant="light" icon={Phone} className="shrink-0">
          Call 112
        </Button>
      </div>
    </section>
  );
}

export default function Home() {
  const { data: meta } = useLoad(() => publicApi.meta(), {});
  return (
    <>
      <Hero meta={meta} />
      <Stats meta={meta} />
      <Categories />
      <Steps />
      <Featured />
      <WhyUs />
      <PartnerBand />
      <Team />
      <Emergency />
    </>
  );
}
