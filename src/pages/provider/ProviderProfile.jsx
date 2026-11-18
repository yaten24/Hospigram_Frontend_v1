// Hospital / lab public listing editor (/hospital/profile, /lab/profile) with a live preview.
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Check, Clock, FlaskConical, Home, Hospital, ImageOff, MapPin, Phone, Plus, RotateCcw, Save, Siren } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, Checkbox, Field, FormAlert, Input, Select, Textarea, cx } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../lib/api";
import { CITIES, HOSPITAL_SERVICES, LAB_SERVICES, KIND_LABEL, isPhone, useForm } from "../../lib/format";
import { useProviderPanel } from "./ProviderLayout";

function ServicePicker({ options, value, onChange, id }) {
  const [custom, setCustom] = useState("");
  const toggle = (s) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  const add = () => {
    const s = custom.trim();
    if (s && !value.includes(s)) onChange([...value, s]);
    setCustom("");
  };
  const extras = value.filter((s) => !options.includes(s));
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={id}>
        {[...options, ...extras].map((s) => {
          const on = value.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s)}
              className={cx("inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs font-semibold transition", on ? "border-care-600 bg-care-50 text-care-700" : "border-ink-200 text-ink-600 hover:border-ink-300")}
            >
              {on ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
              {s}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Add another service"
          aria-label="Add another service"
          className="input"
          maxLength={60}
        />
        <Button variant="secondary" onClick={add} icon={Plus}>
          Add
        </Button>
      </div>
    </div>
  );
}

const pick = (a = {}) => ({
  name: a.name || "",
  category: a.category || "",
  phone: a.phone || "",
  address: a.address || "",
  city: a.city || "",
  pincode: a.pincode || "",
  timings: a.timings || "",
  services: a.services || [],
  description: a.description || "",
  image: a.image || "",
  homeCollection: Boolean(a.homeCollection),
  emergency: Boolean(a.emergency),
});

function ListingImage({ src, kind, className }) {
  const [brokenSrc, setBrokenSrc] = useState(null);
  const broken = Boolean(src) && brokenSrc === src;
  const Icon = kind === "lab" ? FlaskConical : Hospital;
  if (!src || broken) {
    return (
      <div className={cx("grid place-items-center bg-gradient-to-br from-care-50 to-ink-100 text-care-700", className)}>
        {src && broken ? <ImageOff className="h-8 w-8 text-ink-400" aria-label="Image could not be loaded" /> : <Icon className="h-10 w-10" aria-hidden="true" />}
      </div>
    );
  }
  return <img src={src} alt="" onError={() => setBrokenSrc(src)} className={cx("object-cover", className)} />;
}

function PreviewCard({ v, kind, approved }) {
  const services = v.services.slice(0, 5);
  return (
    <Card className="overflow-hidden">
      <ListingImage src={v.image.trim()} kind={kind} className="h-40 w-full" />
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5">
          {approved && (
            <Badge tone="care">
              <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Verified
            </Badge>
          )}
          {kind === "lab" && v.homeCollection && (
            <Badge tone="violet">
              <Home className="h-3 w-3" aria-hidden="true" /> Home collection
            </Badge>
          )}
          {kind === "hospital" && v.emergency && (
            <Badge tone="red">
              <Siren className="h-3 w-3" aria-hidden="true" /> 24×7 Emergency
            </Badge>
          )}
        </div>
        <h3 className="mt-2 break-words text-lg font-bold">{v.name || `Your ${kind} name`}</h3>
        <p className="text-sm text-ink-500">{v.category || KIND_LABEL[kind]}</p>
        <div className="mt-3 space-y-1.5 text-sm text-ink-600">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
            <span className="min-w-0 break-words">{[v.address, v.city, v.pincode].filter(Boolean).join(", ") || "Address"}</span>
          </p>
          {v.timings && (
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
              {v.timings}
            </p>
          )}
          {v.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
              {v.phone}
            </p>
          )}
        </div>
        {v.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">{v.description}</p>}
        {services.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {services.map((s) => (
              <span key={s} className="rounded-sm bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-600 ring-1 ring-inset ring-ink-100">
                {s}
              </span>
            ))}
            {v.services.length > services.length && <span className="px-1 py-0.5 text-xs text-ink-500">+{v.services.length - services.length} more</span>}
          </div>
        )}
        <div className="mt-4 h-10 rounded-md bg-brand-600 text-center text-sm font-semibold leading-10 text-white" aria-hidden="true">
          Book {kind === "lab" ? "a test" : "appointment"}
        </div>
      </div>
    </Card>
  );
}

