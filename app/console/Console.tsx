"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Config } from "@/lib/domain/config";
import { computeDedupeResult } from "@/lib/compute";
import { encodePermalink } from "@/lib/permalink";
import { getContacts } from "@/data/contacts";
import { getAccounts } from "@/data/accounts";
import { Panel } from "./Panel";
import { ClusterList } from "./ClusterList";
import { GraphView } from "./GraphView";
import { RecordDetail } from "./RecordDetail";
import { Controls } from "./Controls";

type EntityType = "contact" | "account";

function edgeKey(sourceId: string, targetId: string): string {
  return `${sourceId}|${targetId}`;
}

export function Console({ initialConfig }: { initialConfig: Config }) {
  const router = useRouter();
  const [config, setConfig] = useState<Config>(initialConfig);
  const [entityType, setEntityType] = useState<EntityType>("contact");
  const [selectedClusterId, setSelectedClusterId] = useState<string | undefined>(undefined);
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const contacts = useMemo(() => getContacts(config.corpusId), [config.corpusId]);
  const accounts = useMemo(() => getAccounts(config.corpusId), [config.corpusId]);
  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const result = useMemo(() => computeDedupeResult(config, { contacts, accounts }), [config, contacts, accounts]);
  const permalink = useMemo(() => encodePermalink(config), [config]);

  const clusters = entityType === "contact" ? result.contactClusters : result.accountClusters;

  // Derived, not stored: falls back to the top-ranked cluster whenever the
  // selection doesn't (or no longer does) exist, without an effect — this is
  // what lets a weight/tier drag keep the same cluster in view while its
  // score and membership update live.
  const activeCluster = useMemo(
    () => clusters.find((c) => c.id === selectedClusterId) ?? clusters[0],
    [clusters, selectedClusterId],
  );
  const activeEdge = useMemo(() => {
    if (!activeCluster) return null;
    const found = activeCluster.edges.find((e) => edgeKey(e.sourceId, e.targetId) === selectedEdgeKey);
    return found ?? activeCluster.edges[0] ?? null;
  }, [activeCluster, selectedEdgeKey]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.replace(`?config=${permalink}`, { scroll: false });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [permalink, router]);

  function displayName(id: string): string {
    if (entityType === "contact") {
      const c = contactsById.get(id);
      return c ? `${c.firstName} ${c.lastName}` : id;
    }
    const a = accountsById.get(id);
    return a ? a.name : id;
  }

  async function copyPermalink() {
    const url = `${window.location.origin}${window.location.pathname}?config=${permalink}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-dim">Day 018</p>
          <h1 className="font-display text-2xl text-ink">CRM Duplicate Graph</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-md border border-line text-xs font-mono">
            <button
              type="button"
              onClick={() => setEntityType("contact")}
              className={`px-3 py-1.5 transition-colors ${entityType === "contact" ? "bg-paper-raised text-ink" : "text-ink-dim hover:text-ink"}`}
            >
              Contacts
            </button>
            <button
              type="button"
              onClick={() => setEntityType("account")}
              className={`border-l border-line px-3 py-1.5 transition-colors ${entityType === "account" ? "bg-paper-raised text-ink" : "text-ink-dim hover:text-ink"}`}
            >
              Accounts
            </button>
          </div>
          <button
            type="button"
            onClick={copyPermalink}
            className="rounded-sm border border-line px-3 py-1.5 font-mono text-xs text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
          >
            {copied ? "copied" : "copy permalink"}
          </button>
        </div>
      </header>

      <Panel index="01" title="Cluster list">
        <p className="mb-4 text-sm text-ink-dim">
          {clusters.length} cluster{clusters.length === 1 ? "" : "s"} · ranked by strongest tier, then size.
        </p>
        <ClusterList
          clusters={clusters}
          displayName={displayName}
          selectedClusterId={activeCluster?.id}
          onSelect={setSelectedClusterId}
        />
      </Panel>

      <Panel index="02" title="Graph view">
        {activeCluster ? (
          <GraphView
            cluster={activeCluster}
            displayName={displayName}
            selectedEdgeKey={activeEdge ? edgeKey(activeEdge.sourceId, activeEdge.targetId) : null}
            onSelectEdge={(edge) => setSelectedEdgeKey(edgeKey(edge.sourceId, edge.targetId))}
          />
        ) : (
          <p className="text-sm text-ink-dim">No cluster to show.</p>
        )}
      </Panel>

      <Panel index="03" title="Record detail">
        {entityType === "contact" ? (
          <RecordDetail
            entityType="contact"
            edge={activeEdge}
            a={activeEdge ? contactsById.get(activeEdge.sourceId) : undefined}
            b={activeEdge ? contactsById.get(activeEdge.targetId) : undefined}
          />
        ) : (
          <RecordDetail
            entityType="account"
            edge={activeEdge}
            a={activeEdge ? accountsById.get(activeEdge.sourceId) : undefined}
            b={activeEdge ? accountsById.get(activeEdge.targetId) : undefined}
          />
        )}
      </Panel>

      <Panel index="04" title="Controls">
        {entityType === "contact" ? (
          <Controls
            entityType="contact"
            weights={config.weights.contact}
            tiers={config.tiers.contact}
            onWeightsChange={(weights) => setConfig((prev) => ({ ...prev, weights: { ...prev.weights, contact: weights } }))}
            onTiersChange={(tiers) => setConfig((prev) => ({ ...prev, tiers: { ...prev.tiers, contact: tiers } }))}
          />
        ) : (
          <Controls
            entityType="account"
            weights={config.weights.account}
            tiers={config.tiers.account}
            onWeightsChange={(weights) => setConfig((prev) => ({ ...prev, weights: { ...prev.weights, account: weights } }))}
            onTiersChange={(tiers) => setConfig((prev) => ({ ...prev, tiers: { ...prev.tiers, account: tiers } }))}
          />
        )}
      </Panel>
    </div>
  );
}
