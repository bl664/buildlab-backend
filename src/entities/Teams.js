const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
    name: 'Team',
    tableName: 'team',
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
          createdAt: {
            type: 'timestamp',
            createDate: true,
          },
          updatedAt: {
            type: 'timestamp',
            updateDate: true,
          },
    }
})