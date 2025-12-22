import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { 
  fetchPesuData as fetchPesuDataApi, 
  fetchSemesters as fetchSemestersApi,
  fetchAllPesuData,
  downloadMaterials as downloadMaterialsApi
} from "../../src/services/courseMaterialService.js";


export const fetchPesuData = createAsyncThunk(
  "courseMaterial/fetchPesuData",
  async ({ search, semester, page, limit }, { rejectWithValue }) => {
    try {
      const data = await fetchPesuDataApi({ search, semester, page, limit });
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSemesters = createAsyncThunk(
  "courseMaterial/fetchSemesters",
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchSemestersApi();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const downloadSelectedMaterials = createAsyncThunk(
  "courseMaterial/downloadSelectedMaterials",
  async ({ contentTypes }, { getState, dispatch, rejectWithValue }) => {
    try {

      const allData = await fetchAllPesuData();
      const { selectedClasses } = getState().courseMaterial;
      
      const selectedItems = [];
      if (allData && Array.isArray(allData)) {
        for (const subject of allData) {
          (subject.units || []).forEach((unit, unitIndex) => {
            let classIndexInUnit = 0;
            for (const cls of (unit.classes || [])) {
              if (selectedClasses[cls.id]) {
                classIndexInUnit++;
                selectedItems.push({
                  subjectId: subject.id,
                  subjectCode: subject.subjectCode,
                  subjectName: subject.subjectName,
                  unitId: unit.id,
                  unitName: unit.name,
                  unitNumber: unitIndex + 1,
                  classId: cls.id,
                  className: cls.className,
                  classIndex: classIndexInUnit
                });
              }
            }
          });
        }
      }

      if (selectedItems.length === 0) {
        return rejectWithValue("No items selected");
      }

      const totalOperations = selectedItems.length * contentTypes.length;
      dispatch(setDownloadProgress({ 
        current: 0, 
        total: totalOperations, 
        currentItem: 'Starting...', 
        status: 'downloading' 
      }));

      const result = await downloadMaterialsApi(
        selectedItems, 
        contentTypes,
        (progress) => dispatch(setDownloadProgress(progress))
      );

      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Data
  pesuData: null,
  semesters: [{ value: "all", label: "All Semesters" }],
  
  // Loading states
  loading: false,
  isFetchingInBackground: false,
  
  // Filters & Pagination
  search: "",
  semester: "all",
  page: 0,
  rowsPerPage: 5,
  
  // Selection (hierarchical)
  selectedSubjects: {},
  selectedUnits: {},
  selectedClasses: {},
  
  // Download state
  downloading: false,
  downloadProgress: { current: 0, total: 0, currentItem: '', status: '' },
  downloadResult: null,
  
  // Error state
  error: null
};

const courseMaterialSlice = createSlice({
  name: "courseMaterial",
  initialState,
  reducers: {
    // Filter actions
    setSearch: (state, action) => {
      state.search = action.payload;
      state.page = 0;
    },
    setSemester: (state, action) => {
      state.semester = action.payload;
      state.page = 0;
    },
    setPage: (state, action) => {
      state.page = action.payload;
    },
    setRowsPerPage: (state, action) => {
      state.rowsPerPage = action.payload;
      state.page = 0;
    },
    
    // Background fetch status
    setBackgroundFetchStatus: (state, action) => {
      state.isFetchingInBackground = action.payload;
    },
    
    // Selection actions with cascade logic
    selectSubject: (state, action) => {
      const { subject, selected } = action.payload;
      state.selectedSubjects[subject.id] = selected;
      
      // Cascade to all units and classes under this subject
      subject.units?.forEach(unit => {
        state.selectedUnits[unit.id] = selected;
        unit.classes?.forEach(cls => {
          state.selectedClasses[cls.id] = selected;
        });
      });
    },
    
    selectUnit: (state, action) => {
      const { subject, unit, selected } = action.payload;
      state.selectedUnits[unit.id] = selected;
      
      // Cascade to all classes under this unit
      unit.classes?.forEach(cls => {
        state.selectedClasses[cls.id] = selected;
      });
      
      // Update subject selection based on units
      const allUnitsSelected = subject.units?.every(u => 
        u.id === unit.id ? selected : state.selectedUnits[u.id]
      );
      const someUnitsSelected = subject.units?.some(u => 
        u.id === unit.id ? selected : state.selectedUnits[u.id]
      );
      
      if (allUnitsSelected) {
        state.selectedSubjects[subject.id] = true;
      } else if (!someUnitsSelected) {
        state.selectedSubjects[subject.id] = false;
      }
    },
    
    selectClass: (state, action) => {
      const { subject, unit, cls, selected } = action.payload;
      state.selectedClasses[cls.id] = selected;
      
      // Update unit selection based on classes
      const allClassesSelected = unit.classes?.every(c => 
        c.id === cls.id ? selected : state.selectedClasses[c.id]
      );
      const someClassesSelected = unit.classes?.some(c => 
        c.id === cls.id ? selected : state.selectedClasses[c.id]
      );
      
      if (allClassesSelected) {
        state.selectedUnits[unit.id] = true;
      } else if (!someClassesSelected) {
        state.selectedUnits[unit.id] = false;
      }
      
      // Update subject selection
      const updatedUnitSelection = allClassesSelected;
      const allUnitsSelected = subject.units?.every(u => 
        u.id === unit.id ? updatedUnitSelection : state.selectedUnits[u.id]
      );
      const someUnitsSelected = subject.units?.some(u => 
        u.id === unit.id ? updatedUnitSelection : state.selectedUnits[u.id]
      );
      
      if (allUnitsSelected) {
        state.selectedSubjects[subject.id] = true;
      } else if (!someUnitsSelected) {
        state.selectedSubjects[subject.id] = false;
      }
    },
    
    clearAllSelections: (state) => {
      state.selectedSubjects = {};
      state.selectedUnits = {};
      state.selectedClasses = {};
    },
    
    // Download actions
    setDownloadProgress: (state, action) => {
      state.downloadProgress = action.payload;
    },
    
    clearDownloadResult: (state) => {
      state.downloadResult = null;
    },
    
    resetError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch PESU data
      .addCase(fetchPesuData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPesuData.fulfilled, (state, action) => {
        state.loading = false;
        state.pesuData = action.payload;
      })
      .addCase(fetchPesuData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch semesters
      .addCase(fetchSemesters.fulfilled, (state, action) => {
        state.semesters = action.payload;
      })
      
      // Download materials
      .addCase(downloadSelectedMaterials.pending, (state) => {
        state.downloading = true;
        state.downloadResult = null;
      })
      .addCase(downloadSelectedMaterials.fulfilled, (state, action) => {
        state.downloading = false;
        state.downloadResult = action.payload;
      })
      .addCase(downloadSelectedMaterials.rejected, (state, action) => {
        state.downloading = false;
        state.downloadResult = {
          success: false,
          error: action.payload
        };
      });
  }
});

// Selectors
export const selectSelectedCount = (state) => 
  Object.values(state.courseMaterial.selectedClasses).filter(Boolean).length;

export const selectIsSubjectIndeterminate = (subject) => (state) => {
  const { selectedUnits } = state.courseMaterial;
  const unitSelections = subject.units?.map(u => selectedUnits[u.id]) || [];
  const hasSelected = unitSelections.some(Boolean);
  const hasUnselected = unitSelections.some(v => !v);
  return hasSelected && hasUnselected;
};

export const selectIsUnitIndeterminate = (unit) => (state) => {
  const { selectedClasses } = state.courseMaterial;
  const classSelections = unit.classes?.map(c => selectedClasses[c.id]) || [];
  const hasSelected = classSelections.some(Boolean);
  const hasUnselected = classSelections.some(v => !v);
  return hasSelected && hasUnselected;
};

export const {
  setSearch,
  setSemester,
  setPage,
  setRowsPerPage,
  setBackgroundFetchStatus,
  selectSubject,
  selectUnit,
  selectClass,
  clearAllSelections,
  setDownloadProgress,
  clearDownloadResult,
  resetError
} = courseMaterialSlice.actions;

export default courseMaterialSlice.reducer;
