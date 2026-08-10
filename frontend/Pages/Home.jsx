import React, { useState, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import WarningIcon from '@mui/icons-material/Warning';
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
            disabled
            sx={{
              backgroundColor: theme.colors.secondary,
              width: '100%',
              textAlign: 'center',
              padding: '12px',
              '&.Mui-disabled': {
                backgroundColor: theme.colors.secondary,
                color: '#fff',
                opacity: 0.45
              }
            }}
          >
            Download PYQs
          </Button>)}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px 4px 0',
              color: '#d32f2f'
            }}
          >
            <WarningIcon sx={{ fontSize: '1.2rem', flexShrink: 0 }} />
            <Typography variant="body2" sx={{ textAlign: 'center' }}>
              Breaking Changes!!! if you had previously installed an older version(&lt;2.0.0), please reinstall the extension.{' '}
              <a
                href="https://chromewebstore.google.com/detail/pesu-max/cmdaofpmedkoahlmcihcdaehgenfdnen"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: theme.colors.secondaryHover, fontWeight: 600 }}
              >
                Install link
              </a>
            </Typography>
          </Box>
        </Box>
    </Box>
   );
}
 
export default Home;
