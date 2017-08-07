require('../util/global.js');
global.log('');
const pkg = global.req('package.json');

const storage = require('node-persist');
const bonjour = require('bonjour')();
const cli = require('cli');
const moment = require('moment');

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
    dir: `storage/client/${config.type}/${config.room}`
});

let plugin;

(async () => {
    let searchTime = +moment();
    global.log('Starting search for master server...');

    let browser = bonjour.find({ type: 'node-home' });
    browser.on('up', (service) => {
        global.muted(`Time to find master server: ${+moment() - searchTime}ms`);
        searchTime = +moment();

        let address = service.addresses[0].includes('::') ? service.addresses[1] : service.addresses[0];

        global.success('Found an Node-Home server:', `http://${address}:${service.port}`);

        const socket = require('socket.io-client')(`http://${address}:${service.port}`);
        
        socket.on('connect', () => {
            global.muted(`Time to connect master socket: ${+moment()-searchTime}ms`);
            global.success('Connected to server! Own ID:', socket.id);

            socket.emit('register', { 
                type: config.type,
                room: config.room
            }, async (d) => {
                global.muted('Registered successfully!');
                await _loadPlugin(config.type, socket);
            });
        });

        socket.on('disconnect', (reason) => {
            global.warn('Server disconnected! Reason:', reason);
            _unloadPlugin(socket);

            searchTime = +moment();
            global.log('Starting search for master server...');
            browser.start();
        });
    });
})();

async function _loadPlugin(type, socket) {
    plugin = await require(`node-home-${type}`).Client(config);
    return plugin.load(socket);
}

function _unloadPlugin(socket) {
    return plugin.unload(socket);
}
