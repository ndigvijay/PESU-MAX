import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import theme from "../../Themes/theme.jsx";
import {
  dialogPaperSx,
  dialogTitleSx,
  popupPrimaryButtonSx,
  popupSecondaryButtonSx,
  selectSx,
} from "../../styles/styles.js";
import {
  fromDateAndTimeInputs,
  toDateInputValue,
  toTimeInputValue,
} from "./deadlineDisplayUtils.js";

const CUSTOM_COURSE_OPTION = "__custom__";

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    fontSize: "13px",
    "& fieldset": { borderColor: theme.colors.line },
    "&:hover fieldset": { borderColor: theme.colors.secondary },
    "&.Mui-focused fieldset": { borderColor: theme.colors.primary },
  },
  "& .MuiInputLabel-root": {
    fontSize: "13px",
    color: theme.colors.textMuted,
    "&.Mui-focused": { color: theme.colors.primary },
  },
};

const DeadlineFormDialog = ({
  open,
  onClose,
  onSave,
  editingItem = null,
  courseOptions = [],
  saving = false,
}) => {
  const isPesuItem = editingItem?.source === "pesu";

  const [title, setTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState(CUSTOM_COURSE_OPTION);
  const [customCourseCode, setCustomCourseCode] = useState("");
  const [customCourseName, setCustomCourseName] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("23:59");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!open) return;
    setValidationError("");

    if (editingItem) {
      setTitle(editingItem.title || "");
      const matchedCourse = courseOptions.find(
        (c) =>
          (editingItem.subjectId && c.subjectId === String(editingItem.subjectId)) ||
          (editingItem.subjectCode && c.subjectCode === editingItem.subjectCode)
      );
      setSelectedCourseId(matchedCourse ? matchedCourse.subjectId : CUSTOM_COURSE_OPTION);
      setCustomCourseCode(editingItem.subjectCode || "");
      setCustomCourseName(editingItem.subjectName || "");
      setDateStr(toDateInputValue(editingItem.dueAt));
      setTimeStr(toTimeInputValue(editingItem.dueAt, editingItem.hasTime));
      setNotes(editingItem.notes || "");
    } else {
      setTitle("");
      setSelectedCourseId(courseOptions[0]?.subjectId || CUSTOM_COURSE_OPTION);
      setCustomCourseCode("");
      setCustomCourseName("");
      setDateStr("");
      setTimeStr("23:59");
      setNotes("");
    }
  }, [open, editingItem, courseOptions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError("Please enter a title.");
      return;
    }

    const { dueAt, hasTime } = fromDateAndTimeInputs(dateStr, timeStr);
    const chosenCourse = courseOptions.find((c) => c.subjectId === selectedCourseId);

    if (editingItem) {
      onSave({
        mode: "edit",
        id: editingItem.id,
        patch: {
          title: trimmedTitle,
          dueAt,
          hasTime,
          notes: notes.trim(),
          ...(!isPesuItem
            ? {
                subjectCode: chosenCourse ? chosenCourse.subjectCode : customCourseCode.trim(),
                subjectName: chosenCourse ? chosenCourse.subjectName : customCourseName.trim(),
              }
            : {}),
        },
      });
    } else {
      onSave({
        mode: "create",
        deadline: {
          title: trimmedTitle,
          subjectId: chosenCourse ? chosenCourse.subjectId : null,
          subjectCode: chosenCourse ? chosenCourse.subjectCode : customCourseCode.trim(),
          subjectName: chosenCourse ? chosenCourse.subjectName : customCourseName.trim(),
          semester: chosenCourse?.semester ?? null,
          dueAt,
          hasTime,
          notes: notes.trim(),
        },
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={dialogTitleSx}>
          {editingItem ? (isPesuItem ? "Edit PESU Assignment" : "Edit Deadline") : "Add Deadline"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ paddingTop: "6px" }}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              size="small"
              fullWidth
              required
              placeholder="e.g., Unit 3 Assignment / Lab Report"
              sx={inputSx}
            />

            {isPesuItem ? (
              <Box
                sx={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  backgroundColor: theme.colors.secondaryLight,
                  border: `1px solid ${theme.colors.line}`,
                }}
              >
                <Typography sx={{ fontSize: "11px", fontWeight: 700, color: theme.colors.primary }}>
                  {editingItem.subjectCode || "PESU Course"}
                </Typography>
                <Typography sx={{ fontSize: "12px", color: theme.colors.secondary }}>
                  {editingItem.subjectName}
                </Typography>
                {editingItem.unitName && (
                  <Typography sx={{ fontSize: "11px", color: theme.colors.textMuted }}>
                    {editingItem.unitName}
                    {editingItem.className ? ` · ${editingItem.className}` : ""}
                  </Typography>
                )}
              </Box>
            ) : (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: "13px", color: theme.colors.textMuted }}>
                    Course
                  </InputLabel>
                  <Select
                    label="Course"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    sx={selectSx}
                  >
                    {courseOptions.map((course) => (
                      <MenuItem key={course.subjectId} value={course.subjectId}>
                        {course.subjectCode ? `${course.subjectCode} - ` : ""}
                        {course.subjectName}
                      </MenuItem>
                    ))}
                    <MenuItem value={CUSTOM_COURSE_OPTION}>Other / Custom Course</MenuItem>
                  </Select>
                </FormControl>

                {selectedCourseId === CUSTOM_COURSE_OPTION && (
                  <Box sx={{ display: "flex", gap: "8px" }}>
                    <TextField
                      label="Code (optional)"
                      value={customCourseCode}
                      onChange={(e) => setCustomCourseCode(e.target.value)}
                      size="small"
                      placeholder="UE24CS301"
                      sx={{ ...inputSx, width: "42%" }}
                    />
                    <TextField
                      label="Course Name"
                      value={customCourseName}
                      onChange={(e) => setCustomCourseName(e.target.value)}
                      size="small"
                      placeholder="Algorithms"
                      sx={{ ...inputSx, flex: 1 }}
                    />
                  </Box>
                )}
              </>
            )}

            <Box sx={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <TextField
                label="Due Date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ ...inputSx, flex: 1 }}
              />
              <TextField
                label="Time"
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                size="small"
                disabled={!dateStr}
                InputLabelProps={{ shrink: true }}
                sx={{ ...inputSx, width: "120px" }}
              />
            </Box>

            {dateStr && (
              <Box sx={{ display: "flex", justifyContent: "flex-end", marginTop: "-6px" }}>
                <Button
                  size="small"
                  onClick={() => setDateStr("")}
                  sx={{ fontSize: "11px", textTransform: "none", color: theme.colors.textMuted }}
                >
                  Clear due date
                </Button>
              </Box>
            )}

            <TextField
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              size="small"
              multiline
              minRows={2}
              placeholder="Submission link, group members, rubric notes..."
              sx={inputSx}
            />

            {validationError && (
              <Typography sx={{ fontSize: "12px", color: theme.colors.danger }}>
                {validationError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ padding: "8px 16px 12px" }}>
          <Button onClick={onClose} sx={popupSecondaryButtonSx}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} sx={popupPrimaryButtonSx}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default DeadlineFormDialog;

