const { EntitySchema, JoinColumn } = require('typeorm');

module.exports = new EntitySchema({
    name: 'Tasks',
    tableName: 'tasks',
    columns: {
        id: {
            primary: true,
            type: 'uuid',
            generated: 'uuid',
        },
        title: {
            type: 'varchar',
            nullable: false,
            length: 255,
        },
        description: {
            type: 'text',
            nullable: true
        },
        status: {
            type: 'enum',
            enum: ['pending', 'in_progress', 'completed'],
            default: 'pending'
        },
        assigned_to: {
            type: 'uuid'
        },
        project_id: {
            type: 'uuid'
        },
        due_date: {
            type: 'date',
            nullable: false
        },
        priority: {
            type: 'enum',
            enum: ['low', 'medium', 'high'],
            default: 'low'
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
            type: 'many-to-one',
            target: 'Project',
            JoinColumn: {
                name: 'project_id',
                referencedColumnName: 'id'
            },
            onDelete: 'CASCADE'
        },
        user: {
            type: 'many-to-one',
            target: 'User',
            JoinColumn: {
                name: 'assigned_to',
                referencedColumnName: 'id'
            },
            onDelete: 'CASCADE'
        }
    }

})