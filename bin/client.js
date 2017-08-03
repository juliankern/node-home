require('../util/global.js');
global.log('');
const pkg = global.req('package.json');

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

(async () => {
    global.log('Starting search for master server...');

    let browser = bonjour.find({ type: 'node-home' });
    browser.on('up', (service) => {
        let address = service.addresses[0].includes('::') ? service.addresses[1] : service.addresses[0];

        global.success('Found an Node-Home server:', `http://${address}:${service.port}`);

        const socket = require('socket.io-client')(`http://${address}:${service.port}`);
        
        socket.on('connect', () => {
            global.success('Connected to server! Own ID:', socket.id);

            socket.emit('register', { 
                type: config.type,
                room: config.room
            }, (d) => {
                global.muted('Registered successfully!');
                loadLibrary(config.type);
            });
        });

        socket.on('disconnect', (reason) => {
            global.warn('Server disconnected! Reason:', reason);

            global.log('Starting search for master server...');
            browser.start();
        });
    });

    function loadLibrary(type) {
        let lib = global.req(`libs/${type}.client.js`);
    }
})();
