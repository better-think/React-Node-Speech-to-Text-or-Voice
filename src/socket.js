import io from "socket.io-client";
import {
	SOCKET_URL
} from "./config";


class Socket {
	socket;

	constructor() {
		console.log("initing.....")
		this._init();
	}
	/**
	 * Private member function
	 */
	_init = () => {
		this.socket = io(SOCKET_URL, {
			
		});
		this.socket.open();
		this.socket.on("connect_error", (err) => {
			console.log(`connect_error due to ${err.message}`);
			console.log(`trying again`);
			this.socket.open();
		});
	}
	
	/**
	 * 
	 * @param {String} roomName 
	 * @param {Function} cb | no required
	 */
	join2room = (roomName, cb) => {
		this.socket.emit('join', { room: roomName }, cb);
	}

	/**
	 * 
	 * @param {Object} conversationResult 
	 * @param {String} roomName 
	 * @param {Function} cb || no required
	 */
	send_conversation = (conversationResult, roomName, cb) => {
		this.socket.emit('send_conversation', { conversationResult, room: roomName }, cb);
	}

	/**
	 * 
	 * @param {Function} cb 
	 */
	on_conversation = (cb) => {
		this.socket.on('broadcast_conversation', cb)
	}
}

export default Socket
