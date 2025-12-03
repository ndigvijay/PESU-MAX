import React, { useEffect, useState, useMemo } from "react";
import { 
  Box, 
  Typography, 
  IconButton, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Checkbox, 
  Collapse, 
  TextField, 
  InputAdornment,
  TablePagination,
  CircularProgress
} from "@mui/material";
import { useDispatch } from "react-redux";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import SearchIcon from '@mui/icons-material/Search';
import theme from "../Themes/theme.jsx";

const CourseMaterial = () => {
  const dispatch = useDispatch();
  const [pesuData, setPesuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // Selection state
  const [selectedSubjects, setSelectedSubjects] = useState({});
  const [selectedUnits, setSelectedUnits] = useState({});
  const [selectedClasses, setSelectedClasses] = useState({});
  
  // Expanded state
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});

  // Fetch data
  const fetchData = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ 
      action: "getPESUDataPagination",
      type: "nested",
      search: search,
      page: page,
      limit: rowsPerPage
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error:", chrome.runtime.lastError.message);
        setLoading(false);
        return;
      }
      if (response && response.data) {
        setPesuData(response.data);
      } else if (response && response.error) {
        console.error("Error fetching data:", response.error);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage, search]);

  const HandleBack = () => {
    dispatch(setCurrentPage("home"));
  };

  const HandleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(0);
  };

  const HandleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const HandleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Toggle expand handlers
  const HandleToggleSubject = (subjectId) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  const HandleToggleUnit = (unitId) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  // Selection handlers
  const HandleSelectSubject = (subject) => {
    const isSelected = !!selectedSubjects[subject.id];
    const newSelected = !isSelected;
    
    setSelectedSubjects(prev => ({
      ...prev,
      [subject.id]: newSelected
    }));
    
    // Select/deselect all units and classes under this subject
    const newUnits = { ...selectedUnits };
    const newClasses = { ...selectedClasses };
    
    subject.units?.forEach(unit => {
      newUnits[unit.id] = newSelected;
      unit.classes?.forEach(cls => {
        newClasses[cls.id] = newSelected;
      });
    });
    
    setSelectedUnits(newUnits);
    setSelectedClasses(newClasses);
  };

  const HandleSelectUnit = (subject, unit) => {
    const isSelected = !!selectedUnits[unit.id];
    const newSelected = !isSelected;
    
    setSelectedUnits(prev => ({
      ...prev,
      [unit.id]: newSelected
    }));
    
    // Select/deselect all classes under this unit
    const newClasses = { ...selectedClasses };
    unit.classes?.forEach(cls => {
      newClasses[cls.id] = newSelected;
    });
    setSelectedClasses(newClasses);
    
    // Update subject selection based on units
    const allUnitsSelected = subject.units?.every(u => 
      u.id === unit.id ? newSelected : selectedUnits[u.id]
    );
    const someUnitsSelected = subject.units?.some(u => 
      u.id === unit.id ? newSelected : selectedUnits[u.id]
    );
    
    if (allUnitsSelected) {
      setSelectedSubjects(prev => ({ ...prev, [subject.id]: true }));
    } else if (!someUnitsSelected) {
      setSelectedSubjects(prev => ({ ...prev, [subject.id]: false }));
    }
  };

  const HandleSelectClass = (subject, unit, cls) => {
    const isSelected = !!selectedClasses[cls.id];
    const newSelected = !isSelected;
    
    setSelectedClasses(prev => ({
      ...prev,
      [cls.id]: newSelected
    }));
    
    // Update unit selection based on classes
    const allClassesSelected = unit.classes?.every(c => 
      c.id === cls.id ? newSelected : selectedClasses[c.id]
    );
    const someClassesSelected = unit.classes?.some(c => 
      c.id === cls.id ? newSelected : selectedClasses[c.id]
    );
    
    if (allClassesSelected) {
      setSelectedUnits(prev => ({ ...prev, [unit.id]: true }));
    } else if (!someClassesSelected) {
      setSelectedUnits(prev => ({ ...prev, [unit.id]: false }));
    }
    
    // Update subject selection
    const updatedSelectedUnits = {
      ...selectedUnits,
      [unit.id]: allClassesSelected
    };
    const allUnitsSelected = subject.units?.every(u => updatedSelectedUnits[u.id]);
    const someUnitsSelected = subject.units?.some(u => updatedSelectedUnits[u.id]);
    
    if (allUnitsSelected) {
      setSelectedSubjects(prev => ({ ...prev, [subject.id]: true }));
    } else if (!someUnitsSelected) {
      setSelectedSubjects(prev => ({ ...prev, [subject.id]: false }));
    }
  };

  // Check indeterminate state
  const isSubjectIndeterminate = (subject) => {
    const unitSelections = subject.units?.map(u => selectedUnits[u.id]) || [];
    const hasSelected = unitSelections.some(Boolean);
    const hasUnselected = unitSelections.some(v => !v);
    return hasSelected && hasUnselected;
  };

  const isUnitIndeterminate = (unit) => {
    const classSelections = unit.classes?.map(c => selectedClasses[c.id]) || [];
    const hasSelected = classSelections.some(Boolean);
    const hasUnselected = classSelections.some(v => !v);
    return hasSelected && hasUnselected;
  };

  // Table cell styles
  const headerCellSx = {
    backgroundColor: theme.table.headerBg,
    color: theme.table.headerText,
    fontWeight: 'bold',
    fontSize: '13px',
    padding: '10px 12px',
    borderBottom: 'none'
  };

  const getRowSx = (index, level = 0) => ({
    backgroundColor: index % 2 === 0 ? theme.table.rowEvenBg : theme.table.rowOddBg,
    '&:hover': {
      backgroundColor: theme.colors.primaryLight
    },
    transition: 'background-color 0.2s ease'
  });

  const cellSx = {
    padding: '8px 12px',
    fontSize: '12px',
    borderBottom: `1px solid ${theme.colors.secondaryLight}`
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
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <IconButton 
          onClick={HandleBack}
          sx={{ 
            color: theme.colors.secondary,
            padding: '4px'
          }}
        >
          <KeyboardBackspaceIcon />
        </IconButton>
        <Typography 
          variant="h6" 
          sx={{ 
            color: theme.colors.secondary,
            fontWeight: 'bold'
          }}
        >
          Course Materials
        </Typography>
      </Box>

      {/* Search */}
      <TextField
        size="small"
        placeholder="Search subjects, units, or classes..."
        value={search}
        onChange={HandleSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: theme.colors.secondary, fontSize: '20px' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            fontSize: '13px',
            '& fieldset': {
              borderColor: theme.colors.secondaryLight
            },
            '&:hover fieldset': {
              borderColor: theme.colors.secondary
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.colors.primary
            }
          }
        }}
      />

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
          <CircularProgress sx={{ color: theme.colors.primary }} />
        </Box>
      ) : (
        <TableContainer sx={{ 
          flex: 1, 
          overflow: 'auto',
          borderRadius: '8px',
          border: `1px solid ${theme.colors.secondaryLight}`
        }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headerCellSx, width: '40px' }} />
                <TableCell sx={{ ...headerCellSx, width: '40px' }} />
                <TableCell sx={headerCellSx}>Code</TableCell>
                <TableCell sx={headerCellSx}>Name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pesuData?.items?.map((subject, subjectIndex) => (
                <React.Fragment key={subject.id}>
                  {/* Subject Row */}
                  <TableRow sx={getRowSx(subjectIndex)}>
                    <TableCell sx={{ ...cellSx, width: '40px', paddingLeft: '8px' }}>
                      <IconButton 
                        size="small" 
                        onClick={() => HandleToggleSubject(subject.id)}
                        sx={{ padding: '2px' }}
                      >
                        {expandedSubjects[subject.id] ? 
                          <KeyboardArrowDownIcon sx={{ fontSize: '18px', color: theme.colors.secondary }} /> : 
                          <KeyboardArrowRightIcon sx={{ fontSize: '18px', color: theme.colors.secondary }} />
                        }
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ ...cellSx, width: '40px' }}>
                      <Checkbox
                        size="small"
                        checked={!!selectedSubjects[subject.id]}
                        indeterminate={isSubjectIndeterminate(subject)}
                        onChange={() => HandleSelectSubject(subject)}
                        sx={{
                          padding: '2px',
                          color: theme.colors.secondary,
                          '&.Mui-checked': { color: theme.colors.primary },
                          '&.MuiCheckbox-indeterminate': { color: theme.colors.primary }
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ ...cellSx, fontWeight: 'bold', color: theme.colors.secondary }}>
                      {subject.subjectCode}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, fontWeight: '500' }}>
                      {subject.subjectName}
                    </TableCell>
                  </TableRow>

                  {/* Units */}
                  <TableRow>
                    <TableCell sx={{ padding: 0, border: 'none' }} colSpan={4}>
                      <Collapse in={expandedSubjects[subject.id]} timeout="auto" unmountOnExit>
                        <Table size="small">
                          <TableBody>
                            {subject.units?.map((unit, unitIndex) => (
                              <React.Fragment key={unit.id}>
                                {/* Unit Row */}
                                <TableRow sx={{
                                  ...getRowSx(unitIndex),
                                  backgroundColor: unitIndex % 2 === 0 ? 
                                    'rgba(245, 130, 31, 0.05)' : 'rgba(35, 58, 118, 0.04)'
                                }}>
                                  <TableCell sx={{ ...cellSx, width: '40px', paddingLeft: '24px' }}>
                                    <IconButton 
                                      size="small" 
                                      onClick={() => HandleToggleUnit(unit.id)}
                                      sx={{ padding: '2px' }}
                                    >
                                      {expandedUnits[unit.id] ? 
                                        <KeyboardArrowDownIcon sx={{ fontSize: '16px', color: theme.colors.primary }} /> : 
                                        <KeyboardArrowRightIcon sx={{ fontSize: '16px', color: theme.colors.primary }} />
                                      }
                                    </IconButton>
                                  </TableCell>
                                  <TableCell sx={{ ...cellSx, width: '40px' }}>
                                    <Checkbox
                                      size="small"
                                      checked={!!selectedUnits[unit.id]}
                                      indeterminate={isUnitIndeterminate(unit)}
                                      onChange={() => HandleSelectUnit(subject, unit)}
                                      sx={{
                                        padding: '2px',
                                        color: theme.colors.primary,
                                        '&.Mui-checked': { color: theme.colors.primary },
                                        '&.MuiCheckbox-indeterminate': { color: theme.colors.primary }
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ ...cellSx, color: theme.colors.primary, fontWeight: '500' }} colSpan={2}>
                                    Unit {unitIndex + 1}
                                  </TableCell>
                                </TableRow>

                                {/* Classes */}
                                <TableRow>
                                  <TableCell sx={{ padding: 0, border: 'none' }} colSpan={4}>
                                    <Collapse in={expandedUnits[unit.id]} timeout="auto" unmountOnExit>
                                      <Table size="small">
                                        <TableBody>
                                          {unit.classes?.map((cls, classIndex) => (
                                            <TableRow 
                                              key={cls.id}
                                              sx={{
                                                backgroundColor: classIndex % 2 === 0 ? 
                                                  'rgba(245, 130, 31, 0.03)' : 'rgba(35, 58, 118, 0.02)',
                                                '&:hover': {
                                                  backgroundColor: 'rgba(245, 130, 31, 0.1)'
                                                }
                                              }}
                                            >
                                              <TableCell sx={{ ...cellSx, width: '40px', paddingLeft: '48px' }} />
                                              <TableCell sx={{ ...cellSx, width: '40px' }}>
                                                <Checkbox
                                                  size="small"
                                                  checked={!!selectedClasses[cls.id]}
                                                  onChange={() => HandleSelectClass(subject, unit, cls)}
                                                  sx={{
                                                    padding: '2px',
                                                    color: theme.colors.secondary,
                                                    '&.Mui-checked': { color: theme.colors.primary }
                                                  }}
                                                />
                                              </TableCell>
                                              <TableCell sx={{ ...cellSx }} />
                                              <TableCell sx={{ ...cellSx, fontSize: '11px', color: '#555' }}>
                                                {cls.className}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </Collapse>
                                  </TableCell>
                                </TableRow>
                              </React.Fragment>
                            ))}
                          </TableBody>
                        </Table>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}

              {(!pesuData?.items || pesuData.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                    {search ? 'No results found' : 'No course materials available'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      {pesuData?.pagination && (
        <TablePagination
          component="div"
          count={pesuData.pagination.total}
          page={page}
          onPageChange={HandleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={HandleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
          sx={{
            borderTop: `1px solid ${theme.colors.secondaryLight}`,
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '12px',
              color: theme.colors.secondary
            },
            '& .MuiTablePagination-select': {
              fontSize: '12px'
            }
          }}
        />
      )}
    </Box>
  );
}

export default CourseMaterial;
