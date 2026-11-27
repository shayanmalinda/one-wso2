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
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

// The travel budget endpoints of the Engagement App Backend: wire types, the views the screens use, and one hook each.

import { authedDelete, authedPost, authedPut } from "@api/http";
import { engagementServiceUrls as urls, type EngagementQueryParams } from "@config/apiConfig";
import { isPreviewEnabled } from "@config/previewFeatures";
import { tripBudget } from "./engagementMappers";
import type { WTripBudget } from "./engagementWire";
import { useEngagementGet } from "./useEngagementApi";
import { useEngagementMutation } from "./useEngagementMutations";

const MINUTE = 60 * 1000;

export type SuggestionSource = "ENGAGEMENT" | "ALLOCATION_TYPE" | "REGION" | "TEAM" | "NONE";
export type RuleKind = "LINE" | "REGION" | "TEAM" | "ENGAGEMENT" | "NONE";

// ---------------------------------------------------------------- wire

interface WLineRef {
  lineId: number;
  code?: string;
  name: string;
}

interface WFigures {
  budgetUsd: number;
  spentUsd: number;
  committedUsd: number;
  leftUsd: number;
  usedPercent: number;
}

export interface WBudgetLine {
  id: number;
  year: number;
  code: string;
  functionName: string;
  subFunction: string;
  name?: string;
  holderName?: string | null;
  holderEmail?: string | null;
  amountUsd: number;
  status: string;
  sortOrder: number;
}

export interface WBudgetPreview {
  inScope: boolean;
  year?: number;
  country?: string;
  suggested?: (WLineRef & { code: string }) | null;
  source?: SuggestionSource;
  line?: (WFigures & { lineId: number; name: string; holderName?: string | null }) | null;
  alternatives?: { lineId: number; code: string; name: string; leftUsd: number }[];
  typicalCost?: { usd?: number | null; basis: "country" | "global" | "none"; sampleSize: number } | null;
  warning?: boolean;
  ratesPending?: boolean;
}

export interface WBudgetSummary {
  year: number;
  startDate: string;
  endDate: string;
  asOf: string;
  /** Optional: the years that have a budget, for the year select. */
  years?: number[];
  ratesPending: boolean;
  expenseAvailable: boolean;
  lines: (WFigures & {
    lineId: number;
    code: string;
    functionName: string;
    name: string;
    holderName?: string | null;
    status: string;
    trips: number;
    openTripsWithoutCost: number;
  })[];
  totals: WFigures;
  unassigned: { spentUsd: number; tripsWithoutLine: number; noTripSpendUsd: number };
  needsLineCount: number;
  unconverted: { count: number; currencies: string[] };
}

interface WNeedsLineItem {
  jobNumber: string;
  travellerEmail: string;
  travellerName?: string | null;
  country?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  engagementId?: string | null;
  engagementType?: string | null;
  customerName?: string | null;
  suggested?: { lineId: number; name: string } | null;
}

interface WRule {
  allocationTypeId: number;
  ruleKind: RuleKind;
  lineCode?: string | null;
}

// ---------------------------------------------------------------- views

export interface BudgetLine {
  readonly id: number;
  readonly year: number;
  readonly code: string;
  readonly functionName: string;
  readonly subFunction: string;
  /** "Sales: EU". */
  readonly name: string;
  readonly holderName?: string;
  readonly holderEmail?: string;
  readonly amountUsd: number;
  readonly status: "Active" | "Retired";
  readonly sortOrder: number;
}

export interface LineFigures {
  readonly budgetUsd: number;
  readonly spentUsd: number;
  readonly committedUsd: number;
  readonly leftUsd: number;
  readonly usedPercent: number;
}

export interface BudgetPreview {
  readonly inScope: boolean;
  readonly country?: string;
  readonly suggested?: { readonly lineId: number; readonly code: string; readonly name: string };
  readonly source: SuggestionSource;
  readonly line?: LineFigures & { readonly lineId: number; readonly name: string; readonly holderName?: string };
  readonly alternatives: readonly { readonly lineId: number; readonly code: string; readonly name: string; readonly leftUsd: number }[];
  readonly typicalCost?: { readonly usd?: number; readonly basis: "country" | "global" | "none"; readonly sampleSize: number };
  readonly warning: boolean;
  readonly ratesPending: boolean;
}

