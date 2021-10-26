/**
 * Code sample
 *  // Join to a room
    socket.join(user.room);
    // emit message to all users in the room
    socket.emit('message', { user: 'admin', text: `${user.name}, welcome to room ${user.room}.`});
    // emit message to all users except this user in the room 
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!` });
    // send message all users in the room
    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
 */
function socket(app, io) {
	console.log("socket initing...")

	io.on('connect', function (socket) {
		console.log("connection...")

		socket.on('disconnecting', (reason) => {
            console.log(`${reason} is disconnecting`);
        });
        socket.on('disconnect', (reason) => {
            console.log(`${reason} has been disconnected`);
        });

		socket.on('join', ({ room }, cb) => {
			// Join to a room
			socket.join(room);
			// emit message to all users in the room
			// socket.emit('message', { user: 'admin', text: `${user.name}, welcome to room ${user.room}.`});
			// emit message to all users except this user in the room 
			// socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!` });
			// send message all users in the room
			// io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
			
			console.log("room: ", room);
			if(typeof cb === 'function') cb();
		});

		// socket events
		socket.on('send_conversation', ({conversationResult, room}, cb) => {
			socket.emit('message', { user: 'admin', text: `test, welcome to room ${room}.`});

			console.log("conversationResult: ", conversationResult);
			io.to(room).emit('broadcast_conversation', conversationResult);
			// socket.broadcast.to(room).emit('broadcast_conversation', conversationResult);
			// socket.broadcast.to(room).emit('receive_sentence', { user: 'admin', text: `${user.name} has joined!` });
			if(typeof cb === 'function') cb();
		});
	});
}

module.exports = socket
