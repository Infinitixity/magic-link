const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-this-admin-token';
const MAX_NAME_LENGTH = 24;
const MAX_MESSAGE_LENGTH = 500;
const ROOM_HISTORY_LIMIT = 80;
const startedAt = Date.now();
const USER_COLORS = [
  '#56f0c0',
  '#ffcc66',
  '#7cc7ff',
  '#ff8fb3',
  '#b9f27c',
  '#c6a7ff',
  '#ff9f66',
  '#8fffe3',
  '#d9ff66',
  '#66a3ff',
  '#ff66e1',
  '#9cff9c'
];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || false
  }
});

app.use(express.json());
app.use(express.static('public'));

const users = new Map();
const rooms = new Map();
const actionBuckets = new Map();
const radioChannels = new Map();
const radioChannelBySocket = new Map();
const radioMutedByChannel = new Map();
const radioBannedByChannel = new Map();

function cleanText(value, maxLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanMessage(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

function requireAdmin(req, res, next) {
  const token = req.get('x-admin-token');

  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    res.status(401).json({
      error: 'Unauthorized'
    });
    return;
  }

  res.set('Cache-Control', 'no-store');
  next();
}

function randomCoord() {
  return Math.floor(Math.random() * 64) + 18;
}

function colorForId(id) {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index) * (index + 1)) % USER_COLORS.length;
  }

  return USER_COLORS[hash];
}

function identityCodeForId(id) {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).toUpperCase().slice(0, 4).padStart(4, '0');
}

function nextUserColor() {
  const usedColors = new Set(Array.from(users.values()).map((user) => user.color));
  return USER_COLORS.find((color) => !usedColors.has(color)) || USER_COLORS[users.size % USER_COLORS.length];
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
    code: user.code,
    color: user.color,
    x: user.x,
    y: user.y,
    status: user.status
  };
}

function emitRadar() {
  io.emit('radar:update', Array.from(users.values()).map(publicUser));
}

function normalizeRadioChannel(value) {
  const channel = Number.parseInt(value, 10);
  return Number.isInteger(channel) && channel >= 1 && channel <= 100 ? channel : null;
}

function radioRoomName(channel) {
  return `radio-${channel}`;
}

function radioSetFor(store, channel) {
  const normalized = normalizeRadioChannel(channel);
  if (!normalized) {
    return null;
  }

  if (!store.has(normalized)) {
    store.set(normalized, new Set());
  }

  return store.get(normalized);
}

function isRadioMuted(channel, socketId) {
  return radioMutedByChannel.get(channel)?.has(socketId) || false;
}

function isRadioBanned(channel, socketId) {
  return radioBannedByChannel.get(channel)?.has(socketId) || false;
}

function emitRadioChannels() {
  const activeChannels = Array.from(radioChannels.entries())
    .filter(([, members]) => members.size > 0)
    .map(([channel, members]) => ({
      channel,
      listeners: members.size
    }))
    .sort((a, b) => a.channel - b.channel);

  io.emit('radio:channels', activeChannels);
}

function leaveRadioChannel(socket) {
  const channel = radioChannelBySocket.get(socket.id);

  if (!channel) {
    return;
  }

  const members = radioChannels.get(channel);
  if (members) {
    members.delete(socket.id);
    socket.leave(radioRoomName(channel));
    socket.to(radioRoomName(channel)).emit('radio:peer-left', {
      peerId: socket.id
    });

    if (members.size === 0) {
      radioChannels.delete(channel);
    }
  }

  radioChannelBySocket.delete(socket.id);
  emitRadioChannels();
}

function radioChannelPayload(channel, members) {
  const banned = radioBannedByChannel.get(channel) || new Set();

  return {
    channel,
    listeners: members.size,
    bannedCount: banned.size,
    members: Array.from(members)
      .map((id) => users.get(id))
      .filter(Boolean)
      .map((user) => ({
        id: user.id,
        username: user.username,
        code: user.code,
        color: user.color,
        muted: isRadioMuted(channel, user.id)
      })),
    banned: Array.from(banned)
      .map((id) => users.get(id) || { id, username: 'Disconnected user', code: id.slice(0, 4), color: '#8da7a0' })
      .map((user) => ({
        id: user.id,
        username: user.username,
        code: user.code,
        color: user.color
      }))
  };
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
        username: user.username,
        code: user.code,
        color: user.color
      })),
    messages: room.messages
  };
}

