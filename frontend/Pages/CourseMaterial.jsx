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
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert
} from "@mui/material";
import { useDispatch } from "react-redux";
import { setCurrentPage } from "../redux/sidebarSlice.js";
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import theme from "../Themes/theme.jsx";

const SEMESTERS = [
  { value: "all", label: "All Semesters" },
  { value: "1", label: "Semester 1" },
  { value: "2", label: "Semester 2" },
  { value: "3", label: "Semester 3" },
  { value: "4", label: "Semester 4" },
  { value: "5", label: "Semester 5" },
  { value: "6", label: "Semester 6" },
  { value: "7", label: "Semester 7" },
  { value: "8", label: "Semester 8" }
];

const CourseMaterial = () => {
  const dispatch = useDispatch();
  const [pesuData, setPesuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(""); // Input field value
  const [search, setSearch] = useState(""); // Actual search query sent to API
  const [semester, setSemester] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // Selection state
  const [selectedSubjects, setSelectedSubjects] = useState({});
  const [selectedUnits, setSelectedUnits] = useState({});
  const [selectedClasses, setSelectedClasses] = useState({});
  
  // Expanded state
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0, currentItem: '', status: '' });
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadResult, setDownloadResult] = useState(null);

  // Fetch data
  const fetchData = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ 
      action: "getPESUDataPagination",
      type: "nested",
      search: search,
      semester: semester,
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
  }, [page, rowsPerPage, search, semester]);

  const HandleBack = () => {
    dispatch(setCurrentPage("home"));
  };

  const HandleSearchChange = (event) => {
    setSearchInput(event.target.value);
  };

  const HandleSearchSubmit = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const HandleSearchKeyPress = (event) => {
    if (event.key === 'Enter') {
      HandleSearchSubmit();
    }
  };

  const HandleSemesterChange = (event) => {
    setSemester(event.target.value);
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

  // Get count of selected classes
  const getSelectedCount = useMemo(() => {
    return Object.values(selectedClasses).filter(Boolean).length;
  }, [selectedClasses]);

  // Collect selected items with full context for download
  const getSelectedItemsForDownload = () => {
    const selectedItems = [];
    
    if (!pesuData?.items) return selectedItems;
    
    for (const subject of pesuData.items) {
      (subject.units || []).forEach((unit, unitIndex) => {
        for (const cls of (unit.classes || [])) {
          if (selectedClasses[cls.id]) {
            selectedItems.push({
              subjectId: subject.id,
              subjectCode: subject.subjectCode,
              subjectName: subject.subjectName,
              unitId: unit.id,
              unitName: unit.name,
              unitNumber: unitIndex + 1, // 1-based unit number for folder structure
              classId: cls.id,
              className: cls.className
            });
          }
        }
      });
    }
    
    return selectedItems;
  };

  // Handle bulk download
  const HandleBulkDownload = async () => {
    const selectedItems = getSelectedItemsForDownload();
    
    if (selectedItems.length === 0) {
      return;
    }

    setDownloading(true);
    setDownloadDialogOpen(true);
    setDownloadProgress({ current: 0, total: selectedItems.length, currentItem: 'Starting...', status: 'downloading' });
    setDownloadResult(null);

    // Set up progress listener
    chrome.runtime.onConnect.addListener(function progressListener(port) {
      if (port.name === "downloadProgress") {
        port.onMessage.addListener((progress) => {
          setDownloadProgress(progress);
        });
        port.onDisconnect.addListener(() => {
          chrome.runtime.onConnect.removeListener(progressListener);
        });
      }
    });

    chrome.runtime.sendMessage({
      action: "downloadSelectedMaterials",
      selectedItems
    }, (response) => {
      setDownloading(false);
      
      if (chrome.runtime.lastError) {
        setDownloadResult({ 
          success: false, 
          error: chrome.runtime.lastError.message 
        });
        return;
      }

      if (response && response.success) {
        // Convert base64 back to blob and download
        try {
          const binaryString = atob(response.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/zip' });
          
          // Trigger download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `PESU_Materials_${new Date().toISOString().split('T')[0]}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          setDownloadResult({
            success: true,
            stats: response.stats
          });
        } catch (err) {
          setDownloadResult({
            success: false,
            error: 'Failed to process download: ' + err.message
          });
        }
      } else if (response && response.error) {
        setDownloadResult({
          success: false,
          error: response.error
        });
      }
    });
  };

  const HandleCloseDownloadDialog = () => {
    if (!downloading) {
      setDownloadDialogOpen(false);
      setDownloadResult(null);
    }
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

      {/* Search and Semester Filter */}
      <Box sx={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search subjects, units, or classes..."
          value={searchInput}
          onChange={HandleSearchChange}
          onKeyPress={HandleSearchKeyPress}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={HandleSearchSubmit}
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
          sx={{
            flex: 1,
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
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={semester}
            onChange={HandleSemesterChange}
            sx={{
              borderRadius: '8px',
              fontSize: '13px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.colors.secondaryLight
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.colors.secondary
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.colors.primary
              }
            }}
          >
            {SEMESTERS.map((sem) => (
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
          onClick={HandleBulkDownload}
          disabled={getSelectedCount === 0 || downloading}
          sx={{
            backgroundColor: theme.colors.primary,
            borderRadius: '8px',
            fontSize: '12px',
            textTransform: 'none',
            padding: '6px 12px',
            minWidth: 'auto',
            '&:hover': {
              backgroundColor: theme.colors.primaryHover
            },
            '&.Mui-disabled': {
              backgroundColor: theme.colors.secondaryLight,
              color: '#999'
            }
          }}
        >
        {getSelectedCount}
        </Button>
      </Box>

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

      {/* Download Progress Dialog */}
      <Dialog 
        open={downloadDialogOpen} 
        onClose={HandleCloseDownloadDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            padding: '8px'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: theme.colors.secondary, 
          fontWeight: 'bold',
          fontSize: '16px',
          paddingBottom: '8px'
        }}>
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
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.colors.secondaryLight,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.colors.primary,
                    borderRadius: 4
                  }
                }}
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
                <Alert severity="success" sx={{ 
                  fontSize: '13px',
                  backgroundColor: theme.colors.secondary,
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  '& .MuiAlert-icon': {
                    color: '#ffffff'
                  }
                }}>
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
                <Alert severity="error" sx={{ 
                  fontSize: '13px',
                  backgroundColor: theme.colors.secondary,
                  color: '#ffffff',
                  '& .MuiAlert-icon': {
                    color: '#ffffff'
                  }
                }}>
                  Download failed: {downloadResult.error}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: '8px 24px 16px' }}>
          <Button 
            variant="contained"
            onClick={HandleCloseDownloadDialog}
            disabled={downloading}
            sx={{
              backgroundColor: theme.colors.primary,
              fontSize: '12px',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: theme.colors.primaryHover
              }
            }}
          >
            {downloading ? 'Please wait...' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CourseMaterial;
