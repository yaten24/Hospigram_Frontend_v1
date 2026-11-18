// Privacy policy (/privacy) and terms of use (/terms).
import { Link } from "react-router-dom";
import { FileText, Lock } from "lucide-react";
import { Reveal, cx } from "../../components/ui";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "../../lib/format";

const UPDATED = "November 2026";

const contact = (
  <>
    Email <a href={`mailto:${SUPPORT_EMAIL}`} className="link">{SUPPORT_EMAIL}</a>, call {SUPPORT_PHONE}, or use our{" "}
    <Link to="/support" className="link">
      support page
    </Link>
    .
  </>
);

const PAGES = {
  privacy: {
    icon: Lock,
    title: "Privacy policy",
    intro: "This policy explains what information Hospigram collects, why we collect it, and the choices you have. We keep it short and in plain language.",
    sections: [
      {
        id: "who",
        title: "Who we are",
        body: [
          "Hospigram is an online platform that helps patients find hospitals and diagnostic labs and request appointments with them. Hospigram is a booking intermediary. We are not a hospital, clinic or laboratory and we do not provide medical advice, diagnosis or treatment.",
        ],
      },
      {
        id: "collect",
        title: "Information we collect",
        list: [
          "Account details: your name, mobile number, and optionally your email, gender, date of birth, city, address and preferred language.",
          "Booking details: the hospital or lab, service, date and time, the problem or notes you write, and the address for home sample collection if you ask for it.",
          "Partner details: for hospitals and labs, the facility name, contact person details, address, services, timings and login email.",
          "Messages you send to our support team.",
          "Basic technical data such as browser type and device, used to keep the service secure and working.",
        ],
      },
      {
        id: "use",
        title: "How we use it",
        list: [
          "To create and manage your account and let you log in.",
          "To send your booking request to the hospital or lab you choose, and to show you its status.",
          "To verify hospitals and labs before they are listed.",
          "To answer your questions and resolve complaints.",
          "To prevent misuse, fraud and security problems, and to improve Hospigram.",
        ],
      },
      {
        id: "share",
        title: "Who we share it with",
        body: [
          "When you book, we share your name, mobile number, patient id and the booking details with that hospital or lab only, so they can confirm and provide the service. They handle your medical information under their own responsibility.",
          "Our team may see booking details to help you or the provider. We may use trusted service providers (for example hosting) who process data on our behalf. We may disclose information if the law requires it.",
          "We do not sell your personal information.",
        ],
      },
      {
        id: "security",
        title: "Keeping it safe",
        body: [
          "We use reasonable technical and organisational measures to protect your information, and access is limited to people who need it. No system is perfectly secure, so please keep your password private and tell us straight away if you think your account has been misused.",
        ],
      },
      {
        id: "rights",
        title: "Your choices",
        list: [
          "You can view and update your profile details from your account.",
          "You can ask us for a copy of your information, or to correct or delete it, by contacting support. Some booking records may be kept for a period where needed for legal, accounting or dispute purposes.",
          "You can stop using Hospigram at any time.",
        ],
      },
      {
        id: "retention",
        title: "How long we keep it",
        body: ["We keep your information while your account is active and for a reasonable period afterwards, as needed for the purposes above or as required by law."],
      },
      {
        id: "changes",
        title: "Changes to this policy",
        body: ["We may update this policy from time to time. The date at the top shows when it last changed. If the changes are significant we will let you know on the site."],
      },
      { id: "contact", title: "Contact us", body: [contact] },
    ],
  },
  terms: {
    icon: FileText,
    title: "Terms of use",
    intro: "These terms apply when you use Hospigram as a patient or as a partner hospital or lab. By using the site you agree to them.",
    sections: [
      {
        id: "service",
        title: "What Hospigram does",
        body: [
          "Hospigram lets patients find hospitals and diagnostic labs and send them appointment requests. Hospigram is a booking intermediary only. We are not a medical provider and nothing on Hospigram is medical advice.",
          "All consultations, tests, scans, reports, advice and treatment are provided by the hospital or lab you book with, which is solely responsible for them.",
        ],
      },
      {
        id: "emergency",
        title: "Not for emergencies",
        body: ["Do not use Hospigram in a medical emergency. Call 112 or go to the nearest hospital emergency department immediately."],
      },
      {
        id: "accounts",
        title: "Your account",
        list: [
          "Give accurate details and keep them up to date.",
          "Keep your password private. You are responsible for activity on your account.",
          "One person per patient account. You may book for a family member if you have their consent.",
        ],
      },
      {
        id: "bookings",
        title: "Bookings",
        list: [
          "A booking is a request until the hospital or lab confirms it. The provider may confirm, reschedule or decline based on availability.",
          "Slot times are indicative. Waiting times at the facility are decided by the provider.",
          "Fees for consultations, tests and scans are set by the provider and paid to them directly, unless clearly stated otherwise.",
          "Hospigram does not charge patients a booking fee.",
        ],
      },
      {
        id: "cancellations",
        title: "Cancellations and no-shows",
        list: [
          "You can cancel an upcoming booking from My bookings. Please cancel as early as possible.",
          "Providers may also cancel or reject a booking, for example if a doctor is unavailable. You will see the status and any note in My bookings.",
          "Repeated no-shows or misuse may lead to your account being restricted.",
        ],
      },
      {
        id: "partners",
        title: "For hospitals and labs",
        list: [
          "Partners must provide true and complete information and hold the registrations and licences required by law.",
          "Hospigram may verify, approve, suspend or remove any listing at its discretion.",
          "Partners must use patient information only to provide the booked service and must protect it as required by law.",
        ],
      },
      {
        id: "use",
        title: "Acceptable use",
        body: ["Do not misuse Hospigram: no fake bookings, false information, attempts to access other accounts, scraping or anything unlawful. We may suspend accounts that break these terms."],
      },
      {
        id: "liability",
        title: "Limitation of liability",
        body: [
          "We work hard to keep listings accurate and the service available, but we cannot guarantee that it will always be error-free or uninterrupted. To the extent permitted by law, Hospigram is not liable for the medical services, advice, outcomes or charges of any hospital or lab, or for indirect losses from using the platform.",
        ],
      },
      {
        id: "changes",
        title: "Changes and governing law",
        body: ["We may update these terms from time to time; continued use means you accept the updated terms. These terms are governed by the laws of India."],
      },
      { id: "contact", title: "Contact us", body: [contact] },
    ],
  },
};

