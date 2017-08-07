moment = require('moment');

require('../util/global.js');
global.log('');
const pkg = global.req('package.json');

const storage = require('node-persist');
const bonjour = require('bonjour')();
const cli = require('cli');

cli.enable('version');
cli.setApp(pkg.name, pkg.version);
const options = cli.parse({
    config: [ 'c', 'A config file to use', 'file', false ]
});

cli.enable('version');

if (!options.config) {
    global.error('You need to provide a valid config file!');
    process.exit(1);
}

const config = global.req(options.config);

storage.initSync({
    dir: `storage/client/${config.room}/${config.type}`
});

let plugin;
let loaded;

(async () => {
    let searchTime = +moment();
    global.log('Starting search for master server...');

    let browser = bonjour.find({ type: 'smartnode' });
    browser.on('up', (service) => {
        global.muted(`Time to find master server: ${+moment() - searchTime}ms`);
        searchTime = +moment();

        let address = service.addresses[0].includes('::') ? service.addresses[1] : service.addresses[0];

        global.success('Found an SmartNode server:', `http://${address}:${service.port}`);

        const socket = require('socket.io-client')(`http://${address}:${service.port}`);
        
        socket.on('connect', () => {
            global.muted(`Time to connect master socket: ${+moment()-searchTime}ms`);
            global.success('Connected to server! Own ID:', socket.id);

            socket.emit('register', { 
                type: config.type,
                room: config.room,
                loaded
            }, async (d) => {
                global.muted('Registered successfully!');
                if ((await _loadPlugin(config.type, socket))) loaded = true;
            });
        });

        socket.on('disconnect', async (reason) => {
            global.warn('Server disconnected! Reason:', reason);
            if ((await _unloadPlugin(socket))) loaded = false;

            searchTime = +moment();
            global.log('Starting search for master server...');
            browser.start();
        });
    });
})();

async function _loadPlugin(type, socket) {
    try {
        plugin = await require(`smartnode-${type}`).Client(config, {
            storage: {
                get: async (key) => {
                    return await storage.getItem(`${key}`);
                },
                set: async (key, value) => {
                    return await storage.setItem(`${key}`, value);
                }
            }
        });
    } catch(e) {
        global.error(`Could not load plugin "smartnode-${type}" - you probably need to install it via "npm install smartnode-${type}" first!`);
        global.muted('Debug', e);
        process.exit(1);
    }
    return await plugin.load(socket);
}

async function _unloadPlugin(socket) {
    return await plugin.unload(socket);
}
