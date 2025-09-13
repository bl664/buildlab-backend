const { queryDatabase } = require('../../../../services/dbQuery');

const createNotification = async (
    user_id,
    type,
    content,
    created_by,
    is_read,
    studentsData,
    mentorData,
    url
) => {

    console.log("noti data is",  user_id,
        type,
        content,
        created_by,
        is_read,
        studentsData,
        mentorData,
        url)
    const query = `
        INSERT INTO notifications 
        (created_for_id, type, content, created_by, is_read, students_list, mentors_list, url) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *;
    `;

    const values = [user_id, type, content, created_by, is_read, studentsData, mentorData, url];

    const result = await queryDatabase(query, values);
    return result;
};

module.exports = createNotification;
