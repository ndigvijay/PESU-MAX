import { load } from "../utils/storage.js";

function getSemester(code) {
  if (!code) return null;
  

  const numMatch = code.match(/(\d{3})/);
  if (!numMatch) return null;
  
  const number = numMatch[1]; 
  const group = parseInt(number[0]); 
  
  const after = code.split(number)[1];
  if (!after) return null;
  
  const sectionMatch = after.match(/[A-Z]/);
  if (!sectionMatch) return null;
  
  const section = sectionMatch[0]; 
  
  const baseSemester = (group - 1) * 2 + 1;
  return section === "A" ? baseSemester : baseSemester + 1;
}

function filterBySemester(subjects, semester) {
  if (!semester || semester === "all") {
    return subjects;
  }
  
  const semesterNum = parseInt(semester);
  return subjects.filter(subject => getSemester(subject.subjectCode) === semesterNum);
}

// Pagination and search helper
function paginateAndSearch(items, { search = "", page = 0, limit = 10, searchFields = [] }) {
  let filtered = items;
  
  if (search && search.trim() !== "") {
    const searchLower = search.toLowerCase().trim();
    filtered = items.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(searchLower);
      })
    );
  }
  
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = page * limit;
  const end = start + limit;
  const paginated = filtered.slice(start, end);
  
  return {
    items: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages - 1,
      hasPrev: page > 0
    }
  };
}

// Filter nested data structure (subjects with units and classes)
function filterNestedData(subjects, search) {
  if (!search || search.trim() === "") {
    return subjects;
  }
  
  const searchLower = search.toLowerCase().trim();
  
  return subjects.filter(subject => {
    // Check subject match
    const subjectMatch = 
      subject.subjectCode?.toLowerCase().includes(searchLower) ||
      subject.subjectName?.toLowerCase().includes(searchLower);
    
    if (subjectMatch) return true;
    
    // Check units and classes
    return subject.units?.some(unit => {
      const unitMatch = unit.name?.toLowerCase().includes(searchLower);
      if (unitMatch) return true;
      
      return unit.classes?.some(cls => 
        cls.className?.toLowerCase().includes(searchLower) ||
        cls.classType?.toLowerCase().includes(searchLower)
      );
    });
  });
}

// Main function to get paginated PESU data
export async function getPESUDataPagination({ type, search = "", page = 0, limit = 10, subjectId, unitId, semester }) {
  const data = await load("pesuData");
  
  if (!data) {
    throw new Error("No PESU data found");
  }

  let result;

  if (type === "subjects") {
    // Get all subjects as array
    let subjectsArray = Object.values(data.subjects || {}).map(subject => ({
      id: subject.id,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      unitCount: Object.keys(subject.units || {}).length,
      semester: getSemester(subject.subjectCode)
    }));
    
    // Filter by semester
    subjectsArray = filterBySemester(subjectsArray, semester);
    
    result = paginateAndSearch(subjectsArray, {
      search,
      page,
      limit,
      searchFields: ["subjectCode", "subjectName"]
    });
  } 
  else if (type === "units") {
    // Get units - either for a specific subject or all units
    let unitsArray = [];
    
    if (subjectId && data.subjects[subjectId]) {
      // Units for specific subject
      const subject = data.subjects[subjectId];
      unitsArray = Object.values(subject.units || {}).map(unit => ({
        id: unit.id,
        name: unit.name,
        subjectId: subject.id,
        subjectCode: subject.subjectCode,
        classCount: (unit.classes || []).length
      }));
    } else {
      // All units across all subjects
      Object.values(data.subjects || {}).forEach(subject => {
        Object.values(subject.units || {}).forEach(unit => {
          unitsArray.push({
            id: unit.id,
            name: unit.name,
            subjectId: subject.id,
            subjectCode: subject.subjectCode,
            classCount: (unit.classes || []).length
          });
        });
      });
    }
    
    result = paginateAndSearch(unitsArray, {
      search,
      page,
      limit,
      searchFields: ["name", "subjectCode"]
    });
  } 
  else if (type === "classes") {
    // Get classes - for specific unit, specific subject, or all
    let classesArray = [];
    
    if (subjectId && unitId && data.subjects[subjectId]?.units[unitId]) {
      // Classes for specific unit
      const unit = data.subjects[subjectId].units[unitId];
      const subject = data.subjects[subjectId];
      classesArray = (unit.classes || []).map(cls => ({
        ...cls,
        unitId: unit.id,
        unitName: unit.name,
        subjectId: subject.id,
        subjectCode: subject.subjectCode
      }));
    } else if (subjectId && data.subjects[subjectId]) {
      // All classes for a specific subject
      const subject = data.subjects[subjectId];
      Object.values(subject.units || {}).forEach(unit => {
        (unit.classes || []).forEach(cls => {
          classesArray.push({
            ...cls,
            unitId: unit.id,
            unitName: unit.name,
            subjectId: subject.id,
            subjectCode: subject.subjectCode
          });
        });
      });
    } else {
      // All classes across all subjects
      Object.values(data.subjects || {}).forEach(subject => {
        Object.values(subject.units || {}).forEach(unit => {
          (unit.classes || []).forEach(cls => {
            classesArray.push({
              ...cls,
              unitId: unit.id,
              unitName: unit.name,
              subjectId: subject.id,
              subjectCode: subject.subjectCode
            });
          });
        });
      });
    }
    
    result = paginateAndSearch(classesArray, {
      search,
      page,
      limit,
      searchFields: ["className", "classType", "subjectCode", "unitName"]
    });
  } 
  else if (type === "nested" || !type) {
    // Return full nested structure for table display
    let subjectsArray = Object.values(data.subjects || {}).map(subject => ({
      id: subject.id,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      semester: getSemester(subject.subjectCode),
      units: Object.values(subject.units || {}).map(unit => ({
        id: unit.id,
        name: unit.name,
        classes: (unit.classes || []).map(cls => ({
          id: cls.id,
          className: cls.className,
          classType: cls.classType
        }))
      }))
    }));
    
    subjectsArray = subjectsArray.filter(subject => 
      subject.units && subject.units.length > 0
    );
    
    // Filter by semester first
    subjectsArray = filterBySemester(subjectsArray, semester);
    
    // Filter if search provided
    let filtered = filterNestedData(subjectsArray, search);
    
    filtered = filtered.filter(subject => 
      subject.units && subject.units.length > 0
    );
    
    // Paginate subjects
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = page * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);
    
    result = {
      items: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages - 1,
        hasPrev: page > 0
      }
    };
  }
  else {
    throw new Error("Invalid type. Use 'subjects', 'units', 'classes', or 'nested'");
  }

  return result;
}

// Get all PESU data in nested format 
export async function getAllPESUDataNested() {
  const data = await load("pesuData");

  if (!data) {
    return null;
  }

  return Object.values(data.subjects || {}).map(subject => ({
    id: subject.id,
    subjectCode: subject.subjectCode,
    subjectName: subject.subjectName,
    semester: getSemester(subject.subjectCode),
    units: Object.values(subject.units || {}).map(unit => ({
      id: unit.id,
      name: unit.name,
      classes: (unit.classes || []).map(cls => ({
        id: cls.id,
        className: cls.className,
        classType: cls.classType
      }))
    }))
  }));
}

