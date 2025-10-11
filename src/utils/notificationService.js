// utils/notificationService.js

const { queryDatabase } = require('../services/dbQuery');
const { users } = require('../routes/messages/socket');

const sendAndStoreNotification = async (io, recipientId, {
    type,
    content,
    createdBy,
    url
}) => {
    // Save notification to DB
    const notificationInsert = `
        INSERT INTO notifications (type, content, created_by, url)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;
    const notificationResult = await queryDatabase(notificationInsert, [
        type,
        content,
        createdBy,
        url,
    ]);
    const savedNotification = notificationResult[0];

    // Link to recipient
    await queryDatabase(
        "INSERT INTO notification_recipients (notification_id, user_id) VALUES ($1, $2)",
        [savedNotification.id, recipientId]
    );

    // Emit real-time notification
    const userSocketId = users.get(recipientId);
    console.log("user socket id is", userSocketId, users, recipientId)
    if (userSocketId && io) {

        try {
            console.log("trying sending request")
            io.to(userSocketId).emit("receiveNotification", {
                id: savedNotification.id,
                type: savedNotification.type,
                content: savedNotification.content,
                created_by: savedNotification.created_by,
                created_at: savedNotification.created_at,
                url: savedNotification.url,
            });
            console.log(`Real-time notification sent to user ${recipientId}`);
        } catch (err) {
            console.warn(`Failed to send socket notification to user ${recipientId}`, err);
        }
    } else {
        console.log(`User ${recipientId} not online. Notification saved in DB.`);
    }

    return savedNotification;
};

module.exports = {
    sendAndStoreNotification,
};
