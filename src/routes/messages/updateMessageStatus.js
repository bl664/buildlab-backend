// helpers/messages.js
async function updateMessageStatus(io, users, messageId, newStatus, receiverId) {
  try {
    // Update in DB
    const res = await queryDatabase(
      `UPDATE messages
       SET status = $1
       WHERE id = $2
       RETURNING id, sender_id, receiver_id, created_at`,
      [newStatus, messageId]
    );

    if (!res || res.length === 0) {
      console.warn(`No message found for id ${messageId}`);
      return;
    }

    const msg = res[0];

    // Notify receiver (to update their UI)
    const receiverSocketId = users.get(msg.receiver_id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messagesDelivered", { 
        messageIds: [msg.id] 
      });
    }

    // Notify sender (so they know delivery succeeded)
    const senderSocketId = users.get(msg.sender_id);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesDelivered", { 
        messageIds: [msg.id], 
        userId: msg.receiver_id 
      });
    }

    console.log(`✅ Message ${msg.id} updated to '${newStatus}'`);
    return msg;
  } catch (err) {
    console.error("Error updating message status:", err.message);
    throw err;
  }
}

module.exports = { updateMessageStatus };
