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
  mutate: vi.fn(),
  lines: {} as Record<string, unknown>,
  success: vi.fn(),
}));
vi.mock("../api/budgetApi", () => ({
  useBudgetLines: () => state.lines,
  useSetTripBudgetLine: () => ({ mutate: state.mutate, isPending: false }),
}));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: state.success }),
}));

import { fireEvent, render, screen, within } from "@testing-library/react";
import SetBudgetLineDialog from "./SetBudgetLineDialog";

const line = (id: number, name: string, status = "Active") => ({
  id,
  name,
  status,
});

beforeEach(() => {
  state.mutate.mockReset();
  state.success.mockReset();
  state.lines = {
    data: [
      line(7, "Sales: EU"),
      line(3, "Sales: APAC"),
      line(9, "Sales: Old", "Retired"),
    ],
    isPending: false,
    isError: false,
  };
});

describe("SetBudgetLineDialog", () => {
  it("starts on the line it was given and saves another one", () => {
    const onClose = vi.fn();
    state.mutate.mockImplementation((_v, o: { onSuccess: () => void }) =>
      o.onSuccess(),
    );
    render(
      <SetBudgetLineDialog
        jobNumber="TRV-1"
        year={2027}
        initial={7}
        onClose={onClose}
      />,
    );
    const box = screen.getByRole("combobox", { name: /Budget Line/ });
    expect(box).toHaveValue("Sales: EU");
    fireEvent.mouseDown(box);
    fireEvent.click(
      within(screen.getByRole("listbox")).getByText("Sales: APAC"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(state.mutate.mock.calls[0][0]).toEqual({
      jobNumber: "TRV-1",
      budgetLineId: 3,
    });
    expect(state.success).toHaveBeenCalledWith("Budget line saved");
    expect(onClose).toHaveBeenCalled();
  });

  it("offers only active lines", () => {
    render(<SetBudgetLineDialog jobNumber="TRV-1" onClose={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole("combobox", { name: /Budget Line/ }));
    expect(screen.queryByText("Sales: Old")).not.toBeInTheDocument();
    expect(screen.getByText("Sales: EU")).toBeInTheDocument();
  });

  it("asks for a line and saves nothing when none is chosen", () => {
    render(<SetBudgetLineDialog jobNumber="TRV-1" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Choose a budget line.")).toBeInTheDocument();
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it("shows the error when the save fails", () => {
    state.mutate.mockImplementation(
      (_v, o: { onError: (e: unknown) => void }) =>
        o.onError("Could not save."),
    );
    render(
      <SetBudgetLineDialog jobNumber="TRV-1" initial={7} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Could not save.")).toBeInTheDocument();
  });
});
