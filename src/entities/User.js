// entities/User.js
const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
    },
    name: {
      type: 'varchar',
      nullable: false,
    },
    email: {
      type: 'varchar',
      unique: true,
      nullable: false,
    },
    passwordHash: {
      type: 'varchar',
      nullable: false,
    },
    role: {
      type: 'enum',
      enum: ['admin', 'member'],
      default: 'member',
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
    updatedAt: {
      type: 'timestamp',
      updateDate: true,
    },
  },
  relations: {
    projects: {
        target: 'Project',
        type: 'many-to-many',
        joinTable: {
            name: 'student_projects', // Ensure this join table exists
            joinColumn: { name: 'student_id', referencedColumnName: 'id' },
            inverseJoinColumn: { name: 'project_id', referencedColumnName: 'id' },
        },
    },
},

});
