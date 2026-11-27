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

import { useState, type JSX } from "react";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { useBudgetLines, useSetTripBudgetLine } from "../api/budgetApi";
import EaDialog from "../components/EaDialog";
import BudgetLinePicker from "./BudgetLinePicker";

/** Choose Budget Line: the line a travel request's cost counts against. */
export default function SetBudgetLineDialog({
  jobNumber,
  year,
  initial,
  onClose,
}: {
  readonly jobNumber: string;
  readonly year?: number;
  /** The line it has now, or the one suggested. */
  readonly initial?: number;
  readonly onClose: () => void;
}): JSX.Element {
  const lines = useBudgetLines(year);
  const save = useSetTripBudgetLine();
  const notify = useNotifications();
  const [line, setLine] = useState<number | null>(initial ?? null);
  const [error, setError] = useState<unknown>();
  return (
    <EaDialog
      title="Choose Budget Line"
      subtitle={jobNumber}
      busy={save.isPending}
      error={error ?? (lines.isError ? lines.error : undefined)}
      onClose={onClose}
      confirmLabel="Save"
      dirty={line !== (initial ?? null)}
      onConfirm={() => {
        if (line === null) return setError("Choose a budget line.");
        setError(undefined);
        save.mutate(
          { jobNumber, budgetLineId: line },
          {
            onSuccess: () => {
              notify.showSuccess("Budget line saved");
              onClose();
            },
            onError: setError,
          },
        );
      }}
    >
      <BudgetLinePicker
        required
        value={line}
        disabled={lines.isPending}
        lines={(lines.data ?? []).filter((l) => l.status === "Active").map((l) => ({ id: l.id, name: l.name }))}
        onChange={setLine}
      />
    </EaDialog>
  );
}
