// Enquiries (/admin/enquiries): support messages from the website contact form.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Inbox, Mail, MessageSquare, Phone, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, Pagination, SearchInput, Skeleton, StatusBadge, Tabs, Textarea, cx } from "../../components/ui";
import { adminApi } from "../../lib/api";
import { STATUS, formatDateTime, timeAgo, useLoad } from "../../lib/format";
import { refreshAdminBadges, useQueryState, useUrlSearch } from "./AdminLayout";

const STATUSES = ["new", "in-progress", "closed"];
const TOPIC = { general: "General", booking: "Booking help", partner: "Partnership", complaint: "Complaint", other: "Other" };
const TOPIC_TONE = { complaint: "red", booking: "sky", partner: "care" };

export default function AdminEnquiries() {
  const [query, update] = useQueryState({ status: "new", q: "", page: "1" });
  const page = Math.max(1, Number(query.page) || 1);
  const [search, setSearch] = useUrlSearch(query.q, update);
  const list = useLoad(adminApi.enquiries, { status: query.status === "all" ? "" : query.status, q: query.q, page, limit: 20 });
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const counts = list.data?.counts || {};
  const tabs = [
    ...STATUSES.map((s) => ({ value: s, label: STATUS[s].label, count: counts[s] || 0 })),
    { value: "all", label: "All", count: Object.values(counts).reduce((a, b) => a + b, 0) },
  ];
  const items = list.data?.items || [];

  const save = async (patch, msg) => {
    if (busy) return;
    const key = patch.status ? `status:${patch.status}` : "notes";
    setBusy(key);
    try {
      const doc = await adminApi.updateEnquiry(selected._id, patch);
      setSelected(doc);
      list.setData((d) => (d ? { ...d, items: d.items.map((x) => (x._id === doc._id ? doc : x)) } : d));
      toast.success(msg);
      if (patch.status) {
        list.reload();
        refreshAdminBadges();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    setBusy("delete");
    try {
      await adminApi.deleteEnquiry(selected._id);
      toast.success("Enquiry deleted");
      setDeleting(false);
      setSelected(null);
      list.reload();
      refreshAdminBadges();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const open = (e) => {
    setSelected(e);
    setNotes(e.notes || "");
  };
  const notesChanged = selected && notes.trim() !== (selected.notes || "").trim();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Tabs options={tabs} value={query.status} onChange={(v) => update({ status: v, page: "" })} />
      <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, email or message" className="max-w-xl" />

      <Card className="overflow-hidden">
        {list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <div className="divide-y divide-ink-100">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 px-5 py-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : !items.length ? (
          <EmptyState
            icon={query.status === "new" && !query.q ? Inbox : MessageSquare}
            title={query.q ? "No enquiries match" : query.status === "new" ? "No new enquiries" : "Nothing here"}
            text={query.q ? "Try another search." : query.status === "new" ? "You are all caught up. New messages from the website show here." : "Enquiries with this status will show here."}
          />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.ul key={`${query.status}-${query.q}-${page}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className={cx("divide-y divide-ink-100 transition-opacity", list.loading && "opacity-60")}>
              {items.map((e, i) => (
                <motion.li key={e._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => open(e)}
                    onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), open(e))}
                    className={cx("block cursor-pointer px-5 py-4 transition hover:bg-ink-50/70", e.status === "new" && "bg-brand-50/30")}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {e.status === "new" && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="New" />}
                      <p className="min-w-0 truncate font-semibold text-ink-900">{e.name}</p>
                      <Badge tone={TOPIC_TONE[e.topic] || "ink"}>{TOPIC[e.topic] || e.topic}</Badge>
                      <span className="ml-auto shrink-0 text-xs text-ink-400">{timeAgo(e.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-600">{e.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      {e.phone && (
                        <a href={`tel:${e.phone}`} onClick={(ev) => ev.stopPropagation()} className="inline-flex items-center gap-1 text-ink-600 hover:text-brand-700">
                          <Phone className="h-3.5 w-3.5" /> {e.phone}
                        </a>
                      )}
                      {e.email && (
                        <a href={`mailto:${e.email}`} onClick={(ev) => ev.stopPropagation()} className="inline-flex min-w-0 items-center gap-1 text-ink-600 hover:text-brand-700">
                          <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{e.email}</span>
                        </a>
                      )}
                      {query.status === "all" && <StatusBadge status={e.status} />}
                      {e.notes && <span className="text-ink-400">Has notes</span>}
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>
        )}
        {list.data && items.length > 0 && (
          <div className="border-t border-ink-100">
            <Pagination page={page} pages={list.data.pages} total={list.data.total} onPage={(pg) => update({ page: pg })} label="enquiries" />
          </div>
        )}
      </Card>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name || "Enquiry"}
        subtitle={selected && `${TOPIC[selected.topic] || selected.topic} · received ${formatDateTime(selected.createdAt)}`}
        footer={
          selected && (
            <>
              <Button variant="danger-ghost" icon={Trash2} onClick={() => setDeleting(true)} className="mr-auto" disabled={Boolean(busy)}>
                Delete
              </Button>
              <Button icon={Save} loading={busy === "notes"} disabled={!notesChanged || Boolean(busy)} onClick={() => save({ notes: notes.trim() }, "Notes saved")}>
                Save notes
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {selected.phone && (
                <Button as="a" href={`tel:${selected.phone}`} variant="secondary" size="sm" icon={Phone}>
                  {selected.phone}
                </Button>
              )}
              {selected.email && (
                <Button as="a" href={`mailto:${selected.email}?subject=${encodeURIComponent("Your Hospigram enquiry")}`} variant="secondary" size="sm" icon={Mail} className="max-w-full">
                  <span className="truncate">{selected.email}</span>
                </Button>
              )}
              {!selected.phone && !selected.email && <p className="text-sm text-ink-500">No contact details were left.</p>}
            </div>

            <section>
              <h3 className="text-sm font-bold">Message</h3>
              <p className="mt-2 whitespace-pre-wrap break-words rounded-md bg-ink-50 p-4 text-sm leading-relaxed text-ink-800">{selected.message}</p>
            </section>

            <section>
              <h3 className="text-sm font-bold">Status</h3>
              <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Status">
                {STATUSES.map((s) => {
                  const on = selected.status === s;
                  return (
                    <Button
                      key={s}
                      size="sm"
                      role="radio"
                      aria-checked={on}
                      variant={on ? "dark" : "secondary"}
                      loading={busy === `status:${s}`}
                      disabled={Boolean(busy) && busy !== `status:${s}`}
                      onClick={() => !on && save({ status: s }, `Marked as ${STATUS[s].label.toLowerCase()}`)}
                    >
                      {STATUS[s].label}
                    </Button>
                  );
                })}
              </div>
            </section>

            <Field label="Internal notes" hint="Only the Hospigram team sees these.">
              {(id, d) => <Textarea id={id} aria-describedby={d} rows={5} maxLength={3000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Called back on 18 Nov, booked at City Hospital." />}
            </Field>
            {selected.updatedAt && selected.updatedAt !== selected.createdAt && <p className="text-xs text-ink-400">Last updated {formatDateTime(selected.updatedAt)}</p>}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={deleting}
        onClose={() => busy !== "delete" && setDeleting(false)}
        onConfirm={doDelete}
        loading={busy === "delete"}
        title="Delete this enquiry?"
        confirmLabel="Delete"
        message={`The message from ${selected?.name || "this person"} and its notes will be removed. This cannot be undone.`}
      />

    </div>
  );
}
