import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Drawer, Box, IconButton, Typography } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { closeSidebar } from '../redux/sidebarSlice';


const Sidebar = () => {

    const dispatch = useDispatch();
    const isOpen = useSelector((state) => state.sidebar.isOpen);
    const HandleClose = () => {
        dispatch(closeSidebar());
    }
    return (
        <Drawer
            anchor="right"
            open={isOpen}
            onClose={HandleClose}
            sx={{
                "& .MuiDrawer-paper": {
                    width: "400px",
                },
            }}
        >
            <Box
                sx={{
                    padding: "20px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "20px",
                        borderBottom: "2px solid #FF6B35",
                        paddingBottom: "15px",
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>
                        PESU-MAX
                    </Typography>
                    <IconButton onClick={HandleClose} sx={{ color: '#333' }}>
                        <ExitToAppIcon />
                    </IconButton>
                </Box>
                {/* content */}

            </Box>
        </Drawer>
    );
}

export default Sidebar;