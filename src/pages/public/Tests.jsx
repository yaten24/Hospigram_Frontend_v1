// Tests & scans catalogue (/tests). Picking a test (or ?service=X) lists the providers that offer it.
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Bone, ClipboardCheck, Droplet, Droplets, FlaskConical, HeartPulse, Info, Radio, ScanLine, SearchX, Sun, TestTube, X, Zap } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Pagination, Reveal, Tabs, cx } from "../../components/ui";
import ProviderCard, { ProviderCardSkeleton } from "../../components/ProviderCard";
import { publicApi } from "../../lib/api";
import { useLoad } from "../../lib/format";

const GROUPS = [
  { value: "all", label: "All" },
  { value: "imaging", label: "Scans & imaging" },
  { value: "blood", label: "Blood & urine" },
  { value: "heart", label: "Heart" },
  { value: "package", label: "Checkups" },
];

/** service = the name providers use in their service list */
const CATALOGUE = [
  { service: "X-Ray", group: "imaging", icon: Bone, text: "A quick, painless image of bones and the chest. Used for fractures, chest infections and joint problems.", prep: "No preparation. Remove metal jewellery. Tell the staff if you may be pregnant." },
  { service: "Ultrasound", group: "imaging", icon: Radio, text: "Uses sound waves to see organs in the abdomen and pelvis, and to check a pregnancy. No radiation.", prep: "For abdomen scans, fast for 6 hours. For pelvic scans, drink water and keep a full bladder." },
  { service: "CT Scan", group: "imaging", icon: ScanLine, text: "Detailed cross-section images of the head, chest or abdomen. Often used after injuries or for further checks.", prep: "You may need to fast for 4 hours if contrast dye is used. Carry old reports and your doctor's note." },
  { service: "MRI", group: "imaging", icon: Zap, text: "Detailed images of the brain, spine, joints and soft tissue using a strong magnet. No radiation.", prep: "Remove all metal. Tell the staff about pacemakers, implants or claustrophobia. Takes 20 to 45 minutes." },
  { service: "ECG", group: "heart", icon: Activity, text: "Records your heart's electrical activity in a few minutes. Checks rhythm and signs of heart strain.", prep: "No preparation. Wear a loose top. Avoid applying body lotion on the chest that day." },
  { service: "Blood Test", group: "blood", icon: Droplets, text: "Routine blood tests such as sugar, haemoglobin and more, as advised by your doctor.", prep: "Some tests need 8 to 12 hours of fasting. Water is fine. Check with the lab when you book." },
  { service: "Complete Blood Count", group: "blood", icon: Droplet, text: "Counts red cells, white cells and platelets. Helps detect anaemia, infection and many other conditions.", prep: "No fasting needed." },
  { service: "Thyroid Profile", group: "blood", icon: TestTube, text: "Measures T3, T4 and TSH to check how your thyroid gland is working.", prep: "No fasting usually needed. Take the test before your morning thyroid tablet if you are on one." },
  { service: "Lipid Profile", group: "heart", icon: HeartPulse, text: "Measures cholesterol and triglycerides to understand your heart health risk.", prep: "Fast for 10 to 12 hours. Water is allowed." },
  { service: "HbA1c", group: "blood", icon: FlaskConical, text: "Shows your average blood sugar over the last 2 to 3 months. Used to diagnose and track diabetes.", prep: "No fasting needed." },
  { service: "Vitamin D", group: "blood", icon: Sun, text: "Checks vitamin D levels, which affect bones, muscles and immunity. Low levels are common in India.", prep: "No fasting needed." },
  { service: "Liver Function Test", group: "blood", icon: TestTube, text: "A group of tests that show how well your liver is working.", prep: "Fasting for 8 to 10 hours is often advised. Avoid alcohol for 24 hours." },
  { service: "Kidney Function Test", group: "blood", icon: TestTube, text: "Checks creatinine, urea and other markers to see how well your kidneys filter blood.", prep: "Usually no fasting. Drink water as normal." },
  { service: "Urine Test", group: "blood", icon: FlaskConical, text: "A routine urine examination to look for infection, sugar, protein and more.", prep: "Collect a mid-stream sample of the first morning urine in the container from the lab." },
  { service: "Full Body Checkup", group: "package", icon: ClipboardCheck, text: "A package of common blood and urine tests for a complete picture of your health. Good once a year.", prep: "Fast for 10 to 12 hours. Water is fine. Home sample collection is often available." },
];

const findTest = (s) => CATALOGUE.find((t) => t.service.toLowerCase() === String(s || "").toLowerCase());

