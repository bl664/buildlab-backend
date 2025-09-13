const { queryDatabase } = require('../../../../services/dbQuery');

const getStudentIdsByProjectId = async (projectId) => {
    const studentQuery = `SELECT student_id FROM student_projects WHERE project_id = $1;`;
    const projectInfoQuery = `SELECT 
    p.name AS project_name, 
    p.created_by_id, 
    u.name AS creator_name,
    u.role AS creator_role
    FROM projects p
    JOIN users u ON p.created_by_id = u.id
    WHERE p.id = $1;
    `

    const values = [projectId];

    try {
        const studentResult = await queryDatabase(studentQuery, values);
        const projectInfoResult = await queryDatabase(projectInfoQuery, values);

        const res = {
            students_ids: studentResult.map(r => r.student_id),
            project_name: projectInfoResult[0].project_name,
            creator: {
                id: projectInfoResult[0].created_by_id,
                name: projectInfoResult[0].creator_name,
                role: projectInfoResult[0].creator_role
            }
        };

        console.log("res is", res)
        return res

    } catch (error) {
        console.error("Error fetching student IDs:", error);
        throw error;
    }
};

module.exports = { getStudentIdsByProjectId };