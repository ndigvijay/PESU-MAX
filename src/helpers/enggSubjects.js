export const filterEnggSubjectsCode = (subjectsArray) =>{
    const engineeringSubjects = []
    subjectsArray.filter((subject)=>{
        if(subject.subjectCode.includes("UE")){
            engineeringSubjects.push(subject)
        }
    })
    return engineeringSubjects
}

// given an id "21333" , extract the subject array
export const getSubjectDetails = (subjectId,engineeringSubjects)=>{
    const SubjectDetails =engineeringSubjects.find((subject)=>{
         return subject.id == subjectId
    })
    return SubjectDetails
}
