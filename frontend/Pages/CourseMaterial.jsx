import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { useDispatch } from "react-redux";
import { useEffect,useState } from "react";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import theme from "../Themes/theme.jsx";

const CourseMaterial = () => {
  const dispatch = useDispatch();
  const [pesuData, setPesuData] = useState(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getPESUData" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error:", chrome.runtime.lastError.message);
        return;
      }
      if (response && response.data) {
        console.log(response.data);
        setPesuData(response.data);
      } else if (response && response.error) {
        console.error("Error fetching data:", response.error);
      }
    });
  }, []);

  const HandleBack = () => {
    dispatch(setCurrentPage("home"));
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '16px'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <IconButton 
          onClick={HandleBack}
          sx={{ 
            color: theme.colors.secondary,
            padding: '4px'
          }}
        >
          <KeyboardBackspaceIcon />
        </IconButton>
        <Typography 
          variant="h5" 
          sx={{ 
            color: theme.colors.secondary,
            fontWeight: 'bold'
          }}
        >
          Course Materials
        </Typography>
      </Box>
      <Typography 
        variant="body1" 
        sx={{ 
          color: '#666'
        }}
      >
        Course materials will be displayed here.
      </Typography>
    </Box>
  );
}

export default CourseMaterial;
