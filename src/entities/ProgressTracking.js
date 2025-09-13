const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "ProgressTracking",
    tableName: "progress_tracking",
    columns: {
        id: {
            type: "uuid",
            primary: true,
            generated: "uuid",
        },
        project_id: {
            type: "uuid",
        },
        milestone: {
            type: "varchar",
            length: 255,
        },
        progress_percentage: {
            type: "float",
        },
        due_date: {
            type: "timestamp",
            nullable: true,
        },
        created_at: {
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
                referencedColumnName: "id",
            },
            onDelete: "CASCADE",
        },
    },
});
