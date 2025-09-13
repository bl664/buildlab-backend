const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "Settings",
    tableName: "settings",
    columns: {
        id: {
            type: "uuid",
            primary: true,
            generated: "uuid",
        },
        user_id: {
            type: "uuid",
        },
        notifications_enabled: {
            type: "boolean",
            default: true,
        },
        theme_preference: {
            type: "enum",
            enum: ["light", "dark"],
            default: "dark",
        },
        language: {
            type: "varchar",
            length: 10,
            default: "en",
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
        user: {
            type: "one-to-one",
            target: "User",
            joinColumn: {
                name: "user_id",
                referencedColumnName: "id",
            },
            onDelete: "CASCADE",
        },
    },
});
