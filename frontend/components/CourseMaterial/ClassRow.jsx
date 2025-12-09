import React from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  TableRow,
  TableCell,
  Checkbox
} from "@mui/material";
import { selectClass } from "../../redux/courseMaterialSlice.js";
import { cellSx, getClassRowSx, checkboxSx } from "../../styles/styles.js";

const ClassRow = ({ subject, unit, cls, index }) => {
  const dispatch = useDispatch();
  const { selectedClasses } = useSelector((state) => state.courseMaterial);
  const isSelected = !!selectedClasses[cls.id];

  const handleSelect = () => {
    dispatch(selectClass({ subject, unit, cls, selected: !isSelected }));
  };

  return (
    <TableRow sx={getClassRowSx(index)}>
      <TableCell sx={{ ...cellSx, width: '40px', paddingLeft: '48px' }} />
      <TableCell sx={{ ...cellSx, width: '40px' }}>
        <Checkbox
          size="small"
          checked={isSelected}
          onChange={handleSelect}
          sx={checkboxSx}
        />
      </TableCell>
      <TableCell sx={{ ...cellSx }} />
      <TableCell sx={{ ...cellSx, fontSize: '11px', color: '#555' }}>
        {cls.className}
      </TableCell>
    </TableRow>
  );
};

export default ClassRow;
