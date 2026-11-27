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

import { describe, expect, it, vi } from "vitest";

vi.mock("../api/budgetApi", () => ({
  useNeedsBudgetLine: () => ({
    data: {
      items: [{ jobNumber: "TRV-2027-01-0042", travellerEmail: "a@wso2.com", travellerName: "Ann Lee", country: "Germany", startDate: "2027-01-18", endDate: "2027-01-22", engagementType: "Pre-Sale Engagement", customerName: "Acme" }],
      total: 1,
    },
    isPending: false,
    isPlaceholderData: false,
    isError: false,
  }),
}));
vi.mock("../api/useEngagementUserInfo", () => ({ useEngagementAccess: () => ({ setBudgetLine: true }) }));
vi.mock("./SetBudgetLineDialog", () => ({ default: ({ jobNumber }: { jobNumber: string }) => <div>Dialog for {jobNumber}</div> }));

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import NeedsBudgetLineList from "./NeedsBudgetLineList";

const draw = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <NeedsBudgetLineList year={2027} />
    </MemoryRouter>,
  );

describe("NeedsBudgetLineList", () => {
  it("lists the request with a Choose Budget Line action", () => {
    draw("/travel-budgets/needs-a-line");
    expect(screen.getByText("Ann Lee")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose Budget Line" })).toBeInTheDocument();
    expect(screen.queryByText(/Dialog for/)).not.toBeInTheDocument();
  });

  it("opens the dialog of the job in ?job=", () => {
    draw("/travel-budgets/needs-a-line?job=TRV-2027-01-0042");
    expect(screen.getByText("Dialog for TRV-2027-01-0042")).toBeInTheDocument();
  });
});
