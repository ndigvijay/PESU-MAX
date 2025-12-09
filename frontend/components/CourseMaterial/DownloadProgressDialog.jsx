import React from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Button,
  LinearProgress,
  Alert
} from "@mui/material";
import theme from "../../Themes/theme.jsx";
import { clearDownloadResult } from "../../redux/courseMaterialSlice.js";
import { 
  dialogPaperSx, 
  dialogTitleSx, 
  primaryButtonSx, 
  progressBarSx,
  successAlertSx,
  errorAlertSx 
} from "../../styles/styles.js";

const DownloadProgressDialog = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { downloading, downloadProgress, downloadResult } = useSelector(
    (state) => state.courseMaterial
  );

  const handleClose = () => {
    if (!downloading) {
      dispatch(clearDownloadResult());
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={dialogTitleSx}>
        {downloading ? 'Downloading Materials...' : 'Download Complete'}
      </DialogTitle>
      <DialogContent>
        {downloading && (
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#666', fontSize: '12px' }}>
                {downloadProgress.status === 'zipping' 
                  ? 'Creating ZIP file...' 
                  : `Downloading ${downloadProgress.current} of ${downloadProgress.total}`}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.colors.primary, fontSize: '12px', fontWeight: '500' }}>
                {downloadProgress.total > 0 
                  ? `${Math.round((downloadProgress.current / downloadProgress.total) * 100)}%` 
                  : '0%'}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={downloadProgress.total > 0 
                ? (downloadProgress.current / downloadProgress.total) * 100 
                : 0}
              sx={progressBarSx}
            />
            <Typography 
              variant="body2" 
              sx={{ 
                mt: 1, 
                color: '#888', 
                fontSize: '11px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {downloadProgress.currentItem}
            </Typography>
          </Box>
        )}

        {!downloading && downloadResult && (
          <Box>
            {downloadResult.success ? (
              <Alert severity="success" sx={successAlertSx}>
                Successfully downloaded {downloadResult.stats?.successful || 0} files!
                {downloadResult.stats?.failed > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '11px', color: '#ffffff' }}>
                      {downloadResult.stats.failed} files could not be downloaded:
                    </Typography>
                    {downloadResult.stats.failedItems?.length > 0 && (
                      <Box 
                        component="ul" 
                        sx={{ 
                          mt: 0.5, 
                          pl: 2, 
                          mb: 0, 
                          color: '#ffffff',
                          fontSize: '11px'
                        }}
                      >
                        {downloadResult.stats.failedItems.map((item, index) => (
                          <Box 
                            component="li" 
                            key={item.classId || `${item.subjectId || 'failed'}-${index}`}
                            sx={{ mb: 0.5 }}
                          >
                            <Typography variant="body2" sx={{ fontSize: '11px', color: '#ffffff' }}>
                              {(item.subjectName && item.subjectName !== item.className) 
                                ? `${item.subjectName} – ${item.className}` 
                                : (item.className || 'Unknown class')}
                            </Typography>
                            {item.error && (
                              <Typography 
                                variant="body2" 
                                sx={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}
                              >
                                Reason: {item.error}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Alert>
            ) : (
              <Alert severity="error" sx={errorAlertSx}>
                Download failed: {downloadResult.error}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ padding: '8px 24px 16px' }}>
        <Button 
          variant="contained"
          onClick={handleClose}
          disabled={downloading}
          sx={primaryButtonSx}
        >
          {downloading ? 'Please wait...' : 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DownloadProgressDialog;
