import React from "react";
import { useDispatch } from "react-redux";
import { Box, Typography, IconButton } from "@mui/material";
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { setCurrentPage } from "../../redux/sidebarSlice.js";
import theme from "../../Themes/theme.jsx";

const CourseMaterialHeader = () => {
  const dispatch = useDispatch();

  const handleBack = () => {
    dispatch(setCurrentPage("home"));
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <IconButton 
        onClick={handleBack}
        sx={{ 
          color: theme.colors.secondary,
          padding: '4px'
        }}
      >
        <KeyboardBackspaceIcon />
      </IconButton>
      <Typography 
        variant="h6" 
        sx={{ 
          color: theme.colors.secondary,
          fontWeight: 'bold'
        }}
      >
        Course Materials
      </Typography>
    </Box>
  );
};

export default CourseMaterialHeader;
