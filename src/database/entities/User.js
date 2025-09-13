const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
    name: 'User',
    tableName: 'users',
    columns: {
        id: {
            primary: true,
            type: 'uuid',
            generated: 'uuid'
        },
        name: {
            type: 'varchar'
        },
        email: {
            type: 'varchar',
            unique: true
        },
        passwordhash: {
            type: 'varchar'
        },
        role: {
            type: 'enum',
            enum: ['admin', 'mentor', 'student', 'member'],
            default: 'member'
        },
        createdat: {
            type: 'timestamp',
            createDate: true,
            default: () => 'CURRENT_TIMESTAMP'
        },
        updatedat: {
            type: 'timestamp',
            updateDate: true,
            default: () => 'CURRENT_TIMESTAMP'
        },
        assigned_to: {
            type: 'int',
            array: true,
            nullable: true
        }
    }
});
