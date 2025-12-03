import React from "react";
import { Box, Typography, Button } from "@mui/material";
import theme from "../Themes/theme";
const Home = () => {
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
            Bunk-o-Meter
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