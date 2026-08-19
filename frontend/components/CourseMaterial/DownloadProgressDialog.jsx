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

// Rendering hundreds of MUI list items makes the dialog crawl and stalls the
// close transition; show a bounded slice and summarise the rest.
const MAX_LISTED_FAILURES = 50;

const DownloadProgressDialog = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { downloading, downloadProgress, downloadResult } = useSelector(
    (state) => state.courseMaterial
  );
  const mergedEntries = Object.entries(downloadResult?.stats?.mergedSubjectsByType || {})
    .filter(([, count]) => count > 0);

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
                {downloadProgress.status === 'merging'
                  ? `Merging ${downloadProgress.mergeContentType ? downloadProgress.mergeContentType.toLowerCase() : 'files'} ${downloadProgress.current} of ${downloadProgress.total}`
                  : downloadProgress.status === 'zipping'
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
            {downloadProgress.status === 'merging' && (
              <Typography
                variant="body2"
                sx={{
                  mt: 0.5,
                  color: '#888',
                  fontSize: '11px'
                }}
              >
                Converting PPTX/DOCS to PDF might take some time, please wait.
              </Typography>
            )}
          </Box>
        )}

        {!downloading && downloadResult && (
          <Box>
            {downloadResult.success ? (
              <Alert severity="success" sx={successAlertSx}>
                Successfully downloaded {downloadResult.stats?.successful || 0} files!
                {mergedEntries.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '11px', color: '#ffffff' }}>
                      Created {downloadResult.stats?.totalMergedFiles || 0} subject-wise merged PDF{downloadResult.stats?.totalMergedFiles > 1 ? 's' : ''}.
                    </Typography>
                    <Box component="ul" sx={{ mt: 0.5, pl: 2, mb: 0, color: '#ffffff', fontSize: '11px' }}>
                      {mergedEntries.map(([contentType, count]) => (
                        <Box component="li" key={contentType} sx={{ mb: 0.25 }}>
                          <Typography variant="body2" sx={{ fontSize: '11px', color: '#ffffff' }}>
                            {contentType}: {count} merged file{count > 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
                {downloadResult.stats?.skipped > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                      Skipped {downloadResult.stats.skipped} class/content-type combination{downloadResult.stats.skipped > 1 ? 's' : ''} with no material uploaded.
                    </Typography>
                  </Box>
                )}
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
                        {downloadResult.stats.failedItems.slice(0, MAX_LISTED_FAILURES).map((item, index) => (
                          <Box 
                            component="li" 
                            key={`${item.classId || item.subjectId || 'failed'}-${item.contentType || 'na'}-${index}`}
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
                    {downloadResult.stats.failedItems?.length > MAX_LISTED_FAILURES && (
                      <Typography variant="body2" sx={{ mt: 0.5, fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                        …and {downloadResult.stats.failedItems.length - MAX_LISTED_FAILURES} more.
                      </Typography>
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
