require('../util/global.js');

const SmartNodeClientPlugin = global.req('classes/SmartNodeClientPlugin.class.js');

const pkg = global.req('package.json');

const moment = require('moment');
const bonjour = require('bonjour')();

const cli = require('cli');
cli.enable('version');
cli.setApp(pkg.name, pkg.version);
const options = cli.parse({ config: [ 'c', 'A config file to use', 'file', false ] });

if (!options.config) {
    global.error('You need to provide a valid config file!');
    process.exit(1);
}

const config = global.req(options.config);

const storage = require('node-persist');
storage.initSync({ dir: `storage/client/${config.room}/${config.type}` });

//////////////////////////////////////////////////////////

let adapter = {};

//////////////////////////////////////////////////////////

init().catch((e) => { global.error('Client init error', e) });

//////////////////////////////////////////////////////////

/**
 * init function
 *
 * @author Julian Kern <julian.kern@dmc.de>
 */
async function init() {
    let searchTime = +moment();
    global.log('Starting search for master server...');

    let browser = bonjour.find({ type: 'smartnode' });
    browser.on('up', (service) => {
        browser.stop();
        global.muted(`Time to find master server: ${+moment() - searchTime}ms`); searchTime = +moment();

        let address = service.addresses[0].includes('::') ? service.addresses[1] : service.addresses[0];

        global.success('Found an SmartNode server:', `http://${address}:${service.port}`);

        const socket = require('socket.io-client')(`http://${address}:${service.port}`);
        
        socket.on('connect', () => {
            global.muted(`Time to connect master server: ${+moment()-searchTime}ms`);
            global.success('Connected to server! Own ID:', socket.id);

            socket.emit('register', { 
                type: config.type,
                room: config.room,
                loaded: adapter.loaded
            }, async (d) => {
                adapter = new SmartNodeClientPlugin({
                    socket,
                    id: socket.id,
                    config
                });

                global.muted('Registered successfully!');
                _loadPlugin();
            });
        });

        socket.on('disconnect', async (reason) => {
            global.warn('Server disconnected! Reason:', reason);
            _unloadPlugin();

            global.log('Starting search for master server...'); searchTime = +moment();
            browser.start();
        });
    });
}

/**
 * load client plugin
 *
 * @author Julian Kern <julian.kern@dmc.de>
 *
 * @return {[type]} returns true if loaded
 */
async function _loadPlugin() {
    let plugin;

    try {
        plugin = await require(`smartnode-${adapter.type}`)
            .Client(adapter)
            .catch((e) => { global.error('Client load plugin error', e) });
    } catch(e) {
        global.error(`Could not load plugin "smartnode-${adapter.type}" - you probably need to install it via "npm install smartnode-${adapter.type}" first!`);
        global.muted('Debug', e);
        process.exit(1);
    }

    adapter.unload = plugin.unload;

    return plugin.load().then((loaded) => {
        if (loaded) adapter.loaded = true;
    });
}

/**
 * unloads plugin and cleans up
 *
 * @author Julian Kern <julian.kern@dmc.de>
 */
async function _unloadPlugin() {
    adapter.loaded = false;
    return adapter.unload();
}
