import { configureStore } from "@reduxjs/toolkit";
import sidebarReducer from './sidebarSlice.js';

const store = configureStore({
    reducer : {
        sidebar: sidebarReducer
    }
})

export { store };