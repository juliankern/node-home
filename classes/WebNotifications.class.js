const socketio = require('socket.io');
const http = require('http');

const SmartNodeRouter = global.req('classes/Router.class');

module.exports = SmartNodeServer => class WebNotifications {
    constructor(app) {
        this._app = app;
        this._server = http.Server(this._app);
        this._io = socketio(this._server);
        this._volatile = false;

        const router = new (SmartNodeRouter(SmartNodeServer))(this._app);
        router.init();
    }

    listen(port, callback) {
        this._server.listen(port, callback);

        this.addHandler('connection', this.onConnection.bind(this));
    }

    get volatile() {
        this._volatile = true;

        return this;
    }

    addHandler(type, handler) {
        return this._io.on(type, handler);
    }

    broadcast(type, data) {
        if (this._volatile) {
            return this._io.volatile.emit('broadcast', { type, notification: this.handleType(type, data) });
        }

        return this._io.emit('broadcast', { type, notification: this.handleType(type, data) });
    }

    handleType(type, data) {
        let notification = {};
        // console.log('notification', data);
        if (type === 'client-connect') {
            notification = {
                title: 'Client connected',
                message: `${data.plugin} was connected to ${data.room}`,
                icon: 'check',
                autoHide: 10,
            };
        } else if (type === 'client-register') {
            notification = {
                title: 'Client connected',
                message: `${data.plugin} was registered and is ready to be configured!`,
                icon: 'check',
                autoHide: false,
                buttons: [
                    {
                        title: 'Configure',
                        url: `/config/${data.id}`,
                    },
                ],
            };
        } else if (type === 'client-disconnect') {
            notification = {
                title: 'Client disconnected',
                message: `${data.plugin} in ${data.room} was disconnected! Please check it's connection!`,
                icon: 'exclamation',
                autoHide: false,
            };
        } else {
            notification = {
                message: data.message,
            };
        }

        return notification;
    }

    send(type, data) {
        return this.broadcast(type, data);
    }

    onConnection(socket) {
        this.broadcast('debug', { message: 'Successful connected!' });
        global.log('WebNotification client connected!', socket.id);
    }
};
