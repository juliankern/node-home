require('../util/global.js');
global.log('');
const pkg = global.req('package.json');

const fs = require('fs');
const storage = require('node-persist');
const cli = require('cli');
const bonjour = require('bonjour')();

const app = require('http').createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello World');
});
const io = require('socket.io')(app);

cli.enable('version');
cli.setApp(pkg.name, pkg.version);

const options = cli.parse({
    port: [ 'p', 'A port to use instead of autodiscover', 'int', null ]
});

storage.initSync({
    dir: 'storage/server'
});

let clients = {};

(async () => {
    let port = options.port || (await findPort());

    app.listen(port, () => {
        bonjour.publish({ name: 'node-home Server', type: 'node-home', port: port });

        global.success(`Home server up and running, broadcasting via bonjour on port ${port}`);
    });
    
    io.on('connection', (socket) => {
        global.log('Client connected');

        socket.on('register', async (data, cb) => {
            clients[socket.client.id] = {};
            clients[socket.client.id].room = data.room;
            clients[socket.client.id].type = data.type;

            global.success('Client registered! ID: ', socket.client.id, data);

            socket.join(data.room);

            global.muted('Clientlist: ', clients);

            cb(Object.assign(data, { success: true }));
        });

        socket.on('disconnect', async (reason) => {
            global.warn('Client disconnected! ID:', socket.client.id, reason);
            delete clients[socket.client.id];

            global.muted('Clientlist: ', clients);
        });

        socket.on('pluginloaded', async () => {
            global.success(`Client ${socket.client.id} has loaded it's plugin`);

            //> TODO start loading own server plugins, announce as accessory etc
            _loadPlugin(socket);

            clients[socket.client.id].loaded = true;
            
            await storage.setItem('clients', clients);
        })
    });
})();

async function _loadPlugin(socket) {
    plugin = require(`node-home-${clients[socket.client.id].type}`).Server(clients[socket.client.id], storage);
    return plugin.load(socket);
}

function findPort(start) {
    var portrange = start || 8000;

    function find(cb) {
        var port = portrange;
        portrange += 1;

        var server = require('http').createServer();
        server.listen(port, (err) => {
            server.once('close', () => {
                cb(port);
            });
            server.close();
        });
        server.on('error', (err) => {
            find(cb);
        });
    }

    return new Promise((resolve, reject) => {
        find((port) => {
            resolve(port);
        })
    });
}

function exitHandler(options, err) {
    if (err) {
        global.error('System error!', err);
    }

    io.close();

    bonjour.unpublishAll(() => {
        global.success('Bonjour service unpublished!');

        if (options.cleanup) {

        }

        if (options.exit) process.exit();
    });


    if (err) global.error(err.stack);
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true, cleanup: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));