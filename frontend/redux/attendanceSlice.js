import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { 
  fetchAttendance as fetchAttendanceApi, 
  fetchSemesters as fetchSemestersApi,
  getUserProfile as getUserProfileApi
} from "../../src/services/attendanceService.js";

export const fetchAttendanceData = createAsyncThunk(
  "attendance/fetchAttendanceData",
  async (semesterId, { rejectWithValue }) => {
    try {
      const data = await fetchAttendanceApi(semesterId);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSemestersList = createAsyncThunk(
  "attendance/fetchSemestersList",
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchSemestersApi();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  "attendance/fetchUserProfile",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getUserProfileApi();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  attendance: [],
  semesters: [],
  currentSemester: null,
  userProfile: null,
  loading: false,
  semestersLoading: false,
  error: null,
  calculatorOpen: false,
  calculatorCourse: null
};

const attendanceSlice = createSlice({
  name: "attendance",
  initialState,
  reducers: {
    setCurrentSemester: (state, action) => {
      state.currentSemester = action.payload;
    },
    openCalculator: (state, action) => {
      state.calculatorOpen = true;
      state.calculatorCourse = action.payload;
    },
    closeCalculator: (state) => {
      state.calculatorOpen = false;
      state.calculatorCourse = null;
    },
    resetAttendanceState: (state) => {
      state.attendance = [];
      state.currentSemester = null;
      state.error = null;
      state.calculatorOpen = false;
      state.calculatorCourse = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch attendance
      .addCase(fetchAttendanceData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceData.fulfilled, (state, action) => {
        state.loading = false;
        state.attendance = action.payload;
      })
      .addCase(fetchAttendanceData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSemestersList.pending, (state) => {
        state.semestersLoading = true;
      })
      .addCase(fetchSemestersList.fulfilled, (state, action) => {
        state.semestersLoading = false;
        state.semesters = action.payload;
      })
      .addCase(fetchSemestersList.rejected, (state, action) => {
        state.semestersLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.userProfile = action.payload;
      });
  }
});

export const {
  setCurrentSemester,
  openCalculator,
  closeCalculator,
  resetAttendanceState
} = attendanceSlice.actions;

export default attendanceSlice.reducer;
