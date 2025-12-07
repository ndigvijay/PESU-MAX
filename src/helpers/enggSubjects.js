import { getYearofStudent } from "./parser.js";
import { load } from "../utils/storage.js";
import courseBranchMappings from "../../course_branch_mappings.json";
import degreeMappings from "../../DegreeMappin.json";

const { BranchMappings, firstYearEngineeringSubjects } = courseBranchMappings;
const { degreePrograms } = degreeMappings;

const getProgramId = (userProgram) => {
  const mapping = degreePrograms.find(p => p.dbName === userProgram);
  return mapping ? mapping.programId : "";
};

const getBranchCodes = (userBranch) => {
  const mapping = BranchMappings.find(b => b.dbName === userBranch);
  if (!mapping) return [];

  const codes = [mapping.courseCodeId];
  if (mapping.courseCodeId2) {
    codes.push(mapping.courseCodeId2);
  }
  return codes;
};


const getFirstYearCodes = () => {
  return firstYearEngineeringSubjects.map(s => s.courseCodeId);
};

export const filterEnggSubjectsCode = async (subjectsArray) => {
    const userProfile = await load('userProfile');
    
    if (!userProfile) {
        return [];
    }

    const { srn, program: userProgram, branch: userBranch } = userProfile;
    
    const program = getProgramId(userProgram);
    const branchCodes = getBranchCodes(userBranch); 
    
    const fullYear = getYearofStudent(srn);
    const year = fullYear ? String(fullYear).slice(-2) : "";
    
    const firstYearCodes = getFirstYearCodes();
    const basePrefix = `${program}${year}`;
    
    console.log(`Filter - Program: ${program}, Year: ${year}, Branches: ${branchCodes.join(", ")}`);

    const universityWidePrefix = `UZ${year}UZ`;

    return subjectsArray.filter((subject) => {
        const code = subject.subjectCode;

        for (const branch of branchCodes) {
            const prefix = `${program}${year}${branch}`;
            if (code.startsWith(prefix)) return true;
        }

        for (const fyCode of firstYearCodes) {
            if (code.startsWith(`${basePrefix}${fyCode}`)) return true;
        }

        if (code.startsWith(universityWidePrefix)) return true;
        return false;
    });
}

// given an id "21333" , extract the subject array
export const getSubjectDetails = (subjectId, engineeringSubjects) => {
    const SubjectDetails = engineeringSubjects.find((subject) => {
         return subject.id == subjectId
    })
    return SubjectDetails
}
