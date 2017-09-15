const socketio = require('socket.io');
const http = require('http');

const SmartNodeRouter = global.req('classes/Router.class');

module.exports = SmartNodeServer => class WebNotifications {
    constructor(app) {
        this._app = app;
        this._server = http.Server(this._app);
        this._io = socketio(this._server);

        const router = new (SmartNodeRouter(SmartNodeServer))(this._app);
        router.init();
    }

    listen(port, callback) {
        this._server.listen(port, callback);

        this.addHandler('connection', this.onConnection.bind(this));
    }

    addHandler(type, handler) {
        return this._io.on(type, handler);
    }

    broadcast(type, message) {
        return this._io.emit('broadcast', { type, message });
    }

    send(type, message) {
        return this.broadcast(type, message);
    }

    onConnection(socket) {
        this.broadcast('debug', 'Successful connected!');
        global.log('WebNotification client connected!', socket.id);
    }
};
