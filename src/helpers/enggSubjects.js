import { getYearofStudent } from "./parser.js";

export const filterEnggSubjectsCode = async (subjectsArray) => {
    const { userProfile } = await chrome.storage.local.get('userProfile');
    
    if (!userProfile) {
        return [];
    }

    const { srn, program: userProgram, branch: userBranch } = userProfile;
    
    let program = "";
    let branch = "";
    
    if (userProgram === "Bachelor of Technology") {
        program = "UE";
    }
    if (userBranch === "Computer Science and Engineering") {
        branch = "CS";
    }
    
    const fullYear = getYearofStudent(srn);
    const year = fullYear ? String(fullYear).slice(-2) : "";
    const prefix = `${program}${year}${branch}`;
    console.log(prefix);
    return subjectsArray.filter((subject) => subject.subjectCode.startsWith(prefix));
}



// given an id "21333" , extract the subject array
export const getSubjectDetails = (subjectId,engineeringSubjects)=>{
    const SubjectDetails =engineeringSubjects.find((subject)=>{
         return subject.id == subjectId
    })
    return SubjectDetails
}
