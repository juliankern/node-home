require('../util/global.js');

const pkg = global.req('package.json');

const bonjour = require('bonjour')();
const fs = require('fs');
const utils = global.req('util');
const storage = require('node-persist');
storage.initSync({ dir: 'storage/server' });

const app = require('http').createServer((req, res) => { res.writeHead(200); res.end('Hello World'); });
const io = require('socket.io')(app);

const cli = require('cli');
cli.enable('version');
cli.setApp(pkg.name, pkg.version);
const cliOptions = cli.parse({ port: [ 'p', 'A port to use instead of autodiscover', 'int', null ]});

//////////////////////////////////////////////////////////

let clients = {};
let globalVariables = {
    global: {}
};

//////////////////////////////////////////////////////////

const SmartNodeServerPlugin = global.req('classes/SmartNodeServerPlugin.class.js')({ storage, globalVariables, globalsChanged });

init().catch((e) => { global.error('Server init error', e) });

//////////////////////////////////////////////////////////

async function init() {
    let port = cliOptions.port || (await utils.findPort());

    app.listen(port, () => {
        bonjour.publish({ name: 'SmartNode Server', type: 'smartnode', port: port });
        bonjour.published = true;

        global.success(`SmartNode server up and running, broadcasting via bonjour on port ${port}`);
    });
    
    io.on('connection', (socket) => {
        global.log('Client connected:', socket.client.id);

        socket.on('register', async (data, cb) => {
            clients[socket.client.id] = new SmartNodeServerPlugin({ 
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
}

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

    adapter.unload = plugin.unload;

    plugin.load();

    return true;
}

function globalsChanged() {
    Object.keys(clients).forEach((id) => {
        if (id !== this.id) clients[id].emit('globalsChanged', globalVariables);
    });
}

function exitHandler(err) {
    global.log('SmartNode exiting...');

    if (err) {
        global.error('System error!', err);
    }

    io.close();

    if (err) global.error(err.stack);

    if(bonjour.published) {
        bonjour.published = false;
        bonjour.unpublishAll(() => {
            global.warn('Bonjour service unpublished!');

            Object.keys(clients).forEach((id) => { if (clients[id].loaded) _unloadPlugin(id); });

            process.exit();
        });
    } else {
        Object.keys(clients).forEach((id) => { if (clients[id].loaded) _unloadPlugin(id); });

        process.exit();
    }
}

//do something when app is closing
process.on('exit', exitHandler);
process.on('SIGINT', exitHandler);
process.on('uncaughtException', exitHandler);