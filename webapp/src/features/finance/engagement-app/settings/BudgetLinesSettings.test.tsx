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

const state = vi.hoisted(() => ({
  save: vi.fn(),
  retire: vi.fn(),
  lines: [] as unknown[],
  years: [2027] as number[],
  success: vi.fn(),
  lineYear: undefined as number | undefined,
}));
vi.mock("../api/budgetApi", () => ({
  useBudgetLines: (year?: number) => {
    state.lineYear = year;
    return { data: state.lines, isPending: false, isError: false };
  },
  useBudgetSummary: () => ({ data: { year: 2027, years: state.years } }),
  useSaveBudgetLine: () => ({ mutate: state.save, isPending: false }),
  useRetireBudgetLine: () => ({ mutateAsync: state.retire, isPending: false }),
}));
vi.mock("../api/useEngagementMutations", () => ({
  useIdempotencyKey: () => ({ key: "k", renew: vi.fn() }),
}));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: state.success, showError: vi.fn() }),
}));

import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import BudgetLinesSettings from "./BudgetLinesSettings";

const eu = {
  id: 7,
  year: 2027,
  code: "SALES_EU",
  functionName: "Sales",
  subFunction: "EU",
  name: "Sales: EU",
  holderName: "Ricardo",
  holderEmail: "r@wso2.com",
  amountUsd: 75000,
  status: "Active",
  sortOrder: 10,
};
const old = {
  ...eu,
  id: 8,
  code: "SALES_OLD",
  subFunction: "Old",
  name: "Sales: Old",
  holderName: undefined,
  holderEmail: undefined,
  status: "Retired",
  sortOrder: 20,
};

const draw = () =>
  render(
    <MemoryRouter>
      <BudgetLinesSettings />
    </MemoryRouter>,
  );

const rowAction = (row: string, label: string) => {
  const tr = screen.getByText(row).closest("tr") as HTMLElement;
  fireEvent.click(
    within(tr).getByRole("button", {
      name: new RegExp(`${label}|actions|more`, "i"),
    }),
  );
};

beforeEach(() => {
  state.save.mockReset();
  state.retire.mockReset().mockResolvedValue(undefined);
  state.success.mockReset();
  state.lines = [eu, old];
  state.years = [2027];
});

describe("BudgetLinesSettings", () => {
  it("lists the lines with their status", () => {
    draw();
    expect(screen.getByText("Ricardo")).toBeInTheDocument();
    expect(screen.getByText("Retired")).toBeInTheDocument();
  });

  it("adds a line with a code made from its function and name", () => {
    draw();
    fireEvent.click(screen.getByRole("button", { name: "Add Budget Line" }));
    fireEvent.change(screen.getByLabelText(/^Function/), {
      target: { value: "Sales" },
    });
    fireEvent.change(screen.getByLabelText(/^Budget Line/), {
      target: { value: "North & South" },
    });
    fireEvent.change(screen.getByLabelText(/^Budget \(USD\)/), {
      target: { value: "5000" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Add Budget Line",
      }),
    );
    const call = state.save.mock.calls[0][0];
    expect(call.id).toBeUndefined();
    expect(call.body).toMatchObject({
      year: 2027,
      code: "SALES_NORTH_AND_SOUTH",
      amountUsd: 5000,
      sortOrder: 30,
    });
  });

  it("edits a line and keeps its code and status", () => {
    draw();
    rowAction("Ricardo", "Edit");
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/^Budget \(USD\)/), {
      target: { value: "80000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    const call = state.save.mock.calls[0][0];
    expect(call.id).toBe(7);
    expect(call.body).toMatchObject({
      code: "SALES_EU",
      amountUsd: 80000,
      status: "Active",
    });
  });

  it("retires an active line after a confirmation", async () => {
    draw();
    rowAction("Ricardo", "Edit");
    fireEvent.click(screen.getByRole("menuitem", { name: "Retire" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Retire",
      }),
    );
    await vi.waitFor(() =>
      expect(state.retire).toHaveBeenCalledWith({ id: 7 }),
    );
  });

  it("reactivates a retired line and offers no Retire for it", () => {
    state.save.mockImplementation((_v, o: { onSuccess: () => void }) =>
      o.onSuccess(),
    );
    draw();
    const tr = screen.getByText("Retired").closest("tr") as HTMLElement;
    fireEvent.click(within(tr).getByRole("button", { name: /actions|more|8/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Reactivate" }));
    expect(state.save.mock.calls[0][0]).toMatchObject({
      id: 8,
      body: { code: "SALES_OLD", status: "Active" },
    });
    expect(state.success).toHaveBeenCalledWith("Budget line reactivated");
  });

  it("shows a year select only when the summary has more than one year", () => {
    const { unmount } = draw();
    expect(
      screen.queryByRole("combobox", { name: "Year" }),
    ).not.toBeInTheDocument();
    unmount();
    state.years = [2026, 2027];
    draw();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Year" }));
    fireEvent.click(within(screen.getByRole("listbox")).getByText("2026"));
    expect(state.lineYear).toBe(2026);
  });
});
