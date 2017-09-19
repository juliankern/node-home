require('../util/global.js');

const pkg = global.req('package.json');
const path = require('path');
const storage = require('node-persist');
const cli = require('cli');

const Logger = global.req('classes/Log.class');
const logger = new Logger();

storage.initSync({ dir: `${path.normalize(`${global.approot}/../..`)}/storage/server` });

cli.enable('version');
cli.setApp('bin/plugin.js', pkg.version);

let maxPlugins;

const opt = cli.parse({
    register: ['r', 'Activate register mode', 'bool', false],
    unregister: ['u', 'Activate unregister mode', 'bool', false],
    name: ['n', 'Name of the plugin to be registered', 'string', null],
    type: ['t', 'Type of the plugin to be registered', 'string', null],
});

// //////////////////////////////////////////////////////////////

if (!opt.register && !opt.unregister) {
    throw logger.error('You need to choose if to register or unregister this plugin.');
}

if (opt.register && opt.unregister) {
    throw logger.error('You need to choose if to register OR unregister this plugin.');
}

if (!opt.name) {
    throw logger.error('Please provide a plugin name');
}

if (!opt.type) {
    throw logger.error('Please provide a plugin type');
}

// //////////////////////////////////////////////////////////////

if (opt.type === 'storage') {
    maxPlugins = 1;
} else {
    throw logger.error('Please provide a valid plugin type');
}

// //////////////////////////////////////////////////////////////

const registeredPlugins = storage.getItemSync(`plugins.${opt.type}`) || [];

if (opt.register) {
    if (maxPlugins === 1 && registeredPlugins.length > 0) {
        throw logger.error(`There is already one ${opt.type}-plugin active. Please unregister it first.`);
    }

    registeredPlugins.push({ name: opt.name });
    storage.setItemSync(`plugins.${opt.type}`, registeredPlugins);
    logger.success(`Plugin '${opt.name}' successfully installed`);
} else if (opt.unregister) {
    if (registeredPlugins.length === 0) {
        throw logger.warn(`There is no active ${opt.type}-plugin. Quitting.`);
    }

    storage.setItemSync(`plugins.${opt.type}`, registeredPlugins.filter(e => e.name !== opt.name));
    logger.success(`Plugin '${opt.name}' successfully uninstalled`);
}
