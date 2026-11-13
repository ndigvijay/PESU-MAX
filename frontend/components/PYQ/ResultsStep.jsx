import React, { useMemo } from "react";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import {
  downloadPyq,
  downloadSelectedPyqsZip,
  openPyq,
  searchPyqs,
  selectCanFilterYearLocally,
  selectPyqPage,
  selectVisiblePyqs,
  setSearchQuery,
  setSelectedPyqs,
  togglePyqSelection
} from "../../redux/pyqSlice.js";
import theme from "../../Themes/theme.jsx";
import { subjectNameForCourseQuery } from "../../../src/helpers/libraryPaperLinks.js";
import PyqBulkActionBar from "./PyqBulkActionBar.jsx";
import PyqCourseLabel from "./PyqCourseLabel.jsx";
import PyqLoading from "./PyqLoading.jsx";
import PyqPagination from "./PyqPagination.jsx";
import PyqResultCard from "./PyqResultCard.jsx";
import PyqSearchBar from "./PyqSearchBar.jsx";
import { emptyStateSx, errorAlertSx, rowCardSx, stepHintSx } from "./pyqStyles.js";

const TIP_TEXT = "Tip: choose a year to narrow the results.";
const tipSx = {
  fontSize: "11px",
  color: theme.colors.primary,
  textAlign: "center",
  paddingTop: "4px",
  paddingBottom: "12px"
};

const alternateSearchButtonSx = {
  flexShrink: 0,
  minWidth: 0,
  padding: "0 4px",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "none",
  color: theme.colors.secondary
};

const ResultsStep = () => {
  const dispatch = useDispatch();
  const {
    selectedCourse,
    selectedPyqs,
    searchQuery,
    loadedResults,
    totalResults,
    resultsComplete,
    lastQuery,
    lastSearchYear,
    selectedYear,
    searchLoading,
    searchError,
    loadMoreError,
    downloadingItemId,
    openingItemId,
    bulkDownloading,
    downloadError,
    bulkDownloadError
  } = useSelector((state) => state.pyq);
  const visibleResults = useSelector(selectVisiblePyqs);
  const { results: pageResults } = useSelector(selectPyqPage);
  const canFilterYearLocally = useSelector(selectCanFilterYearLocally);

  const selectableResults = useMemo(
    () => visibleResults.filter((item) => item.canDownload),
    [visibleResults]
  );

  const selectedCount = useMemo(
    () => selectableResults.filter((item) => selectedPyqs[item.id]).length,
    [selectableResults, selectedPyqs]
  );

  const alternateSearch = useMemo(() => {
    if (!selectedCourse || !lastQuery) {
      return null;
    }

    const { searchCode = "", subjectName = "" } = selectedCourse;
    const searchedQuery = lastQuery.toLowerCase();
    if (searchCode && subjectName && searchedQuery === searchCode.toLowerCase()) {
      return { label: "Search by name", query: subjectName };
    }
    if (searchCode && subjectName && searchedQuery === subjectName.toLowerCase()) {
      return { label: "Search by code", query: searchCode };
    }
    return null;
  }, [selectedCourse, lastQuery]);

  const allSelectableSelected =
    selectableResults.length > 0 && selectedCount === selectableResults.length;

  const busy = searchLoading || bulkDownloading;
  const shownYear = canFilterYearLocally ? selectedYear : lastSearchYear;
  const yearSuffix = shownYear ? ` in ${shownYear}` : "";
  const resultSummary = resultsComplete
    ? `${visibleResults.length} result${visibleResults.length === 1 ? "" : "s"} for "${lastQuery}"${yearSuffix}`
    : `${loadedResults.length} of ${totalResults} results for "${lastQuery}"${yearSuffix}`;

  const handleDownload = (item) => {
    dispatch(downloadPyq(item));
  };

  const handleOpen = (item) => {
    dispatch(openPyq(item));
  };

  const handleToggleSelectAll = () => {
    if (allSelectableSelected) {
      dispatch(setSelectedPyqs({}));
      return;
    }

    const nextSelection = {};
    selectableResults.forEach((item) => {
      nextSelection[item.id] = true;
    });
    dispatch(setSelectedPyqs(nextSelection));
  };

  const handleBulkDownload = () => {
    const selectedItems = selectableResults.filter((item) => selectedPyqs[item.id]);

    if (selectedItems.length === 0) {
      return;
    }

    dispatch(
      downloadSelectedPyqsZip({
        items: selectedItems,
        query: lastQuery || searchQuery || selectedCourse?.subjectName || "PYQs"
      })
    );
  };

  const handleAlternateSearch = () => {
    dispatch(setSearchQuery(alternateSearch.query));
    dispatch(searchPyqs({
      query: alternateSearch.query,
      year: selectedYear,
      subjectName: subjectNameForCourseQuery(alternateSearch.query, selectedCourse)
    }));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Typography sx={stepHintSx}>Search and download PYQs</Typography>

      {selectedCourse && (
        <Paper elevation={0} sx={rowCardSx}>
          <PyqCourseLabel course={selectedCourse} />
        </Paper>
      )}

      <PyqSearchBar />

      {searchError && <Alert severity="error" sx={errorAlertSx}>{searchError}</Alert>}
      {downloadError && <Alert severity="error" sx={errorAlertSx}>{downloadError}</Alert>}
      {bulkDownloadError && <Alert severity="error" sx={errorAlertSx}>{bulkDownloadError}</Alert>}

      {busy && <PyqLoading compact />}

      {!busy && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "8px"
          }}
        >
          <Typography sx={{ fontSize: "12px", color: theme.colors.textMuted }}>
            {lastQuery ? resultSummary : "Search a course code or custom title to view PYQs"}
          </Typography>
          {alternateSearch && (
            <Button size="small" onClick={handleAlternateSearch} sx={alternateSearchButtonSx}>
              {alternateSearch.label}
            </Button>
          )}
        </Box>
      )}

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: "8px" }}>
        {!busy && pageResults.length > 0 && (
          <PyqBulkActionBar
            selectedCount={selectedCount}
            allSelected={allSelectableSelected}
            bulkDownloading={bulkDownloading}
            disabled={busy}
            onToggleSelectAll={handleToggleSelectAll}
            onDownload={handleBulkDownload}
          />
        )}

        {pageResults.map((item) => (
          <PyqResultCard
            key={item.id}
            item={item}
            selected={Boolean(selectedPyqs[item.id])}
            downloading={downloadingItemId === item.id}
            opening={openingItemId === item.id}
            busy={busy}
            onToggleSelection={(itemId) => dispatch(togglePyqSelection(itemId))}
            onOpen={handleOpen}
            onDownload={handleDownload}
          />
        ))}

        {!searchLoading && lastQuery && pageResults.length === 0 && !searchError && (
          <>
            <Typography sx={emptyStateSx}>No PYQs found for this search.</Typography>
            <Typography sx={tipSx}>{TIP_TEXT}</Typography>
          </>
        )}

        {loadMoreError && (
          <Alert severity="error" sx={{ ...errorAlertSx, marginTop: "10px", marginBottom: 0 }}>
            {loadMoreError}
          </Alert>
        )}
      </Box>

      {pageResults.length > 0 && <PyqPagination />}

      <Typography sx={tipSx}>{TIP_TEXT}</Typography>
    </Box>
  );
};

export default ResultsStep;
