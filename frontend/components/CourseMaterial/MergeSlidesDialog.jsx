import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button
} from "@mui/material";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import { dialogPaperSx, dialogTitleSx, primaryButtonSx, secondaryButtonSx } from "../../styles/styles.js";

const MergeSlidesDialog = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={dialogTitleSx}>
        Merge Slides
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: "#666", fontSize: "12px", lineHeight: 1.6 }}>
          Do you want to merge the selected slide PDFs subject-wise?
        </Typography>
        <Typography variant="body2" sx={{ color: "#888", fontSize: "11px", mt: 1 }}>
          Each subject will get one merged PDF inside the ZIP. Non-PDF slide files will stay separate.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ padding: "8px 24px 16px", gap: 1 }}>
        <Button
          variant="contained"
          onClick={() => onConfirm(false)}
          sx={secondaryButtonSx}
        >
          Keep Separate
        </Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(true)}
          startIcon={<MergeTypeIcon />}
          sx={primaryButtonSx}
        >
          Merge Slides
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MergeSlidesDialog;
