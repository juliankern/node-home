require('../util/global.js');

const pkg = global.req('package.json');

const bonjour = require('bonjour')();
const fs = require('fs');
const utils = global.req('util');
const storage = require('node-persist');
storage.initSync({ dir: 'storage/server' });

const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const cli = require('cli');
cli.enable('version');
cli.setApp(pkg.name, pkg.version);
const cliOptions = cli.parse({ port: [ 'p', 'A port to use instead of autodiscover', 'int', null ]});

//////////////////////////////////////////////////////////

let clients = {};
let globalVariables = {
    global: {}
};

if (process.title === 'npm' && require('os').type().includes('Windows')) {
    global.warn('If you want to see the fontend, you\'ll need to run "npm run watch-scss" as well to compile CSS!');
    global.log('');
}

if (+process.version.replace('v', '').split('.')[0] < 8) {
    global.error('You need to upgrade to NodeJS 8 to run this application!');
    process.exit(1);
}

//////////////////////////////////////////////////////////

const SmartNodeServerPlugin = global.req('classes/SmartNodePlugin.class.js').Server({ storage, globalVariables, globalsChanged });
const SmartNodeRouter = global.req('classes/SmartNodeRouter.class.js')({ clients, globalVariables });

init().catch((e) => { global.error('Server init error', e) });

//////////////////////////////////////////////////////////

/**
 * init function
 *
 * @author Julian Kern <mail@juliankern.com>
 */
async function init() {
    let port = cliOptions.port || (await utils.findPort());

    server.listen(port, () => {
        bonjour.publish({ name: 'SmartNode Server', type: 'smartnode', port: port });
        bonjour.published = true;

        global.success(`SmartNode server up and running, broadcasting via bonjour on port ${port}`);
    });

    new SmartNodeRouter(app);
    
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

/**
 * checks if the client plugin is already loaded, and loads it if neccessary
 *
 * @author Julian Kern <mail@juliankern.com>
 *
 * @param  {string} id       id of the client
 */
async function _clientPluginLoaded(id) {
    if (clients[id].loaded) {
        // plugin already loaded
        global.debug('Client plugin already loaded and therefore skipped for ', id);
        return false;
    }

    global.success(`Client ${id} has loaded it's plugin`);

    await _loadPlugin(id).catch((e) => { global.error('Server load plugin error (2)', e) });

    clients[id].loaded = true;
}

/**
 * unloads server plugin
 *
 * @author Julian Kern <mail@juliankern.com>
 *
 * @param  {string} id client ID
 */
function _unloadPlugin(id) {
    global.warn('Unloaded plugin for client', id);
    clients[id].loaded = false;
    clients[id].unload();
}

/**
 * loads server plugin
 *
 * @author Julian Kern <mail@juliankern.com>
 *
 * @param  {string} id  Client ID
 *
 * @return {bool}       true if every worked
 */
async function _loadPlugin(id) {
    // load the plugin mathing to the client
    let adapter = clients[id];
    let plugin;

    // try to load the plugin and check if it's installed
    try {
        // apparently the plugin is installed
        // => load the server side
        // => hand over client id and useful functions
        plugin = await require(`${adapter.module}`)
            .Server(adapter)
            .catch((e) => { global.error('Server load plugin error', e) });
    } catch(e) {
        // nope, the plugin isn't installed on server side yet - die()
        global.error(`Plugin "${adapter.module}" not found - you need to install it via "npm install ${adapter.module}" first!`);
        global.muted('Debug', e);
        process.exit(1);
    }

    adapter.unload = plugin.unload;

    plugin.load();

    return true;
}

/**
 * notifies every server plugin exept the initiator about globals changed
 *
 * @author Julian Kern <mail@juliankern.com>
 *
 * @param  {string} clientId Client ID
 * @param  {object} changed  array of variable paths that got changed
 */
function globalsChanged(clientId, changed) {
    Object.keys(clients).filter((id) => {
        return id !== clientId;
    }).forEach((id) => {
        clients[id].emit('globalsChanged', { 
            changed
        });
    });
}

/**
 * exit handler for cleanup and stuff
 *
 * @author Julian Kern <mail@juliankern.com>
 *
 * @param  {object} err Holding the error messages
 */
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