function TestTile({ t, active, onPick, index }) {
  return (
    <Reveal delay={0.03 * (index % 6)}>
      <button type="button" onClick={() => onPick(t.service)} aria-pressed={active} className={cx("card card-hover group flex h-full w-full flex-col p-5 text-left", active && "border-brand-500 ring-2 ring-brand-500/20")}>
        <span className="flex items-start justify-between gap-3">
          <span className={cx("grid h-11 w-11 place-items-center rounded-md transition", active ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600 group-hover:bg-brand-100")}>
            <t.icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{GROUPS.find((g) => g.value === t.group)?.label}</span>
        </span>
        <span className="mt-4 font-display text-base font-bold text-ink-900">{t.service}</span>
        <span className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-500">{t.text}</span>
        <span className="mt-4 text-sm font-semibold text-brand-600">Find providers →</span>
      </button>
    </Reveal>
  );
}

function SelectedTest({ service, onClear }) {
  const t = findTest(service);
  const Icon = t?.icon || FlaskConical;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-brand-600 text-white">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Selected test</p>
          <h2 className="mt-1 text-2xl font-extrabold">{t?.service || service}</h2>
          {t && <p className="mt-2 text-sm leading-relaxed text-ink-600">{t.text}</p>}
          {t && (
            <p className="mt-3 flex gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <strong>Preparation: </strong>
                {t.prep}
              </span>
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" icon={X} onClick={onClear} className="self-start">
          Clear
        </Button>
      </div>
    </Card>
  );
}

function ProvidersFor({ service }) {
  const [page, setPage] = useState(1);
  const list = useLoad(publicApi.providers, { service, page, limit: 9 });
  const items = list.data?.items || [];
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (list.loading && !list.data)
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <ProviderCardSkeleton key={i} />
        ))}
      </div>
    );
  if (!items.length)
    return (
      <Card>
        <EmptyState
          icon={SearchX}
          title="No providers offer this yet"
          text="We are adding new hospitals and labs every week. Try browsing all labs, or ask our support team for help."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button as={Link} to="/labs" variant="secondary">
                Browse labs
              </Button>
              <Button as={Link} to="/support" variant="ghost">
                Contact support
              </Button>
            </div>
          }
        />
      </Card>
    );
  return (
    <>
      <p className="mb-4 text-sm font-semibold text-ink-600">
        {list.data.total.toLocaleString("en-IN")} {list.data.total === 1 ? "provider offers" : "providers offer"} {service}
      </p>
      <div className={cx("grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3", list.loading && "opacity-60")}>
        {items.map((p, i) => (
          <Reveal key={p._id} delay={0.04 * (i % 3)}>
            <ProviderCard provider={p} service={service} />
          </Reveal>
        ))}
      </div>
      <div className="mt-4">
        <Pagination page={list.data.page || page} pages={list.data.pages || 1} total={list.data.total || 0} onPage={setPage} label="providers" />
      </div>
    </>
  );
}

export default function Tests() {
  const [params, setParams] = useSearchParams();
  const service = params.get("service") || "";
  const [group, setGroup] = useState("all");
  const resultsRef = useRef(null);
  const shown = CATALOGUE.filter((t) => group === "all" || t.group === group);

  useEffect(() => {
    if (service) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [service]);

  const pick = (s) => setParams(s === service ? {} : { service: s });

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-transparent">
        <TestTube className="absolute -right-12 -top-8 h-72 w-72 rotate-12 text-ink-900/[0.03]" aria-hidden="true" />
        <div className="container-page relative pb-8 pt-12 sm:pt-16">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">
              <FlaskConical className="h-4 w-4" aria-hidden="true" /> Tests & scans
            </p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">Common tests, explained simply</h1>
            <p className="mt-3 text-base text-ink-500 sm:text-lg">Learn what a test is for and how to prepare, then book it at a verified lab or hospital near you.</p>
          </Reveal>
        </div>
      </section>

      <div className="container-page pb-20">
        <div ref={resultsRef} className="scroll-mt-24">
          <AnimatePresence mode="wait" initial={false}>
            {service && (
              <motion.div key={service} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="mb-12 space-y-6">
                <SelectedTest service={service} onClear={() => setParams({})} />
                <ProvidersFor service={service} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{service ? "Other tests & scans" : "Choose a test or scan"}</h2>
          <Tabs options={GROUPS} value={group} onChange={setGroup} />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t, i) => (
            <TestTile key={t.service} t={t} index={i} active={t.service.toLowerCase() === service.toLowerCase()} onPick={pick} />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-ink-500">This information is general guidance only. Always follow your doctor's advice and the lab's instructions.</p>
      </div>
    </>
  );
}
