import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import {
  fetchPyqCatalog,
  loadMoreCoursePyqs,
  openCoursePyq,
  searchCoursePyqs,
  downloadCoursePyq,
  downloadSelectedCoursePyqsZip
} from "../../src/services/pyqService.js";

export const ALL_PYQ_YEARS = "";
export const PYQ_PAGE_SIZE = 10;

const toPaperRequest = ({ id, recordId, courseCode, title, year, downloadPath, prefixHints }) => ({
  id,
  recordId,
  courseCode,
  title,
  year,
  downloadPath,
  prefixHints
});

export const loadPyqCatalog = createAsyncThunk(
  "pyq/loadPyqCatalog",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchPyqCatalog();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const searchPyqs = createAsyncThunk(
  "pyq/searchPyqs",
  async ({ query, year, subjectName }, { rejectWithValue }) => {
    try {
      return await searchCoursePyqs({ query, year, subjectName });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
  {
    condition: (_, { getState }) => !getState().pyq?.searchLoading
  }
);

export const loadMorePyqs = createAsyncThunk(
  "pyq/loadMorePyqs",
  async (_, { getState, rejectWithValue }) => {
    const { pyq } = getState();

    try {
      return await loadMoreCoursePyqs({
        query: pyq.lastQuery,
        year: pyq.lastSearchYear,
        subjectName: pyq.lastSubjectName,
        cursor: pyq.nextPageCursor
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
  {
    condition: (_, { getState }) => {
      const pyq = getState().pyq;
      return Boolean(pyq?.nextPageCursor)
        && !pyq.resultsComplete
        && !pyq.loadingMore
        && !pyq.searchLoading
        && !pyq.bulkDownloading;
    }
  }
);

export const downloadPyq = createAsyncThunk(
  "pyq/downloadPyq",
  async (item, { rejectWithValue }) => {
    try {
      const data = await downloadCoursePyq(toPaperRequest(item));
      return { ...data, itemId: item.id };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const openPyq = createAsyncThunk(
  "pyq/openPyq",
  async (item, { rejectWithValue }) => {
    try {
      return await openCoursePyq(toPaperRequest(item));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const downloadSelectedPyqsZip = createAsyncThunk(
  "pyq/downloadSelectedPyqsZip",
  async ({ items, query }, { rejectWithValue }) => {
    try {
      return await downloadSelectedCoursePyqsZip({ items: items.map(toPaperRequest), query });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  semesters: [],
  courses: [],
  currentStep: "semesters",
  semesterFilter: "all",
  selectedSemester: null,
  selectedCourse: null,
  selectedPyqs: {},
  courseSearch: "",
  searchQuery: "",
  loadedResults: [],
  totalResults: 0,
  resultsComplete: false,
  nextPageCursor: null,
  currentPage: 1,
  searchRequestId: null,
  pageRequestId: null,
  lastQuery: "",
  lastSearchYear: ALL_PYQ_YEARS,
  lastSubjectName: "",
  selectedYear: ALL_PYQ_YEARS,
  catalogLoading: false,
  searchLoading: false,
  loadingMore: false,
  downloadingItemId: null,
  openingItemId: null,
  bulkDownloading: false,
  downloadSuccessItemId: null,
  bulkDownloadResult: null,
  error: null,
  searchError: null,
  loadMoreError: null,
  downloadError: null,
  bulkDownloadError: null
};

function clearSearchResults(state) {
  state.searchRequestId = null;
  state.pageRequestId = null;
  state.searchLoading = false;
  state.loadingMore = false;
  state.selectedPyqs = {};
  state.loadedResults = [];
  state.totalResults = 0;
  state.resultsComplete = false;
  state.nextPageCursor = null;
  state.currentPage = 1;
  state.lastQuery = "";
  state.lastSearchYear = ALL_PYQ_YEARS;
  state.lastSubjectName = "";
  state.selectedYear = ALL_PYQ_YEARS;
  state.searchError = null;
  state.loadMoreError = null;
}

function canFilterYearLocally(pyq) {
  return pyq.resultsComplete && pyq.lastSearchYear === ALL_PYQ_YEARS;
}

const pyqSlice = createSlice({
  name: "pyq",
  initialState,
  reducers: {
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },
    setSemesterFilter: (state, action) => {
      state.semesterFilter = action.payload;
    },
    setSelectedSemester: (state, action) => {
      clearSearchResults(state);
      state.selectedSemester = action.payload;
      state.selectedCourse = null;
      state.courseSearch = "";
      state.searchQuery = "";
    },
    setSelectedCourse: (state, action) => {
      clearSearchResults(state);
      state.selectedCourse = action.payload;
      state.searchQuery = action.payload?.searchCode || action.payload?.subjectName || "";
      state.downloadSuccessItemId = null;
      state.downloadError = null;
      state.bulkDownloadResult = null;
      state.bulkDownloadError = null;
    },
    setCourseSearch: (state, action) => {
      state.courseSearch = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      state.searchError = null;
      state.loadMoreError = null;
      state.downloadSuccessItemId = null;
    },
    showPyqPage: (state, action) => {
      state.currentPage = Math.max(1, action.payload);
      state.loadMoreError = null;
    },
    setSelectedYear: (state, action) => {
      state.selectedYear = action.payload;
      if (canFilterYearLocally(state)) {
        state.currentPage = 1;
      }
      state.searchError = null;
      state.loadMoreError = null;
      state.downloadSuccessItemId = null;
    },
    togglePyqSelection: (state, action) => {
      const itemId = action.payload;
      if (state.selectedPyqs[itemId]) {
        delete state.selectedPyqs[itemId];
      } else {
        state.selectedPyqs[itemId] = true;
      }
      state.bulkDownloadResult = null;
      state.bulkDownloadError = null;
    },
    setSelectedPyqs: (state, action) => {
      state.selectedPyqs = action.payload || {};
      state.bulkDownloadResult = null;
      state.bulkDownloadError = null;
    },
    clearPyqSelection: (state) => {
      state.selectedPyqs = {};
    },
    clearDownloadFeedback: (state) => {
      state.downloadSuccessItemId = null;
      state.downloadError = null;
      state.bulkDownloadResult = null;
      state.bulkDownloadError = null;
    },
    resetPyqState: () => initialState
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPyqCatalog.pending, (state) => {
        state.catalogLoading = true;
        state.error = null;
      })
      .addCase(loadPyqCatalog.fulfilled, (state, action) => {
        state.catalogLoading = false;
        state.semesters = action.payload?.semesters || [];
        state.courses = action.payload?.courses || [];

        const latestSemester = state.semesters.reduce((latest, semester) => {
          const semesterNumber = Number(semester.value);

          if (!Number.isFinite(semesterNumber)) {
            return latest;
          }

          return !latest || semesterNumber > Number(latest.value)
            ? semester
            : latest;
        }, null);

        state.semesterFilter = latestSemester?.value || "all";
      })
      .addCase(loadPyqCatalog.rejected, (state, action) => {
        state.catalogLoading = false;
        state.error = action.payload;
      })
      .addCase(searchPyqs.pending, (state, action) => {
        state.searchRequestId = action.meta.requestId;
        state.pageRequestId = null;
        state.searchLoading = true;
        state.selectedPyqs = {};
        state.searchError = null;
        state.loadMoreError = null;
        state.loadingMore = false;
        state.downloadSuccessItemId = null;
        state.bulkDownloadResult = null;
        state.bulkDownloadError = null;
      })
      .addCase(searchPyqs.fulfilled, (state, action) => {
        if (state.searchRequestId !== action.meta.requestId) return;
        const entry = action.payload || {};
        state.searchRequestId = null;
        state.searchLoading = false;
        state.selectedPyqs = {};
        state.loadedResults = entry.results || [];
        state.totalResults = entry.totalResults || 0;
        state.resultsComplete = Boolean(entry.complete);
        state.nextPageCursor = entry.nextCursor || null;
        state.lastQuery = action.meta.arg.query.trim();
        state.lastSearchYear = action.meta.arg.year || ALL_PYQ_YEARS;
        state.lastSubjectName = action.meta.arg.subjectName || "";
        state.currentPage = 1;
      })
      .addCase(searchPyqs.rejected, (state, action) => {
        if (state.searchRequestId !== action.meta.requestId) return;
        state.searchRequestId = null;
        state.searchLoading = false;
        state.selectedPyqs = {};
        state.loadedResults = [];
        state.totalResults = 0;
        state.resultsComplete = false;
        state.nextPageCursor = null;
        state.currentPage = 1;
        state.lastQuery = "";
        state.lastSearchYear = ALL_PYQ_YEARS;
        state.lastSubjectName = "";
        state.searchError = action.payload;
      })
      .addCase(loadMorePyqs.pending, (state, action) => {
        state.pageRequestId = action.meta.requestId;
        state.loadingMore = true;
        state.loadMoreError = null;
      })
      .addCase(loadMorePyqs.fulfilled, (state, action) => {
        if (state.pageRequestId !== action.meta.requestId) return;
        const page = action.payload || {};
        const loadedIds = new Set(state.loadedResults.map((item) => item.id));
        const freshResults = (page.results || []).filter((item) => !loadedIds.has(item.id));
        state.pageRequestId = null;
        state.loadingMore = false;
        state.loadedResults.push(...freshResults);
        state.totalResults = Math.max(page.totalResults || 0, state.loadedResults.length);
        state.resultsComplete = !page.nextCursor;
        state.nextPageCursor = page.nextCursor || null;
        if (state.loadedResults.length > state.currentPage * PYQ_PAGE_SIZE) {
          state.currentPage += 1;
        }
      })
      .addCase(loadMorePyqs.rejected, (state, action) => {
        if (state.pageRequestId !== action.meta.requestId) return;
        state.pageRequestId = null;
        state.loadingMore = false;
        state.loadMoreError = action.payload;
      })
      .addCase(downloadPyq.pending, (state, action) => {
        state.downloadingItemId = action.meta.arg?.id || null;
        state.downloadSuccessItemId = null;
        state.downloadError = null;
      })
      .addCase(downloadPyq.fulfilled, (state, action) => {
        state.downloadingItemId = null;
        state.downloadSuccessItemId = action.payload?.itemId || null;
      })
      .addCase(downloadPyq.rejected, (state, action) => {
        state.downloadingItemId = null;
        state.downloadError = action.payload;
      })
      .addCase(openPyq.pending, (state, action) => {
        state.openingItemId = action.meta.arg?.id || null;
        state.downloadError = null;
      })
      .addCase(openPyq.fulfilled, (state) => {
        state.openingItemId = null;
      })
      .addCase(openPyq.rejected, (state, action) => {
        state.openingItemId = null;
        state.downloadError = action.payload;
      })
      .addCase(downloadSelectedPyqsZip.pending, (state) => {
        state.bulkDownloading = true;
        state.bulkDownloadResult = null;
        state.bulkDownloadError = null;
      })
      .addCase(downloadSelectedPyqsZip.fulfilled, (state, action) => {
        state.bulkDownloading = false;
        state.bulkDownloadResult = action.payload || null;
        state.bulkDownloadError = null;
      })
      .addCase(downloadSelectedPyqsZip.rejected, (state, action) => {
        state.bulkDownloading = false;
        state.bulkDownloadError = action.payload;
      });
  }
});

export const selectCanFilterYearLocally = (state) => canFilterYearLocally(state.pyq);

export const selectVisiblePyqs = createSelector(
  [
    (state) => state.pyq.loadedResults,
    (state) => state.pyq.selectedYear,
    selectCanFilterYearLocally
  ],
  (results, selectedYear, filterLocally) => (
    filterLocally && selectedYear
      ? results.filter((item) => String(item.year) === selectedYear)
      : results
  )
);

export const selectPyqPage = createSelector(
  [selectVisiblePyqs, (state) => state.pyq.currentPage],
  (visibleResults, currentPage) => {
    const pageCount = Math.max(1, Math.ceil(visibleResults.length / PYQ_PAGE_SIZE));
    const page = Math.min(Math.max(currentPage, 1), pageCount);
    return {
      page,
      pageCount,
      results: visibleResults.slice((page - 1) * PYQ_PAGE_SIZE, page * PYQ_PAGE_SIZE)
    };
  }
);

export const {
  setCurrentStep,
  setSemesterFilter,
  setSelectedSemester,
  setSelectedCourse,
  setSelectedYear,
  setCourseSearch,
  setSearchQuery,
  showPyqPage,
  togglePyqSelection,
  setSelectedPyqs,
  clearPyqSelection,
  clearDownloadFeedback,
  resetPyqState
} = pyqSlice.actions;

export default pyqSlice.reducer;
