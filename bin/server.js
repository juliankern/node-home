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
        bonjour.publish({ name: 'SmartNode Server', type: 'smartnode', port: port });

        global.success(`SmartNode server up and running, broadcasting via bonjour on port ${port}`);
    });
    
    io.on('connection', (socket) => {
        global.log('Client connected:', socket.client.id);

        socket.on('register', async (data, cb) => {
            clients[socket.client.id] = {};
            clients[socket.client.id].room = data.room;
            clients[socket.client.id].type = data.type;

            global.success('Client registered! ID: ', socket.client.id, data);

            socket.join(data.room);

            global.muted('Clientlist: ', clients);

            cb(Object.assign(data, { success: true }));
            
            if (data.loaded) {
                // server reconnected - plugin on client side is already loaded
                _pluginLoaded(socket);
            }
        });

        socket.on('disconnect', async (reason) => {
            global.warn('Client disconnected! ID:', socket.client.id, reason);
            delete clients[socket.client.id];

            global.muted('Clientlist: ', clients);
        });

        socket.on('pluginloaded', async () => {
            _pluginLoaded(socket);
        })
    });
})();

async function _pluginLoaded(socket) {
    global.success(`Client ${socket.client.id} has loaded it's plugin`);

    //> TODO start loading own server plugins, announce as accessory etc
    await _loadPlugin(socket, clients[socket.client.id]);

    clients[socket.client.id].loaded = true;
}

async function _loadPlugin(socket, cfg) {
    try {
        plugin = await require(`smartnode-${clients[socket.client.id].type}`).Server(clients[socket.client.id], {
            storage: {
                get: async (key) => {
                    return await storage.getItem(`${cfg.room}.${cfg.type}.${key}`);
                },
                set: async (key, value) => {
                    return await storage.setItem(`${cfg.room}.${cfg.type}.${key}`, value);
                }
            },
            findPort
        });
    } catch(e) {
        global.error(`Plugin "smartnode-${type}" not found - you need to install it via "npm install smartnode-${type}" first!`);
        global.muted('Debug', e);
        process.exit(1);
    }

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
        global.warn('Bonjour service unpublished!');

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