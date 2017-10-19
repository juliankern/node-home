const EventEmitter = require('events');

const shared = require('./shared.js');

module.exports = class ServerConnectionManager extends EventEmitter {
    constructor(io) {
        super();

        this._io = io;

        this.init();
    }

    init() {
        shared.events.concat([]).forEach((e) => {
            this._io.on(e, this[`on${shared.ucfirst(e)}`].bind(this));
        });
    }

    onConnection(socket) {
        // the server "onConnection" is called automatically
        // => trigger it on the Client as well
        socket.emit('connection');
    }

    onHandshake() {

    }

    onReady() {

    }
};
