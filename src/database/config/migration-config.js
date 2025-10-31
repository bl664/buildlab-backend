const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
const path = require('path');
const APP_CONFIG = require('../../../config.js');
dotenv.config();

// console.log("app config",  APP_CONFIG.HOST, APP_CONFIG.DB_PORT, APP_CONFIG.USERNAME,  APP_CONFIG.PASSWORD, APP_CONFIG.DATABASE);

const migrationConfig = {
    type: 'postgres',
    host: APP_CONFIG.HOST,
    port: APP_CONFIG.DB_PORT,
    username: APP_CONFIG.USERNAME,
    password: APP_CONFIG.PASSWORD,
    database: APP_CONFIG.DATABASE,
    migrations: [
        path.join(__dirname, '../migrations/1640000000000-CreateEnumTypes.js'),
        path.join(__dirname, '../migrations/1640000000001-CreateUsersTable.js'),
        path.join(__dirname, '../migrations/1640000000002-CreateProjectsTable.js'),
        path.join(__dirname, '../migrations/1640000000003-CreateUserProfilesTable.js'),
        path.join(__dirname, '../migrations/1640000000004-CreateTasksTable.js'),
        path.join(__dirname, '../migrations/1640000000005-CreateTeamsTable.js'),
        path.join(__dirname, '../migrations/1640000000006-CreateStudentProjectsTable.js'),
        path.join(__dirname, '../migrations/1640000000007-CreateMentorProjectsTable.js'),
        path.join(__dirname, '../migrations/1640000000008-CreateStudentTasksTable.js'),
        path.join(__dirname, '../migrations/1640000000009-CreateMentorTasksTable.js'),
        path.join(__dirname, '../migrations/1640000000010-CreateTaskCommentsTable.js'),
        path.join(__dirname, '../migrations/1640000000011-CreateStudentTeamsTable.js'),
        path.join(__dirname, '../migrations/1640000000012-CreateDailyTasksTable.js'),
        path.join(__dirname, '../migrations/1640000000013-CreateMeetingsTable.js'),
        path.join(__dirname, '../migrations/1640000000014-CreateStudentMeetingsTable.js'),
        path.join(__dirname, '../migrations/1640000000015-CreateMentorMeetingsTable.js'),
        path.join(__dirname, '../migrations/1640000000016-CreateNotificationsTable.js'),
        path.join(__dirname, '../migrations/1640000000017-CreateNotificationRecipientsTable.js'),
        path.join(__dirname, '../migrations/1640000000018-CreateMessagesTable.js'),
        path.join(__dirname, '../migrations/1640000000019-CreateGithubUsersTable.js'),
        path.join(__dirname, '../migrations/1640000000020-CreateStudentGroupsTable.js'),
        path.join(__dirname, '../migrations/1640000000021-CreateStudentGroupMembersTable.js'),
        path.join(__dirname, '../migrations/1640000000022-CreateStudentGroupRequestsTable.js'),
        path.join(__dirname, '../migrations/1640000000023-CreateMessagingUsersTable.js'),
        path.join(__dirname, '../migrations/1640000000024-CreateExtensions.js'),
        path.join(__dirname, '../migrations/1640000000026-CreateTriggersForUpdatedAt.js'),
        path.join(__dirname, '../migrations/1690000000000-AddRoleToStudentTeams.js'),
        path.join(__dirname, '../migrations/1640000000030-AlterStudentGroupsAddMaxMembersAndTags.js'),
        path.join(__dirname, '../migrations/1690000000001-CreateUsersAdditionalInfoTable.js'),
        path.join(__dirname, '../migrations/1690000000002-DropColumnsFromUsersAndUsersAdditionalInfo.js'),
        path.join(__dirname, '../migrations/1690000000003-MakeUserIdUniqueInUsersAdditionalInfo.js'),
        path.join(__dirname, '../migrations/1650000000001-AddAuthColumnsToUsers.js'),
        //path.join(__dirname, '../migrations/1650000000004-UpdateUsersAdditionalInfo.js'),
        path.join(__dirname, '../migrations/1650000000003-AddVeifiedColumnToUsers'),
        path.join(__dirname, '../migrations/1690000000004-AddColumnToAdditionalUsersInfo.js'),
        path.join(__dirname, '../migrations/1690000000005-CreateStudentGroupProjectsTable.js')
    ],

    migrationsTableName: 'migrations_history',

    extra: {
        max: 20,
        min: 2,
        acquire: 60000,
        idle: 10000,
        evict: 1000,
        createTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 600000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
    },

    logging: process.env.NODE_ENV === 'development' ? 'all' : ['error', 'warn'],
    logger: 'advanced-console',

    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

    synchronize: false,
    migrationsRun: false,
    dropSchema: false,
};

