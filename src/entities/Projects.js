const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
    name: 'Project',
    tableName: 'projects', // Adjusted to plural for clarity
    columns: {
        id: { primary: true, type: 'uuid', generated: 'uuid' },
        name: { type: 'varchar', nullable: false },
        description: { type: 'text', unique: true, nullable: false },
        status: { type: 'enum', enum: ['active', 'completed', 'on_hold'], default: 'active' },
        start_date: { type: 'date', nullable: false },
        end_date: { type: 'date', nullable: false },
        created_by_id: { type: 'uuid', nullable: false },
        createdAt: { type: 'timestamp', createDate: true },
        updatedAt: { type: 'timestamp', updateDate: true },
    },
    relations: {
        // Changed 'students' to 'users' for consistency
        users: {
            target: 'User',
            type: 'many-to-many',
            mappedBy: 'projects',
        },
        created_by: {
            target: 'User',
            type: 'many-to-one',
            joinColumn: { name: 'created_by_id', referencedColumnName: 'id' },
        },
    },
});
