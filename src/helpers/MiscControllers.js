import { load } from "../utils/storage.js";


export const getSemestersData = async () => {
  const semestersData = await load("semestersData");
  
  if (!semestersData || semestersData.length === 0) {
    return [
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
  }

  const semesters = [{ value: "all", label: "All Semesters" }];
  semestersData.forEach(sem => {
    semesters.push({
      value: String(sem.number),
      label: `Semester ${sem.number}`
    });
  });
  
  return semesters;
};

