import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Drawer, Box, IconButton, Typography } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { closeSidebar } from '../redux/sidebarSlice.js';
import theme from '../Themes/theme.jsx';
const logoUrl = chrome.runtime.getURL("icons/Pes_logo_square.png");


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
            hideBackdrop
            slotProps={{
                backdrop: {
                    sx: { backgroundColor: 'transparent' }
                }
            }}
            sx={{
                "& .MuiDrawer-paper": {
                    width: "400px",
                    borderTopLeftRadius: "32px",
                    borderBottomLeftRadius: "32px",
                    backgroundColor: "rgba(255, 255, 255, 0.85)",
                    backdropFilter: "blur(5px)",
                },
            }}
        >
            <Box
                sx={{
                    paddingTop:"0px",
                    paddingBottom:"5px",
                    paddingLeft:"15px",
                    paddingRight:"15px",
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
                        // Stretch header to drawer edges by canceling parent padding
                        marginLeft: "-20px",
                        marginRight: "-20px",
                        paddingLeft: 0,
                        paddingRight: 0,
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: "4px" , padding: "4px 8px" }}>
                        <img
                            src={logoUrl}
                            alt="PESU Logo"
                            style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "50%",
                                pointerEvents: "none",
                            }}
                            />
                        <Typography sx={{ fontWeight: 'bold', color: '#333', fontSize: '18px' }}>
                            PESU-MAX
                        </Typography>
                    </Box>
                    <IconButton onClick={HandleClose} size="large" sx={{ color: '#333' }}>
                        <ExitToAppIcon fontSize="large" />
                    </IconButton>
                </Box>
                {/* content */}

            </Box>
        </Drawer>
    );
}

export default Sidebar;