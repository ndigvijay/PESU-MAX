import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  TableRow,
  TableCell,
  TableBody,
  Table,
  IconButton,
  Checkbox,
  Collapse
} from "@mui/material";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import UnitRow from "./UnitRow.jsx";
import { selectSubject, selectIsSubjectIndeterminate } from "../../redux/courseMaterialSlice.js";
import theme from "../../Themes/theme.jsx";
import { cellSx, getRowSx, checkboxSx, expandButtonSx } from "../../styles/styles.js";

const SubjectRow = ({ subject, index }) => {
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState(false);
  const { selectedSubjects } = useSelector((state) => state.courseMaterial);
  const isIndeterminate = useSelector(selectIsSubjectIndeterminate(subject));
  const isSelected = !!selectedSubjects[subject.id];

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const handleSelect = () => {
    dispatch(selectSubject({ subject, selected: !isSelected }));
  };

  return (
    <React.Fragment>
      {/* Subject Row */}
      <TableRow sx={getRowSx(index)}>
        <TableCell sx={{ ...cellSx, width: '40px', paddingLeft: '8px' }}>
          <IconButton 
            size="small" 
            onClick={handleToggle}
            sx={expandButtonSx}
          >
            {expanded ? 
              <KeyboardArrowDownIcon sx={{ fontSize: '18px', color: theme.colors.secondary }} /> : 
              <KeyboardArrowRightIcon sx={{ fontSize: '18px', color: theme.colors.secondary }} />
            }
          </IconButton>
        </TableCell>
        <TableCell sx={{ ...cellSx, width: '40px' }}>
          <Checkbox
            size="small"
            checked={isSelected}
            indeterminate={isIndeterminate}
            onChange={handleSelect}
            sx={checkboxSx}
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
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Table size="small">
              <TableBody>
                {subject.units?.map((unit, unitIndex) => (
                  <UnitRow 
                    key={unit.id} 
                    subject={subject} 
                    unit={unit} 
                    index={unitIndex} 
                  />
                ))}
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

export default SubjectRow;
