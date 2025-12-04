import React, { useState, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useDispatch } from "react-redux";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import theme from "../Themes/theme.jsx";

const Home = () => {
  const dispatch = useDispatch();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    chrome.storage.local.get("userProfile", (result) => {
      setIsLoggedIn(!!result.userProfile);
    });
    
    const listener = (changes) => {
      if (changes.userProfile) {
        setIsLoggedIn(!!changes.userProfile.newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return ( 
    <Box>
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px'
        }}>
          {!isLoggedIn && (
            <>
            <Button 
              variant="contained" 
              sx={{
                backgroundColor: theme.colors.secondary,
                width: '100%',
                textAlign: 'center',
                padding: '12px'
              }}
            >
              Login to pesu Academy
            </Button>
            <Typography variant="body1" sx={{ textAlign: 'center', padding: '12px' }}>
              if you have just logged in, please wait a minute for the data to be fetched.
            </Typography>
            </>
          )}
          {isLoggedIn && (<Button 
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
            Download All PESU Slides
          </Button>)}
          {isLoggedIn && (<Button 
            variant="contained" 
            sx={{
              backgroundColor: theme.colors.secondary,
              width: '100%',
              textAlign: 'center',
              padding: '12px'
            }}
          >
            Attendence Calculator
          </Button>)}
          {isLoggedIn && (<Button 
            variant="contained" 
            sx={{
              backgroundColor: theme.colors.secondary,
              width: '100%',
              textAlign: 'center',
              padding: '12px'
            }}
          >
            GPA calculator
          </Button>)}
        </Box>
    </Box>
   );
}
 
export default Home;