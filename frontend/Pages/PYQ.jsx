import React, { useEffect, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import {
  clearDownloadFeedback,
  downloadPyq,
  downloadSelectedPyqsZip,
  initLibraryAuth,
  loadPyqCatalog,
  resetPyqState,
  searchPyqs,
  setSelectedPyqs,
  setCourseSearch,
  setCurrentStep,
  setSearchQuery,
  setSelectedCourse,
  setSelectedSemester,
  setSemesterFilter,
  togglePyqSelection
} from "../redux/pyqSlice.js";
import theme from "../Themes/theme.jsx";
import { selectSx } from "../styles/styles.js";

const rowCardSx = {
  padding: "12px",
  borderRadius: "12px",
  backgroundColor: theme.colors.secondaryLight,
  border: "1px solid rgba(35, 58, 118, 0.12)",
  marginBottom: "10px"
};

const loadingText = "fetching resources from library";
const authLoadingText = "fetching resources from library\nplease wait a few seconds";

const PYQ = () => {
  const dispatch = useDispatch();
  const {
    semesters,
    courses,
    currentStep,
    semesterFilter,
    selectedSemester,
    selectedCourse,
    selectedPyqs,
    courseSearch,
    searchQuery,
    searchResults,
    totalResults,
    lastQuery,
    catalogLoading,
    authLoading,
    authError,
    error,
    searchLoading,
    searchError,
    downloadingItemId,
    bulkDownloading,
    downloadSuccessItemId,
    downloadError,
    bulkDownloadResult,
    bulkDownloadError
  } = useSelector((state) => state.pyq);

  useEffect(() => {
    dispatch(loadPyqCatalog());
    dispatch(initLibraryAuth());
  }, [dispatch]);

  const filteredSemesters = useMemo(() => {
    if (semesterFilter === "all") {
      return semesters;
    }

    return semesters.filter((semester) => semester.value === semesterFilter);
  }, [semesters, semesterFilter]);

  const semesterCourses = useMemo(() => {
    if (!selectedSemester) {
      return [];
    }

    const selected = courses.filter(
      (course) => String(course.semester) === String(selectedSemester)
    );

    if (!courseSearch.trim()) {
      return selected;
    }

    const query = courseSearch.toLowerCase().trim();
    return selected.filter(
      (course) =>
        course.subjectCode.toLowerCase().includes(query) ||
        course.subjectName.toLowerCase().includes(query)
    );
  }, [courses, selectedSemester, courseSearch]);

  const selectableResults = useMemo(
    () => searchResults.filter((item) => item.downloadPath),
    [searchResults]
  );

  const selectedCount = useMemo(
    () => selectableResults.filter((item) => selectedPyqs[item.id]).length,
    [selectableResults, selectedPyqs]
  );

  const allSelectableSelected =
    selectableResults.length > 0 && selectedCount === selectableResults.length;

  const handleBack = () => {
    if (currentStep === "results") {
      dispatch(clearDownloadFeedback());
      dispatch(setCurrentStep("courses"));
      return;
    }

    if (currentStep === "courses") {
      dispatch(setSelectedSemester(null));
      dispatch(setCurrentStep("semesters"));
      return;
    }

    dispatch(resetPyqState());
    dispatch(setCurrentPage("home"));
  };

  const handleSelectSemester = (semesterValue) => {
    dispatch(setSelectedSemester(semesterValue));
    dispatch(setCurrentStep("courses"));
  };

  const handleSelectCourse = (course) => {
    dispatch(setSelectedCourse(course));
    dispatch(setCurrentStep("results"));
    dispatch(searchPyqs(course.subjectCode));
  };

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) {
      return;
    }

    dispatch(searchPyqs(query));
  };

  const handleSearchKey = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const handleDownload = (item) => {
    dispatch(
      downloadPyq({
        itemId: item.id,
        downloadPath: item.downloadPath,
        title: item.title
      })
    );
  };

  const handleToggleSelection = (itemId) => {
    dispatch(togglePyqSelection(itemId));
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
    const selectedItems = selectableResults
      .filter((item) => selectedPyqs[item.id])
      .map((item) => ({
        id: item.id,
        title: item.title,
        downloadPath: item.downloadPath
      }));

    if (selectedItems.length === 0) {
      return;
    }

    dispatch(
      downloadSelectedPyqsZip({
        items: selectedItems,
        query: lastQuery || searchQuery || selectedCourse?.subjectCode || "PYQs"
      })
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 0"
        }}
      >
        <IconButton onClick={handleBack} sx={{ color: theme.colors.secondary }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: "bold", color: theme.colors.secondary }}>
          Download PYQs
        </Typography>
      </Box>

      {(catalogLoading || authLoading) && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            flex: 1
          }}
        >
          <CircularProgress sx={{ color: theme.colors.primary }} />
          <Typography
            sx={{
              fontSize: "12px",
              color: theme.colors.secondary,
              letterSpacing: "0.2px",
              textAlign: "center",
              whiteSpace: "pre-line"
            }}
          >
            {authLoading ? authLoadingText : loadingText}
          </Typography>
        </Box>
      )}

      {!catalogLoading && !authLoading && (
        <>
          {authError && (
            <Alert severity="warning" sx={{ marginBottom: "10px", fontSize: "12px" }}>
              Library login issue: {authError}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ marginBottom: "10px", fontSize: "12px" }}>
              {error}
            </Alert>
          )}

          {currentStep === "semesters" && (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Typography sx={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>
                Select semester
              </Typography>

              <FormControl fullWidth size="small" sx={{ marginBottom: "12px" }}>
                <Select
                  value={semesterFilter}
                  onChange={(event) => dispatch(setSemesterFilter(event.target.value))}
                  sx={selectSx}
                >
                  <MenuItem value="all">All semesters</MenuItem>
                  {semesters.map((semester) => (
                    <MenuItem key={semester.value} value={semester.value}>
                      {semester.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ flex: 1, overflowY: "auto", paddingBottom: "8px" }}>
                {filteredSemesters.map((semester) => (
                  <Paper
                    key={semester.value}
                    elevation={0}
                    onClick={() => handleSelectSemester(semester.value)}
                    sx={{
                      ...rowCardSx,
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: theme.colors.primaryLight
                      }
                    }}
                  >
                    <Typography sx={{ fontSize: "14px", fontWeight: "700", color: theme.colors.secondary }}>
                      {semester.label}
                    </Typography>
                    <Typography sx={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                      Browse courses and download question papers
                    </Typography>
                  </Paper>
                ))}

                {filteredSemesters.length === 0 && (
                  <Typography sx={{ fontSize: "13px", color: "#777", textAlign: "center", marginTop: "20px" }}>
                    No semesters found.
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {currentStep === "courses" && (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Typography sx={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>
                Select course from Semester {selectedSemester}
              </Typography>

              <TextField
                fullWidth
                size="small"
                placeholder="Search course by code or name"
                value={courseSearch}
                onChange={(event) => dispatch(setCourseSearch(event.target.value))}
                sx={{ marginBottom: "12px" }}
              />

              <Box sx={{ flex: 1, overflowY: "auto", paddingBottom: "8px" }}>
                {semesterCourses.map((course) => (
                  <Paper
                    key={course.id}
                    elevation={0}
                    onClick={() => handleSelectCourse(course)}
                    sx={{
                      ...rowCardSx,
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: theme.colors.primaryLight
                      }
                    }}
                  >
                    <Typography sx={{ fontSize: "11px", color: theme.colors.primary, fontWeight: "700" }}>
                      {course.subjectCode}
                    </Typography>
                    <Typography sx={{ fontSize: "13px", color: theme.colors.secondary, fontWeight: "600" }}>
                      {course.subjectName}
                    </Typography>
                  </Paper>
                ))}

                {semesterCourses.length === 0 && (
                  <Typography sx={{ fontSize: "13px", color: "#777", textAlign: "center", marginTop: "20px" }}>
                    No courses found for this semester.
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {currentStep === "results" && (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Typography sx={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>
                Search and download PYQs
              </Typography>

              {selectedCourse && (
                <Paper elevation={0} sx={{ ...rowCardSx, marginBottom: "10px" }}>
                  <Typography sx={{ fontSize: "11px", color: theme.colors.primary, fontWeight: "700" }}>
                    {selectedCourse.subjectCode}
                  </Typography>
                  <Typography sx={{ fontSize: "13px", color: theme.colors.secondary, fontWeight: "600" }}>
                    {selectedCourse.subjectName}
                  </Typography>
                </Paper>
              )}

              <Box sx={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Custom title search (e.g. UE21MA141A)"
                  value={searchQuery}
                  onChange={(event) => dispatch(setSearchQuery(event.target.value))}
                  onKeyDown={handleSearchKey}
                />
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={searchLoading || !searchQuery.trim()}
                  sx={{
                    minWidth: "46px",
                    backgroundColor: theme.colors.primary,
                    "&:hover": { backgroundColor: theme.colors.primaryHover }
                  }}
                >
                  <SearchIcon fontSize="small" />
                </Button>
              </Box>

              {searchError && (
                <Alert severity="error" sx={{ marginBottom: "10px", fontSize: "12px" }}>
                  {searchError}
                </Alert>
              )}

              {downloadError && (
                <Alert severity="error" sx={{ marginBottom: "10px", fontSize: "12px" }}>
                  {downloadError}
                </Alert>
              )}

              {bulkDownloadError && (
                <Alert severity="error" sx={{ marginBottom: "10px", fontSize: "12px" }}>
                  {bulkDownloadError}
                </Alert>
              )}

              {downloadSuccessItemId && (
                <Alert severity="success" sx={{ marginBottom: "10px", fontSize: "12px" }}>
                  Download started successfully.
                </Alert>
              )}

              {bulkDownloadResult && (
                <Alert severity="success" sx={{ marginBottom: "10px", fontSize: "12px" }}>
                  ZIP download started for {bulkDownloadResult.stats?.successful || 0} PYQs.
                  {(bulkDownloadResult.stats?.failed || 0) > 0
                    ? ` ${bulkDownloadResult.stats.failed} item(s) could not be added.`
                    : ""}
                </Alert>
              )}

              {(searchLoading || bulkDownloading) && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 0"
                  }}
                >
                  <CircularProgress size={24} sx={{ color: theme.colors.primary }} />
                  <Typography sx={{ fontSize: "12px", color: theme.colors.secondary }}>
                    {loadingText}
                  </Typography>
                </Box>
              )}

              {!searchLoading && !bulkDownloading && (
                <Typography sx={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                  {lastQuery
                    ? `${totalResults} result${totalResults === 1 ? "" : "s"} for "${lastQuery}"`
                    : "Search a course code or custom title to view PYQs"}
                </Typography>
              )}

              <Box sx={{ flex: 1, overflowY: "auto", paddingBottom: "8px" }}>
                {!searchLoading && !bulkDownloading && searchResults.length > 0 && (
                  <Paper
                    elevation={0}
                    sx={{
                      ...rowCardSx,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px"
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Checkbox
                        size="small"
                        checked={allSelectableSelected}
                        indeterminate={selectedCount > 0 && !allSelectableSelected}
                        onChange={handleToggleSelectAll}
                        sx={{
                          color: theme.colors.primary,
                          "&.Mui-checked": { color: theme.colors.primary }
                        }}
                      />
                      <Typography sx={{ fontSize: "12px", color: theme.colors.secondary, fontWeight: 600 }}>
                        {selectedCount} selected
                      </Typography>
                    </Box>

                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<DownloadIcon fontSize="small" />}
                      onClick={handleBulkDownload}
                      disabled={selectedCount === 0 || bulkDownloading || searchLoading}
                      sx={{
                        backgroundColor: theme.colors.primary,
                        textTransform: "none",
                        minWidth: "122px",
                        "&:hover": { backgroundColor: theme.colors.primaryHover }
                      }}
                    >
                      {bulkDownloading ? "Creating ZIP" : "Download ZIP"}
                    </Button>
                  </Paper>
                )}

                {searchResults.map((item) => (
                  <Paper key={item.id} elevation={0} sx={rowCardSx}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: theme.colors.secondary,
                            fontWeight: "700",
                            lineHeight: 1.35,
                            marginBottom: "6px"
                          }}
                        >
                          {item.title}
                        </Typography>
                        <Typography sx={{ fontSize: "11px", color: "#666" }}>
                          {item.callNo ? `Call No: ${item.callNo}` : "Call No: N/A"}
                        </Typography>
                        <Typography sx={{ fontSize: "11px", color: "#666" }}>
                          {item.yearEdition ? `Year/Ed: ${item.yearEdition}` : "Year/Ed: N/A"}
                        </Typography>
                        <Typography sx={{ fontSize: "11px", color: "#666" }}>
                          {item.recordId ? `ID: ${item.recordId}` : "ID: N/A"}
                        </Typography>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Checkbox
                          size="small"
                          checked={!!selectedPyqs[item.id]}
                          disabled={!item.downloadPath || searchLoading || bulkDownloading}
                          onChange={() => handleToggleSelection(item.id)}
                          sx={{
                            padding: "2px",
                            color: theme.colors.primary,
                            "&.Mui-checked": { color: theme.colors.primary }
                          }}
                        />

                        <Button
                          component="a"
                          href={item.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="contained"
                          size="small"
                          aria-label="View PYQ"
                          disabled={!item.downloadUrl}
                          disableRipple
                          disableElevation
                          sx={{
                            backgroundColor: theme.colors.secondary,
                            color: "#fff",
                            minWidth: "40px",
                            width: "40px",
                            boxShadow: "none",
                            transition: "none",
                            "& .MuiSvgIcon-root": {
                              color: "#fff"
                            },
                            "&:hover": {
                              backgroundColor: theme.colors.secondary,
                              boxShadow: "none",
                              transform: "none",
                              color: "#fff"
                            },
                            "&:focus, &:focus-visible": {
                              backgroundColor: theme.colors.secondary,
                              boxShadow: "none",
                              color: "#fff"
                            }
                          }}
                        >
                          <VisibilityIcon fontSize="small" sx={{ color: "#fff" }} />
                        </Button>

                        <Button
                          variant="contained"
                          size="small"
                          aria-label={downloadingItemId === item.id ? "Downloading PYQ" : "Download PYQ"}
                          onClick={() => handleDownload(item)}
                          disabled={
                            !item.downloadPath ||
                            downloadingItemId === item.id ||
                            searchLoading ||
                            bulkDownloading
                          }
                          sx={{
                            backgroundColor: theme.colors.secondary,
                            minWidth: "40px",
                            width: "40px",
                            "&:hover": {
                              backgroundColor: theme.colors.secondaryHover
                            }
                          }}
                        >
                          {downloadingItemId === item.id ? (
                            <CircularProgress size={16} sx={{ color: "#fff" }} />
                          ) : (
                            <DownloadIcon fontSize="small" />
                          )}
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                ))}

                {!searchLoading && lastQuery && searchResults.length === 0 && !searchError && (
                  <Typography sx={{ fontSize: "13px", color: "#777", textAlign: "center", marginTop: "20px" }}>
                    No PYQs found for this search.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default PYQ;
