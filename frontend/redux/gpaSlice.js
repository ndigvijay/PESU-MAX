import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getGpaData as getGpaDataApi } from "../../src/services/gpaService.js";

export const GRADE_VALUES = {
  S: 10,
  A: 9,
  B: 8,
  C: 7,
  D: 6,
  E: 5,
  F: 4
};

export const GRADE_COLORS = {
  S: '#43a047',
  A: '#F5821F',
  B: '#ffa000',
  C: '#1976d2',
  D: '#233A76',
  E: '#e53935',
  F: '#b71c1c'
};

export const loadGpaData = createAsyncThunk(
  "gpa/loadGpaData",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getGpaDataApi();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  mode: 'sgpa', 
  gpaData: [],           
  currentCgpa: null,
  totalCredits: 0,
  loading: false,
  error: null,
  manualSemesters: [],  
  nextManualSemester: 9, 
  courses: [{ id: 1, credits: '', grade: '' }],
  nextCourseId: 2,
};

const gpaSlice = createSlice({
  name: "gpa",
  initialState,
  reducers: {
    setMode: (state, action) => {
      state.mode = action.payload;
    },
    
    // SGPA course management
    addCourse: (state) => {
      state.courses.push({ 
        id: state.nextCourseId, 
        credits: '', 
        grade: '' 
      });
      state.nextCourseId += 1;
    },
    
    updateCourse: (state, action) => {
      const { id, field, value } = action.payload;
      const course = state.courses.find(c => c.id === id);
      if (course) {
        course[field] = value;
      }
    },
    
    removeCourse: (state, action) => {
      if (state.courses.length > 1) {
        state.courses = state.courses.filter(c => c.id !== action.payload);
      }
    },
    
    // CGPA manual semester management
    addManualSemester: (state) => {
      state.manualSemesters.push({
        id: `manual-${Date.now()}`,
        semester: state.nextManualSemester,
        credits: '',
        sgpa: ''
      });
      state.nextManualSemester += 1;
    },
    
    updateManualSemester: (state, action) => {
      const { id, field, value } = action.payload;
      const sem = state.manualSemesters.find(s => s.id === id);
      if (sem) {
        sem[field] = value;
      }
    },
    
    removeManualSemester: (state, action) => {
      const removedSem = state.manualSemesters.find(s => s.id === action.payload);
      if (removedSem) {
        state.manualSemesters = state.manualSemesters.filter(s => s.id !== action.payload);
        
        // Recalculate next semester number
        const apiMax = state.gpaData.length > 0 
          ? Math.max(...state.gpaData.map(g => g.semester)) 
          : 0;
        const manualMax = state.manualSemesters.length > 0 
          ? Math.max(...state.manualSemesters.map(m => m.semester)) 
          : 0;
        state.nextManualSemester = Math.max(apiMax, manualMax) + 1;
      }
    },
    
    resetGpaState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadGpaData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadGpaData.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.gpaData = action.payload.semesters || [];
          state.currentCgpa = action.payload.currentCgpa || null;
          state.totalCredits = state.gpaData.reduce((sum, s) => sum + (s.credits || 0), 0);
          
          // Set next manual semester after highest API semester
          const maxSem = state.gpaData.length > 0 
            ? Math.max(...state.gpaData.map(g => g.semester)) 
            : 0;
          state.nextManualSemester = maxSem + 1;
        }
      })
      .addCase(loadGpaData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const {
  setMode,
  addCourse,
  updateCourse,
  removeCourse,
  addManualSemester,
  updateManualSemester,
  removeManualSemester,
  resetGpaState
} = gpaSlice.actions;

export default gpaSlice.reducer;
