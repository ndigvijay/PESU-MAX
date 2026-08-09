import React from "react";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Box, Typography, IconButton, Button, Snackbar, Alert, Tooltip } from "@mui/material";
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { setCurrentPage } from "../../redux/sidebarSlice.js";
import theme from "../../Themes/theme.jsx";
import { refetchAllPesuData } from "../../../src/services/courseMaterialService.js";

const REFETCH_COOLDOWN_MS = 1 * 60 * 60 * 1000;
const LAST_REFETCH_KEY = "manualPesuDataRefetchAt";

const CourseMaterialHeader = () => {
  const dispatch = useDispatch();
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  const handleBack = () => {
    dispatch(setCurrentPage("home"));
  };

  const formatRemainingTime = (remaining) => {
    const totalMinutes = Math.ceil(remaining / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    }

    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  };

  useEffect(() => {
    let cooldownTimer;

    const updateCooldown = (lastRefetchAt) => {
      const remaining = (lastRefetchAt || 0) + REFETCH_COOLDOWN_MS - Date.now();
      setIsCoolingDown(remaining > 0);

      if (remaining > 0) {
        cooldownTimer = setTimeout(() => updateCooldown(lastRefetchAt), remaining);
      }
    };

    chrome.storage.local.get(LAST_REFETCH_KEY, (result) => {
      updateCooldown(result[LAST_REFETCH_KEY]);
    });

    return () => clearTimeout(cooldownTimer);
  }, []);

  const handleRefetch = async () => {
    if (isRefetching) {
      return;
    }

    if (isCoolingDown) {
      chrome.storage.local.get(LAST_REFETCH_KEY, (result) => {
        const lastRefetchAt = result[LAST_REFETCH_KEY] || 0;
        const remaining = lastRefetchAt + REFETCH_COOLDOWN_MS - Date.now();

        if (remaining > 0) {
          setSnackbarMessage(`Refetch available in ${formatRemainingTime(remaining)}`);
          setSnackbarSeverity('info');
          setSnackbarOpen(true);
        }
      });
      return;
    }

    setIsCoolingDown(true);
    setIsRefetching(true);
    await new Promise((resolve) => {
      chrome.storage.local.set({ [LAST_REFETCH_KEY]: Date.now() }, resolve);
    });

    try {
      await refetchAllPesuData();
      setSnackbarMessage('Successfully refetched');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error refetching PESU data:", error);
      setSnackbarMessage('Failed to refetch data');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsRefetching(false);
    }
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
      <Button
        onClick={handleRefetch}
        disabled={isRefetching}
        startIcon={<RefreshIcon sx={{ fontSize: '18px' }} />}
        sx={{
          backgroundColor: theme.colors.primary,
          color: '#ffffff',
          textTransform: 'none',
          fontSize: '12px',
          fontWeight: 500,
          padding: '6px 12px',
          minWidth: 'auto',
          borderRadius: '8px',
          whiteSpace: 'nowrap',
          '&:hover': {
            backgroundColor: theme.colors.primaryHover
          },
          '&.Mui-disabled': {
            backgroundColor: theme.colors.primary,
            color: '#ffffff',
            opacity: 0.55
          }
        }}
      >
        {isRefetching ? 'Refetching...' : 'Refetch Data'}
      </Button>
      <Tooltip title="refresh data if some topics/courses/semesters are missing in the table">
        <IconButton
          aria-label="Refetch data information"
          size="small"
          sx={{
            color: theme.colors.secondary,
            padding: '4px'
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CourseMaterialHeader;
