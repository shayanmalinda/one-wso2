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
import { statusCreatesTrip, willCreateTrip } from "./allocationForm";

describe("willCreateTrip", () => {
  it("needs travel", () => {
    expect(willCreateTrip({ travel: "No", tentative: false, status: "Confirmed" }, true)).toBe(false);
    expect(willCreateTrip({ travel: "", tentative: false, status: "Confirmed" }, false)).toBe(false);
  });

  it("raises a request for a customer allocation unless it is tentative", () => {
    expect(willCreateTrip({ travel: "Yes", tentative: false, status: "" }, true)).toBe(true);
    expect(willCreateTrip({ travel: "Yes", tentative: true, status: "" }, true)).toBe(false);
  });

  it("raises a request for an internal allocation only once it is confirmed", () => {
    expect(willCreateTrip({ travel: "Yes", tentative: false, status: "Tentative" }, false)).toBe(false);
    expect(willCreateTrip({ travel: "Yes", tentative: false, status: "Confirmed" }, false)).toBe(true);
    expect(willCreateTrip({ travel: "Yes", tentative: false, status: "Confirmed - Visa Pending" }, false)).toBe(true);
  });
});

describe("statusCreatesTrip", () => {
  it("is true only for a confirmed status on an allocation that needs travel and has no request yet", () => {
    expect(statusCreatesTrip({ travelRequired: "Yes" }, "Confirmed")).toBe(true);
    expect(statusCreatesTrip({ travelRequired: "Yes" }, "Accepted by Consultant")).toBe(false);
    expect(statusCreatesTrip({ travelRequired: "No" }, "Confirmed")).toBe(false);
    expect(statusCreatesTrip({ travelRequired: "Yes", travelRequest: "TRV-1" }, "Confirmed")).toBe(false);
    expect(statusCreatesTrip({ travelRequired: "Yes", travelRaised: true }, "Confirmed")).toBe(false);
  });
});
