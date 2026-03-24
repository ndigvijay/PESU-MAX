import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Box } from "@mui/material";

// Components
import CourseMaterialHeader from "../components/CourseMaterial/CourseMaterialHeader.jsx";
import CourseMaterialFilters from "../components/CourseMaterial/CourseMaterialFilters.jsx";
import CourseMaterialTable from "../components/CourseMaterial/CourseMaterialTable.jsx";
import ContentTypeDialog from "../components/CourseMaterial/ContentTypeDialog.jsx";
import MergeSlidesDialog from "../components/CourseMaterial/MergeSlidesDialog.jsx";
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
import { CONTENT_TYPE_IDS } from "../constants/constants.js";

const CourseMaterial = () => {
  const dispatch = useDispatch();
  
  // Local UI state
  const [contentTypeDialogOpen, setContentTypeDialogOpen] = useState(false);
  const [mergeSlidesDialogOpen, setMergeSlidesDialogOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [pendingContentTypes, setPendingContentTypes] = useState([]);
  
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

  const startDownload = (contentTypes, mergeSlides = false) => {
    if (contentTypes.length > 0) {
      setDownloadDialogOpen(true);
      dispatch(downloadSelectedMaterials({ contentTypes, mergeSlides }));
    }
  };

  // Handle content type dialog confirm
  const handleContentTypeConfirm = (contentTypes) => {
    setContentTypeDialogOpen(false);

    if (contentTypes.length === 0) {
      return;
    }

    if (contentTypes.includes(CONTENT_TYPE_IDS.slides)) {
      setPendingContentTypes(contentTypes);
      setMergeSlidesDialogOpen(true);
      return;
    }

    startDownload(contentTypes, false);
  };

  const handleMergeSlidesConfirm = (mergeSlides) => {
    const contentTypes = pendingContentTypes;
    setMergeSlidesDialogOpen(false);
    setPendingContentTypes([]);
    startDownload(contentTypes, mergeSlides);
  };

  const handleMergeSlidesClose = () => {
    setMergeSlidesDialogOpen(false);
    setPendingContentTypes([]);
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

      <MergeSlidesDialog
        open={mergeSlidesDialogOpen}
        onClose={handleMergeSlidesClose}
        onConfirm={handleMergeSlidesConfirm}
      />

      <DownloadProgressDialog
        open={downloadDialogOpen}
        onClose={handleDownloadDialogClose}
      />
    </Box>
  );
};

export default CourseMaterial;
