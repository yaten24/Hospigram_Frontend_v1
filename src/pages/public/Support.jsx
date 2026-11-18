// Support & contact (/support): contact cards and an enquiry form.
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, HelpCircle, Mail, MessageSquare, Phone, Send, Siren } from "lucide-react";
import { Button, Field, FormAlert, Input, Reveal, Select, Textarea } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { publicApi } from "../../lib/api";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_LINK, isEmail, isPhone, useForm } from "../../lib/format";

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "booking", label: "Help with a booking" },
  { value: "partner", label: "Partner with Hospigram" },
  { value: "complaint", label: "Complaint or feedback" },
  { value: "other", label: "Something else" },
];

function ContactCards() {
  const cards = [
    { icon: Phone, title: "Call us", text: "Talk to our support team", value: SUPPORT_PHONE, href: SUPPORT_PHONE_LINK, tone: "bg-brand-50 text-brand-600" },
    { icon: Mail, title: "Email us", text: "Write to us any time", value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, tone: "bg-care-50 text-care-700" },
    { icon: HelpCircle, title: "Common questions", text: "Booking, cancelling, home collection", value: "Read the FAQ", to: "/how-it-works", tone: "bg-sky-50 text-sky-700" },
  ];
  return (
    <div className="grid gap-4">
      {cards.map((c, i) => {
        const inner = (
          <>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-md ${c.tone}`}>
              <c.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-display font-bold text-ink-900">{c.title}</span>
              <span className="block text-xs text-ink-500">{c.text}</span>
              <span className="mt-1 block break-words text-sm font-semibold text-brand-600">{c.value}</span>
            </span>
          </>
        );
        return (
          <Reveal key={c.title} delay={0.06 * i}>
            {c.to ? (
              <Link to={c.to} className="card card-hover flex items-start gap-4 p-5">
                {inner}
              </Link>
            ) : (
              <a href={c.href} className="card card-hover flex items-start gap-4 p-5">
                {inner}
              </a>
            )}
          </Reveal>
        );
      })}
      <Reveal delay={0.2} className="flex items-start gap-4 rounded-lg border border-brand-200 bg-brand-50 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-brand-600 text-white">
          <Siren className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block font-display font-bold text-brand-800">Medical emergency?</span>
          <span className="mt-0.5 block text-sm text-brand-800">
            Do not wait for a reply. Call{" "}
            <a href="tel:112" className="font-bold underline">
              112
            </a>{" "}
            or go to the nearest hospital emergency department.
          </span>
        </span>
      </Reveal>
    </div>
  );
}

function Success({ name, onReset }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center" role="status">
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-care-50 text-care-600">
        <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
      </motion.span>
      <h2 className="mt-4 text-xl font-extrabold">Thank you{name ? `, ${name.split(" ")[0]}` : ""}!</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">We have received your message. Our team will get back to you soon.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button as={Link} to="/" variant="secondary">
          Back to home
        </Button>
        <Button variant="ghost" onClick={onReset}>
          Send another message
        </Button>
      </div>
    </motion.div>
  );
}

function ContactForm() {
  const { role, account } = useAuth();
  const blank = { name: role === "patient" ? account?.name || "" : "", phone: role === "patient" ? account?.phone || "" : "", email: role === "patient" ? account?.email || "" : "", topic: "general", message: "" };
  const f = useForm(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const v = f.values;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (v.name.trim().length < 2) er.name = "Enter your name";
    if (!v.phone.trim() && !v.email.trim()) er.phone = "Give a mobile number or an email so we can reply";
    if (v.phone.trim() && !isPhone(v.phone)) er.phone = "Enter a valid 10-digit mobile number";
    if (v.email.trim() && !isEmail(v.email)) er.email = "Enter a valid email";
    if (v.message.trim().length < 10) er.message = "Please write at least 10 characters";
    f.setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setError("");
    try {
      await publicApi.enquiry({ name: v.name.trim(), phone: v.phone.trim(), email: v.email.trim(), topic: v.topic, message: v.message.trim() });
      setSent(true);
    } catch (err) {
      f.setErrors(err.errors || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <Success
        name={v.name}
        onReset={() => {
          f.setValues({ ...blank });
          setSent(false);
        }}
      />
    );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormAlert>{error}</FormAlert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required error={f.errors.name} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} autoComplete="name" value={v.name} onChange={f.set("name")} error={f.errors.name} />}
        </Field>
        <Field label="Mobile number" error={f.errors.phone}>
          {(id, d) => <Input id={id} aria-describedby={d} type="tel" inputMode="numeric" autoComplete="tel" value={v.phone} onChange={f.set("phone")} error={f.errors.phone} placeholder="10-digit mobile" />}
        </Field>
        <Field label="Email" error={f.errors.email}>
          {(id, d) => <Input id={id} aria-describedby={d} type="email" autoComplete="email" value={v.email} onChange={f.set("email")} error={f.errors.email} placeholder="you@example.com" />}
        </Field>
        <Field label="Topic" error={f.errors.topic} className="sm:col-span-2">
          {(id, d) => (
            <Select id={id} aria-describedby={d} value={v.topic} onChange={f.set("topic")} error={f.errors.topic}>
              {TOPICS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Message" required hint="If it is about a booking, include the booking id." error={f.errors.message} className="sm:col-span-2">
          {(id, d) => <Textarea id={id} aria-describedby={d} rows={5} maxLength={2000} value={v.message} onChange={f.set("message")} error={f.errors.message} placeholder="How can we help?" />}
        </Field>
      </div>
      <Button type="submit" size="lg" icon={Send} loading={busy} className="w-full sm:w-auto">
        Send message
      </Button>
      <p className="text-xs text-ink-500">Please do not share detailed medical records here. We use your details only to reply to you.</p>
    </form>
  );
}

export default function Support() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[380px] bg-gradient-to-b from-brand-50 via-white to-transparent" aria-hidden="true" />
      <div className="container-page relative py-12 sm:py-16">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">
            <MessageSquare className="h-4 w-4" aria-hidden="true" /> Support
          </p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">How can we help?</h1>
          <p className="mt-3 text-base text-ink-500 sm:text-lg">Questions about a booking, a partner listing or anything else? Reach us by phone, email or the form below.</p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-ink-600">
            <Clock className="h-4 w-4 text-care-600" aria-hidden="true" /> We read every message
          </p>
        </Reveal>
        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1fr_1.5fr]">
          <ContactCards />
          <Reveal delay={0.1} className="card p-5 sm:p-7">
            <h2 className="text-xl font-bold">Send us a message</h2>
            <p className="mb-5 mt-1 text-sm text-ink-500">Fields marked * are required. Give a mobile number or an email so we can reply.</p>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