export default function Legal({ page }) {
  const d = PAGES[page] || PAGES.terms;
  const other = page === "privacy" ? { to: "/terms", label: "Terms of use" } : { to: "/privacy", label: "Privacy policy" };
  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-[300px] bg-gradient-to-b from-ink-100/70 to-transparent" aria-hidden="true" />
      <div className="container-page relative py-12 sm:py-16">
        <Reveal className="max-w-3xl">
          <p className="eyebrow">
            <d.icon className="h-4 w-4" aria-hidden="true" /> Legal
          </p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">{d.title}</h1>
          <p className="mt-3 text-sm text-ink-500">Last updated {UPDATED}</p>
          <p className="mt-4 text-base leading-relaxed text-ink-600 sm:text-lg">{d.intro}</p>
        </Reveal>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[220px_1fr]">
          <nav aria-label="On this page" className="hidden lg:sticky lg:top-24 lg:block">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-400">On this page</p>
            <ul className="mt-3 space-y-1 border-l border-ink-200 text-sm">
              {d.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent py-1 pl-3 text-ink-600 hover:border-brand-500 hover:text-ink-900">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
            <Link to={other.to} className="link mt-6 inline-block text-sm">
              {other.label} →
            </Link>
          </nav>

          <article className="card max-w-3xl p-6 sm:p-10">
            {d.sections.map((s, i) => (
              <section key={s.id} id={s.id} className={cx("scroll-mt-24", i > 0 && "mt-8 border-t border-ink-100 pt-8")}>
                <h2 className="text-xl font-bold">
                  <span className="mr-2 text-brand-600">{i + 1}.</span>
                  {s.title}
                </h2>
                {s.body?.map((b, j) => (
                  <p key={j} className="mt-3 text-[15px] leading-relaxed text-ink-600">
                    {b}
                  </p>
                ))}
                {s.list && (
                  <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink-600">
                    {s.list.map((li) => (
                      <li key={li} className="flex gap-3">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <p className="mt-10 rounded-md bg-ink-50 p-4 text-sm text-ink-500">
              This page is a general summary written for a booking platform and is not legal advice. See also our{" "}
              <Link to={other.to} className="link">
                {other.label}
              </Link>
              .
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
