// How it works (/how-it-works): patient journey, partner journey and FAQ.
import { useEffect, useId, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Building2, CalendarCheck, ChevronDown, ClipboardList, FileCheck2, Home as HomeIcon, LayoutDashboard, Search, UserRound } from "lucide-react";
import { Button, Reveal, SectionHeading, cx } from "../../components/ui";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "../../lib/format";

const PATIENT_STEPS = [
  { icon: Search, title: "Search", text: "Look up verified hospitals and labs by name, service, test or city." },
  { icon: CalendarCheck, title: "Book a slot", text: "Choose the service, date and time. Add a short note about your problem if you like." },
  { icon: HomeIcon, title: "Visit or stay home", text: "Go to the hospital or lab at your time, or ask the lab to collect samples from home." },
  { icon: ClipboardList, title: "Track it", text: "See every booking and its status (pending, confirmed, completed) in My bookings." },
];

const PARTNER_STEPS = [
  { icon: Building2, title: "Register", text: "Add your hospital or lab, services, timings and address. It takes about five minutes." },
  { icon: FileCheck2, title: "Get verified", text: "Our team checks your details before you are listed." },
  { icon: LayoutDashboard, title: "Manage bookings", text: "Confirm, reject or complete requests from your dashboard. Each booking shows the patient's contact." },
];

const FAQ = [
  { q: "Does Hospigram charge patients for booking?", a: "No. Booking through Hospigram is free for patients. You pay the hospital or lab directly for the consultation, test or scan, as per their charges." },
  { q: "Is my booking confirmed right away?", a: "Your request is sent to the hospital or lab instantly and shows as Pending. Once they confirm the slot, the status changes to Confirmed in My bookings." },
  { q: "How does home sample collection work?", a: "When you book a lab that offers it, tick Home sample collection and enter your address. A trained collector from the lab visits at your chosen time." },
  { q: "Can I cancel a booking?", a: "Yes. Open My bookings and cancel any upcoming booking. Please cancel as early as you can so the slot can be given to someone else." },
  { q: "Are the hospitals and labs verified?", a: "Yes. Every partner registers with its details and our team reviews them before the listing goes live. We may remove partners who do not meet our standards." },
  { q: "Is Hospigram a hospital or a medical service?", a: "No. Hospigram is a booking platform. Medical care, advice, test results and reports are provided by the hospital or lab you book with." },
  { q: "What should I do in an emergency?", a: "Do not use Hospigram for emergencies. Call 112 or go to the nearest hospital emergency department straight away." },
  { q: "I run a hospital or lab. How do I join?", a: "Go to the Partners page and register your hospital or lab. Joining is free. Once verified, you start receiving booking requests." },
];

function Journey({ id, eyebrow, title, text, steps, tone, action }) {
  const accent = tone === "care" ? "bg-care-600" : "bg-brand-600";
  const soft = tone === "care" ? "bg-care-50 text-care-700" : "bg-brand-50 text-brand-600";
  return (
    <section id={id} className="scroll-mt-24 py-16">
      <div className="container-page">
        <SectionHeading eyebrow={eyebrow} title={title} text={text} align="left" className={tone === "care" ? "[&_.eyebrow]:!text-care-700" : undefined} />
        <ol className={cx("mt-10 grid gap-5 sm:grid-cols-2", steps.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
          {steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={0.08 * i} className="card card-hover group relative overflow-hidden p-6">
              <span className="absolute right-4 top-3 font-display text-5xl font-extrabold text-ink-100" aria-hidden="true">
                {i + 1}
              </span>
              <span className={cx("relative grid h-12 w-12 place-items-center rounded-md", soft)}>
                <s.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="relative mt-5 text-lg font-bold">
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-ink-500">{s.text}</p>
              <span className={cx("absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition duration-500 group-hover:scale-x-100", accent)} aria-hidden="true" />
            </Reveal>
          ))}
        </ol>
        <div className="mt-8">{action}</div>
      </div>
    </section>
  );
}

function FaqItem({ item, open, onToggle }) {
  const id = useId();
  return (
    <div className="border-b border-ink-100 last:border-0">
      <h3>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-[15px] font-bold text-ink-900 transition hover:bg-ink-50">
          {item.q}
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-sm", open ? "bg-brand-50 text-brand-600" : "bg-ink-50 text-ink-400")}>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} role="region" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }} className="overflow-hidden">
            <p className="px-5 pb-5 text-sm leading-relaxed text-ink-600">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="border-t border-ink-100 bg-white py-16">
      <div className="container-page max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Questions people ask" />
        <Reveal className="card mt-10 overflow-hidden">
          {FAQ.map((item, i) => (
            <FaqItem key={item.q} item={item} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </Reveal>
        <p className="mt-8 text-center text-sm text-ink-500">
          Still have a question? Call <span className="font-semibold text-ink-700">{SUPPORT_PHONE}</span>, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="link">
            {SUPPORT_EMAIL}
          </a>{" "}
          or{" "}
          <Link to="/support" className="link">
            send us a message
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

export default function HowItWorks() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return undefined;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => clearTimeout(t);
  }, [hash]);
  return (
    <>
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-600/25 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-care-600/20 blur-3xl" aria-hidden="true" />
        <div className="container-page relative py-16 sm:py-24">
          <Reveal className="max-w-2xl">
            <p className="eyebrow !text-brand-300">How it works</p>
            <h1 className="mt-2 text-4xl font-extrabold !text-white sm:text-5xl">Healthcare booking, made simple</h1>
            <p className="mt-4 text-lg text-ink-300">Hospigram connects patients with verified hospitals and diagnostic labs across Delhi NCR. Here is how it works for you.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button as="a" href="#patients" size="lg" icon={UserRound}>
                For patients
              </Button>
              <Button as="a" href="#partners" size="lg" variant="care" icon={BadgeCheck}>
                For hospitals & labs
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <Journey
        id="patients"
        eyebrow="For patients"
        title="From search to visit in four steps"
        text="No sign-up fees, no phone queues. Create a free account with your mobile number and book."
        steps={PATIENT_STEPS}
        action={
          <div className="flex flex-wrap gap-3">
            <Button as={Link} to="/book" iconRight={ArrowRight}>
              Book an appointment
            </Button>
            <Button as={Link} to="/tests" variant="secondary">
              Browse tests & scans
            </Button>
          </div>
        }
      />

      <div className="bg-gradient-to-b from-care-50/70 to-transparent">
        <Journey
          id="partners"
          eyebrow="For hospitals & labs"
          title="Get bookings from patients near you"
          text="Joining is free. Manage every request from a simple dashboard on your phone or computer."
          steps={PARTNER_STEPS}
          tone="care"
          action={
            <div className="flex flex-wrap gap-3">
              <Button as={Link} to="/partners" variant="care" iconRight={ArrowRight}>
                Partner with us
              </Button>
              <Button as={Link} to="/hospital/login" variant="secondary">
                Partner login
              </Button>
            </div>
          }
        />
      </div>

      <Faq />
    </>
  );
}
