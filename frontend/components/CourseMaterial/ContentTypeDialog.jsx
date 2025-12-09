import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Checkbox,
  Button
} from "@mui/material";
import DownloadIcon from '@mui/icons-material/Download';
import theme from "../../Themes/theme.jsx";
import { CONTENT_TYPE_OPTIONS, DEFAULT_CONTENT_TYPE_SELECTION } from "../../constants/constants.js";
import { dialogPaperSx, dialogTitleSx, primaryButtonSx, secondaryButtonSx } from "../../styles/styles.js";

const ContentTypeDialog = ({ open, onClose, onConfirm }) => {
  const [selectedContentTypes, setSelectedContentTypes] = useState(DEFAULT_CONTENT_TYPE_SELECTION);

  const handleContentTypeChange = (key) => {
    setSelectedContentTypes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const hasSelectedContentTypes = Object.values(selectedContentTypes).some(Boolean);

  const handleConfirm = () => {
    const contentTypes = CONTENT_TYPE_OPTIONS
      .filter(opt => selectedContentTypes[opt.key])
      .map(opt => opt.id);
    onConfirm(contentTypes);
  };

  const handleClose = () => {
    // Reset to defaults when closing
    setSelectedContentTypes(DEFAULT_CONTENT_TYPE_SELECTION);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={dialogTitleSx}>
        Select Content Types
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: '#666', fontSize: '12px', mb: 2 }}>
          Choose which materials to download :
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {CONTENT_TYPE_OPTIONS.map((option) => (
            <Box 
              key={option.key}
              onClick={() => handleContentTypeChange(option.key)}
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: selectedContentTypes[option.key] ? theme.colors.primaryLight : 'transparent',
                border: `1px solid ${selectedContentTypes[option.key] ? theme.colors.primary : theme.colors.secondaryLight}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary }
              }}
            >
              <Checkbox
                size="small"
                checked={selectedContentTypes[option.key]}
                onChange={() => handleContentTypeChange(option.key)}
                sx={{
                  padding: '2px',
                  marginRight: '8px',
                  color: theme.colors.primary,
                  '&.Mui-checked': { color: theme.colors.primary }
                }}
              />
              <Typography sx={{ 
                fontSize: '13px', 
                color: selectedContentTypes[option.key] ? theme.colors.secondary : '#666',
                fontWeight: selectedContentTypes[option.key] ? '500' : 'normal'
              }}>
                {option.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: '8px 24px 16px', gap: 1 }}>
        <Button 
          variant="contained"
          onClick={handleClose}
          sx={secondaryButtonSx}
        >
          Cancel
        </Button>
        <Button 
          variant="contained"
          onClick={handleConfirm}
          disabled={!hasSelectedContentTypes}
          startIcon={<DownloadIcon />}
          sx={primaryButtonSx}
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContentTypeDialog;
