const express = require('express');

const app = express();

const http =
  require('http').createServer(app);

const io =
  require('socket.io')(http, {
    cors: {
      origin: '*'
    }
  });

app.use(
  express.static('public')
);

const users = {};

const channels = {};

function randomCoord() {
  return (
    Math.floor(
      Math.random() * 80
    ) + 10
  );
}

function emitRadar() {
  io.emit(
    'update-radar',
    Object.values(users)
  );
}

function createChannel({
  ownerId,
  targetId,
  secure = false
}) {

  const groupId =
    `group-${Date.now()}-${Math.floor(
      Math.random() * 9999
    )}`;

  const owner =
    users[ownerId];

  const target =
    users[targetId];

  if (
    !owner ||
    !target
  ) {
    return null;
  }

  const roomData = {
    id: groupId,

    name: secure
      ? 'SECURE LINK'
      : `${owner.username} CHAT`,

    owner: ownerId,

    secure,

    banned: [],

    users: [
      ownerId,
      targetId
    ]
  };

  channels[groupId] =
    roomData;

  return roomData;
}

io.on(
  'connection',
  (socket) => {

    socket.on(
      'join-system',
      (username) => {

        users[socket.id] = {
          id: socket.id,

          username,

          x: randomCoord(),

          y: randomCoord()
        };

        emitRadar();
      }
    );

    socket.on(
      'public-channel-request',
      (data) => {

        const requester =
          users[socket.id];

        const target =
          users[data.targetId];

        if (
          !requester ||
          !target
        ) {
          return;
        }

        io.to(
          data.targetId
        ).emit(
          'receive-public-request',
          {
            requester:
              requester.username,

            requesterId:
              socket.id,

            groupId:
              data.groupId || null
          }
        );
      }
    );

    socket.on(
      'secure-channel-request',
      (data) => {

        const requester =
          users[socket.id];

        const target =
          users[data.targetId];

        if (
          !requester ||
          !target
        ) {
          return;
        }

        io.to(
          data.targetId
        ).emit(
          'receive-secure-request',
          {
            requester:
              requester.username,

            requesterId:
              socket.id,

            groupId:
              data.groupId || null
          }
        );
      }
    );

    socket.on(
      'accept-public-request',
      (data) => {

        let room;

        if (
          data.groupId &&
          channels[data.groupId]
        ) {

          room =
            channels[
              data.groupId
            ];

          if (
            room.banned.includes(
              socket.id
            )
          ) {
            return;
          }

          if (
            !room.users.includes(
              socket.id
            )
          ) {

            room.users.push(
              socket.id
            );
          }

        } else {

          room =
            createChannel({
              ownerId:
                data.requesterId,

              targetId:
                socket.id,

              secure: false
            });
        }

        if (!room) {
          return;
        }

        const requesterSocket =
          io.sockets.sockets.get(
            data.requesterId
          );

        if (!requesterSocket) {
          return;
        }

        socket.join(
          room.id
        );

        requesterSocket.join(
          room.id
        );

        room.memberNames =
          room.users
            .map(
              (id) =>
                users[id]?.username
            )
            .filter(Boolean);

        io.to(room.id).emit(
          'start-chat',
          {
            groupId:
              room.id,

            groupData:
              room
          }
        );
      }
    );

    socket.on(
      'accept-secure-request',
      (data) => {

        let room;

        if (
          data.groupId &&
          channels[data.groupId]
        ) {

          room =
            channels[
              data.groupId
            ];

          if (
            room.banned.includes(
              socket.id
            )
          ) {
            return;
          }

          if (
            !room.users.includes(
              socket.id
            )
          ) {

            room.users.push(
              socket.id
            );
          }

        } else {

          room =
            createChannel({
              ownerId:
                data.requesterId,

              targetId:
                socket.id,

              secure: true
            });
        }

        if (!room) {
          return;
        }

        const requesterSocket =
          io.sockets.sockets.get(
            data.requesterId
          );

        if (!requesterSocket) {
          return;
        }

        socket.join(
          room.id
        );

        requesterSocket.join(
          room.id
        );

        room.memberNames =
          room.users
            .map(
              (id) =>
                users[id]?.username
            )
            .filter(Boolean);

        io.to(room.id).emit(
          'start-chat',
          {
            groupId:
              room.id,

            groupData:
              room
          }
        );
      }
    );

    socket.on(
      'send-message',
      (data) => {

        const sender =
          users[socket.id];

        const room =
          channels[
            data.groupId
          ];

        if (
          !sender ||
          !room
        ) {
          return;
        }

        if (
          !room.users.includes(
            socket.id
          )
        ) {
          return;
        }

        io.to(
          data.groupId
        ).emit(
          'new-message',
          {
            groupId:
              data.groupId,

            user:
              sender.username,

            text:
              data.message
          }
        );
      }
    );

    socket.on(
      'kick-user',
      (data) => {

        const room =
          channels[
            data.groupId
          ];

        if (!room) {
          return;
        }

        if (
          room.owner !==
          socket.id
        ) {
          return;
        }

        const target =
          Object.values(
            users
          ).find(
            (u) =>
              u.username ===
              data.username
          );

        if (!target) {
          return;
        }

        room.users =
          room.users.filter(
            (id) =>
              id !== target.id
          );

        room.memberNames =
          room.users
            .map(
              (id) =>
                users[id]?.username
            )
            .filter(Boolean);

        const targetSocket =
          io.sockets.sockets.get(
            target.id
          );

        if (targetSocket) {

          targetSocket.leave(
            room.id
          );

          targetSocket.emit(
            'removed-from-channel',
            {
              type: 'kick'
            }
          );
        }
      }
    );

    socket.on(
      'ban-user',
      (data) => {

        const room =
          channels[
            data.groupId
          ];

        if (!room) {
          return;
        }

        if (
          room.owner !==
          socket.id
        ) {
          return;
        }

        const target =
          Object.values(
            users
          ).find(
            (u) =>
              u.username ===
              data.username
          );

        if (!target) {
          return;
        }

        room.banned.push(
          target.id
        );

        room.users =
          room.users.filter(
            (id) =>
              id !== target.id
          );

        room.memberNames =
          room.users
            .map(
              (id) =>
                users[id]?.username
            )
            .filter(Boolean);

        const targetSocket =
          io.sockets.sockets.get(
            target.id
          );

        if (targetSocket) {

          targetSocket.leave(
            room.id
          );

          targetSocket.emit(
            'removed-from-channel',
            {
              type: 'ban'
            }
          );
        }
      }
    );

    socket.on(
      'disconnect',
      () => {

        delete users[
          socket.id
        ];

        Object.values(
          channels
        ).forEach((room) => {

          room.users =
            room.users.filter(
              (id) =>
                id !== socket.id
            );

          room.memberNames =
            room.users
              .map(
                (id) =>
                  users[id]?.username
              )
              .filter(Boolean);
        });

        emitRadar();
      }
    );
  }
);

http.listen(
  3000,
  '0.0.0.0',
  () => {
    console.log(
      'MAGIC LINK ACTIVE : 3000'
    );
  }
);
