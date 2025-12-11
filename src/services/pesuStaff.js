const BASE_PROF_URL = "https://staff.pes.edu"
import axios from "axios";
import * as cheerio from "cheerio";
import {dynamicallyExtractTabs,dynamicallyExtractSidebar,dynamicallyExtractBasicInfo} from "../helpers/pesuStaffHelper.js"
//  https://staff.pes.edu${profId}


export const getProfessorId = async (searchProfQuery) =>{
    const {data} =  await axios.get(`${BASE_PROF_URL}/atoz/list/?search=${searchProfQuery}`)
    const $ = cheerio.load(data);
    const profId = $("a.chat-contacts-item").attr('href')
    // console.log(profId)
    return profId
}


 export const getProfessorDetails = async (ProfessorId) =>{
    const {data} = await axios.get(`${BASE_PROF_URL}${ProfessorId}`)
    const $ = cheerio.load(data);
      const professorData = {
        basicInfo: dynamicallyExtractBasicInfo($),
        sidebar: dynamicallyExtractSidebar($),
        tabs: dynamicallyExtractTabs($),
    };
    return professorData
}




// const professorId = await getProfessorId("Jeny")

// console.log(professorId)
// const professorData = await getProfessorDetails(professorId)
// console.log(JSON.stringify(professorData, null, 2))