const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "ProjectTeams",
    tableName: "project_teams",
    columns: {
        id: {
            type: "uuid",
            primary: true,
            generated: "uuid",
        },
        project_id: {
            type: "uuid",
        },
        team_id: {
            type: "uuid",
        },
        role_in_project: {
            type: "enum",
            enum: ["development", "design", "qa"],
        },
        created_at: {
            type: "timestamp",
            default: () => "CURRENT_TIMESTAMP",
        },
        updated_at: {
            type: "timestamp",
            default: () => "CURRENT_TIMESTAMP",
        },
    },
    relations: {
        project: {
            type: "many-to-one",
            target: "Project",
            joinColumn: {
                name: "project_id",
                referencedColumnName: "id"
            },
            onDelete: 'CASCADE'
        },
        team: {
            type: "many-to-one",
            target: "Team",
            joinColumn: {
                name: "team_id",
                referencedColumnName: "id",
            },
            onDelete: "CASCADE",
        },
    }
});
