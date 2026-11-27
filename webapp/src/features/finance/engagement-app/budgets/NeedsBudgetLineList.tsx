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

import type { JSX } from "react";
import { useSearchParams } from "react-router";
import { useNeedsBudgetLine, type NeedsLineItem } from "../api/budgetApi";
import { useEngagementAccess } from "../api/useEngagementUserInfo";
import EaTable, { type Column, tableState } from "../components/EaTable";
import { Empty, Failed } from "../components/ListCard";
import { Two } from "../components/StatusChips";
import JobLink from "../invoices/JobLink";
import { fmtRange } from "../model/format";
import { useListView } from "../model/useListView";
import SetBudgetLineDialog from "./SetBudgetLineDialog";

const COLUMNS: readonly Column<NeedsLineItem>[] = [
  { key: "job", label: "Job Number", render: (t) => <JobLink job={t.jobNumber} /> },
  { key: "who", label: "Traveller", render: (t) => <Two main={t.travellerName} sub={t.travellerEmail} /> },
  { key: "dest", label: "Destination", render: (t) => t.country || "—" },
  { key: "dates", label: "Travel Dates", render: (t) => <span style={{ whiteSpace: "nowrap" }}>{fmtRange(t.startDate, t.endDate)}</span> },
  { key: "type", label: "Allocation Type", render: (t) => t.engagementType || "—" },
  { key: "customer", label: "Customer", render: (t) => t.customerName || "—" },
];

/** The travel requests of the year that have no budget line, each with a way to choose one. `?job=` opens that request's dialog. */
export default function NeedsBudgetLineList({ year }: { readonly year?: number }): JSX.Element {
  const { setBudgetLine } = useEngagementAccess();
  const list = useListView("needs-budget-line");
  const [params, setParams] = useSearchParams();
  const job = params.get("job");
  const needs = useNeedsBudgetLine({ year, limit: list.pageSize, offset: list.page * list.pageSize }, year !== undefined);
  const rows = needs.data?.items ?? [];
  const closeDialog = () =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.delete("job");
        return next;
      },
      { replace: true },
    );
  return (
    <>
      {needs.isError ? (
        <Failed what="the travel requests" error={needs.error} onRetry={() => void needs.refetch()} retrying={needs.isFetching} />
      ) : (
        <EaTable
          ariaLabel="Travel requests without a budget line"
          columns={COLUMNS}
          rows={rows}
          rowKey={(t) => t.jobNumber}
          {...tableState(needs)}
          pagination={list.pager(needs.data?.total ?? 0, needs.isPlaceholderData)}
          actions={setBudgetLine ? (t) => [{ label: "Choose Budget Line", primary: true, onClick: () => setParams((p) => new URLSearchParams({ ...Object.fromEntries(p), job: t.jobNumber })) }] : undefined}
          empty={<Empty title="Every travel request has a budget line." />}
        />
      )}
      {job && setBudgetLine ? (
        <SetBudgetLineDialog jobNumber={job} year={year} initial={rows.find((t) => t.jobNumber === job)?.suggested?.lineId} onClose={closeDialog} />
      ) : null}
    </>
  );
}
