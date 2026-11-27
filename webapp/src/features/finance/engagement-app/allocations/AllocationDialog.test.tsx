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

const state = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("../api/useEngagementMutations", () => ({
  useCreateAllocation: () => ({ mutate: state.mutate, isPending: false }),
  useIdempotencyKey: () => ({ key: "k", renew: vi.fn() }),
}));
vi.mock("../api/useEngagementUserInfo", () => ({ useEngagementAccess: () => ({ budgetPreview: true }) }));
vi.mock("@context/notifications/NotificationsContext", () => ({ useNotifications: () => ({ showSuccess: vi.fn() }) }));
vi.mock("../budgets/BudgetPreviewCard", () => ({
  default: ({ onChange }: { onChange: (id: number | null) => void }) => <button type="button" onClick={() => onChange(7)}>Pick line 7</button>,
}));

import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Engagement } from "../api/engagementTypes";
import AllocationDialog from "./AllocationDialog";

const engagement = { id: "1", kind: "customer", typeId: 3, title: "Pilot", allocationType: "Pre-Sale", code: "X", start: "2027-02-01", end: "2027-02-05" } as unknown as Engagement;

const draw = () => render(<AllocationDialog engagement={engagement} consultant={{ email: "a@wso2.com", name: "Ann" }} timeZones={[]} onClose={vi.fn()} />);

const chooseTravel = (value: string) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: /Travel Required/ }));
  fireEvent.click(within(screen.getByRole("listbox")).getByText(value));
};

beforeEach(() => state.mutate.mockClear());

describe("AllocationDialog travel budget", () => {
  it("shows the card and sends the chosen line when a travel request will be raised", () => {
    draw();
    chooseTravel("Yes");
    fireEvent.click(screen.getByText("Pick line 7"));
    fireEvent.click(screen.getByRole("button", { name: "Add Allocation" }));
    expect(state.mutate.mock.calls[0][0].body.budgetLineId).toBe(7);
  });

  it("sends no line and shows no card when travel is not required", () => {
    draw();
    chooseTravel("No");
    expect(screen.queryByText("Pick line 7")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Allocation" }));
    expect(state.mutate.mock.calls[0][0].body.budgetLineId).toBeUndefined();
  });

  it("says the line is chosen later for a tentative allocation, and sends none", () => {
    draw();
    chooseTravel("Yes");
    fireEvent.click(screen.getByText("Pick line 7"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Tentative Allocation" }));
    expect(screen.getByText("The budget line is chosen when the allocation is confirmed.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Allocation" }));
    expect(state.mutate.mock.calls[0][0].body.budgetLineId).toBeUndefined();
  });
});
