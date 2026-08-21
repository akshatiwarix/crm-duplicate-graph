"use client";

import type { ContactSignalWeights, AccountSignalWeights } from "@/lib/domain/weights";
import { SliderField } from "./controls/SliderField";

type Tiers = { high: number; possible: number };

type Props =
  | {
      entityType: "contact";
      weights: ContactSignalWeights;
      tiers: Tiers;
      onWeightsChange: (weights: ContactSignalWeights) => void;
      onTiersChange: (tiers: Tiers) => void;
    }
  | {
      entityType: "account";
      weights: AccountSignalWeights;
      tiers: Tiers;
      onWeightsChange: (weights: AccountSignalWeights) => void;
      onTiersChange: (tiers: Tiers) => void;
    };

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function Controls(props: Props) {
  const { tiers, onTiersChange } = props;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wide text-ink-dim">Signal weights</h3>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {props.entityType === "contact" ? (
            <>
              <SliderField label="Email exact" value={props.weights.emailExact} min={0} max={100} step={1} onChange={(v) => props.onWeightsChange({ ...props.weights, emailExact: v })} />
              <SliderField label="Phone exact" value={props.weights.phoneExact} min={0} max={100} step={1} onChange={(v) => props.onWeightsChange({ ...props.weights, phoneExact: v })} />
              <SliderField label="LinkedIn exact" value={props.weights.linkedinExact} min={0} max={100} step={1} onChange={(v) => props.onWeightsChange({ ...props.weights, linkedinExact: v })} />
              <SliderField label="Name max (pair)" value={props.weights.nameMax} min={0} max={50} step={1} onChange={(v) => props.onWeightsChange({ ...props.weights, nameMax: v })} />
              <SliderField label="Company max (pair)" value={props.weights.companyMax} min={0} max={50} step={1} onChange={(v) => props.onWeightsChange({ ...props.weights, companyMax: v })} />
              <SliderField label="Name floor" value={props.weights.nameFloor} min={0} max={1} step={0.01} format={pct} onChange={(v) => props.onWeightsChange({ ...props.weights, nameFloor: v })} />
              <SliderField label="Company floor" value={props.weights.companyFloor} min={0} max={1} step={0.01} format={pct} onChange={(v) => props.onWeightsChange({ ...props.weights, companyFloor: v })} />
            </>
          ) : (
            <>
              <SliderField label="Domain exact" value={props.weights.domainExact} min={0} max={100} step={1} onChange={(v) => props.onWeightsChange({ ...props.weights, domainExact: v })} />
              <SliderField label="Phone exact" value={props.weights.phoneExact} min={0} max={100} step={1} onChange={(v) => props.onWeightsChange({ ...props.weights, phoneExact: v })} />
              <SliderField label="Name max" value={props.weights.nameMax} min={0} max={50} step={1} onChange={(v) => props.onWeightsChange({ ...props.weights, nameMax: v })} />
              <SliderField label="Name floor" value={props.weights.nameFloor} min={0} max={1} step={0.01} format={pct} onChange={(v) => props.onWeightsChange({ ...props.weights, nameFloor: v })} />
              <SliderField label="Address max" value={props.weights.addressMax} min={0} max={50} step={1} onChange={(v) => props.onWeightsChange({ ...props.weights, addressMax: v })} />
              <SliderField label="Address floor" value={props.weights.addressFloor} min={0} max={1} step={0.01} format={pct} onChange={(v) => props.onWeightsChange({ ...props.weights, addressFloor: v })} />
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wide text-ink-dim">Confidence tiers</h3>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {/* min/max cross-clamped so the UI can never construct an inverted tier config. */}
          <SliderField
            label="Possible cutoff"
            value={tiers.possible}
            min={0}
            max={tiers.high}
            step={1}
            onChange={(v) => onTiersChange({ ...tiers, possible: v })}
          />
          <SliderField
            label="High cutoff"
            value={tiers.high}
            min={tiers.possible}
            max={200}
            step={1}
            onChange={(v) => onTiersChange({ ...tiers, high: v })}
          />
        </div>
      </div>
    </div>
  );
}
