import { configureStore } from "@reduxjs/toolkit";
import sidebarReducer from './sidebarSlice.js';
import courseMaterialReducer from './courseMaterialSlice.js';
import facultyReducer from './facultySlice.js';
import attendanceReducer from './attendanceSlice.js';
import gpaReducer from './gpaSlice.js';
import pyqReducer from './pyqSlice.js';
import notificationsReducer from './notificationsSlice.js';
import deadlinesReducer from './deadlinesSlice.js';

const store = configureStore({
    reducer : {
        sidebar: sidebarReducer,
        courseMaterial: courseMaterialReducer,
        faculty: facultyReducer,
        attendance: attendanceReducer,
        gpa: gpaReducer,
        pyq: pyqReducer,
        notifications: notificationsReducer,
        deadlines: deadlinesReducer
    }
})

export { store };