export interface SummaryLine extends LineFigures {
  readonly lineId: number;
  readonly functionName: string;
  /** The sub function ("EU"): the Budget Line column. */
  readonly name: string;
  readonly holderName?: string;
  readonly status: string;
  readonly trips: number;
  readonly openTripsWithoutCost: number;
}

export interface BudgetSummary {
  readonly year: number;
  readonly years: readonly number[];
  readonly ratesPending: boolean;
  readonly expenseAvailable: boolean;
  readonly lines: readonly SummaryLine[];
  readonly totals: LineFigures;
  readonly unassigned: { readonly spentUsd: number; readonly tripsWithoutLine: number; readonly noTripSpendUsd: number };
  readonly needsLineCount: number;
}

export interface NeedsLineItem {
  readonly jobNumber: string;
  readonly travellerEmail: string;
  readonly travellerName: string;
  readonly country: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly engagementType?: string;
  readonly customerName?: string;
  readonly suggested?: { readonly lineId: number; readonly name: string };
}

export interface AllocationTypeRule {
  readonly allocationTypeId: string;
  readonly ruleKind: RuleKind;
  readonly lineCode?: string;
}

// ---------------------------------------------------------------- mappers

const opt = (x: string | null | undefined): string | undefined => (x ? x : undefined);

const PREFIX: Readonly<Record<string, string>> = { Sales: "Sales", "Research and Development": "R&D", "General Administration": "G&A" };

/** "Sales: EU", "R&D: Choreo Cloud", and the bare sub function for COS and Marketing. */
export const budgetLineName = (l: Pick<WBudgetLine, "functionName" | "subFunction">): string =>
  PREFIX[l.functionName] ? `${PREFIX[l.functionName]}: ${l.subFunction}` : l.subFunction;

export const budgetLine = (l: WBudgetLine): BudgetLine => ({
  id: l.id,
  year: l.year,
  code: l.code,
  functionName: l.functionName,
  subFunction: l.subFunction,
  name: l.name || budgetLineName(l),
  holderName: opt(l.holderName),
  holderEmail: opt(l.holderEmail),
  amountUsd: l.amountUsd,
  status: l.status === "Retired" ? "Retired" : "Active",
  sortOrder: l.sortOrder,
});

const figures = (f: WFigures): LineFigures => ({ budgetUsd: f.budgetUsd, spentUsd: f.spentUsd, committedUsd: f.committedUsd, leftUsd: f.leftUsd, usedPercent: f.usedPercent });

export const budgetPreview = (p: WBudgetPreview): BudgetPreview => ({
  inScope: p.inScope,
  country: opt(p.country),
  suggested: p.suggested ? { lineId: p.suggested.lineId, code: p.suggested.code, name: p.suggested.name } : undefined,
  source: p.source ?? "NONE",
  line: p.line ? { ...figures(p.line), lineId: p.line.lineId, name: p.line.name, holderName: opt(p.line.holderName) } : undefined,
  alternatives: p.alternatives ?? [],
  typicalCost: p.typicalCost ? { usd: p.typicalCost.usd ?? undefined, basis: p.typicalCost.basis, sampleSize: p.typicalCost.sampleSize } : undefined,
  warning: Boolean(p.warning),
  ratesPending: Boolean(p.ratesPending),
});

export const budgetSummary = (s: WBudgetSummary): BudgetSummary => ({
  year: s.year,
  years: s.years ?? [],
  ratesPending: s.ratesPending,
  expenseAvailable: s.expenseAvailable,
  lines: s.lines.map((l) => ({ ...figures(l), lineId: l.lineId, functionName: l.functionName, name: l.name, holderName: opt(l.holderName), status: l.status, trips: l.trips, openTripsWithoutCost: l.openTripsWithoutCost })),
  totals: figures(s.totals),
  unassigned: s.unassigned,
  needsLineCount: s.needsLineCount,
});

const needsLineItem = (i: WNeedsLineItem): NeedsLineItem => ({
  jobNumber: i.jobNumber,
  travellerEmail: i.travellerEmail,
  travellerName: i.travellerName || i.travellerEmail,
  country: i.country ?? "",
  startDate: i.startDate,
  endDate: i.endDate,
  engagementType: opt(i.engagementType),
  customerName: opt(i.customerName),
  suggested: i.suggested ?? undefined,
});

