require('../util/global.js');
global.log('');
const pkg = global.req('package.json');

const fs = require('fs');
const bonjour = require('bonjour')();
const portfinder = require('portfinder');
const cli = require('cli');
cli.enable('version');
cli.setApp(pkg.name, pkg.version)
const options = cli.parse({
    port: [ 'p', 'A port to use instead of autodiscover', 'int', null ]
});

const app = require('http').createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello World');
});
const io = require('socket.io')(app);

const clients = {};

(async () => {
    let port = options.port || await portfinder.getPortPromise();

    app.listen(port, () => {
        bonjour.publish({ name: 'node-home Server', type: 'node-home', port: port });

        global.success(`Home server up and running, broadcasting via bonjour on port ${port}`);
    });
    
    io.on('connection', (socket) => {
        global.log('Client connected');

        socket.on('register', (data, cb) => {
            clients[socket.client.id] = {};
            clients[socket.client.id].room = data.room;
            clients[socket.client.id].type = data.type;

            global.success('Client registered! ID: ', socket.client.id, data);

            socket.join(data.room);

            global.muted('Clientlist: ', clients);

            cb(Object.assign(data, { success: true }));
        });

        socket.on('disconnect', (reason) => {
            global.warn('Client disconnected! ID:', socket.client.id, reason);
            delete clients[socket.client.id];

            global.muted('Clientlist: ', clients);
        })
    });
})()

function exitHandler(options, err) {
    console.log('exitHandler called!', options, err);

    if (options.cleanup) {
        bonjour.unpublishAll(() => {
            global.success('Bonjour service unpublished!');

            if (options.exit) process.exit();
        });
    } else if (options.exit) process.exit();

    if (err) global.error(err.stack);
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{ cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true, cleanup: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));