function adminSnapshot() {
  return {
    app: 'Magic Link',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    users: Array.from(users.values()).map((user) => ({
      id: user.id,
      username: user.username,
      code: user.code,
      color: user.color,
      status: user.status,
      x: user.x,
      y: user.y
    })),
    rooms: Array.from(rooms.values()).map((room) => ({
      id: room.id,
      name: room.name,
      ownerId: room.ownerId,
      isPrivate: room.isPrivate,
      createdAt: room.createdAt,
      members: room.members
        .map((id) => users.get(id))
        .filter(Boolean)
        .map((user) => ({
          id: user.id,
          username: user.username,
          code: user.code,
          color: user.color
        })),
      messageCount: room.messages.length,
      bannedCount: room.banned.size
    })),
    radioChannels: Array.from(new Set([
      ...radioChannels.keys(),
      ...radioBannedByChannel.keys()
    ]))
      .filter((channel) => (radioChannels.get(channel)?.size || 0) > 0 || (radioBannedByChannel.get(channel)?.size || 0) > 0)
      .map((channel) => radioChannelPayload(channel, radioChannels.get(channel) || new Set()))
      .sort((a, b) => a.channel - b.channel)
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

app.get('/api/admin/status', requireAdmin, (req, res) => {
  res.json(adminSnapshot());
});

app.post('/api/admin/clear-rooms', requireAdmin, (req, res) => {
  rooms.forEach((room) => {
    room.members.forEach((memberId) => {
      io.to(memberId).emit('room:removed', {
        roomId: room.id,
        type: 'admin-clear'
      });
    });
  });

  rooms.clear();
  res.json(adminSnapshot());
});

app.post('/api/admin/rooms/:roomId/delete', requireAdmin, (req, res) => {
  const room = rooms.get(req.params.roomId);

  if (!room) {
    res.status(404).json({
      error: 'Room not found'
    });
    return;
  }

  room.members.forEach((memberId) => {
    io.to(memberId).emit('room:removed', {
      roomId: room.id,
      type: 'admin-delete'
    });
  });

  rooms.delete(room.id);
  res.json(adminSnapshot());
});

app.post('/api/admin/rooms/:roomId/remove-member', requireAdmin, (req, res) => {
  const room = rooms.get(req.params.roomId);
  const targetId = cleanText(req.body?.targetId, 120);

  if (!room) {
    res.status(404).json({
      error: 'Room not found'
    });
    return;
  }

  if (!targetId || !room.members.includes(targetId)) {
    res.status(400).json({
      error: 'Member not found in room'
    });
    return;
  }

  removeMember(room, targetId, 'admin-kick');

  if (room.members.length === 0) {
    rooms.delete(room.id);
  }

  res.json(adminSnapshot());
});

app.post('/api/admin/radio/:channel/turn-off', requireAdmin, (req, res) => {
  const channel = normalizeRadioChannel(req.params.channel);
  const targetId = cleanText(req.body?.targetId, 120);

  if (!channel || !targetId || radioChannelBySocket.get(targetId) !== channel) {
    res.status(400).json({
      error: 'Radio member not found'
    });
    return;
  }

  const targetSocket = io.sockets.sockets.get(targetId);
  if (targetSocket) {
    targetSocket.emit('radio:admin-off', {
      channel,
      reason: 'admin-off'
    });
    leaveRadioChannel(targetSocket);
  }

  res.json(adminSnapshot());
});

app.post('/api/admin/radio/:channel/mute', requireAdmin, (req, res) => {
  const channel = normalizeRadioChannel(req.params.channel);
  const targetId = cleanText(req.body?.targetId, 120);
  const muted = req.body?.muted !== false;

  if (!channel || !targetId || radioChannelBySocket.get(targetId) !== channel) {
    res.status(400).json({
      error: 'Radio member not found'
    });
    return;
  }

  const mutedSet = radioSetFor(radioMutedByChannel, channel);
  if (muted) {
    mutedSet.add(targetId);
  } else {
    mutedSet.delete(targetId);
  }

  io.to(targetId).emit('radio:admin-muted', {
    channel,
    muted
  });

  res.json(adminSnapshot());
});

app.post('/api/admin/radio/:channel/ban', requireAdmin, (req, res) => {
  const channel = normalizeRadioChannel(req.params.channel);
  const targetId = cleanText(req.body?.targetId, 120);

  if (!channel || !targetId) {
    res.status(400).json({
      error: 'Radio member not found'
    });
    return;
  }

  radioSetFor(radioBannedByChannel, channel).add(targetId);
  radioMutedByChannel.get(channel)?.delete(targetId);

  const targetSocket = io.sockets.sockets.get(targetId);
  if (targetSocket && radioChannelBySocket.get(targetId) === channel) {
    targetSocket.emit('radio:admin-off', {
      channel,
      reason: 'admin-ban'
    });
    leaveRadioChannel(targetSocket);
  }

  res.json(adminSnapshot());
});

app.post('/api/admin/radio/:channel/unban', requireAdmin, (req, res) => {
  const channel = normalizeRadioChannel(req.params.channel);
  const targetId = cleanText(req.body?.targetId, 120);

  if (!channel || !targetId) {
    res.status(400).json({
      error: 'Radio ban not found'
    });
    return;
  }

  const bannedSet = radioBannedByChannel.get(channel);
  if (!bannedSet || !bannedSet.has(targetId)) {
    res.status(404).json({
      error: 'Radio ban not found'
    });
    return;
  }

  bannedSet.delete(targetId);
  if (bannedSet.size === 0) {
    radioBannedByChannel.delete(channel);
  }

  io.to(targetId).emit('app:error', `You were unbanned from radio channel ${channel}.`);
  res.json(adminSnapshot());
});

app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    app: 'Magic Link',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    users: users.size,
    rooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

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

    const existingUser = users.get(socket.id);
    const user = {
      id: socket.id,
      username,
      code: existingUser?.code || identityCodeForId(socket.id),
      color: existingUser?.color || nextUserColor() || colorForId(socket.id),
      x: existingUser?.x || randomCoord(),
      y: existingUser?.y || randomCoord(),
      status: payload.status === 'busy' ? 'busy' : 'available'
    };

    users.set(socket.id, user);

    socket.emit('user:ready', publicUser(users.get(socket.id)));
    emitRadar();
    emitRadioChannels();

    rooms.forEach((room) => {
      if (room.members.includes(socket.id)) {
        emitRoom(room);
      }
    });
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
    const text = cleanMessage(payload.text);

    if (!sender || !room || !text || !room.members.includes(socket.id)) {
      return;
    }

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      roomId: room.id,
      senderId: socket.id,
      senderName: sender.username,
      senderCode: sender.code,
      senderColor: sender.color,
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

  socket.on('radio:join', (payload = {}) => {
    const user = users.get(socket.id);
    const channel = normalizeRadioChannel(payload.channel);

    if (!user || !channel) {
      return;
    }

    if (isRadioBanned(channel, socket.id)) {
      socket.emit('app:error', `You are banned from radio channel ${channel}.`);
      return;
    }

    leaveRadioChannel(socket);

    const members = radioChannels.get(channel) || new Set();
    const peers = Array.from(members)
      .map((id) => users.get(id))
      .filter(Boolean)
      .map(publicUser);

    members.add(socket.id);
    radioChannels.set(channel, members);
    radioChannelBySocket.set(socket.id, channel);
    socket.join(radioRoomName(channel));

    socket.emit('radio:joined', {
      channel,
      peers
    });

    socket.to(radioRoomName(channel)).emit('radio:peer-joined', publicUser(user));
    emitRadioChannels();
  });

  socket.on('radio:leave', () => {
    leaveRadioChannel(socket);
  });

  socket.on('radio:signal', (payload = {}) => {
    const targetId = cleanText(payload.targetId, 120);
    const senderChannel = radioChannelBySocket.get(socket.id);
    const targetChannel = radioChannelBySocket.get(targetId);

    if (!targetId || !senderChannel || senderChannel !== targetChannel) {
      return;
    }

    io.to(targetId).emit('radio:signal', {
      peerId: socket.id,
      signal: payload.signal
    });
  });

  socket.on('radio:ptt', (payload = {}) => {
    const channel = radioChannelBySocket.get(socket.id);
    const user = users.get(socket.id);

    if (!channel || !user) {
      return;
    }

    if (isRadioMuted(channel, socket.id)) {
      socket.emit('radio:admin-muted', {
        channel,
        muted: true
      });
      return;
    }

    socket.to(radioRoomName(channel)).emit('radio:ptt', {
      peerId: socket.id,
      username: user.username,
      code: user.code,
      active: Boolean(payload.active)
    });
  });

  socket.on('disconnect', () => {
    leaveRadioChannel(socket);
    radioMutedByChannel.forEach((members, channel) => {
      members.delete(socket.id);
      if (members.size === 0) {
        radioMutedByChannel.delete(channel);
      }
    });
    radioBannedByChannel.forEach((members, channel) => {
      members.delete(socket.id);
      if (members.size === 0) {
        radioBannedByChannel.delete(channel);
      }
    });
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
