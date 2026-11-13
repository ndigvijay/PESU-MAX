export const MERGE_MODES = { subject: "subject-wise", unit: "unit-wise" };

export const DEFAULT_MERGE_MODE = MERGE_MODES.subject;

export const MERGE_MODE_OPTIONS = [
  { value: MERGE_MODES.subject, label: "Subject-wise" },
  { value: MERGE_MODES.unit, label: "Unit-wise" },
];

export const normalizeMergeMode = (value) =>
  (value === MERGE_MODES.unit ? MERGE_MODES.unit : DEFAULT_MERGE_MODE);

export const mergeScopeLabel = (mode) =>
  (normalizeMergeMode(mode) === MERGE_MODES.unit ? "unit" : "subject");
