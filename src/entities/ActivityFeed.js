const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "ActivityFeed",
    tableName: "activity_feed",
    columns: {
        id: {
            type: "uuid",
            primary: true,
            generated: "uuid",
        },
        user_id: {
            type: "uuid",
        },
        project_id: {
            type: "uuid",
        },
        action: {
            type: "varchar",
            length: 255,
        },
        timestamp: {
            type: "timestamp",
            default: () => "CURRENT_TIMESTAMP",
        },
    },
    relations: {
        user: {
            type: "many-to-one",
            target: "User",
            joinColumn: {
                name: "user_id",
                referencedColumnName: "id",
            },
            onDelete: "CASCADE",
        },
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
