const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "Messages",
    tableName: "messages",
    columns: {
        id: {
            type: "uuid",
            primary: true,
            generated: "uuid",
        },
        sender_id: {
            type: "uuid",
        },
        receiver_id: {
            type: "uuid",
        },
        content: {
            type: "text",
        },
        created_at: {
            type: "timestamp",
            default: () => "CURRENT_TIMESTAMP",
        },
    },
    relations: {
        sender: {
            type: "many-to-one",
            target: "User",
            joinColumn: {
                name: "sender_id",
                referencedColumnName: "id",
            },
            onDelete: "CASCADE",
        },
        receiver: {
            type: "many-to-one",
            target: "User",
            joinColumn: {
                name: "receiver_id",
                referencedColumnName: "id",
            },
            onDelete: "CASCADE",
        },
    },
});
