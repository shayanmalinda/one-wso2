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

import type { JSX, ReactNode } from "react";
import { Alert, Box, Typography } from "@wso2/oxygen-ui";
import type { BudgetSummary, LineFigures, SummaryLine } from "../api/budgetApi";
import EaTable, { type Column } from "../components/EaTable";
import { Empty } from "../components/ListCard";
import { Two } from "../components/StatusChips";
import { n2, plural } from "../model/format";
import { percent } from "./budgetFormat";

type Row = { readonly kind: "line"; readonly line: SummaryLine } | { readonly kind: "unassigned" } | { readonly kind: "total" };

const num = (n: number): ReactNode => n2(n);

/** The budget, what has been spent, what is committed and what is left, per budget line, with the spend that has no line and the totals. */
export default function BudgetSummaryTable({ summary }: { readonly summary?: BudgetSummary }): JSX.Element {
  const rows: readonly Row[] = summary ? [...summary.lines.map((line): Row => ({ kind: "line", line })), { kind: "unassigned" }, { kind: "total" }] : [];
  const figure =
    (pick: (f: LineFigures) => number, cell: (n: number) => ReactNode = num) =>
    (r: Row): ReactNode =>
      !summary ? null : r.kind === "line" ? cell(pick(r.line)) : r.kind === "total" ? <strong>{cell(pick(summary.totals))}</strong> : "—";
  const left = (n: number): ReactNode => (n < 0 ? <Box component="span" sx={{ color: "error.main" }}>{n2(n)}</Box> : n2(n));
  const columns: Column<Row>[] = [
    { key: "function", label: "Function", render: (r) => (r.kind === "line" ? r.line.functionName : r.kind === "total" ? <strong>Total</strong> : "Unassigned") },
    {
      key: "line",
      label: "Budget Line",
      render: (r) =>
        r.kind === "line" ? (
          <Two main={r.line.name} sub={r.line.status === "Retired" ? "Retired" : undefined} />
        ) : r.kind === "unassigned" && summary ? (
          <Two main="No budget line" sub={plural(summary.unassigned.tripsWithoutLine, "travel request")} />
        ) : null,
    },
    { key: "holder", label: "Budget Holder", render: (r) => (r.kind === "line" ? r.line.holderName || "—" : null) },
    { key: "budget", label: "Budget (USD)", align: "right", render: figure((f) => f.budgetUsd) },
    {
      key: "spent",
      label: "Spent (USD)",
      align: "right",
      render: (r) => (r.kind === "unassigned" && summary ? num(summary.unassigned.spentUsd) : figure((f) => f.spentUsd)(r)),
    },
    { key: "committed", label: "Committed (USD)", align: "right", render: figure((f) => f.committedUsd) },
    { key: "left", label: "Left (USD)", align: "right", render: figure((f) => f.leftUsd, left) },
    { key: "used", label: "% Used", align: "right", render: figure((f) => f.usedPercent, percent) },
  ];
  return (
    <>
      {summary?.ratesPending ? (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Some amounts are still being converted. Refresh in a minute.
        </Alert>
      ) : null}
      <EaTable
        ariaLabel="Travel budget by budget line"
        columns={columns}
        rows={rows}
        rowKey={(r) => (r.kind === "line" ? `line-${r.line.lineId}` : r.kind)}
        loading={!summary}
        loadingRows={8}
        empty={<Empty title="No Budget Lines Yet" />}
      />
      <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 1.5, mb: 0 }}>
        Committed is an estimate. It counts open travel requests with no cost yet at the typical cost of a trip to their country.
      </Typography>
      <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 0.5, mb: 0 }}>
        Converted to USD at NetSuite&apos;s rate on the day each trip was allocated.
      </Typography>
    </>
  );
}
