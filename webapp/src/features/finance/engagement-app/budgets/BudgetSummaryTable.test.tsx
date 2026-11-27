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

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BudgetSummary } from "../api/budgetApi";
import BudgetSummaryTable from "./BudgetSummaryTable";

const fig = { budgetUsd: 1000, spentUsd: 400, committedUsd: 800, leftUsd: -200, usedPercent: 120 };
const summary: BudgetSummary = {
  year: 2027,
  years: [],
  ratesPending: false,
  expenseAvailable: true,
  lines: [{ ...fig, lineId: 7, functionName: "Sales", name: "EU", holderName: "Ricardo", status: "Active", trips: 3, openTripsWithoutCost: 1 }],
  totals: { ...fig, budgetUsd: 3200000, leftUsd: 5 },
  unassigned: { spentUsd: 4120.55, tripsWithoutLine: 1, noTripSpendUsd: 0 },
  needsLineCount: 1,
};

describe("BudgetSummaryTable", () => {
  it("shows the line, the Unassigned row with spent only, and the Total", () => {
    render(<BudgetSummaryTable summary={summary} />);
    expect(screen.getByText("Ricardo")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("4,120.55")).toBeInTheDocument();
    expect(screen.getByText("1 travel request")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("3,200,000.00")).toBeInTheDocument();
  });

  it("draws a negative Left in the error colour", () => {
    render(<BudgetSummaryTable summary={summary} />);
    expect(screen.getByText("-200.00")).toHaveStyle({ color: "rgb(211, 47, 47)" });
  });

  it("keeps the headers and the captions while loading, and says when amounts are still converting", () => {
    const { rerender } = render(<BudgetSummaryTable />);
    expect(screen.getByText("Committed (USD)")).toBeInTheDocument();
    expect(screen.getByText(/Committed is an estimate/)).toBeInTheDocument();
    rerender(<BudgetSummaryTable summary={{ ...summary, ratesPending: true }} />);
    expect(screen.getByText("Some amounts are still being converted. Refresh in a minute.")).toBeInTheDocument();
  });
});
