import type { MatchEdge } from "@/lib/domain/result";
import type { Contact } from "@/lib/domain/contact";
import type { Account } from "@/lib/domain/account";
import { TierPill } from "./TierPill";

const CONTACT_FIELDS: Array<[string, (c: Contact) => string]> = [
  ["Name", (c) => `${c.firstName} ${c.lastName}`],
  ["Email", (c) => c.email],
  ["Phone", (c) => c.phone],
  ["Company", (c) => c.company],
  ["LinkedIn", (c) => c.linkedinUrl ?? "—"],
];

const ACCOUNT_FIELDS: Array<[string, (a: Account) => string]> = [
  ["Name", (a) => a.name],
  ["Domain", (a) => a.domain],
  ["Phone", (a) => a.phone],
  ["Address", (a) => a.address],
];

function Receipt({ edge }: { edge: MatchEdge }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <TierPill tier={edge.tier} />
        <span className="font-mono text-sm tabular text-ink">score {edge.score}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-dim">
            <th className="pb-2 pr-2 font-normal">Signal</th>
            <th className="pb-2 pr-2 font-normal">Points</th>
            <th className="pb-2 font-normal">Detail</th>
          </tr>
        </thead>
        <tbody>
          {edge.signals.map((s) => (
            <tr key={s.signal} className="border-t border-line align-top">
              <td className="py-1.5 pr-2 font-mono text-xs whitespace-nowrap text-ink">{s.signal}</td>
              <td className="py-1.5 pr-2 font-mono text-xs tabular text-ink">+{s.points}</td>
              <td className="py-1.5 font-mono text-xs break-all text-ink-dim">{s.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldTable<T>({ a, b, fields }: { a: T; b: T; fields: Array<[string, (x: T) => string]> }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-ink-dim">
          <th className="pb-2 pr-2 font-normal">Field</th>
          <th className="pb-2 pr-2 font-normal">Record A</th>
          <th className="pb-2 font-normal">Record B</th>
        </tr>
      </thead>
      <tbody>
        {fields.map(([label, get]) => (
          <tr key={label} className="border-t border-line align-top">
            <td className="py-1.5 pr-2 text-ink-dim">{label}</td>
            <td className="py-1.5 pr-2 break-all text-ink">{get(a)}</td>
            <td className="py-1.5 break-all text-ink">{get(b)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Props =
  | { entityType: "contact"; edge: MatchEdge | null; a: Contact | undefined; b: Contact | undefined }
  | { entityType: "account"; edge: MatchEdge | null; a: Account | undefined; b: Account | undefined };

export function RecordDetail(props: Props) {
  const { edge } = props;
  if (!edge || !props.a || !props.b) {
    return <p className="text-sm text-ink-dim">Click an edge in the graph to see its scoring receipt.</p>;
  }

  if (props.entityType === "contact") {
    return (
      <div className="grid gap-8 sm:grid-cols-2">
        <FieldTable a={props.a} b={props.b} fields={CONTACT_FIELDS} />
        <Receipt edge={edge} />
      </div>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <FieldTable a={props.a} b={props.b} fields={ACCOUNT_FIELDS} />
      <Receipt edge={edge} />
    </div>
  );
}
