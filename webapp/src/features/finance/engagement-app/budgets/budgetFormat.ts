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
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

// How the travel budget screens word money, percentages and where a suggestion came from.

import type { AllocationTypeRule, BudgetLine, RuleKind, SuggestionSource } from "../api/budgetApi";

/** "USD 42,300", and "USD 45,249.90" when there are cents. */
export function usd(amount: number): string {
  const digits = Number.isInteger(amount) ? 0 : 2;
  return `USD ${amount.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** "39.7%". */
export const percent = (n: number): string => `${n.toFixed(1)}%`;

const SOURCE: Readonly<Record<SuggestionSource, string>> = {
  ENGAGEMENT: "Suggested from the engagement",
  ALLOCATION_TYPE: "Suggested from the allocation type",
  REGION: "Suggested from the engagement's region",
  TEAM: "Suggested from the traveller's team",
  NONE: "",
};

export const sourceText = (source: SuggestionSource): string => SOURCE[source];

/** The ways an allocation type can pick a budget line, besides one fixed line. */
export const RULE_KINDS: readonly (readonly [Exclude<RuleKind, "LINE">, string])[] = [
  ["REGION", "By engagement region"],
  ["TEAM", "By traveller's team"],
  ["ENGAGEMENT", "Set on the engagement"],
  ["NONE", "None"],
];

/** What an allocation type's rule says: the line name, or how the line is found. */
export function ruleText(rule: AllocationTypeRule | undefined, lines: readonly BudgetLine[] | undefined): string {
  if (rule?.ruleKind === "LINE") return lines?.find((l) => l.code === rule.lineCode)?.name ?? rule.lineCode ?? "None";
  return RULE_KINDS.find(([k]) => k === rule?.ruleKind)?.[1] ?? "None";
}

/** A rule as one select value: its kind, or `LINE:<code>`. */
export const ruleValue = (rule: AllocationTypeRule | undefined): string => (rule?.ruleKind === "LINE" ? `LINE:${rule.lineCode ?? ""}` : (rule?.ruleKind ?? "NONE"));
