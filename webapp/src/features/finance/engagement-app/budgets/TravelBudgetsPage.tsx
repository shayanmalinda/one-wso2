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
import { Navigate, useSearchParams } from "react-router";
import { MenuItem, TextField } from "@wso2/oxygen-ui";
import RoutedTabs from "@components/routed-tabs/RoutedTabs";
import { useBudgetSummary } from "../api/budgetApi";
import EaPage from "../components/EaPage";
import { Failed, ListCard } from "../components/ListCard";
import { countBadge } from "../components/tabBadge";
import { engagementPaths, type BudgetsTab } from "../engagementPaths";
import BudgetSummaryTable from "./BudgetSummaryTable";
import NeedsBudgetLineList from "./NeedsBudgetLineList";

export function TravelBudgetsIndex(): JSX.Element {
  return <Navigate to={engagementPaths.budgets("overview")} replace />;
}

/** Travel Budgets: what each budget line of the year has, spent and left, and the travel requests that still need a line. */
export default function TravelBudgetsPage({ tab }: { tab: BudgetsTab }): JSX.Element {
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get("year")) || undefined;
  const summary = useBudgetSummary(requested);
  const year = requested ?? summary.data?.year;
  const years = summary.data?.years ?? [];
  return (
    <EaPage
      title="Travel Budgets"
      subtitle="Travel spend against each budget line for the year."
      actions={
        years.length > 1 ? (
          <TextField
            select
            size="small"
            label="Year"
            value={String(year ?? "")}
            onChange={(e) =>
              setParams((p) => {
                const next = new URLSearchParams(p);
                next.set("year", e.target.value);
                return next;
              })
            }
            sx={{ minWidth: 110 }}
          >
            {years.map((y) => (
              <MenuItem key={y} value={String(y)}>
                {y}
              </MenuItem>
            ))}
          </TextField>
        ) : null
      }
    >
      <ListCard>
        <RoutedTabs
          basePath={engagementPaths.budgets()}
          ariaLabel="Travel budgets"
          keepSearchParams={["year"]}
          tabs={[
            { segment: "overview", label: "Budget Lines" },
            { segment: "needs-a-line", label: "Needs a Budget Line", ...countBadge(summary.data?.needsLineCount, (n) => `${n} waiting`, summary.isPending) },
          ]}
        />
        {summary.isError && (tab === "overview" || year === undefined) ? (
          <Failed what="the travel budgets" error={summary.error} onRetry={() => void summary.refetch()} retrying={summary.isFetching} />
        ) : tab === "needs-a-line" ? (
          <NeedsBudgetLineList year={year} />
        ) : (
          <BudgetSummaryTable summary={summary.data} />
        )}
      </ListCard>
    </EaPage>
  );
}
