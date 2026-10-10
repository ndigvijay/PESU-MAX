import React, { useState, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import StarIcon from '@mui/icons-material/Star';
import GitHubIcon from '@mui/icons-material/GitHub';
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
            <Typography variant="body1" sx={{ textAlign: 'center', padding: '12px' }}>
              For a better experience, please login first and load the extension.
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
            Download All PESU Materials
          </Button>)}
          {isLoggedIn && (<Button
            variant="contained"
            sx={{
              backgroundColor: theme.colors.secondary,
              width: '100%',
              textAlign: 'center',
              padding: '12px'
            }}
            onClick={() => {
              dispatch(setCurrentPage("attendance"));
            }}
          >
            Attendance Calculator
          </Button>)}
          {isLoggedIn && (<Button
            variant="contained"
            sx={{
              backgroundColor: theme.colors.secondary,
              width: '100%',
              textAlign: 'center',
              padding: '12px'
            }}
            onClick={() => {
              dispatch(setCurrentPage("gpaCalculator"));
            }}
          >
            GPA Calculator
          </Button>)}
          {isLoggedIn && (<Button
            variant="contained"
            sx={{
              backgroundColor: theme.colors.secondary,
              width: '100%',
              textAlign: 'center',
              padding: '12px'
            }}
            onClick={() => {
              dispatch(setCurrentPage("knowYourFaculty"));
            }}
          >
            Know your Faculty
          </Button>)}
          {isLoggedIn && (<Button
            variant="contained"
            sx={{
              backgroundColor: theme.colors.secondary,
              width: '100%',
              textAlign: 'center',
              padding: '12px'
            }}
            onClick={() => {
              dispatch(setCurrentPage("pyq"));
            }}
          >
            Download PYQs
          </Button>)}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              border: `1px solid ${theme.colors.primary}`,
              borderRadius: '8px'
            }}
          >
            <Typography variant="body2" sx={{ textAlign: 'center' }}>
              Enjoying PESU MAX? Show some love by starring the repo on GitHub!
            </Typography>
            <Button
              variant="outlined"
              startIcon={<StarIcon />}
              endIcon={<GitHubIcon />}
              component="a"
              href="https://github.com/ndigvijay/PESU-MAX"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: theme.colors.secondary,
                borderColor: theme.colors.secondary,
                textTransform: 'none',
                fontWeight: 600,
                "&:hover": {
                  borderColor: theme.colors.secondaryHover,
                  backgroundColor: 'rgba(0,0,0,0.04)'
                }
              }}
            >
              Star on GitHub
            </Button>
          </Box>
        </Box>
    </Box>
   );
}
 
export default Home;
