import { createSlice } from "@reduxjs/toolkit";

const sidebarSlice = createSlice({
    name: "sidebar",
    initialState:{
        isOpen: false,
        currentPage: "home"
    },
    reducers:{
        toggleSidebar: (state) => {
            state.isOpen = !state.isOpen;
        },
        openSidebar: (state)=>{
            state.isOpen = true;
            state.currentPage = "home";
        },
        closeSidebar: (state)=>{
            state.isOpen = false;
        },
        setCurrentPage: (state, action) => {
            state.currentPage = action.payload;
        }
    }
})

export const  { toggleSidebar,openSidebar,closeSidebar,setCurrentPage} = sidebarSlice.actions;
export default sidebarSlice.reducer;