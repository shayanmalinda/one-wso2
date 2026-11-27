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

const state = vi.hoisted(() => ({ saveType: vi.fn(), saveRule: vi.fn() }));
vi.mock("../api/useEngagementApi", () => ({
  useEngagementTypes: () => ({
    data: [{ id: 3, name: "Customer", kind: "Customer", active: true }],
  }),
}));
vi.mock("../api/useEngagementMutations", () => ({
  useSaveAllocationType: () => ({ mutate: state.saveType, isPending: false }),
  useIdempotencyKey: () => ({ key: "k", renew: vi.fn() }),
}));
vi.mock("../api/budgetApi", () => ({
  useSaveAllocationTypeRule: () => ({
    mutate: state.saveRule,
    isPending: false,
  }),
}));
vi.mock("../api/useEngagementUserInfo", () => ({
  useEngagementAccess: () => ({ budgetAdmin: true }),
}));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn() }),
}));

import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AllocationTypeDef } from "../api/engagementTypes";
import { AllocationTypeDialog } from "./SettingsPage";

const type: AllocationTypeDef = {
  id: "11",
  engagementTypeId: 3,
  name: "Pre-Sale",
  code: "PS",
};
const lines = [
  {
    id: 7,
    year: 2027,
    code: "SALES_EU",
    functionName: "Sales",
    subFunction: "EU",
    name: "Sales: EU",
    amountUsd: 1,
    status: "Active" as const,
    sortOrder: 1,
  },
];

const draw = (rule?: {
  allocationTypeId: string;
  ruleKind: "LINE" | "REGION" | "NONE";
  lineCode?: string;
}) =>
  render(
    <AllocationTypeDialog
      type={type}
      defaultTypeId={3}
      departments={[]}
      budget={{ rule, lines }}
      onClose={vi.fn()}
    />,
  );

beforeEach(() => {
  state.saveType
    .mockReset()
    .mockImplementation((_v, o: { onSuccess: (r: unknown) => void }) =>
      o.onSuccess(null),
    );
  state.saveRule.mockReset();
});

describe("AllocationTypeDialog budget rule", () => {
  it("does not send the rule when it was not changed, so a stored rule is never overwritten", () => {
    draw({ allocationTypeId: "11", ruleKind: "LINE", lineCode: "SALES_EU" });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(state.saveType).toHaveBeenCalled();
    expect(state.saveRule).not.toHaveBeenCalled();
  });

  it("does not send a rule for a type that has none when it was left alone", () => {
    draw(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(state.saveRule).not.toHaveBeenCalled();
  });

  it("sends the rule when the person changed it", () => {
    draw({ allocationTypeId: "11", ruleKind: "NONE" });
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Budget Line" }));
    fireEvent.click(within(screen.getByRole("listbox")).getByText("Sales: EU"));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(state.saveRule.mock.calls[0][0]).toEqual({
      allocationTypeId: "11",
      ruleKind: "LINE",
      lineCode: "SALES_EU",
    });
  });

  it("can set the rule back to None on purpose", () => {
    draw({ allocationTypeId: "11", ruleKind: "REGION" });
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Budget Line" }));
    fireEvent.click(within(screen.getByRole("listbox")).getByText("None"));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(state.saveRule.mock.calls[0][0]).toMatchObject({ ruleKind: "NONE" });
  });
});
