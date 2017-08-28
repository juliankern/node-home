require('../util/global.js');

const pkg = global.req('package.json');
const storage = require('node-persist');
storage.initSync({ dir: 'storage/server' });

const cli = require('cli');
cli.enable('version');
cli.setApp('bin/plugin.js', pkg.version);

let maxPlugins;

const opt = cli.parse({ 
    register: [ 'r', 'Activate register mode', 'bool', false ],
    unregister: [ 'un', 'Activate unregister mode', 'bool', false ],
    name: [ 'n', 'Name of the plugin to be registered', 'string', null ],
    type: [ 't', 'Type of the plugin to be registered', 'string', null ]
});

////////////////////////////////////////////////////////////////

if (!opt.register && !opt.unregister) {
    throw global.error('You need to choose if to register or unregister this plugin.')
}

if (opt.register && opt.unregister) {
    throw global.error('You need to choose if to register OR unregister this plugin.')
}

if (!opt.name) {
    throw global.error('Please provide a plugin name');
}

if (!opt.type) {
    throw global.error('Please provide a plugin type');
}

////////////////////////////////////////////////////////////////

if (opt.type === 'storage') {
    maxPlugins = 1;
} else {
    throw global.error('Please provide a valid plugin type');
}

////////////////////////////////////////////////////////////////

let registeredPlugins = storage.getItemSync('plugins.' + opt.type) || [];

if (opt.register) {
    if (maxPlugins === 1 && registeredPlugins.length > 0) {
        throw global.error(`There is already one ${opt.type}-plugin active. Please unregister it first.`);
    }
    
    registeredPlugins.push({ name: opt.name });
    storage.setItemSync('plugins.' + opt.type, registeredPlugins);
} 
else if (opt.unregister) {
    if (registeredPlugins.length === 0) {
        throw global.warn(`There is no active ${opt.type}-plugin. Quitting.`);
    }
    
    storage.setItemSync('plugins.' + opt.type, registeredPlugins.filter((e) => e.name !== opt.name));
}
