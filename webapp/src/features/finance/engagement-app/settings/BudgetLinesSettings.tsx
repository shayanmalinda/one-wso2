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
import { Autocomplete, Box, Button, MenuItem, TextField } from "@wso2/oxygen-ui";
import { PlusIcon } from "@wso2/oxygen-ui-icons-react";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { useBudgetLines, useBudgetSummary, useRetireBudgetLine, useSaveBudgetLine, type BudgetLine } from "../api/budgetApi";
import { useIdempotencyKey } from "../api/useEngagementMutations";
import EaDialog, { ConfirmDialog } from "../components/EaDialog";
import EaTable, { type Column } from "../components/EaTable";
import { Empty, Failed } from "../components/ListCard";
import ListToolbar from "../components/ListToolbar";
import { n2 } from "../model/format";
import { columnAccessors, sortRows } from "../model/sorting";
import { useListView } from "../model/useListView";

const COLUMNS: Column<BudgetLine>[] = [
  { key: "function", label: "Function", sortKey: "function", sortValue: (l) => l.functionName, render: (l) => l.functionName },
  { key: "line", label: "Budget Line", sortKey: "line", sortValue: (l) => l.subFunction, render: (l) => l.subFunction },
  { key: "holder", label: "Budget Holder", sortKey: "holder", sortValue: (l) => l.holderName, render: (l) => l.holderName || "—" },
  { key: "email", label: "Holder Email", render: (l) => l.holderEmail || "—" },
  { key: "budget", label: "Budget (USD)", align: "right", sortKey: "budget", sortValue: (l) => l.amountUsd, render: (l) => n2(l.amountUsd) },
  { key: "status", label: "Status", sortKey: "status", sortValue: (l) => l.status, render: (l) => l.status },
];

