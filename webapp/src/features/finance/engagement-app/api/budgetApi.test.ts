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

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const get = vi.hoisted(() => vi.fn<(...args: unknown[]) => object>(() => ({})));
vi.mock("./useEngagementApi", () => ({ useEngagementGet: get }));
vi.mock("./useEngagementMutations", () => ({ useEngagementMutation: vi.fn() }));

import { budgetLine, budgetLineName, budgetPreview, budgetSummary, useBudgetLines, useBudgetPreview, useBudgetSummary, useNeedsBudgetLine, useAllocationTypeRules } from "./budgetApi";

const original = window.config;
afterEach(() => {
  window.config = original;
  get.mockClear();
});

describe("budget line names", () => {
  it("prefixes Sales, R&D and G&A and leaves COS and Marketing bare", () => {
    expect(budgetLineName({ functionName: "Sales", subFunction: "EU" })).toBe("Sales: EU");
    expect(budgetLineName({ functionName: "Research and Development", subFunction: "Choreo Cloud" })).toBe("R&D: Choreo Cloud");
    expect(budgetLineName({ functionName: "General Administration", subFunction: "Board meeting travel" })).toBe("G&A: Board meeting travel");
    expect(budgetLineName({ functionName: "Marketing", subFunction: "Marketing travel" })).toBe("Marketing travel");
  });

  it("takes the backend's name when it sends one, and drops empty holders", () => {
    const l = budgetLine({ id: 7, year: 2027, code: "SALES_EU", functionName: "Sales", subFunction: "EU", name: "Sales: EU", holderName: null, holderEmail: "", amountUsd: 75000, status: "Retired", sortOrder: 40 });
    expect(l).toMatchObject({ name: "Sales: EU", holderName: undefined, holderEmail: undefined, status: "Retired" });
  });
});

describe("mappers", () => {
  it("maps a preview and treats a missing source as none", () => {
    expect(budgetPreview({ inScope: false })).toEqual({ inScope: false, source: "NONE", alternatives: [], warning: false, ratesPending: false, country: undefined, suggested: undefined, line: undefined, typicalCost: undefined });
    const p = budgetPreview({
      inScope: true,
      country: "Germany",
      source: "REGION",
      suggested: { lineId: 7, code: "SALES_EU", name: "Sales: EU" },
      line: { lineId: 7, name: "Sales: EU", holderName: "Ricardo", budgetUsd: 75000, spentUsd: 21350.1, committedUsd: 8400, leftUsd: 45249.9, usedPercent: 39.7 },
      typicalCost: { usd: null, basis: "none", sampleSize: 0 },
      warning: false,
    });
    expect(p.line?.leftUsd).toBe(45249.9);
    expect(p.typicalCost).toEqual({ usd: undefined, basis: "none", sampleSize: 0 });
  });

  it("keeps the years a summary offers, and none when the backend sends none", () => {
    const base = { year: 2027, startDate: "2027-01-01", endDate: "2027-12-31", asOf: "", ratesPending: false, expenseAvailable: true, lines: [], totals: { budgetUsd: 0, spentUsd: 0, committedUsd: 0, leftUsd: 0, usedPercent: 0 }, unassigned: { spentUsd: 0, tripsWithoutLine: 0, noTripSpendUsd: 0 }, needsLineCount: 0, unconverted: { count: 0, currencies: [] } };
    expect(budgetSummary(base).years).toEqual([]);
    expect(budgetSummary({ ...base, years: [2026, 2027] }).years).toEqual([2026, 2027]);
  });
});

describe("with the preview feature off", () => {
  it("asks for nothing, whatever the screen wants", () => {
    window.config = { ...(original ?? {}), ONE_WSO2_PREVIEW_FEATURES: { travelBudgets: false } } as Window["config"];
    renderHook(() => {
      useBudgetPreview({ engagementId: "1", travellerEmail: "a@wso2.com", startDate: "2027-02-01", endDate: "2027-02-05" }, true);
      useBudgetSummary(2027);
      useBudgetLines(2027, true);
      useAllocationTypeRules();
      useNeedsBudgetLine({ year: 2027 });
    });
    expect(get.mock.calls).toHaveLength(5);
    expect(get.mock.calls.map((c) => (c[3] as { enabled?: boolean } | undefined)?.enabled)).toEqual([false, false, false, false, false]);
  });

  it("asks once the feature is on", () => {
    window.config = { ...(original ?? {}), ONE_WSO2_PREVIEW_FEATURES: { travelBudgets: true } } as Window["config"];
    renderHook(() => useBudgetSummary(2027));
    expect((get.mock.calls[0][3] as { enabled?: boolean } | undefined)?.enabled).toBe(true);
  });
});