// Load all migration classes with correct naming
const CreateEnumTypes = require('../migrations/1640000000000-CreateEnumTypes.js');
const CreateUsersTable = require('../migrations/1640000000001-CreateUsersTable.js');
const CreateProjectsTable = require('../migrations/1640000000002-CreateProjectsTable.js');
const CreateUserProfilesTable = require('../migrations/1640000000003-CreateUserProfilesTable.js');
const CreateTasksTable = require('../migrations/1640000000004-CreateTasksTable.js');
const CreateTeamsTable = require('../migrations/1640000000005-CreateTeamsTable.js');
const CreateStudentProjectsTable = require('../migrations/1640000000006-CreateStudentProjectsTable.js');
const CreateMentorProjectsTable = require('../migrations/1640000000007-CreateMentorProjectsTable.js');
const CreateStudentTasksTable = require('../migrations/1640000000008-CreateStudentTasksTable.js');
const CreateMentorTasksTable = require('../migrations/1640000000009-CreateMentorTasksTable.js');
const CreateTaskCommentsTable = require('../migrations/1640000000010-CreateTaskCommentsTable.js');
const CreateStudentTeamsTable = require('../migrations/1640000000011-CreateStudentTeamsTable.js');
const CreateDailyTasksTable = require('../migrations/1640000000012-CreateDailyTasksTable.js');
const CreateMeetingsTable = require('../migrations/1640000000013-CreateMeetingsTable.js');
const CreateStudentMeetingsTable = require('../migrations/1640000000014-CreateStudentMeetingsTable.js');
const CreateMentorMeetingsTable = require('../migrations/1640000000015-CreateMentorMeetingsTable.js');
const CreateNotificationsTable = require('../migrations/1640000000016-CreateNotificationsTable.js');
const CreateNotificationRecipientsTable = require('../migrations/1640000000017-CreateNotificationRecipientsTable.js');
const CreateMessagesTable = require('../migrations/1640000000018-CreateMessagesTable.js');
const CreateGithubUsersTable = require('../migrations/1640000000019-CreateGithubUsersTable.js');
const CreateStudentGroupsTable = require('../migrations/1640000000020-CreateStudentGroupsTable.js');
const CreateStudentGroupMembersTable = require('../migrations/1640000000021-CreateStudentGroupMembersTable.js');
const CreateStudentGroupRequestsTable = require('../migrations/1640000000022-CreateStudentGroupRequestsTable.js');
const CreateMessagingUsersTable = require('../migrations/1640000000023-CreateMessagingUsersTable.js');
const CreateExtensions = require('../migrations/1640000000024-CreateExtensions.js');
const CreateTriggers = require('../migrations/1640000000026-CreateTriggersForUpdatedAt.js');
const CreateRoleToStudentsTeam = require('../migrations/1690000000000-AddRoleToStudentTeams.js');
const AlterStudentGroupsAddMaxMembersAndTags = require('../migrations/1640000000030-AlterStudentGroupsAddMaxMembersAndTags.js');
const CreateUsersAdditionalInfoTable = require('../migrations/1690000000001-CreateUsersAdditionalInfoTable.js');
const DropColumnsFromUsersAndUsersAdditionalInfo = require('../migrations/1690000000002-DropColumnsFromUsersAndUsersAdditionalInfo.js')
const MakeUserIdUniqueInUsersAdditionalInfo = require('../migrations/1690000000003-MakeUserIdUniqueInUsersAdditionalInfo.js')
const AddColumnsToUsers = require('../migrations/1650000000001-AddAuthColumnsToUsers.js')
// const CreateUsersAdditionalInfo = require('../migrations/1650000000004-UpdateUsersAdditionalInfo.js')
const AddverifiedColumnsToUsers = require('../migrations/1650000000003-AddVeifiedColumnToUsers')
const AddVerificationAttempYOUSerAdditionalInfo = require('../migrations/1690000000004-AddColumnToAdditionalUsersInfo.js')
const CreateStudentGroupProjectsTable = require('../migrations/1690000000005-CreateStudentGroupProjectsTable.js');

const AppDataSourceWithDirectImports = new DataSource({
    ...migrationConfig,
    migrations: [
        CreateEnumTypes,
        CreateUsersTable,
        CreateProjectsTable,
        CreateUserProfilesTable,
        CreateTasksTable,
        CreateTeamsTable,
        CreateStudentProjectsTable,
        CreateMentorProjectsTable,
        CreateStudentTasksTable,
        CreateMentorTasksTable,
        CreateTaskCommentsTable,
        CreateStudentTeamsTable,
        CreateDailyTasksTable,
        CreateMeetingsTable,
        CreateStudentMeetingsTable,
        CreateMentorMeetingsTable,
        CreateNotificationsTable,
        CreateNotificationRecipientsTable,
        CreateMessagesTable,
        CreateGithubUsersTable,
        CreateStudentGroupsTable,
        CreateStudentGroupMembersTable,
        CreateStudentGroupRequestsTable,
        CreateMessagingUsersTable,
        CreateExtensions,
        CreateTriggers,
        CreateRoleToStudentsTeam,
        AlterStudentGroupsAddMaxMembersAndTags,
        CreateUsersAdditionalInfoTable,
        DropColumnsFromUsersAndUsersAdditionalInfo,
        MakeUserIdUniqueInUsersAdditionalInfo,
        AddColumnsToUsers,
        //CreateUsersAdditionalInfo,
        AddverifiedColumnsToUsers,
        AddVerificationAttempYOUSerAdditionalInfo,
        CreateStudentGroupProjectsTable
    ],
    // ssl: { rejectUnauthorized: false },

});

module.exports = {
    AppDataSource: AppDataSourceWithDirectImports,
    migrationConfig
};
