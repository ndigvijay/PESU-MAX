const BASE_PROF_URL = "https://staff.pes.edu"
import axios from "axios";
import * as cheerio from "cheerio";
import {dynamicallyExtractTabs,dynamicallyExtractSidebar,dynamicallyExtractBasicInfo} from "../helpers/pesuStaffHelper.js"
//  https://staff.pes.edu${profId}


export const searchProfessors = async (searchProfQuery) =>{
    const {data} =  await axios.get(`${BASE_PROF_URL}/atoz/list/?search=${searchProfQuery}`)
    const $ = cheerio.load(data);

    const professors = [];
    $("a.chat-contacts-item").each((_, el) => {
        const profId = $(el).attr('href');
        const name = $(el).find("h4").text().trim();
        const designation = $(el).find(".chat-contacts-item-text p").first().text().trim();
        const imageUrl = $(el).find(".dashboard-message-avatar img").attr('src');

        if (profId && name) {
            professors.push({
                id: profId,
                name: name,
                designation: designation,
                imageUrl: imageUrl
            });
        }
    });

    return professors;
}

export const getProfessorId = async (searchProfQuery) =>{
    const professors = await searchProfessors(searchProfQuery);
    return professors.length > 0 ? professors[0].id : null;
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