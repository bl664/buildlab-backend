const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'StudentProject',
  tableName: 'student_projects',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
    },
    student_id: {
      type: 'uuid',
      nullable: false,
    },
    project_id: {
      type: 'uuid',
      nullable: false,
    },
    participation_start_date: {
      type: 'date',
      nullable: false,
    },
    participation_end_date: {
      type: 'date',
      nullable: true,
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
  indices: [
    {
      name: 'IDX_student_project_unique',
      columns: ['student_id', 'project_id'],
      unique: true,  // enforce uniqueness
    },
  ],
  relations: {
    user: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'student_id',
        referencedColumnName: 'id',
      },
      onDelete: 'CASCADE',
    },
    project: {
      type: 'many-to-one',
      target: 'Project',
      joinColumn: {
        name: 'project_id',
        referencedColumnName: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
});
