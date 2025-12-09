import React from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress
} from "@mui/material";
import SubjectRow from "./SubjectRow.jsx";
import { setPage, setRowsPerPage } from "../../redux/courseMaterialSlice.js";
import theme from "../../Themes/theme.jsx";
import { headerCellSx, tableContainerSx, paginationSx } from "../../styles/styles.js";

const CourseMaterialTable = () => {
  const dispatch = useDispatch();
  const { 
    pesuData, 
    loading, 
    page, 
    rowsPerPage, 
    search,
    isFetchingInBackground 
  } = useSelector((state) => state.courseMaterial);

  const handleChangePage = (event, newPage) => {
    dispatch(setPage(newPage));
  };

  const handleChangeRowsPerPage = (event) => {
    dispatch(setRowsPerPage(parseInt(event.target.value, 10)));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
        <CircularProgress sx={{ color: theme.colors.primary }} />
      </Box>
    );
  }

  return (
    <>
      <TableContainer sx={tableContainerSx}>
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
              <SubjectRow 
                key={subject.id} 
                subject={subject} 
                index={subjectIndex} 
              />
            ))}

            {(!pesuData?.items || pesuData.items.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                  {isFetchingInBackground ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <CircularProgress size={16} sx={{ color: theme.colors.primary }} />
                      <span>Fetching course data... Please wait a minute...</span>
                    </Box>
                  ) : search ? 'No results found' : 'No course materials available'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pesuData?.pagination && (
        <TablePagination
          component="div"
          count={pesuData.pagination.total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
          sx={paginationSx}
        />
      )}
    </>
  );
};

export default CourseMaterialTable;
