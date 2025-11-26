import { createSlice } from "@reduxjs/toolkit";

const sidebarSlice = createSlice({
    name: "sidebar",
    initialState:{
        isOpen: false
    },
    reducers:{
        toggleSidebar: (state) => {
            state.isOpen = !state.isOpen;
        },
        openSidebar: (state)=>{
            state.isOpen = true;
        },
        closeSidebar: (state)=>{
            state.isOpen = false;
        }
    }
})

export const  { toggleSidebar,openSidebar,closeSidebar} = sidebarSlice.actions;
export default sidebarSlice.reducer;