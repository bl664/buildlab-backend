const { DataSource } = require('typeorm');
const User = require('./src/entities/User');
const Project = require('./src/entities/Projects');
const Team = require('./src/entities/Teams');
const ProjectTeam = require('./src/entities/ProjectTeams');
const ActivityFeed = require('./src/entities/ActivityFeed');
const Message = require('./src/entities/Messages');
const Notification = require('./src/entities/Notifications');
const ProgressTracking = require('./src/entities/ProgressTracking');
const Setting = require('./src/entities/Settings');
const Task = require('./src/entities/Tasks');
const StudentProject = require('./src/entities/StudentProjects');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'buildlabapp',
  synchronize: false, // Set to true in development, but false in production
  entities: [
    User,
    Project,
    Team,
    ProgressTracking,
    ActivityFeed,
    Message,
    Notification,
    Setting,
    Task,
    ProjectTeam
  ], 
  migrations: [__dirname + '/src/migrations/*.js'],
  cli: {
    migrationsDir: 'src/migrations',
  },
});

module.exports = AppDataSource;
