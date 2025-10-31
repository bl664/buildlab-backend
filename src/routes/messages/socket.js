const { Server } = require("socket.io");
const { queryDatabase } = require('../../services/dbQuery');
const APP_CONFIG = require('../../../config');
const cookie = require("cookie");
const jwt = require("jsonwebtoken");

const users = new Map(); // userId -> socketId
const activeChats = new Map();

console.log("Initializing socket...");

const initializeSocket = (server) => {

  const io = new Server(server, {
  cookie: true,
  cors: {
    origin: [
      APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS,
      APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS,
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});


  io.on("connection", async (socket) => {
    
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔌 New Socket Connection`);
  console.log(`📍 Socket ID: ${socket.id}`);
  console.log(`🌐 Origin: ${socket.handshake.headers.origin}`);
  console.log(`🚀 Transport: ${socket.conn.transport.name}`);
  console.log(`🔒 Secure: ${socket.handshake.secure}`);
  
  let userId = null;

  // Check for cookies
  const cookieHeader = socket.handshake.headers.cookie;
  console.log(`🍪 Raw Cookie Header: ${cookieHeader || 'MISSING'}`);

  if (cookieHeader) {
    try {
      const cookies = cookie.parse(cookieHeader);
      console.log(`🍪 Parsed Cookie Keys:`, Object.keys(cookies));
      console.log(`🔍 Looking for cookie: "${APP_CONFIG.BL_AUTH_COOKIE_NAME}"`);
      
      const userToken = cookies[APP_CONFIG.BL_AUTH_COOKIE_NAME];
      
      if (userToken) {
        console.log(`✅ Auth cookie found, length: ${userToken.length}`);
        
        try {
          const decoded = jwt.verify(userToken, APP_CONFIG.BL_AUTH_SECRET_KEY);
          userId = decoded.userId;
          console.log(`✅ JWT verified, User ID: ${userId}`);
          
          users.set(userId, socket.id);
          await sendExistingUnreadCounts(socket, userId);
          
          // // Emit success to client
          // socket.emit('authenticated', { userId });

          socket.broadcast.emit('userOnline', { userId });

          // ✅ Also emit to the connecting user about who else is online
          const onlineUserIds = Array.from(users.keys()).filter(id => id !== userId);
          console.log(`📤 Sending online users list to ${userId}:`, onlineUserIds);
          socket.emit('onlineUsers', { userIds: onlineUserIds });

        } catch (jwtErr) {
          console.error(`❌ JWT verification failed: ${jwtErr.message}`);
          socket.emit('authError', { message: 'Invalid token' });
        }
      } else {
        console.error(`❌ Cookie "${APP_CONFIG.BL_AUTH_COOKIE_NAME}" not found`);
        console.error(`❌ Available cookies: ${Object.keys(cookies).join(', ')}`);
        socket.emit('authError', { message: 'Auth cookie missing' });
      }
    } catch (parseErr) {
      console.error(`❌ Cookie parsing failed: ${parseErr.message}`);
      socket.emit('authError', { message: 'Cookie parse error' });
    }
  } else {
    console.error('❌ No cookie header in request');
    console.error('📋 All headers:', JSON.stringify(socket.handshake.headers, null, 2));
    socket.emit('authError', { message: 'No cookies received' });
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
    if (!userId) {
    console.log('⚠️ Disconnecting unauthenticated socket');
    socket.disconnect();
    return;
  }

  // Add error handler
  socket.on("error", (error) => {
    console.error(`❌ Socket error for user ${userId}:`, error);
  });

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

        // console.log(`📊 Total unread count for user ${userId}: ${totalCount}`);

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

//     socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
//       try {
//         if (!message || !message.trim()) return;
// console.log("message is ", senderId, receiverId, message.trim())
//         const result = await queryDatabase(
//           `INSERT INTO messages (sender_id, receiver_id, message, status) 
//        VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
//           [senderId, receiverId, message.trim(), "sent"]
//         );

//         const messageData = result[0];
//         const messageId = messageData?.id;
//         if (!messageId) return;

//         const receiverSocketId = users.get(receiverId);

//         if (receiverSocketId) {
//           // send to receiver
//           io.to(receiverSocketId).emit("receiveMessage", {
//             id: messageId,
//             senderId,
//             message: message.trim(),
//             timestamp: messageData.created_at
//           });

//           // check if receiver has this chat open
//           const isActiveChat = activeChats.get(receiverId) === senderId;

//           if (isActiveChat) {
//             // update to READ
//             await queryDatabase("UPDATE messages SET status = $1 WHERE id = $2", ["read", messageId]);

//             // notify sender instantly
//             const senderSocketId = users.get(senderId);
//             if (senderSocketId) {
//               io.to(senderSocketId).emit("messagesRead", {
//                 peerId: receiverId,
//                 all: true // bulk update locally
//               });
//             }
//           } else {
//             // normal DELIVERED
//             await queryDatabase("UPDATE messages SET status = $1 WHERE id = $2", ["delivered", messageId]);

//             const senderSocketId = users.get(senderId);
//             if (senderSocketId) {
//               io.to(senderSocketId).emit("messagesDelivered", {
//                 peerId: receiverId,
//                 all: true
//               });
//             }
//           }
//         } else {
//           console.log(`📵 User ${receiverId} offline; stored for later`);
//         }
//       } catch (err) {
//         console.error("sendMessage error:", err.message);
//       }
//     });

  //   socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
  //   // Validate senderId matches authenticated userId
  //   if (senderId !== userId) {
  //     console.error(`❌ SenderId mismatch: ${senderId} !== ${userId}`);
  //     socket.emit("messageError", { error: "Unauthorized" });
  //     return;
  //   }

  //   console.log(`📨 Message: ${senderId} -> ${receiverId}: "${message.substring(0, 50)}..."`);
    
  //   try {
  //     if (!message || !message.trim()) {
  //       console.error("❌ Empty message");
  //       socket.emit("messageError", { error: "Message cannot be empty" });
  //       return;
  //     }

  //     const result = await queryDatabase(
  //       `INSERT INTO messages (sender_id, receiver_id, message, status) 
  //        VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
  //       [senderId, receiverId, message.trim(), "sent"]
  //     );

  //     if (!result || result.length === 0) {
  //       console.error("❌ Database insert failed");
  //       socket.emit("messageError", { error: "Failed to save message" });
  //       return;
  //     }

  //     const messageData = result[0];
  //     const messageId = messageData?.id;
      
  //     console.log(`✅ Message saved with ID: ${messageId}`, users);

  //     const receiverSocketId = users.get(receiverId);

  //     if (receiverSocketId) {
  //       console.log(`📤 Delivering to receiver socket: ${receiverSocketId}`);
        
  //       io.to(receiverSocketId).emit("receiveMessage", {
  //         id: messageId,
  //         senderId,
  //         message: message.trim(),
  //         timestamp: messageData.created_at,
  //         status: 'delivered'
  //       });

  //       const isActiveChat = activeChats.get(receiverId) === senderId;

  //       if (isActiveChat) {
  //         console.log(`👀 Receiver has chat open, marking as read`);
  //         await queryDatabase("UPDATE messages SET status = $1 WHERE id = $2", ["read", messageId]);
          
  //         const senderSocketId = users.get(senderId);
  //         if (senderSocketId) {
  //           io.to(senderSocketId).emit("messagesRead", {
  //             peerId: receiverId,
  //             all: true
  //           });
  //         }
  //       } else {
  //         console.log(`📬 Receiver chat not active, marking as delivered`);
  //         await queryDatabase("UPDATE messages SET status = $1 WHERE id = $2", ["delivered", messageId]);
          
  //         const senderSocketId = users.get(senderId);
  //         if (senderSocketId) {
  //           io.to(senderSocketId).emit("messagesDelivered", {
  //             peerId: receiverId,
  //             all: true
  //           });
  //         }
  //       }
  //     } else {
  //       console.log(`📵 Receiver ${receiverId} is offline`);
  //     }
      
  //     // Confirm to sender
  //     socket.emit("messageSent", { 
  //       messageId, 
  //       timestamp: messageData.created_at 
  //     });
      
  //   } catch (err) {
  //     console.error("❌ sendMessage error:", err.message);
  //     console.error(err.stack);
  //     socket.emit("messageError", { error: "Failed to send message" });
  //   }
  // });

  socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
    if (senderId !== userId) {
        console.error(`❌ SenderId mismatch: ${senderId} !== ${userId}`);
        socket.emit("messageError", { error: "Unauthorized" });
        return;
    }
    
    try {
        if (!message || !message.trim()) {
            socket.emit("messageError", { error: "Message cannot be empty" });
            return;
        }

        const result = await queryDatabase(
            `INSERT INTO messages (sender_id, receiver_id, message, status) 
             VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
            [senderId, receiverId, message.trim(), "sent"]
        );

        if (!result || result.length === 0) {
            socket.emit("messageError", { error: "Failed to save message" });
            return;
        }

        const messageData = result[0];
        const messageId = messageData?.id;
        
        // ✅ GET COMPLETE SENDER INFO
        const senderInfo = await queryDatabase(
            `SELECT user_id, name, email, role, is_online FROM messaging_users WHERE user_id = $1`,
            [senderId]
        );

        const receiverSocketId = users.get(receiverId);
        
        if (receiverSocketId) {
            // ✅ SEND COMPLETE SENDER INFO to receiver
            io.to(receiverSocketId).emit("receiveMessage", {
                id: messageId,
                senderId,
                senderName: senderInfo[0]?.name || 'Unknown User',
                senderEmail: senderInfo[0]?.email || '',
                senderRole: senderInfo[0]?.role || 'student',
                senderOnline: users.has(senderId), // Real-time online status
                message: message.trim(),
                timestamp: messageData.created_at,
                status: 'delivered'
            });

            const isActiveChat = activeChats.get(receiverId) === senderId;

            if (isActiveChat) {
                await queryDatabase("UPDATE messages SET status = $1 WHERE id = $2", ["read", messageId]);
                
                const senderSocketId = users.get(senderId);
                if (senderSocketId) {
                    io.to(senderSocketId).emit("messagesRead", {
                        peerId: receiverId,
                        all: true
                    });
                }
            } else {
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
            console.log(`📵 Receiver ${receiverId} is offline`);
        }
        
        socket.emit("messageSent", { 
            messageId, 
            timestamp: messageData.created_at 
        });
        
    } catch (err) {
        console.error("❌ sendMessage error:", err.message);
        console.error(err.stack);
        socket.emit("messageError", { error: "Failed to send message" });
    }
});

    socket.on("activeChat", ({ peerId }) => {
      activeChats.set(userId, peerId);
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
    // socket.on("disconnect", async () => {
    //   if (userId) {
    //     users.delete(userId);
    //     activeChats.delete(userId)
    //     console.log(`User ${userId} disconnected and activeChats deleted.`);

    //     // const allUsers = await getAllUsers();
    //     // notifyUsersStatus(io, allUsers.filter(id => id !== userId), userId, false);
    //   }
    // });

      socket.on("disconnect", async (reason) => {
    console.log(`🔌 User ${userId} disconnected: ${reason}`);
    if (userId) {
      users.delete(userId);
      activeChats.delete(userId);
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

module.exports = initializeSocket;
module.exports.users = users;
