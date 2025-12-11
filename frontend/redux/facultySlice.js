import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const searchProfessors = createAsyncThunk(
  "faculty/searchProfessors",
  async (searchQuery, { rejectWithValue }) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "searchProfessors",
        searchQuery: searchQuery,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data || response.data.length === 0) {
        throw new Error("No professors found");
      }

      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchProfessorDetails = createAsyncThunk(
  "faculty/fetchProfessorDetails",
  async (professorId, { rejectWithValue }) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getProfessorDetails",
        professorId: professorId,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const facultySlice = createSlice({
  name: "faculty",
  initialState: {
    searchQuery: "",
    searchResults: [],
    selectedProfessor: null,
    professorData: null,
    loading: false,
    detailsLoading: false,
    error: null,
  },
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.error = null;
    },
    clearProfessorData: (state) => {
      state.professorData = null;
      state.selectedProfessor = null;
    },
    resetFacultyState: (state) => {
      state.searchResults = [];
      state.professorData = null;
      state.selectedProfessor = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Search professors
      .addCase(searchProfessors.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.searchResults = [];
        state.professorData = null;
        state.selectedProfessor = null;
      })
      .addCase(searchProfessors.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchProfessors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch professor details
      .addCase(fetchProfessorDetails.pending, (state) => {
        state.detailsLoading = true;
        state.error = null;
      })
      .addCase(fetchProfessorDetails.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.professorData = action.payload;
      })
      .addCase(fetchProfessorDetails.rejected, (state, action) => {
        state.detailsLoading = false;
        state.error = action.payload;
      });
  },
});

export const { setSearchQuery, clearSearchResults, clearProfessorData, resetFacultyState } = facultySlice.actions;
export default facultySlice.reducer;
