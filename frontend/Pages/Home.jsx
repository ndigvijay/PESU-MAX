import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useDispatch } from "react-redux";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import theme from "../Themes/theme.jsx";

const Home = () => {
  const dispatch = useDispatch();
  return ( 
    <Box>
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px'
        }}>
          <Button 
            variant="contained" 
            sx={{
              backgroundColor: theme.colors.secondary,
              width: '100%',
              textAlign: 'center',
              padding: '12px'
            }}
            onClick={() => {
              dispatch(setCurrentPage("courseMaterial"));
            }}
          >
            Download All Course Materials
          </Button>
          <Button 
            variant="contained" 
            sx={{
              backgroundColor: theme.colors.secondary,
              width: '100%',
              textAlign: 'center',
              padding: '12px'
            }}
          >
            Attendence Calculator
          </Button>
          <Button 
            variant="contained" 
            sx={{
              backgroundColor: theme.colors.secondary,
              width: '100%',
              textAlign: 'center',
              padding: '12px'
            }}
          >
            GPA calculator
          </Button>
        </Box>
    </Box>
   );
}
 
export default Home;