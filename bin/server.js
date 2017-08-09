require('../util/global.js');
global.log('');
const pkg = global.req('package.json');

const fs = require('fs');
const EventEmitter = require('events');
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
let globalValues = {
    global: {}
};

class SmartNodePlugin extends EventEmitter {
    constructor(data) {
        super();

        this.id = data.id;
        this.socket = data.socket;
        this.config = data.config;
        this.room = data.config.room;
        this.type = data.config.type;
        this.findPort = findPort;

        this.storage = {
            get: async (key) => {
                return await storage.getItem(`${this.config.room}.${this.config.type}.${key}`);
            },
            set: async (key, value) => {
                return await storage.setItem(`${this.config.room}.${this.config.type}.${key}`, value);
            }
        };
    }

    getGlobals() { 
        return { 
            global: globalValues.global,
            room: globalValues[this.config.room] 
        } 
    }
};

(async () => {
    let port = options.port || (await findPort());

    app.listen(port, () => {
        bonjour.publish({ name: 'SmartNode Server', type: 'smartnode', port: port });

        global.success(`SmartNode server up and running, broadcasting via bonjour on port ${port}`);
    });
    
    io.on('connection', (socket) => {
        global.log('Client connected:', socket.client.id);

        socket.on('register', async (data, cb) => {
            clients[socket.client.id] = new SmartNodePlugin({ 
                socket,
                id: socket.client.id, 
                config: data
            });

            global.success('Client registered! ID: ', socket.client.id, data);

            socket.join(data.room);

            global.muted('Clientlist: ', Object.keys(clients));

            cb(Object.assign(data, { success: true }));
            
            if (data.loaded) {
                // server reconnected - plugin on client side is already loaded
                _clientPluginLoaded(socket.client.id).catch((e) => { global.error('Server load plugin error (3)', e) });;
            }
        });

        socket.on('disconnect', async (reason) => {
            global.warn('Client disconnected! ID:', socket.client.id, reason);
            _unloadPlugin(socket.client.id);

            delete clients[socket.client.id];

            global.muted('Clientlist: ', Object.keys(clients));
        });

        socket.on('pluginloaded', async () => {
            _clientPluginLoaded(socket.client.id, true).catch((e) => { global.error('Server load plugin error (4)', e) });;
        })
    });
})().catch((e) => { global.error('Server init error', e) });

async function _clientPluginLoaded(id, viaEvent) {
    if (viaEvent) global.debug('Plugin loading was initiaded via "pluginloaded" event.');
    if (clients[id].loaded) {
        // plugin already loaded
        global.debug('Client plugin already loaded and therefore skipped for ', id);
        return false;
    }

    global.success(`Client ${id} has loaded it's plugin`);

    await _loadPlugin(id).catch((e) => { global.error('Server load plugin error (2)', e) });

    clients[id].loaded = true;
}

function _unloadPlugin(id) {
    global.warn('Unloaded plugin for client', id);
    clients[id].loaded = false;
    clients[id].unload();
}

async function _loadPlugin(id) {
    // load the plugin mathing to the client
    let adapter = clients[id];

    // try to load the plugin and check if it's installed
    try {
        // apparently the plugin is installed
        // => load the server side
        // => hand over client id and useful functions
        plugin = await require(`smartnode-${adapter.type}`)
            .Server(adapter)
            .catch((e) => { global.error('Server load plugin error', e) });
    } catch(e) {
        // nope, the plugin isn't installed on server side yet - die()
        global.error(`Plugin "smartnode-${adapter.type}" not found - you need to install it via "npm install smartnode-${adapter.type}" first!`);
        global.muted('Debug', e);
        process.exit(1);
    }

    // save the plugin globals locally
    Object.assign(globalValues.global, plugin.exports.global);
    globalValues[adapter.room] = Object.assign(globalValues[adapter.room] || {}, plugin.exports.room);

    console.log('globalValues', globalValues);

    adapter.unload = plugin.unload;

    Object.keys(clients).forEach((id) => {
        if (id !== adapter.id) {
            adapter.emit('globalsChanged');
        }
    });

    plugin.load(adapter.socket);

    return true;
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

function exitHandler(err) {
    global.log('SmartNode exiting...');

    if (err) {
        global.error('System error!', err);
    }

    io.close();

    bonjour.unpublishAll(() => {
        global.warn('Bonjour service unpublished!');

        Object.keys(clients).forEach((id) => { if (clients[id].loaded) _unloadPlugin(id); });

        process.exit();
    });


    if (err) global.error(err.stack);
}

//do something when app is closing
process.on('exit', exitHandler);

process.on('restart', () => { console.log('RESTART CAUGHT!!!'); }); 

//catches ctrl+c event
process.on('SIGINT', exitHandler);

//catches uncaught exceptions
process.on('uncaughtException', exitHandler);