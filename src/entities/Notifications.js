const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "Notifications",
    tableName: "notifications",
    columns: {
        id: {
            type: "uuid",
            primary: true,
            generated: "uuid",
        },
        user_id: {
            type: "uuid",
        },
        message: {
            type: "text",
        },
        status: {
            type: "enum",
            enum: ["unread", "read"],
            default: "unread",
        },
        created_at: {
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
    },
});
