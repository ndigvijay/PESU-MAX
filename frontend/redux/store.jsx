import { configureStore } from "@reduxjs/toolkit";
import sidebarReducer from './sidebarSlice.js';
import courseMaterialReducer from './courseMaterialSlice.js';
import facultyReducer from './facultySlice.js';
import attendanceReducer from './attendanceSlice.js';

const store = configureStore({
    reducer : {
        sidebar: sidebarReducer,
        courseMaterial: courseMaterialReducer,
        faculty: facultyReducer,
        attendance: attendanceReducer
    }
})

export { store };