const { Server } = require("socket.io");
const { queryDatabase } = require('../../services/dbQuery');
const APP_CONFIG = require('../../../config');
const cookie = require("cookie");
const jwt = require("jsonwebtoken");

const users = new Map(); // userId -> socketId
const activeChats = new Map();

console.log("active chats are", activeChats)
console.log("Initializing socket...");

const initializeSocket = (server) => {
  const io = new Server(server, {
    cookie: true,
    cors: {
      origin: [APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS, APP_CONFIG.DEFAULT_REDIRECT_URL, APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", async (socket) => {
    let userId = null;

    // Parse and verify JWT from cookie
    if (socket.handshake.headers.cookie) {
      const cookies = cookie.parse(socket.handshake.headers.cookie);
      const userToken = cookies['bl_auth'];

      if (userToken) {
        try {
          const decoded = jwt.verify(userToken, APP_CONFIG.BL_AUTH_SECRET_KEY);
          userId = decoded.userId;

          users.set(userId, socket.id);
          console.log(`User ${userId} connected.`);

          // ✅ Send existing unread counts when user connects
          await sendExistingUnreadCounts(socket, userId);

          // Notify all users that this user is online
          // const allUsers = await getAllUsers();
          // notifyUsersStatus(io, allUsers.filter(id => id !== userId), userId, true);
        } catch (err) {
          console.error("Invalid token:", err.message);
        }
      }
    }

    // ✅ NEW: Send existing unread message counts to the user
    socket.on("requestUnreadCounts", async ({ userId }) => {
      if (userId) {
        await sendExistingUnreadCounts(socket, userId);
      }
    });

    // ✅ NEW: Get unread counts for specific users
    socket.on("getUnreadCountsForUsers", async ({ userIds }, callback) => {
      try {
        if (!userId) {
          callback({ error: "Not authenticated" });
          return;
        }

        const unreadCounts = {};

        for (const fromUserId of userIds) {
          const result = await queryDatabase(
            "SELECT COUNT(*) as count FROM messages WHERE sender_id = $1 AND receiver_id = $2 AND status != 'read'",
            [fromUserId, userId]
          );

          const count = parseInt(result[0]?.count || 0);
          if (count > 0) {
            unreadCounts[fromUserId] = count;
          }
        }

        console.log(`📊 Unread counts for user ${userId}:`, unreadCounts);

        if (callback) {
          callback({ unreadCounts });
        }
      } catch (err) {
        console.error("Error getting unread counts for users:", err.message);
        if (callback) {
          callback({ error: err.message, unreadCounts: {} });
        }
      }
    });

    // ✅ NEW: Get total unread message count
    socket.on("getTotalUnreadCount", async (callback) => {
      try {
        if (!userId) {
          callback({ error: "Not authenticated" });
          return;
        }

        const result = await queryDatabase(
          "SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND status != 'read'",
          [userId]
        );

        const totalCount = parseInt(result[0]?.count || 0);

        console.log(`📊 Total unread count for user ${userId}: ${totalCount}`);

        if (callback) {
          callback({ totalCount });
        }
      } catch (err) {
        console.error("Error getting total unread count:", err.message);
        if (callback) {
          callback({ error: err.message, totalCount: 0 });
        }
      }
    });

    // On-demand status check
    socket.on("checkOnlineStatus", ({ userId: targetId }, callback) => {
      const isOnline = users.has(targetId);
      callback({ userId: targetId, isOnline });
    });

    socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
      try {
        if (!message || !message.trim()) return;

        const result = await queryDatabase(
          `INSERT INTO messages (sender_id, receiver_id, message, status) 
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
          [senderId, receiverId, message.trim(), "sent"]
        );

        const messageData = result[0];
        const messageId = messageData?.id;
        if (!messageId) return;

        const receiverSocketId = users.get(receiverId);

        if (receiverSocketId) {
          // send to receiver
          io.to(receiverSocketId).emit("receiveMessage", {
            id: messageId,
            senderId,
            message: message.trim(),
            timestamp: messageData.created_at
          });

          // check if receiver has this chat open
          const isActiveChat = activeChats.get(receiverId) === senderId;

          if (isActiveChat) {
            // update to READ
            await queryDatabase("UPDATE messages SET status = $1 WHERE id = $2", ["read", messageId]);

            // notify sender instantly
            const senderSocketId = users.get(senderId);
            if (senderSocketId) {
              io.to(senderSocketId).emit("messagesRead", {
                peerId: receiverId,
                all: true // bulk update locally
              });
            }
          } else {
            // normal DELIVERED
            await queryDatabase("UPDATE messages SET status = $1 WHERE id = $2", ["delivered", messageId]);

            const senderSocketId = users.get(senderId);
            if (senderSocketId) {
              io.to(senderSocketId).emit("messagesDelivered", {
                peerId: receiverId,
                all: true
              });
            }
          }
        } else {
          console.log(`📵 User ${receiverId} offline; stored for later`);
        }
      } catch (err) {
        console.error("sendMessage error:", err.message);
      }
    });

    socket.on("activeChat", ({ peerId }) => {
      activeChats.set(userId, peerId);
      console.log("active chats are", activeChats)
    });

    socket.on("inactiveChat", ({ peerId }) => {
      if (activeChats.get(userId) === peerId) {
        activeChats.delete(userId);
      }
    });

    // Handle message delivery confirmation
    socket.on("messageDelivered", async ({ userId }, ack) => {
      try {
        const res = await queryDatabase(
          `UPDATE messages
       SET status = 'delivered'
       WHERE receiver_id = $1
         AND status = 'sent'
       RETURNING sender_id`,
          [userId]
        );

        if (!res || res.length === 0) return;

        // notify each distinct sender that "their thread with userId is delivered"
        const uniqueSenders = [...new Set(res.map(r => r.sender_id))];
        for (const senderUserId of uniqueSenders) {
          const senderSocketId = users.get(senderUserId);
          if (senderSocketId) {
            io.to(senderSocketId).emit("messagesDelivered", {
              peerId: userId,  // <-- the receiver who just came online / acknowledged
              all: true
            });
          }
        }

        // (optional) also tell the receiver's own client if you want them to update anything
        socket.emit("messagesDelivered", { peerId: userId, all: true });
      } catch (err) {
        console.error("Error updating messages:", err);
      }
    });

    socket.on("markMessagesRead", async ({ userId, fromUserId }, callback) => {
      try {
        console.log(`📖 Marking messages as read: ${fromUserId} -> ${userId}`);
        // 1) Update DB - mark all delivered messages as read
        const resultUpdateDB = await queryDatabase(
          `UPDATE messages 
       SET status = 'read'
       WHERE sender_id = $1 
         AND receiver_id = $2 
         AND status = 'delivered'
       RETURNING id`,
          [fromUserId, userId]
        );

        const updatedCount = resultUpdateDB.length;

        // 2) Notify the sender (user A) that their messages were read
        const senderSocketId = users.get(fromUserId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messagesMarkedRead", {
            fromUserId: userId,
            count: updatedCount,
          });
        }

        // 3) Confirm back to receiver’s client (optional, for UI consistency)
        if (callback) callback({ success: true, count: updatedCount });

      } catch (err) {
        console.error("Error in markMessagesRead:", err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Get unread message count for a user
    socket.on("getUnreadMessageCount", async ({ fromUserId }, callback) => {
      try {
        const result = await queryDatabase(
          "SELECT COUNT(*) as count FROM messages WHERE sender_id = $1 AND receiver_id = $2 AND status != 'read'",
          [fromUserId, userId]
        );

        const count = parseInt(result[0]?.count || 0);
        if (callback) {
          callback({ fromUserId, count });
        }
      } catch (err) {
        console.error("Error getting unread message count:", err.message);
        if (callback) {
          callback({ fromUserId, count: 0, error: err.message });
        }
      }
    });

    // Handle notification events (keeping existing code)
    socket.on("sendNotification", async (notificationData) => {
      try {
        const { receiverId, type, content, url, created_by } = notificationData;

        console.log(`🔔 Sending notification: ${type} to user ${receiverId}`);

        const notificationResult = await queryDatabase(
          "INSERT INTO notifications (type, content, created_by, url) VALUES ($1, $2, $3, $4) RETURNING *",
          [type, content, created_by, url || null]
        );

        const savedNotification = notificationResult[0];

        await queryDatabase(
          "INSERT INTO notification_recipients (notification_id, user_id, is_read) VALUES ($1, $2, $3)",
          [savedNotification.id, receiverId, false]
        );

        const receiverSocketId = users.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveNotification", {
            id: savedNotification.id,
            type: savedNotification.type,
            content: savedNotification.content,
            created_by: savedNotification.created_by,
            created_at: savedNotification.created_at,
            url: savedNotification.url,
            is_read: false
          });
        } else {
          console.log(`📵 User ${receiverId} is offline, notification stored for later`);
        }
      } catch (err) {
        console.error("sendNotification error:", err.message);
      }
    });

    // Mark notification as read
    socket.on("markNotificationRead", async ({ notificationId }, callback) => {
      try {
        await queryDatabase(
          "UPDATE notification_recipients SET is_read = true WHERE notification_id = $1 AND user_id = $2",
          [notificationId, userId]
        );

        if (callback) {
          callback({ success: true });
        }
      } catch (err) {
        console.error("Error marking notification as read:", err.message);
        if (callback) {
          callback({ success: false, error: err.message });
        }
      }
    });

    socket.on("getUnreadNotificationsCount", async (callback) => {
      try {
        const result = await queryDatabase(
          "SELECT COUNT(*) as count FROM notification_recipients WHERE user_id = $1 AND is_read = false",
          [userId]
        );

        const count = parseInt(result[0]?.count || 0);
        if (callback) {
          callback({ count });
        }
      } catch (err) {
        console.error("Error getting unread notifications count:", err.message);
        if (callback) {
          callback({ count: 0, error: err.message });
        }
      }
    });

    socket.on("getUserNotifications", async ({ limit = 20, offset = 0 }, callback) => {
      try {
        const result = await queryDatabase(
                    `SELECT n.*, 
                mu.name AS creator_name, 
                nr.is_read
          FROM notifications n
          INNER JOIN notification_recipients nr 
              ON n.id = nr.notification_id
          LEFT JOIN messaging_users mu 
              ON n.created_by = mu.user_id
          WHERE nr.user_id = $1
          ORDER BY n.created_at DESC
          LIMIT $2 OFFSET $3;
          `,
          [userId, limit, offset]
        );

        if (callback) {
          callback({ notifications: result });
        }
      } catch (err) {
        console.error("Error getting user notifications:", err.message);
        if (callback) {
          callback({ notifications: [], error: err.message });
        }
      }
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      if (userId) {
        users.delete(userId);
        activeChats.delete(userId)
        console.log(`User ${userId} disconnected and activeChats deleted.`);

        // const allUsers = await getAllUsers();
        // notifyUsersStatus(io, allUsers.filter(id => id !== userId), userId, false);
      }
    });
  });

  return io;
};

// ✅ NEW: Helper function to send existing unread counts
async function sendExistingUnreadCounts(socket, userId) {
  try {
    // Get all users who have sent unread messages to this user
    const result = await queryDatabase(
      `SELECT sender_id, COUNT(*) as count 
       FROM messages 
       WHERE receiver_id = $1 AND status != 'read' 
       GROUP BY sender_id`,
      [userId]
    );

    const unreadCounts = {};
    let totalUnread = 0;

    result.forEach(row => {
      const count = parseInt(row.count);
      unreadCounts[row.sender_id] = count;
      totalUnread += count;
    });

    // console.log(`📊 Sending existing unread counts to user ${userId}:`, unreadCounts);
    // console.log(`📊 Total unread: ${totalUnread}`);

    // Send individual user counts
    socket.emit("existingUnreadCounts", { unreadCounts, totalUnread });

  } catch (err) {
    console.error("Error sending existing unread counts:", err.message);
  }
}

// Helper: Get user's relevant contacts
async function getUserContacts(userId) {
  try {
    const result = await queryDatabase(
      `SELECT DISTINCT 
        CASE 
          WHEN sender_id = $1 THEN receiver_id 
          ELSE sender_id 
        END as contact_id
      FROM messages 
      WHERE sender_id = $1 OR receiver_id = $1`,
      [userId]
    );
    return result.map(row => row.contact_id);
  } catch (err) {
    console.error("Error fetching contacts:", err.message);
    return [];
  }
}

// Helper: Notify contacts about user's status
function notifyUsersStatus(io, userIds, userId, isOnline) {
  userIds.forEach(contactId => {
    const socketId = users.get(contactId);
    if (socketId) {
      io.to(socketId).emit(isOnline ? "userOnline" : "userOffline", { userId });
    }
  });
}

// async function getAllUsers() {
//   try {
//     const result = await queryDatabase(
//       `SELECT id FROM users WHERE role IN ('student', 'mentor')`,
//       []
//     );
//     return result.map(row => row.id);
//   } catch (err) {
//     console.error("Error fetching all users:", err.message);
//     return [];
//   }
// }

module.exports = initializeSocket;
module.exports.users = users;