export default function ProviderProfile() {
  const { account, setAccount } = useAuth();
  const { kind, copy, approved } = useProviderPanel();
  const initial = useMemo(() => pick(account), [account]);
  const f = useForm(initial);
  const v = f.values;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  const validate = () => {
    const er = {};
    if (v.name.trim().length < 2) er.name = `Enter the ${copy.noun} name`;
    if (!isPhone(v.phone)) er.phone = "Enter a valid 10-digit mobile number";
    if (v.address.trim().length < 5) er.address = "Enter the full address";
    if (v.city.trim().length < 2) er.city = "Enter the city";
    if (v.pincode && !/^\d{6}$/.test(v.pincode.trim())) er.pincode = "Enter a 6-digit PIN code";
    if (!v.services.length) er.services = "Choose at least one service";
    if (v.image.trim() && !/^https?:\/\/\S+$/i.test(v.image.trim())) er.image = "Enter a full image link starting with https://";
    f.setErrors(er);
    return !Object.keys(er).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) {
      setError("Please fix the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      const data = {
        ...v,
        name: v.name.trim(),
        address: v.address.trim(),
        city: v.city.trim(),
        pincode: v.pincode.trim(),
        timings: v.timings.trim(),
        description: v.description.trim(),
        image: v.image.trim(),
        homeCollection: kind === "lab" && v.homeCollection,
        emergency: kind === "hospital" && v.emergency,
      };
      const res = await authApi.updateMe(data);
      setAccount(res.account);
      f.setValues(pick(res.account));
      toast.success("Your listing is updated");
    } catch (err) {
      f.setErrors(err.errors || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    f.setValues(initial);
    f.setErrors({});
    setError("");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <FormAlert>{error}</FormAlert>

          <Card className="p-4 sm:p-6">
            <h2 className="text-base font-bold">Basic details</h2>
            <p className="mt-0.5 text-sm text-ink-500">Shown on your public listing.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label={`${copy.Noun} name`} required error={f.errors.name} className="sm:col-span-2">
                {(id, d) => <Input id={id} aria-describedby={d} maxLength={120} value={v.name} onChange={f.set("name")} error={f.errors.name} />}
              </Field>
              <Field label="Type" error={f.errors.category}>
                {(id, d) => (
                  <Select id={id} aria-describedby={d} value={v.category} onChange={f.set("category")} error={f.errors.category}>
                    <option value="">Select type</option>
                    {[...copy.categories, ...(v.category && !copy.categories.includes(v.category) ? [v.category] : [])].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Contact mobile" required error={f.errors.phone} hint="Patients call this number">
                {(id, d) => <Input id={id} aria-describedby={d} type="tel" inputMode="numeric" autoComplete="tel" value={v.phone} onChange={f.set("phone")} error={f.errors.phone} />}
              </Field>
              <Field label="Timings" error={f.errors.timings} className="sm:col-span-2">
                {(id, d) => <Input id={id} aria-describedby={d} maxLength={120} value={v.timings} onChange={f.set("timings")} error={f.errors.timings} placeholder="Mon–Sat, 9 AM – 8 PM" />}
              </Field>
              <Field label="About" error={f.errors.description} hint={`${v.description.length}/2000`} className="sm:col-span-2">
                {(id, d) => (
                  <Textarea
                    id={id}
                    aria-describedby={d}
                    rows={4}
                    maxLength={2000}
                    value={v.description}
                    onChange={f.set("description")}
                    error={f.errors.description}
                    placeholder={`A few lines patients will see about your ${copy.noun}: specialities, facilities, parking, languages spoken.`}
                  />
                )}
              </Field>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="text-base font-bold">Location</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full address" required error={f.errors.address} className="sm:col-span-2">
                {(id, d) => <Input id={id} aria-describedby={d} maxLength={300} value={v.address} onChange={f.set("address")} error={f.errors.address} placeholder="Building, street, area" />}
              </Field>
              <Field label="City" required error={f.errors.city}>
                {(id, d) => (
                  <>
                    <Input id={id} aria-describedby={d} list="hg-profile-cities" maxLength={80} value={v.city} onChange={f.set("city")} error={f.errors.city} />
                    <datalist id="hg-profile-cities">
                      {CITIES.map((x) => (
                        <option key={x} value={x} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
              <Field label="PIN code" error={f.errors.pincode}>
                {(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" maxLength={6} value={v.pincode} onChange={f.set("pincode")} error={f.errors.pincode} />}
              </Field>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="text-base font-bold" id="services-label">
              {kind === "lab" ? "Tests & scans offered" : "Departments & services"}
              <span className="ml-0.5 text-brand-600">*</span>
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">Patients find you by these. {v.services.length} selected.</p>
            <div className="mt-4">
              <ServicePicker id="services-label" options={kind === "lab" ? LAB_SERVICES : HOSPITAL_SERVICES} value={v.services} onChange={f.set("services")} />
              {f.errors.services && <p className="mt-2 text-xs font-medium text-brand-700">{f.errors.services}</p>}
            </div>
            <div className="mt-5 border-t border-ink-100 pt-4">
              {kind === "lab" ? (
                <Checkbox label="We offer home sample collection" hint="Patients can ask for a home visit when booking" checked={v.homeCollection} onChange={f.set("homeCollection")} />
              ) : (
                <Checkbox label="24×7 emergency services" hint="Shown as a badge on your listing" checked={v.emergency} onChange={f.set("emergency")} />
              )}
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="text-base font-bold">Photo</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_160px] sm:items-start">
              <Field label="Image link" error={f.errors.image} hint="Paste a link to a photo of your building or reception (https://…)">
                {(id, d) => <Input id={id} aria-describedby={d} type="url" inputMode="url" maxLength={500} value={v.image} onChange={f.set("image")} error={f.errors.image} placeholder="https://" />}
              </Field>
              <ListingImage src={v.image.trim()} kind={kind} className="h-28 w-full rounded-md border border-ink-100" />
            </div>
          </Card>
        </div>

        {/* preview + save */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Live preview</p>
          <PreviewCard v={v} kind={kind} approved={approved} />
          {!approved && <p className="mt-2 text-xs text-ink-500">Your listing becomes visible to patients once Hospigram approves it.</p>}
          <div className="mt-4 hidden gap-2 lg:flex">
            <Button type="submit" icon={Save} loading={busy} disabled={!dirty} className="flex-1">
              Save changes
            </Button>
            <Button variant="secondary" icon={RotateCcw} onClick={reset} disabled={!dirty || busy} aria-label="Undo changes" title="Undo changes" />
          </div>
        </div>

        {/* mobile save bar */}
        <AnimatePresence>
          {dirty && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-ink-100 bg-white/95 px-4 py-3 shadow-lift backdrop-blur lg:hidden"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-600">Unsaved changes</span>
              <Button variant="secondary" onClick={reset} disabled={busy}>
                Undo
              </Button>
              <Button type="submit" icon={Save} loading={busy}>
                Save
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        {dirty && <div className="h-16 lg:hidden" aria-hidden="true" />}
      </form>
    </div>
  );
}
