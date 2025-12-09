import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Button
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import { setSearch } from "../../redux/courseMaterialSlice.js";
import { selectSelectedCount, setSemester } from "../../redux/courseMaterialSlice.js";
import theme from "../../Themes/theme.jsx";
import { searchInputSx, selectSx, downloadButtonSx } from "../../styles/styles.js";

const CourseMaterialFilters = ({ onDownloadClick }) => {
  const dispatch = useDispatch();
  const [searchInput, setSearchInput] = useState("");
  const { semester, semesters, downloading } = useSelector((state) => state.courseMaterial);
  const selectedCount = useSelector(selectSelectedCount);

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
  };

  const handleSearchSubmit = () => {
    dispatch(setSearch(searchInput));
  };

  const handleSearchKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleSemesterChange = (event) => {
    dispatch(setSemester(event.target.value));
  };

  const handleDownloadClick = () => {
    if (selectedCount > 0) {
      onDownloadClick();
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <TextField
        size="small"
        placeholder="Search subjects, units, or classes..."
        value={searchInput}
        onChange={handleSearchChange}
        onKeyPress={handleSearchKeyPress}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={handleSearchSubmit}
                sx={{
                  padding: '4px',
                  color: theme.colors.primary,
                  '&:hover': {
                    backgroundColor: 'rgba(245, 130, 31, 0.1)'
                  }
                }}
              >
                <SearchIcon sx={{ fontSize: '18px' }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={searchInputSx}
      />
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <Select
          value={semester}
          onChange={handleSemesterChange}
          sx={selectSx}
        >
          {semesters.map((sem) => (
            <MenuItem key={sem.value} value={sem.value} sx={{ fontSize: '13px' }}>
              {sem.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        variant="contained"
        size="small"
        startIcon={<DownloadIcon />}
        onClick={handleDownloadClick}
        disabled={selectedCount === 0 || downloading}
        sx={downloadButtonSx}
      >
        {selectedCount}
      </Button>
    </Box>
  );
};

export default CourseMaterialFilters;
