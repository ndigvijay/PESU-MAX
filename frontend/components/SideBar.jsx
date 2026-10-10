import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Drawer, Box, IconButton, Typography, Divider, Badge } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { closeSidebar, openSidebar, setCurrentPage } from '../redux/sidebarSlice.js';
import theme from '../Themes/theme.jsx';
import { newBadgeSx } from '../styles/styles.js';
import Home from '../Pages/Home.jsx';
import CourseMaterial from '../Pages/CourseMaterial.jsx';
import KnowYourFaculty from '../Pages/KnowYourFaculty.jsx';
import Attendance from '../Pages/Attendance.jsx';
import GPACalculator from '../Pages/GPACalculator.jsx';
import PYQ from '../Pages/PYQ.jsx';
import Settings from '../Pages/Settings.jsx';
import Appearance from '../Pages/Appearance.jsx';
import Notifications from '../Pages/Notifications.jsx';
const logoUrl = chrome.runtime.getURL("icons/Pes_logo_square_ui.png");
import SettingsIcon from '@mui/icons-material/Settings';
import ResourceNotificationsButton from './Notifications/ResourceNotificationsButton.jsx';



const Sidebar = () => {

    const dispatch = useDispatch();
    const isOpen = useSelector((state) => state.sidebar.isOpen);
    const currentPage = useSelector((state) => state.sidebar.currentPage);
    const HandleClose = () => {
        dispatch(closeSidebar());
    }
    const HandleSettings = () => {
        dispatch(openSidebar());
        dispatch(setCurrentPage("settings"));
    }
    return (
        <Drawer
            anchor="right"
            open={isOpen}
            onClose={HandleClose}
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
                        marginLeft: "-15px",
                        marginRight: "-15px",
                        padding: "8px 12px",
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                        <Typography sx={{ fontWeight: 'bold', color: theme.colors.secondary, fontSize: '18px' }}>
                            PESU-MAX
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <ResourceNotificationsButton />
                        <IconButton onClick={HandleSettings} aria-label="Open settings" size="large" sx={{ color: '#333' }}>
                            <Badge badgeContent="NEW" overlap="circular" sx={newBadgeSx}>
                                <SettingsIcon fontSize="large" />
                            </Badge>
                        </IconButton>
                        <IconButton onClick={HandleClose} aria-label="Close PESU-MAX" size="large" sx={{ color: '#333' }}>
                            <ExitToAppIcon fontSize="large" />
                        </IconButton>
                    </Box>
                </Box>
                <Divider 
                    sx={{ 
                        marginLeft: "-15px",
                        marginRight: "-15px",
                        borderColor: theme.colors.secondary,
                        borderWidth: "1.5px",
                    }} 
                />
                {/* content */}
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        minWidth: 0,
                        overflow: "hidden",
                        display: "flex",
                        "& > *": {
                            flex: 1,
                            minWidth: 0,
                            width: "100%",
                        },
                    }}
                >
                    {currentPage === "home" && <Home />}
                    {currentPage === "courseMaterial" && <CourseMaterial />}
                    {currentPage === "knowYourFaculty" && <KnowYourFaculty />}
                    {currentPage === "attendance" && <Attendance />}
                    {currentPage === "gpaCalculator" && <GPACalculator />}
                    {currentPage === "pyq" && <PYQ />}
                    {currentPage === "settings" && <Settings />}
                    {currentPage === "appearance" && <Appearance />}
                    {currentPage === "notifications" && <Notifications />}
                </Box>


            </Box>
        </Drawer>
    );
}

export default Sidebar;
