import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchPyqCatalog,
  initializeLibraryLogin,
  loadMoreCoursePyqs,
  searchCoursePyqs,
  downloadCoursePyq,
  downloadSelectedCoursePyqsZip
} from "../../src/services/pyqService.js";
import {
  LIBRARY_MEMBER_ID_BASE64,
  LIBRARY_PASSWORD_BASE64
} from "../constants/constants.js";

export const initLibraryAuth = createAsyncThunk(
  "pyq/initLibraryAuth",
  async (_, { rejectWithValue }) => {
    try {
      return await initializeLibraryLogin({
        encodedMemberId: LIBRARY_MEMBER_ID_BASE64,
        encodedPassword: LIBRARY_PASSWORD_BASE64
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

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
  async (query, { rejectWithValue }) => {
    try {
      return await searchCoursePyqs({
        query,
        encodedMemberId: LIBRARY_MEMBER_ID_BASE64,
        encodedPassword: LIBRARY_PASSWORD_BASE64
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadMorePyqs = createAsyncThunk(
  "pyq/loadMorePyqs",
  async (_, { getState, rejectWithValue }) => {
    const { pyq } = getState();

    if (!pyq?.hasMore || !pyq?.nextPageCursor) {
      return rejectWithValue("No more PYQs to load");
    }

    try {
      return await loadMoreCoursePyqs({
        query: pyq.lastQuery,
        cursor: pyq.nextPageCursor,
        loadedCount: pyq.searchResults.length,
        encodedMemberId: LIBRARY_MEMBER_ID_BASE64,
        encodedPassword: LIBRARY_PASSWORD_BASE64
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const downloadPyq = createAsyncThunk(
  "pyq/downloadPyq",
  async ({ downloadPath, title, itemId }, { rejectWithValue }) => {
    try {
      const data = await downloadCoursePyq({
        downloadPath,
        title,
        encodedMemberId: LIBRARY_MEMBER_ID_BASE64,
        encodedPassword: LIBRARY_PASSWORD_BASE64
      });
      return { ...data, itemId };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const downloadSelectedPyqsZip = createAsyncThunk(
  "pyq/downloadSelectedPyqsZip",
  async ({ items, query }, { rejectWithValue }) => {
    try {
      return await downloadSelectedCoursePyqsZip({
        items,
        query,
        encodedMemberId: LIBRARY_MEMBER_ID_BASE64,
        encodedPassword: LIBRARY_PASSWORD_BASE64
      });
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
  searchResults: [],
  totalResults: 0,
  lastQuery: "",
  hasMore: false,
  nextPageCursor: null,
  catalogLoading: false,
  authLoading: false,
  authReady: false,
  searchLoading: false,
  loadingMore: false,
  downloadingItemId: null,
  bulkDownloading: false,
  downloadSuccessItemId: null,
  bulkDownloadResult: null,
  error: null,
  authError: null,
  searchError: null,
  loadMoreError: null,
  downloadError: null,
  bulkDownloadError: null
};

function mergeUniquePyqResults(existingResults = [], incomingResults = []) {
  const mergedResults = [...existingResults];
  const seenKeys = new Set(
    existingResults.map((item) => item.downloadPath || item.recordId || item.id)
  );

  incomingResults.forEach((item) => {
    const resultKey = item.downloadPath || item.recordId || item.id;
    if (seenKeys.has(resultKey)) {
      return;
    }

    seenKeys.add(resultKey);
    mergedResults.push(item);
  });

  return mergedResults;
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
      state.selectedSemester = action.payload;
      state.selectedCourse = null;
      state.selectedPyqs = {};
      state.courseSearch = "";
      state.searchResults = [];
      state.totalResults = 0;
      state.lastQuery = "";
      state.hasMore = false;
      state.nextPageCursor = null;
      state.searchQuery = "";
      state.searchError = null;
      state.loadMoreError = null;
    },
    setSelectedCourse: (state, action) => {
      state.selectedCourse = action.payload;
      state.selectedPyqs = {};
      state.searchQuery = action.payload?.subjectCode || "";
      state.searchResults = [];
      state.totalResults = 0;
      state.lastQuery = "";
      state.hasMore = false;
      state.nextPageCursor = null;
      state.searchError = null;
      state.loadMoreError = null;
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
      .addCase(initLibraryAuth.pending, (state) => {
        state.authLoading = true;
        state.authError = null;
      })
      .addCase(initLibraryAuth.fulfilled, (state) => {
        state.authLoading = false;
        state.authReady = true;
      })
      .addCase(initLibraryAuth.rejected, (state, action) => {
        state.authLoading = false;
        state.authReady = false;
        state.authError = action.payload;
      })
      .addCase(loadPyqCatalog.pending, (state) => {
        state.catalogLoading = true;
        state.error = null;
      })
      .addCase(loadPyqCatalog.fulfilled, (state, action) => {
        state.catalogLoading = false;
        state.semesters = action.payload?.semesters || [];
        state.courses = action.payload?.courses || [];
      })
      .addCase(loadPyqCatalog.rejected, (state, action) => {
        state.catalogLoading = false;
        state.error = action.payload;
      })
      .addCase(searchPyqs.pending, (state) => {
        state.searchLoading = true;
        state.selectedPyqs = {};
        state.searchError = null;
        state.loadMoreError = null;
        state.hasMore = false;
        state.nextPageCursor = null;
        state.loadingMore = false;
        state.downloadSuccessItemId = null;
        state.bulkDownloadResult = null;
        state.bulkDownloadError = null;
      })
      .addCase(searchPyqs.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.selectedPyqs = {};
        state.searchResults = action.payload?.results || [];
        state.totalResults = action.payload?.totalResults || 0;
        state.lastQuery = action.payload?.query || "";
        state.hasMore = Boolean(action.payload?.hasMore);
        state.nextPageCursor = action.payload?.nextCursor || null;
        state.loadingMore = false;
        state.loadMoreError = null;
      })
      .addCase(searchPyqs.rejected, (state, action) => {
        state.searchLoading = false;
        state.selectedPyqs = {};
        state.searchResults = [];
        state.totalResults = 0;
        state.lastQuery = "";
        state.hasMore = false;
        state.nextPageCursor = null;
        state.loadingMore = false;
        state.loadMoreError = null;
        state.searchError = action.payload;
      })
      .addCase(loadMorePyqs.pending, (state) => {
        state.loadingMore = true;
        state.loadMoreError = null;
      })
      .addCase(loadMorePyqs.fulfilled, (state, action) => {
        const previousLength = state.searchResults.length;
        const mergedResults = mergeUniquePyqResults(state.searchResults, action.payload?.results || []);

        state.loadingMore = false;
        state.searchResults = mergedResults;
        state.totalResults = action.payload?.totalResults || state.totalResults;
        state.lastQuery = action.payload?.query || state.lastQuery;
        state.nextPageCursor = action.payload?.nextCursor || null;
        state.hasMore = Boolean(
          action.payload?.hasMore
          && mergedResults.length > previousLength
          && mergedResults.length < state.totalResults
        );
      })
      .addCase(loadMorePyqs.rejected, (state, action) => {
        state.loadingMore = false;
        state.loadMoreError = action.payload;
      })
      .addCase(downloadPyq.pending, (state, action) => {
        state.downloadingItemId = action.meta.arg?.itemId || null;
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

export const {
  setCurrentStep,
  setSemesterFilter,
  setSelectedSemester,
  setSelectedCourse,
  setCourseSearch,
  setSearchQuery,
  togglePyqSelection,
  setSelectedPyqs,
  clearPyqSelection,
  clearDownloadFeedback,
  resetPyqState
} = pyqSlice.actions;

export default pyqSlice.reducer;
