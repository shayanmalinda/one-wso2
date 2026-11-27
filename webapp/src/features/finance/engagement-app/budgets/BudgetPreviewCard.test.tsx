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

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ q: {} as Record<string, unknown> }));
vi.mock("../api/budgetApi", () => ({ useBudgetPreview: () => state.q }));

import { render, screen } from "@testing-library/react";
import type { BudgetPreview } from "../api/budgetApi";
import BudgetPreviewCard from "./BudgetPreviewCard";

const preview: BudgetPreview = {
  inScope: true,
  country: "Germany",
  source: "REGION",
  suggested: { lineId: 7, code: "SALES_EU", name: "Sales: EU" },
  line: { lineId: 7, name: "Sales: EU", budgetUsd: 75000, spentUsd: 21350.1, committedUsd: 8400, leftUsd: 1950, usedPercent: 97.4 },
  alternatives: [
    { lineId: 7, code: "SALES_EU", name: "Sales: EU", leftUsd: 1950 },
    { lineId: 3, code: "SALES_APAC", name: "Sales: APAC", leftUsd: 51200 },
  ],
  typicalCost: { usd: 2800, basis: "country", sampleSize: 14 },
  warning: true,
  ratesPending: false,
};

const draw = (onChange = vi.fn(), value: number | null = null, start = "2027-02-01") => {
  render(<BudgetPreviewCard engagementId="1" travellerEmail="a@wso2.com" startDate={start} endDate="2027-02-05" value={value} onChange={onChange} />);
  return onChange;
};

beforeEach(() => {
  state.q = { data: undefined, isPending: true, isError: false };
});

describe("BudgetPreviewCard", () => {
  it("keeps the title and shows no figures while loading", () => {
    draw();
    expect(screen.getByText("Travel Budget")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
    expect(screen.queryByText("Budget")).not.toBeInTheDocument();
  });

  it("preselects the suggestion and warns when a typical trip costs more than what is left", () => {
    state.q = { data: preview, isPending: false, isError: false };
    const onChange = draw(vi.fn(), 7);
    expect(onChange).toHaveBeenCalledWith(7);
    expect(screen.getByText("Suggested from the engagement's region")).toBeInTheDocument();
    expect(screen.getByText("Committed (estimate)")).toBeInTheDocument();
    expect(screen.getByText("Based on 14 past trips")).toBeInTheDocument();
    expect(screen.getByText("A typical trip to Germany costs about USD 2,800. This line has USD 1,950 left. You can still add the allocation.")).toBeInTheDocument();
  });

  it("says so when no line could be suggested", () => {
    state.q = { data: { ...preview, suggested: undefined, line: undefined, source: "NONE", warning: false }, isPending: false, isError: false };
    const onChange = draw();
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByText(/No budget line could be suggested/)).toBeInTheDocument();
  });

  it("says no budget applies when the date is outside every year, and sends no line", () => {
    state.q = { data: { inScope: false, source: "NONE", alternatives: [], warning: false, ratesPending: false }, isPending: false, isError: false };
    const onChange = draw(vi.fn(), 7);
    expect(screen.getByText("No travel budget applies to trips starting on this date.")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows the error text and sends no line when the budget cannot be read", () => {
    state.q = { data: undefined, isPending: false, isError: true };
    const onChange = draw(vi.fn(), 7);
    expect(screen.getByText("Budget details could not be loaded. You can still add the allocation.")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