/** Preferences → Budget Lines: the lines of the year with their holders and amounts. Retiring a line keeps it on the trips already on it. */
export default function BudgetLinesSettings(): JSX.Element {
  const [year, setYear] = useState<number>();
  const lines = useBudgetLines(year, true);
  const summary = useBudgetSummary(year);
  const years = summary.data?.years ?? [];
  const retire = useRetireBudgetLine();
  const save = useSaveBudgetLine();
  const notify = useNotifications();
  const list = useListView("budget-lines");
  const [editing, setEditing] = useState<BudgetLine | "new" | null>(null);
  const [retiring, setRetiring] = useState<BudgetLine | null>(null);
  const reactivate = (l: BudgetLine) =>
    save.mutate(
      { id: l.id, body: { ...l, status: "Active" } },
      { onSuccess: () => notify.showSuccess("Budget line reactivated"), onError: (e) => notify.showError(e instanceof Error ? e.message : "Could not reactivate the budget line") },
    );
  const q = list.search.toLowerCase();
  const rows = (lines.data ?? []).filter((l) => !q || [l.functionName, l.subFunction, l.holderName, l.holderEmail].some((v) => (v ?? "").toLowerCase().includes(q)));
  return (
    <>
      <ListToolbar
        search={list.search}
        placeholder="Search budget lines"
        onSearch={list.setSearch}
        right={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            {years.length > 1 ? (
              <TextField select size="small" label="Year" value={String(year ?? summary.data?.year ?? "")} onChange={(e) => setYear(Number(e.target.value))} sx={{ minWidth: 110 }}>
                {years.map((y) => (
                  <MenuItem key={y} value={String(y)}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <Button variant="contained" size="small" startIcon={<PlusIcon size={14} />} disabled={!lines.data} onClick={() => setEditing("new")}>
              Add Budget Line
            </Button>
          </Box>
        }
      />
      {lines.isError ? (
        <Failed what="the budget lines" error={lines.error} onRetry={() => void lines.refetch()} retrying={lines.isFetching} />
      ) : (
        <EaTable
          ariaLabel="Budget lines"
          columns={COLUMNS}
          rows={list.pageOf(sortRows(rows, list.sort, columnAccessors(COLUMNS)))}
          sorting={list.sorting}
          pagination={list.pager(rows.length)}
          rowKey={(l) => String(l.id)}
          loading={lines.isPending}
          actions={(l) => [{ label: "Edit", onClick: () => setEditing(l) }, ...(l.status === "Active" ? [{ label: "Retire", danger: true, onClick: () => setRetiring(l) }] : [{ label: "Reactivate", disabled: save.isPending, onClick: () => reactivate(l) }])]}
          empty={q ? <Empty title="No Budget Lines Match" body="Change the search to see more." /> : <Empty title="No Budget Lines Yet" body="Add a budget line to count travel against it." />}
        />
      )}
      {editing && lines.data ? <BudgetLineDialog line={editing === "new" ? undefined : editing} year={year ?? summary.data?.year} lines={lines.data} onClose={() => setEditing(null)} /> : null}
      {retiring ? (
        <ConfirmDialog
          title="Retire Budget Line"
          confirmLabel="Retire"
          busyLabel="Retiring…"
          text="Retire this budget line? Trips already on it keep it."
          danger
          run={() => retire.mutateAsync({ id: retiring.id })}
          onDone={() => notify.showSuccess("Budget line retired")}
          onClose={() => setRetiring(null)}
        />
      ) : null}
    </>
  );
}

/** A line's code is made once, from its function and name, and never changes. */
const codeOf = (fn: string, name: string): string =>
  `${fn}_${name}`
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function BudgetLineDialog({ line, year: shown, lines, onClose }: { line?: BudgetLine; year?: number; lines: readonly BudgetLine[]; onClose: () => void }): JSX.Element {
  const save = useSaveBudgetLine();
  const idem = useIdempotencyKey();
  const notify = useNotifications();
  // A year with no lines yet takes its year from the summary.
  const summary = useBudgetSummary(undefined, !line && lines.length === 0);
  const [f, setF] = useState({
    functionName: line?.functionName ?? "",
    subFunction: line?.subFunction ?? "",
    holderName: line?.holderName ?? "",
    holderEmail: line?.holderEmail ?? "",
    amount: line ? String(line.amountUsd) : "",
  });
  const [error, setError] = useState<unknown>();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const year = line?.year ?? lines[0]?.year ?? shown ?? summary.data?.year;
  return (
    <EaDialog
      title={line ? "Edit Budget Line" : "Add Budget Line"}
      confirmLabel={line ? "Save Changes" : "Add Budget Line"}
      busy={save.isPending}
      error={error}
      onClose={onClose}
      onConfirm={() => {
        const amount = Number(f.amount);
        if (!f.functionName.trim() || !f.subFunction.trim() || f.amount.trim() === "" || !Number.isFinite(amount) || amount < 0) return setError("Function, Budget Line and a Budget of 0 or more are required.");
        if (f.holderEmail.trim() && !EMAIL.test(f.holderEmail.trim())) return setError("Enter a valid holder email.");
        if (year === undefined) return setError("The budget year is still loading. Try again in a moment.");
        setError(undefined);
        const body = {
          year,
          code: line?.code ?? codeOf(f.functionName, f.subFunction),
          functionName: f.functionName.trim(),
          subFunction: f.subFunction.trim(),
          holderName: f.holderName.trim() || undefined,
          holderEmail: f.holderEmail.trim() || undefined,
          amountUsd: amount,
          sortOrder: line?.sortOrder ?? Math.max(0, ...lines.map((l) => l.sortOrder)) + 10,
          status: line?.status,
        };
        save.mutate(
          { id: line?.id, body, idempotencyKey: line ? undefined : idem.key },
          {
            onSuccess: () => {
              notify.showSuccess(`Budget line ${line ? "updated" : "added"}`);
              onClose();
            },
            onError: setError,
          },
        );
      }}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, pt: 1 }}>
        <Autocomplete
          freeSolo
          size="small"
          options={[...new Set(lines.map((l) => l.functionName))]}
          value={f.functionName}
          onInputChange={(_, v) => setF((x) => ({ ...x, functionName: v }))}
          renderInput={(params) => <TextField {...params} required label="Function" slotProps={{ htmlInput: { ...params.inputProps, maxLength: 100 } }} />}
        />
        <TextField size="small" required label="Budget Line" value={f.subFunction} onChange={set("subFunction")} slotProps={{ htmlInput: { maxLength: 150 } }} />
        <TextField size="small" label="Budget Holder" value={f.holderName} onChange={set("holderName")} slotProps={{ htmlInput: { maxLength: 255 } }} />
        <TextField size="small" type="email" label="Holder Email" value={f.holderEmail} onChange={set("holderEmail")} slotProps={{ htmlInput: { maxLength: 255 } }} />
        <TextField size="small" required type="number" label="Budget (USD)" value={f.amount} onChange={set("amount")} slotProps={{ htmlInput: { min: 0, step: "0.01" } }} />
      </Box>
    </EaDialog>
  );
}
