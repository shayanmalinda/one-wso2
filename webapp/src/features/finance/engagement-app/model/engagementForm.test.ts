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

import { describe, expect, it } from "vitest";
import { changesOf, formOf, inputOf, newForm } from "./engagementForm";
import type { Engagement } from "../api/engagementTypes";

const internal = { ...newForm(1), title: "Offsite", allocationType: "Team Event", nature: "On-site", address: "Colombo", start: "2027-02-01", end: "2027-02-02", businessUnit: "CORPORATE" };

describe("the travel budget line on an engagement form", () => {
  it("sends the code on create for an internal engagement, and nothing when none is chosen", () => {
    expect(inputOf({ ...internal, budgetLineCode: "GA_BOARD" }, 3).budgetLineCode).toBe("GA_BOARD");
    expect(inputOf(internal, 3).budgetLineCode).toBeUndefined();
  });

  it("never sends it for a customer engagement", () => {
    expect(inputOf({ ...newForm(3), budgetLineCode: "GA_BOARD" }, 3).budgetLineCode).toBeUndefined();
  });

  it("sends a change on edit, and an empty string to clear the line", () => {
    const base = { ...internal, budgetLineCode: "GA_BOARD" };
    expect(changesOf(base, { ...base, budgetLineCode: "GA_SENIOR" })).toEqual({ budgetLineCode: "GA_SENIOR" });
    expect(changesOf(base, { ...base, budgetLineCode: "" })).toEqual({ budgetLineCode: "" });
    expect(changesOf(base, base)).toEqual({});
  });

  it("opens an edit with the engagement's line", () => {
    const e = { typeId: 1, account: "", title: "Offsite", allocationType: "Team Event", nature: "On-site", country: "Sri Lanka", start: "2027-02-01", end: "2027-02-02", budgetLine: { code: "GA_BOARD", name: "G&A: Board meeting travel" } } as unknown as Engagement;
    expect(formOf(e).budgetLineCode).toBe("GA_BOARD");
    expect(formOf({ ...e, budgetLine: undefined }).budgetLineCode).toBe("");
  });
});
