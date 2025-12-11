import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Avatar,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Paper,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import {
  searchProfessors,
  fetchProfessorDetails,
  setSearchQuery,
  clearProfessorData,
  resetFacultyState,
} from "../redux/facultySlice.js";
import theme from "../Themes/theme.jsx";

const KnowYourFaculty = () => {
  const dispatch = useDispatch();
  const { searchQuery, searchResults, professorData, loading, detailsLoading, error } = useSelector(
    (state) => state.faculty
  );
  const [activeTab, setActiveTab] = useState(0);

  const handleBack = () => {
    // If viewing professor details, go back to search results
    if (professorData) {
      dispatch(clearProfessorData());
      return;
    }
    // Otherwise, go back to home
    dispatch(resetFacultyState());
    dispatch(setCurrentPage("home"));
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      dispatch(searchProfessors(searchQuery.trim()));
      setActiveTab(0);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectProfessor = (professor) => {
    dispatch(fetchProfessorDetails(professor.id));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const tabKeys = professorData?.tabs ? Object.keys(professorData.tabs) : [];

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
          {professorData ? "Faculty Profile" : "Know your Faculty"}
        </Typography>
      </Box>

      {/* Search Bar - only show when not viewing professor details */}
      {!professorData && !detailsLoading && (
        <Box sx={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search faculty name..."
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            onKeyPress={handleKeyPress}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&.Mui-focused fieldset": {
                  borderColor: theme.colors.primary,
                },
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={loading}
            sx={{
              backgroundColor: theme.colors.primary,
              "&:hover": { backgroundColor: theme.colors.primaryHover },
              minWidth: "50px",
            }}
          >
            <SearchIcon />
          </Button>
        </Box>
      )}

      {/* Loading State */}
      {(loading || detailsLoading) && (
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
      {error && !loading && !detailsLoading && (
        <Box sx={{ textAlign: "center", padding: "20px" }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {/* Search Results List */}
      {searchResults.length > 0 && !professorData && !loading && !detailsLoading && (
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <Typography variant="body2" sx={{ color: "#666", marginBottom: "8px" }}>
            {searchResults.length} result{searchResults.length > 1 ? "s" : ""} found
          </Typography>
          <List sx={{ padding: 0 }}>
            {searchResults.map((professor) => (
              <Paper
                key={professor.id}
                elevation={1}
                sx={{
                  marginBottom: "8px",
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: theme.colors.primaryLight,
                  },
                }}
                onClick={() => handleSelectProfessor(professor)}
              >
                <ListItem>
                  <ListItemAvatar>
                    <Avatar src={professor.imageUrl} alt={professor.name}>
                      {professor.name?.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={professor.name}
                    secondary={professor.designation}
                    primaryTypographyProps={{
                      fontWeight: "bold",
                      color: theme.colors.secondary,
                    }}
                  />
                </ListItem>
              </Paper>
            ))}
          </List>
        </Box>
      )}

      {/* Professor Details */}
      {professorData && !detailsLoading && (
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          {/* Profile Card */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "16px",
              backgroundColor: theme.colors.secondaryLight,
              borderRadius: "12px",
              marginBottom: "16px",
            }}
          >
            <Avatar
              src={professorData.basicInfo?.["Image URL"]}
              alt={professorData.basicInfo?.Name}
              sx={{ width: 80, height: 80 }}
            />
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: theme.colors.secondary }}
              >
                {professorData.basicInfo?.Name}
              </Typography>
              <Typography variant="body2" sx={{ color: "#666" }}>
                {professorData.basicInfo?.Designation}
              </Typography>
              <Typography variant="body2" sx={{ color: "#888", marginTop: "4px" }}>
                {professorData.sidebar?.Department}
              </Typography>
              <Typography variant="body2" sx={{ color: "#888" }}>
                {professorData.sidebar?.Campus}
              </Typography>
            </Box>
          </Box>

          {/* Tabs */}
          {tabKeys.length > 0 && (
            <>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                TabIndicatorProps={{
                  style: { backgroundColor: theme.colors.primary },
                }}
                sx={{
                  marginBottom: "8px",
                  marginLeft: "-16px",
                  "& .MuiTabs-flexContainer": {
                    paddingLeft: "0px",
                  },
                  "& .MuiTab-root": {
                    textTransform: "capitalize",
                    minWidth: "auto",
                    padding: "8px 16px",
                  },
                  "& .MuiTab-root:first-of-type": {
                    marginLeft: "0px",
                  },
                  "& .Mui-selected": {
                    color: `${theme.colors.primary} !important`,
                    fontWeight: "bold",
                  },
                }}
              >
                {tabKeys.map((tabName) => (
                  <Tab key={tabName} label={tabName} />
                ))}
              </Tabs>

              {/* Tab Content */}
              <Box
                sx={{
                  maxHeight: "300px",
                  overflowY: "auto",
                  padding: "8px",
                  backgroundColor: theme.colors.primaryLight,
                  borderRadius: "8px",
                }}
              >
                {tabKeys[activeTab] &&
                  Object.entries(professorData.tabs[tabKeys[activeTab]]).map(
                    ([sectionTitle, items]) => (
                      <Box key={sectionTitle} sx={{ marginBottom: "16px" }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: "bold",
                            color: theme.colors.secondary,
                            marginBottom: "8px",
                          }}
                        >
                          {sectionTitle}
                        </Typography>
                        <List dense sx={{ padding: 0 }}>
                          {items.map((item, index) => (
                            <ListItem
                              key={index}
                              sx={{ padding: "4px 0", alignItems: "flex-start" }}
                            >
                              <ListItemText
                                primary={item}
                                primaryTypographyProps={{
                                  variant: "body2",
                                  sx: { color: "#333" },
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )
                  )}
              </Box>
            </>
          )}
        </Box>
      )}

      {/* Empty State */}
      {!professorData && searchResults.length === 0 && !loading && !error && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
            color: "#888",
          }}
        >
          <Typography>Search for a faculty member to see their details</Typography>
        </Box>
      )}
    </Box>
  );
};

export default KnowYourFaculty;
