import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchPyqCatalog,
  initializeLibraryLogin,
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
  catalogLoading: false,
  authLoading: false,
  authReady: false,
  searchLoading: false,
  downloadingItemId: null,
  bulkDownloading: false,
  downloadSuccessItemId: null,
  bulkDownloadResult: null,
  error: null,
  authError: null,
  searchError: null,
  downloadError: null,
  bulkDownloadError: null
};

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
      state.searchQuery = "";
      state.searchError = null;
    },
    setSelectedCourse: (state, action) => {
      state.selectedCourse = action.payload;
      state.selectedPyqs = {};
      state.searchQuery = action.payload?.subjectCode || "";
      state.searchResults = [];
      state.totalResults = 0;
      state.lastQuery = "";
      state.searchError = null;
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
      })
      .addCase(searchPyqs.rejected, (state, action) => {
        state.searchLoading = false;
        state.selectedPyqs = {};
        state.searchResults = [];
        state.totalResults = 0;
        state.lastQuery = "";
        state.searchError = action.payload;
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
