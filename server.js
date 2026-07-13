const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MAX_NAME_LENGTH = 24;
const MAX_MESSAGE_LENGTH = 500;
const ROOM_HISTORY_LIMIT = 80;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || false
  }
});

app.use(express.static('public'));

const users = new Map();
const rooms = new Map();
const actionBuckets = new Map();

function cleanText(value, maxLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function randomCoord() {
  return Math.floor(Math.random() * 78) + 11;
}

function isRateLimited(socketId, action, limit, windowMs) {
  const key = `${socketId}:${action}`;
  const now = Date.now();
  const bucket = actionBuckets.get(key) || [];
  const recent = bucket.filter((time) => now - time < windowMs);

  if (recent.length >= limit) {
    actionBuckets.set(key, recent);
    return true;
  }

  recent.push(now);
  actionBuckets.set(key, recent);
  return false;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    x: user.x,
    y: user.y,
    status: user.status
  };
}

function emitRadar() {
  io.emit('radar:update', Array.from(users.values()).map(publicUser));
}

function emitRoom(room) {
  const payload = roomPayload(room);

  room.members.forEach((memberId) => {
    io.to(memberId).emit('room:update', payload);
  });
}

function roomPayload(room) {
  return {
    id: room.id,
    name: room.name,
    ownerId: room.ownerId,
    isPrivate: room.isPrivate,
    members: room.members
      .map((id) => users.get(id))
      .filter(Boolean)
      .map((user) => ({
        id: user.id,
        username: user.username
      })),
    messages: room.messages
  };
}

function createRoom(ownerId, targetId, isPrivate) {
  const owner = users.get(ownerId);
  const target = users.get(targetId);

  if (!owner || !target || ownerId === targetId) {
    return null;
  }

  const room = {
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: isPrivate ? `${owner.username} private link` : `${owner.username} channel`,
    ownerId,
    isPrivate,
    members: [ownerId, targetId],
    banned: new Set(),
    messages: [],
    createdAt: Date.now()
  };

  rooms.set(room.id, room);
  return room;
}

function joinSocketToRoom(socketId, room) {
  const memberSocket = io.sockets.sockets.get(socketId);

  if (memberSocket) {
    memberSocket.join(room.id);
  }
}

function removeMember(room, targetId, type) {
  room.members = room.members.filter((id) => id !== targetId);

  const targetSocket = io.sockets.sockets.get(targetId);
  if (targetSocket) {
    targetSocket.leave(room.id);
    targetSocket.emit('room:removed', {
      roomId: room.id,
      type
    });
  }

  emitRoom(room);
}

io.on('connection', (socket) => {
  socket.on('user:join', (payload = {}) => {
    if (isRateLimited(socket.id, 'join', 8, 10000)) {
      return;
    }

    const username = cleanText(payload.username, MAX_NAME_LENGTH);

    if (!username) {
      socket.emit('app:error', 'Choose a name to enter the radar.');
      return;
    }

    users.set(socket.id, {
      id: socket.id,
      username,
      x: randomCoord(),
      y: randomCoord(),
      status: payload.status === 'busy' ? 'busy' : 'available'
    });

    socket.emit('user:ready', publicUser(users.get(socket.id)));
    emitRadar();
  });

  socket.on('radar:refresh', () => {
    socket.emit('radar:update', Array.from(users.values()).map(publicUser));
  });

  socket.on('room:request', (payload = {}) => {
    if (isRateLimited(socket.id, 'request', 10, 15000)) {
      socket.emit('app:error', 'Slow down a little before sending more invites.');
      return;
    }

    const requester = users.get(socket.id);
    const target = users.get(payload.targetId);

    if (!requester || !target || target.id === socket.id) {
      return;
    }

    const roomId = cleanText(payload.roomId, 80) || null;
    const room = roomId ? rooms.get(roomId) : null;

    if (room && (!room.members.includes(socket.id) || room.banned.has(target.id))) {
      return;
    }

    io.to(target.id).emit('room:invite', {
      requesterId: socket.id,
      requesterName: requester.username,
      roomId,
      isPrivate: Boolean(payload.isPrivate || room?.isPrivate)
    });
  });

  socket.on('room:accept', (payload = {}) => {
    const target = users.get(socket.id);
    const requester = users.get(payload.requesterId);

    if (!target || !requester) {
      return;
    }

    let room = null;
    const requestedRoomId = cleanText(payload.roomId, 80);

    if (requestedRoomId) {
      room = rooms.get(requestedRoomId);

      if (!room || !room.members.includes(payload.requesterId) || room.banned.has(socket.id)) {
        return;
      }

      if (!room.members.includes(socket.id)) {
        room.members.push(socket.id);
      }
    } else {
      room = createRoom(payload.requesterId, socket.id, Boolean(payload.isPrivate));
    }

    if (!room) {
      return;
    }

    room.members.forEach((memberId) => joinSocketToRoom(memberId, room));
    emitRoom(room);

    io.to(room.id).emit('room:opened', roomPayload(room));
  });

  socket.on('message:send', (payload = {}) => {
    if (isRateLimited(socket.id, 'message', 25, 10000)) {
      socket.emit('app:error', 'Message limit reached. Try again in a moment.');
      return;
    }

    const sender = users.get(socket.id);
    const room = rooms.get(payload.roomId);
    const text = cleanText(payload.text, MAX_MESSAGE_LENGTH);

    if (!sender || !room || !text || !room.members.includes(socket.id)) {
      return;
    }

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      roomId: room.id,
      senderId: socket.id,
      senderName: sender.username,
      text,
      sentAt: Date.now()
    };

    room.messages.push(message);
    room.messages = room.messages.slice(-ROOM_HISTORY_LIMIT);

    io.to(room.id).emit('message:new', message);
  });

  socket.on('room:remove-member', (payload = {}) => {
    const room = rooms.get(payload.roomId);
    const targetId = cleanText(payload.targetId, 120);

    if (!room || room.ownerId !== socket.id || targetId === socket.id) {
      return;
    }

    if (!room.members.includes(targetId)) {
      return;
    }

    if (payload.ban) {
      room.banned.add(targetId);
    }

    removeMember(room, targetId, payload.ban ? 'ban' : 'kick');
  });

  socket.on('disconnect', () => {
    users.delete(socket.id);
    actionBuckets.forEach((_, key) => {
      if (key.startsWith(`${socket.id}:`)) {
        actionBuckets.delete(key);
      }
    });

    rooms.forEach((room, roomId) => {
      if (!room.members.includes(socket.id)) {
        return;
      }

      room.members = room.members.filter((id) => id !== socket.id);

      if (room.members.length === 0) {
        rooms.delete(roomId);
        return;
      }

      if (room.ownerId === socket.id) {
        room.ownerId = room.members[0];
      }

      emitRoom(room);
    });

    emitRadar();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Magic Link radar chat running on http://${HOST}:${PORT}`);
});
