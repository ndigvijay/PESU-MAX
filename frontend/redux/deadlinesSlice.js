import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import {
  deleteDeadline,
  getDeadlines,
  getEnrolledCourseOptions,
  saveCustomDeadline,
  syncDeadlines,
  testDeadlineNotification,
  updateDeadline,
  updateDeadlineSettings,
} from "../../src/services/deadlineService.js";
import { computeBadgeSummary, getDeadlineStatus } from "../../src/helpers/deadlineUtils.js";

export const loadDeadlines = createAsyncThunk(
  "deadlines/loadDeadlines",
  async (_, { rejectWithValue }) => {
    const courseOptions = await getEnrolledCourseOptions().catch(() => []);
    try {
      const payload = await getDeadlines();
      return { ...payload, courseOptions };
    } catch (error) {
      return rejectWithValue({ message: error.message, courseOptions });
    }
  }
);

export const syncDeadlinesThunk = createAsyncThunk(
  "deadlines/syncDeadlines",
  async (force = false, { rejectWithValue }) => {
    try {
      return await syncDeadlines(force);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveCustomDeadlineThunk = createAsyncThunk(
  "deadlines/saveCustomDeadline",
  async (deadline, { rejectWithValue }) => {
    try {
      return await saveCustomDeadline(deadline);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateDeadlineThunk = createAsyncThunk(
  "deadlines/updateDeadline",
  async ({ id, patch }, { rejectWithValue }) => {
    try {
      return await updateDeadline(id, patch);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteDeadlineThunk = createAsyncThunk(
  "deadlines/deleteDeadline",
  async (id, { rejectWithValue }) => {
    try {
      return await deleteDeadline(id);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateDeadlineSettingsThunk = createAsyncThunk(
  "deadlines/updateDeadlineSettings",
  async (settings, { rejectWithValue }) => {
    try {
      return await updateDeadlineSettings(settings);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const testNotificationThunk = createAsyncThunk(
  "deadlines/testNotification",
  async (_, { rejectWithValue }) => {
    try {
      return await testDeadlineNotification();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const deadlinesSlice = createSlice({
  name: "deadlines",
  initialState: {
    items: [],
    courseOptions: [],
    settings: {
      notificationsEnabled: true,
      leadHours: [24, 6, 1],
      overdueReminder: true,
    },
    syncStatus: {
      syncing: false,
      lastSyncedAt: null,
      lastError: null,
    },
    filter: "active",
    search: "",
    showAllSemesters: false,
    ready: false,
    loading: false,
    syncing: false,
    saving: false,
    error: null,
    workerWarning: null,
  },
  reducers: {
    setDeadlineFilter: (state, action) => {
      state.filter = action.payload;
    },
    setDeadlineSearch: (state, action) => {
      state.search = action.payload;
    },
    setShowAllSemesters: (state, action) => {
      state.showAllSemesters = Boolean(action.payload);
    },
    clearDeadlineError: (state) => {
      state.error = null;
      state.workerWarning = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDeadlines.pending, (state) => {
        state.loading = !state.ready;
        state.error = null;
      })
      .addCase(loadDeadlines.fulfilled, (state, action) => {
        state.loading = false;
        state.ready = true;
        state.items = action.payload.items || [];
        state.settings = action.payload.settings || state.settings;
        state.syncStatus = action.payload.syncStatus || state.syncStatus;
        state.workerWarning = action.payload.workerWarning || null;
        if (action.payload.courseOptions) {
          state.courseOptions = action.payload.courseOptions;
        }
      })
      .addCase(loadDeadlines.rejected, (state, action) => {
        state.loading = false;
        state.ready = true;
        if (action.payload && typeof action.payload === "object") {
          state.error = action.payload.message || "Could not load deadlines.";
          if (action.payload.courseOptions) {
            state.courseOptions = action.payload.courseOptions;
          }
        } else {
          state.error = action.payload || "Could not load deadlines.";
        }
      })
      .addCase(syncDeadlinesThunk.pending, (state) => {
        state.syncing = true;
        state.error = null;
      })
      .addCase(syncDeadlinesThunk.fulfilled, (state, action) => {
        state.syncing = false;
        state.ready = true;
        state.items = action.payload.items || [];
        state.settings = action.payload.settings || state.settings;
        state.syncStatus = action.payload.syncStatus || state.syncStatus;
        state.workerWarning = action.payload.workerWarning || null;
      })
      .addCase(syncDeadlinesThunk.rejected, (state, action) => {
        state.syncing = false;
        state.error = action.payload || "Failed to sync deadlines from PESU Academy.";
      })
      .addCase(saveCustomDeadlineThunk.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveCustomDeadlineThunk.fulfilled, (state, action) => {
        state.saving = false;
        state.items = action.payload.items || [];
        state.workerWarning = action.payload.workerWarning || null;
      })
      .addCase(saveCustomDeadlineThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Could not save deadline.";
      })
      .addCase(updateDeadlineThunk.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateDeadlineThunk.fulfilled, (state, action) => {
        state.saving = false;
        state.items = action.payload.items || [];
        state.workerWarning = action.payload.workerWarning || null;
      })
      .addCase(updateDeadlineThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Could not update deadline.";
      })
      .addCase(deleteDeadlineThunk.fulfilled, (state, action) => {
        state.items = action.payload.items || [];
        state.workerWarning = action.payload.workerWarning || null;
      })
      .addCase(deleteDeadlineThunk.rejected, (state, action) => {
        state.error = action.payload || "Could not delete deadline.";
      })
      .addCase(updateDeadlineSettingsThunk.fulfilled, (state, action) => {
        state.settings = action.payload.settings || state.settings;
        state.workerWarning = action.payload.workerWarning || null;
      })
      .addCase(updateDeadlineSettingsThunk.rejected, (state, action) => {
        state.error = action.payload || "Could not update notification settings.";
      })
      .addCase(testNotificationThunk.rejected, (state, action) => {
        state.error = action.payload || "Could not send test notification.";
      });
  },
});

export const {
  setDeadlineFilter,
  setDeadlineSearch,
  setShowAllSemesters,
  clearDeadlineError,
} = deadlinesSlice.actions;

const selectDeadlineItems = (state) => state.deadlines.items;
const selectShowAllSemesters = (state) => state.deadlines.showAllSemesters;

export const selectScopedDeadlines = createSelector(
  [selectDeadlineItems, selectShowAllSemesters],
  (items, showAllSemesters) => {
    if (showAllSemesters) return items;
    return items.filter(
      (item) => item.source === "custom" || item.isCurrentSemester !== false
    );
  }
);

export const selectDeadlinesSummary = createSelector([selectDeadlineItems], (items) =>
  computeBadgeSummary(items)
);

export const selectUrgentPreviewDeadlines = createSelector([selectDeadlineItems], (items) =>
  items
    .filter((item) => !item.completed && (item.source === "custom" || item.isCurrentSemester !== false))
    .slice(0, 3)
);

export const selectFilteredDeadlines = createSelector(
  [
    selectScopedDeadlines,
    (state) => state.deadlines.filter,
    (state) => state.deadlines.search,
  ],
  (items, filter, search) => {
    const query = (search || "").trim().toLowerCase();

    return items.filter((item) => {
      const status = getDeadlineStatus(item);
      if (filter === "active" && item.completed) return false;
      if (filter === "overdue" && status !== "overdue") return false;
      if (filter === "upcoming" && !["urgent", "soon", "upcoming"].includes(status)) return false;
      if (filter === "needsDate" && (item.completed || item.dueAt != null)) return false;
      if (filter === "completed" && !item.completed) return false;

      if (query) {
        const haystack = [
          item.title,
          item.subjectCode,
          item.subjectName,
          item.unitName,
          item.className,
          item.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      }

      return true;
    });
  }
);

export default deadlinesSlice.reducer;
