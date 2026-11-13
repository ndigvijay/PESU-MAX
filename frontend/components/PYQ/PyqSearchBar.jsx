import React from "react";
import { Box, Button, FormControl, MenuItem, Select, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useDispatch, useSelector } from "react-redux";
import {
  searchPyqs,
  selectCanFilterYearLocally,
  setSearchQuery,
  setSelectedYear
} from "../../redux/pyqSlice.js";
import theme from "../../Themes/theme.jsx";
import { selectSx } from "../../styles/styles.js";
import { subjectNameForCourseQuery } from "../../../src/helpers/libraryPaperLinks.js";
import { PYQ_YEAR_OPTIONS } from "./pyqStyles.js";

const CONTROL_HEIGHT = "40px";

const searchFieldSx = {
  "& .MuiOutlinedInput-root": { ...selectSx, height: CONTROL_HEIGHT }
};

const pendingFieldSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: theme.colors.secondaryLight,
    "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.colors.secondary, borderWidth: "2px" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: theme.colors.secondary },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: theme.colors.secondary }
  }
};

const searchButtonSx = {
  minWidth: "46px",
  height: CONTROL_HEIGHT,
  borderRadius: "8px",
  boxShadow: "none",
  backgroundColor: theme.colors.primary,
  color: theme.colors.onPrimary,
  "&:hover": { backgroundColor: theme.colors.primaryHover, boxShadow: "none" }
};

const PyqSearchBar = () => {
  const dispatch = useDispatch();
  const { searchQuery, selectedYear, selectedCourse, lastQuery, lastSearchYear, searchLoading } = useSelector(
    (state) => state.pyq
  );
  const canFilterYearLocally = useSelector(selectCanFilterYearLocally);

  const queryChanged = searchQuery.trim() !== lastQuery;
  const yearChanged = selectedYear !== lastSearchYear && !canFilterYearLocally;
  const hasPendingSearch = Boolean(
    lastQuery
    && searchQuery.trim()
    && (queryChanged || yearChanged)
    && !searchLoading
  );

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query || (lastQuery && !queryChanged && !yearChanged)) {
      return;
    }

    dispatch(searchPyqs({
      query,
      year: selectedYear,
      subjectName: subjectNameForCourseQuery(query, selectedCourse)
    }));
  };

  const handleSearchKey = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <>
      <Box sx={{ display: "flex", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search subject or title"
          value={searchQuery}
          onChange={(event) => dispatch(setSearchQuery(event.target.value))}
          onKeyDown={handleSearchKey}
          sx={[searchFieldSx, hasPendingSearch && pendingFieldSx]}
        />
        <FormControl
          size="small"
          sx={[{ minWidth: "108px", flexShrink: 0 }, hasPendingSearch && pendingFieldSx]}
        >
          <Select
            value={selectedYear}
            displayEmpty
            inputProps={{ "aria-label": "PYQ year" }}
            onChange={(event) => dispatch(setSelectedYear(event.target.value))}
            sx={{ ...selectSx, height: CONTROL_HEIGHT }}
          >
            {PYQ_YEAR_OPTIONS.map((option) => (
              <MenuItem key={option.label} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          aria-label="Search PYQs"
          onClick={handleSearch}
          disabled={searchLoading || !searchQuery.trim()}
          sx={searchButtonSx}
        >
          <SearchIcon fontSize="small" />
        </Button>
      </Box>

      {hasPendingSearch && (
        <Typography
          sx={{
            fontSize: "11px",
            color: theme.colors.primary,
            marginTop: "-4px",
            marginBottom: "8px",
            fontWeight: 600
          }}
        >
          Search settings changed. Click Search to update the results.
        </Typography>
      )}
    </>
  );
};

export default PyqSearchBar;
