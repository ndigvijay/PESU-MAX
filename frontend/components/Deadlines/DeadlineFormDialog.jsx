import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
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
import AttachFileIcon from "@mui/icons-material/AttachFile";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
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
  const isEditingExisting = Boolean(editingItem && editingItem.id);
  const isPesuItem = editingItem?.source === "pesu" && isEditingExisting;

  const [title, setTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState(CUSTOM_COURSE_OPTION);
  const [customCourseCode, setCustomCourseCode] = useState("");
  const [customCourseName, setCustomCourseName] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("23:59");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);
  const [readingFiles, setReadingFiles] = useState(false);
  const [validationError, setValidationError] = useState("");
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
      reader.readAsDataURL(file);
    });

  const handleFileSelect = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    setReadingFiles(true);
    setValidationError("");
    try {
      const oversized = selected.find((f) => f.size > 15 * 1024 * 1024);
      if (oversized) {
        setValidationError(`"${oversized.name}" exceeds the 15MB limit.`);
        return;
      }

      const processed = await Promise.all(
        selected.map(async (file) => ({
          id: `file:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: await readFileAsDataUrl(file),
        }))
      );
      setFiles((prev) => [...prev, ...processed]);
    } catch (err) {
      setValidationError(err.message || "Failed to attach file");
    } finally {
      setReadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!open) return;
    setValidationError("");

    if (editingItem) {
      const rawTitle = editingItem.title || "";
      const isPlaceholder = /no assignments? content/i.test(rawTitle);
      setTitle(
        isPlaceholder
          ? editingItem.unitName
            ? `${editingItem.unitName} Assignment`
            : "Assignment"
          : rawTitle
      );

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
      setFiles(Array.isArray(editingItem.files) ? [...editingItem.files] : []);
    } else {
      setTitle("");
      setSelectedCourseId(courseOptions[0]?.subjectId || CUSTOM_COURSE_OPTION);
      setCustomCourseCode("");
      setCustomCourseName("");
      setDateStr("");
      setTimeStr("23:59");
      setNotes("");
      setFiles([]);
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

    if (isEditingExisting) {
      onSave({
        mode: "edit",
        id: editingItem.id,
        patch: {
          title: trimmedTitle,
          dueAt,
          hasTime,
          notes: notes.trim(),
          files,
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
          subjectId: chosenCourse ? chosenCourse.subjectId : (editingItem?.subjectId || null),
          subjectCode: chosenCourse
            ? chosenCourse.subjectCode
            : (customCourseCode.trim() || editingItem?.subjectCode || ""),
          subjectName: chosenCourse
            ? chosenCourse.subjectName
            : (customCourseName.trim() || editingItem?.subjectName || ""),
          semester: chosenCourse?.semester ?? editingItem?.semester ?? null,
          dueAt,
          hasTime,
          notes: notes.trim(),
          files,
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
          {isEditingExisting
            ? isPesuItem
              ? "Edit PESU Assignment"
              : "Edit Deadline"
            : editingItem
              ? "Track in My Deadlines"
              : "Add Deadline"}
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

            {/* Document Attachments */}
            <Box
              sx={{
                padding: "8px 10px",
                borderRadius: "8px",
                backgroundColor: theme.colors.sunken,
                border: `1px solid ${theme.colors.line}`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: files.length > 0 ? "8px" : "0",
                }}
              >
                <Typography sx={{ fontSize: "12px", fontWeight: 600, color: theme.colors.secondary }}>
                  Important Documents ({files.length})
                </Typography>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  size="small"
                  startIcon={
                    readingFiles ? (
                      <CircularProgress size={12} sx={{ color: theme.colors.primary }} />
                    ) : (
                      <AttachFileIcon sx={{ fontSize: "15px" }} />
                    )
                  }
                  onClick={() => fileInputRef.current?.click()}
                  disabled={readingFiles}
                  sx={{
                    fontSize: "11px",
                    textTransform: "none",
                    color: theme.colors.primary,
                    padding: "2px 8px",
                    minWidth: 0,
                  }}
                >
                  {readingFiles ? "Attaching..." : "+ Attach Document"}
                </Button>
              </Box>

              {files.length === 0 ? (
                <Typography sx={{ fontSize: "11px", color: theme.colors.textMuted, fontStyle: "italic" }}>
                  Attach PDFs, project rubrics, problem sheets, or notes for 1-click access.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {files.map((file, idx) => (
                    <Chip
                      key={file.id || idx}
                      icon={<InsertDriveFileOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                      label={`${file.name}${file.size ? ` (${formatFileSize(file.size)})` : ""}`}
                      onDelete={() => handleRemoveFile(idx)}
                      size="small"
                      sx={{
                        fontSize: "11px",
                        backgroundColor: theme.colors.secondaryLight,
                        color: theme.colors.secondary,
                        maxWidth: "100%",
                        "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>

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

