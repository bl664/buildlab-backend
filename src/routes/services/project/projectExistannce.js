const { queryDatabase } = require("../../../services/dbQuery");

async function checkProjectExistence(projectName, userId) {
    try {
        if (!projectName || !userId) {
            throw new Error("Project name and user ID are required");
        }

        const existingProject = await queryDatabase(
            'SELECT id FROM projects WHERE name = $1 AND created_by_id = $2',
            [projectName, userId]
        );

        if (existingProject.length > 0) {
            return {
                exists: true,
                message: `Project with name '${projectName}' already exists.`,
            };
        }

        return { exists: false };
    } catch (error) {
        console.error("Error checking project existence:", error);
        throw new Error("Failed to check project existence");
    }
}

module.exports = { checkProjectExistence };