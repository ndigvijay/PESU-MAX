// Content type IDs 
export const CONTENT_TYPE_IDS = {
  slides: 2,
  notes: 3,
  assignments: 5,
  qb: 6,
  qa: 7
};

// Content type mappings
export const CONTENT_TYPE_NAMES = {
  2: 'Slides',
  3: 'Notes',
  5: 'Assignments',
  6: 'QB',
  7: 'QA'
};

// Content types
export const CONTENT_TYPE_OPTIONS = [
  { key: 'slides', label: 'Slides', id: CONTENT_TYPE_IDS.slides },
  { key: 'notes', label: 'Notes', id: CONTENT_TYPE_IDS.notes },
  { key: 'assignments', label: 'Assignments', id: CONTENT_TYPE_IDS.assignments },
  { key: 'qb', label: 'Question Bank (QB)', id: CONTENT_TYPE_IDS.qb },
  { key: 'qa', label: 'Questions & Answers (QA)', id: CONTENT_TYPE_IDS.qa }
];

export const MERGEABLE_CONTENT_TYPE_KEYS = ['slides', 'notes', 'assignments'];

export const MERGEABLE_CONTENT_TYPE_OPTIONS = CONTENT_TYPE_OPTIONS.filter((option) =>
  MERGEABLE_CONTENT_TYPE_KEYS.includes(option.key)
);

// Default content type selection state
export const DEFAULT_CONTENT_TYPE_SELECTION = {
  slides: true,
  notes: false,
  assignments: false,
  qa: false,
  qb: false
};

export const DEFAULT_MERGE_SELECTION = {
  slides: false,
  notes: false,
  assignments: false
};

export const LIBRARY_MEMBER_ID_BASE64 = "UEVTMTIwMjEwMjM5MA==";
export const LIBRARY_PASSWORD_BASE64 = "Nmo0UGVRQVg=";