const rule = (r: WRule): AllocationTypeRule => ({ allocationTypeId: String(r.allocationTypeId), ruleKind: r.ruleKind, lineCode: opt(r.lineCode) });

// ---------------------------------------------------------------- reads

/** Every budget read asks only while the preview feature is on. */
const on = (enabled: boolean): boolean => enabled && isPreviewEnabled("travelBudgets");

export interface PreviewParams {
  readonly engagementId: string;
  readonly travellerEmail: string;
  readonly startDate: string;
  readonly endDate: string;
}

export const useBudgetPreview = (params: PreviewParams, enabled: boolean) =>
  useEngagementGet(["budgets", "preview", params], urls.budgetPreview({ ...params }), budgetPreview, { enabled: on(enabled), staleTime: MINUTE });

export const useBudgetSummary = (year?: number, enabled = true) =>
  useEngagementGet(["budgets", "summary", year], urls.budgetSummary(year), budgetSummary, { enabled: on(enabled), staleTime: MINUTE });

export const useBudgetLines = (year?: number, includeRetired = false, enabled = true) =>
  useEngagementGet(["budgets", "lines", year, includeRetired], urls.budgetLines(year, includeRetired), (w: { lines: WBudgetLine[] }) => w.lines.map(budgetLine), {
    enabled: on(enabled),
    staleTime: 5 * MINUTE,
  });

export const useAllocationTypeRules = (enabled = true) =>
  useEngagementGet(["budgets", "rules"], urls.budgetRules, (w: { rules: WRule[] }) => w.rules.map(rule), { enabled: on(enabled), staleTime: 5 * MINUTE });

export const useNeedsBudgetLine = (params: EngagementQueryParams, enabled = true) =>
  useEngagementGet(
    ["budgets", "needs-line", params],
    urls.budgetNeedsLine(params),
    (w: { items: WNeedsLineItem[]; total: number }) => ({ items: w.items.map(needsLineItem), total: w.total }),
    { enabled: on(enabled), keepPrevious: true },
  );

// ---------------------------------------------------------------- writes

const BUDGETS: readonly (readonly unknown[])[] = [["budgets"]];

export interface BudgetLineInput {
  readonly year: number;
  readonly code: string;
  readonly functionName: string;
  readonly subFunction: string;
  readonly holderName?: string;
  readonly holderEmail?: string;
  readonly amountUsd: number;
  readonly sortOrder: number;
  readonly status?: "Active" | "Retired";
}

/** Add a line (no `id`, with its idempotency key) or save all of an existing line's fields. */
export const useSaveBudgetLine = () =>
  useEngagementMutation(
    ({ id, body, idempotencyKey }: { id?: number; body: BudgetLineInput; idempotencyKey?: string }, token) => {
      if (id === undefined) return authedPost<unknown>(urls.budgetLines(), token, body, idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined);
      const { functionName, subFunction, holderName, holderEmail, amountUsd, sortOrder, status } = body;
      return authedPut<unknown>(urls.budgetLine(id), token, {
        functionName,
        subFunction,
        holderName: holderName ?? null,
        holderEmail: holderEmail ?? null,
        amountUsd,
        sortOrder,
        status: status ?? "Active",
      });
    },
    () => BUDGETS,
  );

export const useRetireBudgetLine = () => useEngagementMutation(({ id }: { id: number }, token) => authedDelete(urls.budgetLine(id), token), () => BUDGETS);

export const useSaveAllocationTypeRule = () =>
  useEngagementMutation(
    ({ allocationTypeId, ruleKind, lineCode }: { allocationTypeId: string; ruleKind: RuleKind; lineCode?: string }, token) =>
      authedPut<unknown>(urls.budgetRule(allocationTypeId), token, { ruleKind, lineCode }),
    () => BUDGETS,
  );

export const useSetTripBudgetLine = () =>
  useEngagementMutation(
    async ({ jobNumber, budgetLineId }: { jobNumber: string; budgetLineId: number | null }, token) => {
      const res = await authedPut<WTripBudget>(urls.tripBudgetLine(jobNumber), token, { budgetLineId });
      return res ? tripBudget(res) : null;
    },
    () => [...BUDGETS, ["travel-requests"]],
  );
