import React, { useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import { setMode, loadGpaData, resetGpaState } from "../redux/gpaSlice.js";
import SGPACalculator from "../components/GPACalculator/SGPACalculator.jsx";
import CGPACalculator from "../components/GPACalculator/CGPACalculator.jsx";
import theme from "../Themes/theme.jsx";

const GPACalculator = () => {
  const dispatch = useDispatch();
  const { mode, loading, error } = useSelector((state) => state.gpa);

  useEffect(() => {
    dispatch(loadGpaData());
  }, [dispatch]);

  const handleBack = () => {
    dispatch(resetGpaState());
    dispatch(setCurrentPage("home"));
  };

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      dispatch(setMode(newMode));
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 0",
        }}
      >
        <IconButton onClick={handleBack} sx={{ color: theme.colors.secondary }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", color: theme.colors.secondary }}
        >
          GPA Calculator
        </Typography>
      </Box>

      {/* Mode Toggle */}
      <Box sx={{ marginBottom: "16px" }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          fullWidth
          sx={{
            '& .MuiToggleButtonGroup-grouped': {
              border: `1px solid ${theme.colors.secondary}`,
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '14px',
              fontWeight: 600,
              padding: '10px',
              '&.Mui-selected': {
                backgroundColor: theme.colors.primary,
                color: '#fff',
                borderColor: theme.colors.primary,
                '&:hover': {
                  backgroundColor: theme.colors.primaryHover,
                },
              },
              '&:not(.Mui-selected)': {
                color: theme.colors.secondary,
                backgroundColor: '#fff',
                '&:hover': {
                  backgroundColor: theme.colors.secondaryLight,
                },
              },
            },
          }}
        >
          <ToggleButton value="sgpa">SGPA</ToggleButton>
          <ToggleButton value="cgpa">CGPA</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Loading State */}
      {loading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
          }}
        >
          <CircularProgress sx={{ color: theme.colors.primary }} />
        </Box>
      )}

      {/* Error State */}
      {error && !loading && (
        <Box sx={{ textAlign: "center", padding: "20px" }}>
          <Typography color="error" sx={{ fontSize: '13px' }}>
            {error}
          </Typography>
        </Box>
      )}

      {/* Content Area */}
      {!loading && !error && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {mode === "sgpa" && <SGPACalculator />}
          {mode === "cgpa" && <CGPACalculator />}
        </Box>
      )}
    </Box>
  );
};

export default GPACalculator;
