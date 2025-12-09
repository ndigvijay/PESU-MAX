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
import ClassRow from "./ClassRow.jsx";
import { selectUnit, selectIsUnitIndeterminate } from "../../redux/courseMaterialSlice.js";
import theme from "../../Themes/theme.jsx";
import { cellSx, getUnitRowSx, primaryCheckboxSx, expandButtonSx } from "../../styles/styles.js";

const UnitRow = ({ subject, unit, index }) => {
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState(false);
  const { selectedUnits } = useSelector((state) => state.courseMaterial);
  const isIndeterminate = useSelector(selectIsUnitIndeterminate(unit));
  const isSelected = !!selectedUnits[unit.id];

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const handleSelect = () => {
    dispatch(selectUnit({ subject, unit, selected: !isSelected }));
  };

  return (
    <React.Fragment>
      {/* Unit Row */}
      <TableRow sx={getUnitRowSx(index)}>
        <TableCell sx={{ ...cellSx, width: '40px', paddingLeft: '24px' }}>
          <IconButton 
            size="small" 
            onClick={handleToggle}
            sx={expandButtonSx}
          >
            {expanded ? 
              <KeyboardArrowDownIcon sx={{ fontSize: '16px', color: theme.colors.primary }} /> : 
              <KeyboardArrowRightIcon sx={{ fontSize: '16px', color: theme.colors.primary }} />
            }
          </IconButton>
        </TableCell>
        <TableCell sx={{ ...cellSx, width: '40px' }}>
          <Checkbox
            size="small"
            checked={isSelected}
            indeterminate={isIndeterminate}
            onChange={handleSelect}
            sx={primaryCheckboxSx}
          />
        </TableCell>
        <TableCell sx={{ ...cellSx, color: theme.colors.primary, fontWeight: '500' }} colSpan={2}>
          Unit {index + 1}
        </TableCell>
      </TableRow>

      {/* Classes */}
      <TableRow>
        <TableCell sx={{ padding: 0, border: 'none' }} colSpan={4}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Table size="small">
              <TableBody>
                {unit.classes?.map((cls, classIndex) => (
                  <ClassRow 
                    key={cls.id} 
                    subject={subject}
                    unit={unit}
                    cls={cls} 
                    index={classIndex} 
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

export default UnitRow;
