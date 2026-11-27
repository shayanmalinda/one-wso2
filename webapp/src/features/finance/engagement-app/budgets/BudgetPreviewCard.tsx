// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { useEffect, useRef, type JSX } from "react";
import { Alert, Box, Skeleton, Typography } from "@wso2/oxygen-ui";
import { useDebouncedValue } from "@hooks/useDebouncedValue";
import { useBudgetPreview, type BudgetPreview } from "../api/budgetApi";
import { DelayedSkeleton } from "../components/EaSkeletons";
import { FactsGrid } from "../components/Facts";
import BudgetLinePicker from "./BudgetLinePicker";
import { sourceText, usd } from "./budgetFormat";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const typicalBasis = (t: NonNullable<BudgetPreview["typicalCost"]>, country: string): string =>
  t.basis === "country" ? `Based on ${t.sampleSize} past trips` : t.basis === "global" ? `Based on all countries, few past trips to ${country}` : "No past trips to compare";

/** The travel budget under "Travel Required?": the suggested line, what it has left, a typical trip cost and a picker to change the line. `value` is the chosen line id, null when none or when the budget could not be read. */
export default function BudgetPreviewCard({
  engagementId,
  travellerEmail,
  startDate,
  endDate,
  value,
  onChange,
}: {
  readonly engagementId: string;
  readonly travellerEmail: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly value: number | null;
  readonly onChange: (id: number | null) => void;
}): JSX.Element {
  const dates = useDebouncedValue(`${startDate}|${endDate}`, 300);
  const [start, end] = dates.split("|");
  const ok = (a: string, b: string) => DATE.test(a) && DATE.test(b) && b >= a;
  const preview = useBudgetPreview({ engagementId, travellerEmail, startDate: start, endDate: end }, ok(start, end));
  const picked = useRef(false);
  const data = preview.data;
  // A new answer preselects its suggestion until the person picks a line themselves.
  useEffect(() => {
    if (preview.isError || !ok(startDate, endDate) || (data && !data.inScope)) onChange(null);
    else if (data && !picked.current) onChange(data.suggested?.lineId ?? null);
    else if (data && value !== null && !data.alternatives.some((a) => a.lineId === value)) onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, preview.isError, startDate, endDate]);
  const settling = dates !== `${startDate}|${endDate}`;
  return (
    <Box sx={{ gridColumn: "1 / -1", border: 1, borderColor: "divider", borderRadius: 1.5, p: 2 }}>
      <Typography component="h3" sx={{ fontSize: 14, fontWeight: 600, mb: 1.25 }}>
        Travel Budget
      </Typography>
      {!ok(startDate, endDate) ? (
        <Typography variant="body2" color="text.secondary">
          Choose valid dates to see the travel budget.
        </Typography>
      ) : preview.isError ? (
        <Typography variant="body2" color="text.secondary">
          Budget details could not be loaded. You can still add the allocation.
        </Typography>
      ) : settling || !data ? (
        <DelayedSkeleton minHeight={196}>
          {[40, 20, 44, 44, 44].map((h, i) => (
            <Skeleton key={i} variant="text" height={h} sx={{ transform: "none", mb: i === 1 ? 1.5 : 0.5 }} />
          ))}
        </DelayedSkeleton>
      ) : !data.inScope ? (
        <Typography variant="body2" color="text.secondary">
          No travel budget applies to trips starting on this date.
        </Typography>
      ) : (
        <Body
          p={data}
          value={value}
          onPick={(id) => {
            picked.current = true;
            onChange(id);
          }}
        />
      )}
    </Box>
  );
}

function Body({ p, value, onPick }: { p: BudgetPreview; value: number | null; onPick: (id: number | null) => void }): JSX.Element {
  const left = p.alternatives.find((a) => a.lineId === value)?.leftUsd;
  const isSuggested = value !== null && value === p.suggested?.lineId;
  const typical = p.typicalCost;
  const country = p.country ?? "";
  const warning = value !== null && typical?.usd !== undefined && left !== undefined && (isSuggested ? p.warning : typical.usd > left);
  const facts = [
    isSuggested && p.line && { label: "Budget", value: usd(p.line.budgetUsd) },
    isSuggested && p.line && { label: "Spent", value: usd(p.line.spentUsd) },
    isSuggested && p.line && { label: "Committed (estimate)", value: usd(p.line.committedUsd) },
    left !== undefined && value !== null && { label: "Left", value: usd(left) },
    typical && { label: `Typical trip to ${country}`, value: typical.usd === undefined ? "—" : <>{usd(typical.usd)}<Typography variant="caption" component="div" color="text.secondary">{typicalBasis(typical, country)}</Typography></> },
  ];
  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <BudgetLinePicker
        value={value}
        lines={p.alternatives.map((a) => ({ id: a.lineId, name: a.name, leftUsd: a.leftUsd }))}
        onChange={onPick}
        helperText={isSuggested ? sourceText(p.source) : undefined}
      />
      {!p.suggested ? (
        <Alert severity="info">No budget line could be suggested. Choose one, or leave it empty and the travel budget owner will be asked to choose.</Alert>
      ) : null}
      <FactsGrid columns={2} facts={facts} />
      {warning && typical?.usd !== undefined && left !== undefined ? (
        <Alert severity="warning">{`A typical trip to ${country} costs about ${usd(typical.usd)}. This line has ${usd(left)} left. You can still add the allocation.`}</Alert>
      ) : null}
    </Box>
  );
}
