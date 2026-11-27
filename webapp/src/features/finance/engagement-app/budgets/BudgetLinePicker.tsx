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
import { Autocomplete, TextField } from "@wso2/oxygen-ui";
import { Two } from "../components/StatusChips";
import { usd } from "./budgetFormat";

export interface PickerLine {
  readonly id: number;
  /** "Sales: EU". */
  readonly name: string;
  /** What the line has left, when known. */
  readonly leftUsd?: number;
}

/** A select you can type into over budget lines: the name, with what is left under it when known. */
export default function BudgetLinePicker({
  label = "Budget Line",
  value,
  lines,
  onChange,
  disabled,
  error,
  helperText,
  required,
}: {
  readonly label?: string;
  readonly value: number | null;
  readonly lines: readonly PickerLine[];
  readonly onChange: (id: number | null) => void;
  readonly disabled?: boolean;
  readonly error?: string;
  readonly helperText?: string;
  readonly required?: boolean;
}): JSX.Element {
  return (
    <Autocomplete
      size="small"
      autoHighlight
      disabled={disabled}
      options={lines}
      value={lines.find((l) => l.id === value) ?? null}
      getOptionLabel={(l) => l.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_, l) => onChange(l?.id ?? null)}
      renderOption={({ key, ...props }, l) => (
        <li key={key} {...props}>
          <Two main={l.name} sub={l.leftUsd === undefined ? undefined : `${usd(l.leftUsd)} left`} />
        </li>
      )}
      renderInput={(params) => <TextField {...params} label={label} required={required} error={Boolean(error)} helperText={error ?? helperText} />}
    />
  );
}
