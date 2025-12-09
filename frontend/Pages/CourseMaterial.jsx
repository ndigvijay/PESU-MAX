import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Box } from "@mui/material";

// Components
import CourseMaterialHeader from "../components/CourseMaterial/CourseMaterialHeader.jsx";
import CourseMaterialFilters from "../components/CourseMaterial/CourseMaterialFilters.jsx";
import CourseMaterialTable from "../components/CourseMaterial/CourseMaterialTable.jsx";
import ContentTypeDialog from "../components/CourseMaterial/ContentTypeDialog.jsx";
import DownloadProgressDialog from "../components/CourseMaterial/DownloadProgressDialog.jsx";

// Redux actions
import { 
  fetchPesuData, 
  fetchSemesters,
  setBackgroundFetchStatus,
  downloadSelectedMaterials
} from "../redux/courseMaterialSlice.js";

// Services
import { 
  getBackgroundFetchStatus, 
  subscribeToStorageChanges 
} from "../../src/services/courseMaterialService.js";

const CourseMaterial = () => {
  const dispatch = useDispatch();
  
  // Local UI state
  const [contentTypeDialogOpen, setContentTypeDialogOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  
  // Redux state
  const { search, semester, page, rowsPerPage, downloading } = useSelector(
    (state) => state.courseMaterial
  );

  // Fetch data when filters change
  useEffect(() => {
    dispatch(fetchPesuData({ search, semester, page, limit: rowsPerPage }));
  }, [dispatch, page, rowsPerPage, search, semester]);

  // Fetch semesters on mount
  useEffect(() => {
    dispatch(fetchSemesters());
  }, [dispatch]);

  // Subscribe to background fetch status and storage changes
  useEffect(() => {
    // Get initial status
    getBackgroundFetchStatus().then((status) => {
      dispatch(setBackgroundFetchStatus(status));
    });

    // Subscribe to changes
    const unsubscribe = subscribeToStorageChanges(
      (status) => dispatch(setBackgroundFetchStatus(status)),
      () => dispatch(fetchPesuData({ search, semester, page, limit: rowsPerPage }))
    );

    return unsubscribe;
  }, [dispatch, search, semester, page, rowsPerPage]);

  // Handle download button click
  const handleDownloadClick = () => {
    setContentTypeDialogOpen(true);
  };

  // Handle content type dialog confirm
  const handleContentTypeConfirm = (contentTypes) => {
    setContentTypeDialogOpen(false);
    if (contentTypes.length > 0) {
      setDownloadDialogOpen(true);
      dispatch(downloadSelectedMaterials({ contentTypes }));
    }
  };

  // Handle download dialog close
  const handleDownloadDialogClose = () => {
    if (!downloading) {
      setDownloadDialogOpen(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '12px',
      height: '100%',
      overflow: 'hidden'
    }}>
      <CourseMaterialHeader />
      
      <CourseMaterialFilters onDownloadClick={handleDownloadClick} />
      
      <CourseMaterialTable />

      <ContentTypeDialog
        open={contentTypeDialogOpen}
        onClose={() => setContentTypeDialogOpen(false)}
        onConfirm={handleContentTypeConfirm}
      />

      <DownloadProgressDialog
        open={downloadDialogOpen}
        onClose={handleDownloadDialogClose}
      />
    </Box>
  );
};

export default CourseMaterial;
