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
    dir: `storage/client/${config.type}/${config.room}`
});

let plugin;

(async () => {
    let searchTime = Date.now();
    global.log('Starting search for master server...');

    let browser = bonjour.find({ type: 'node-home' });
    browser.on('up', (service) => {
        global.muted(`Time to find master server: ${Date.now()-searchTime}ms`);
        searchTime = Date.now();

        let address = service.addresses[0].includes('::') ? service.addresses[1] : service.addresses[0];

        global.success('Found an Node-Home server:', `http://${address}:${service.port}`);

        const socket = require('socket.io-client')(`http://${address}:${service.port}`);
        
        socket.on('connect', () => {
            global.muted(`Time to connect master socket: ${Date.now()-searchTime}ms`);
            global.success('Connected to server! Own ID:', socket.id);

            socket.emit('register', { 
                type: config.type,
                room: config.room
            }, (d) => {
                global.muted('Registered successfully!');
                loadPlugin(config.type, socket);
            });
        });

        socket.on('disconnect', (reason) => {
            global.warn('Server disconnected! Reason:', reason);
            unloadPlugin(socket);

            searchTime = Date.now();
            global.log('Starting search for master server...');
            browser.start();
        });
    });
})();

function loadPlugin(type, socket) {
    plugin = require(`node-home-${type}`).Client(config);
    return plugin.load(socket);
}

function unloadPlugin() {
    return plugin.unload();
}
