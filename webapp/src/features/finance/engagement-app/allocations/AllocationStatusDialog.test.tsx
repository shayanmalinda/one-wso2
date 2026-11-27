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

const state = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("../api/useEngagementMutations", () => ({
  useSetAllocationStatus: () => ({ mutate: state.mutate, isPending: false }),
}));
vi.mock("../api/useEngagementUserInfo", () => ({
  useEngagementAccess: () => ({ budgetPreview: true }),
}));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn() }),
}));
vi.mock("../api/budgetApi", () => ({
  useBudgetPreview: () => ({
    data: undefined,
    isPending: false,
    isError: true,
  }),
}));

import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Allocation } from "../api/engagementTypes";
import AllocationStatusDialog from "./AllocationStatusDialog";

const allocation = {
  id: "A-1",
  status: "Tentative",
  travelRequired: "Yes",
  start: "2027-02-01",
  end: "2027-02-05",
  consultant: { email: "a@wso2.com", name: "Ann" },
  engagement: { id: "1", allocationType: "Pre-Sale", code: "X" },
} as unknown as Allocation;

describe("AllocationStatusDialog travel budget", () => {
  it("words the budget card for a status change, not for adding an allocation", () => {
    render(
      <AllocationStatusDialog allocation={allocation} onClose={vi.fn()} />,
    );
    expect(screen.queryByText("Travel Budget")).not.toBeInTheDocument();
    fireEvent.mouseDown(
      screen.getByRole("combobox", { name: /Allocation Status/ }),
    );
    fireEvent.click(within(screen.getByRole("listbox")).getByText("Confirmed"));
    expect(
      screen.getByText(
        "Budget details could not be loaded. You can still confirm it.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/add the allocation/)).not.toBeInTheDocument();
  });
});
