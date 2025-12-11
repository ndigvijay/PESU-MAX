import { configureStore } from "@reduxjs/toolkit";
import sidebarReducer from './sidebarSlice.js';
import courseMaterialReducer from './courseMaterialSlice.js';
import facultyReducer from './facultySlice.js';

const store = configureStore({
    reducer : {
        sidebar: sidebarReducer,
        courseMaterial: courseMaterialReducer,
        faculty: facultyReducer
    }
})

export { store };