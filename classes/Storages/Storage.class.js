const Logger = global.req('classes/Log.class');
const localLogger = new Logger();

const tmpStore = require('node-persist');

tmpStore.initSync({ dir: 'storage/server' });

const fallbackStorage = global.req('classes/Storages/FallbackStorage')(localLogger);

let pluginName = tmpStore.getItemSync('plugins.storage');
pluginName = pluginName ? pluginName[0] : undefined;

let plugin;

if (pluginName) {
    try {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        plugin = require(pluginName.name);
    } catch (e) {
        localLogger.warn(`Cannot load storage plugin "${pluginName.name}". Falling back to node-persist.`);
        localLogger.debug('Error:', e);
    }

    if (plugin) {
        if (!('Client' in plugin)) {
            throw localLogger.error(`Plugin ${pluginName.name} is missing a "Client" part.
                Please contact the author.`);
        }

        if (!('Server' in plugin)) {
            throw localLogger.error(`Plugin ${pluginName.name} is missing a "Server" part.
                Please contact the author.`);
        }

        if (!('get' in plugin.Client.prototype)) {
            throw localLogger.error(`Plugin ${pluginName.name} is missing a get()-method within the Client part.
                Please contact the author.`);
        }

        if (!('get' in plugin.Server.prototype)) {
            throw localLogger.error(`Plugin ${pluginName.name} is missing a get()-method within the Server part.
                Please contact the author.`);
        }

        if (!('set' in plugin.Client.prototype)) {
            throw localLogger.error(`Plugin ${pluginName.name} is missing a set()-method within the Client part.
                Please contact the author.`);
        }

        if (!('set' in plugin.Server.prototype)) {
            throw localLogger.error(`Plugin ${pluginName.name} is missing a set()-method within the Server part.
                Please contact the author.`);
        }

        localLogger.success(`Storage plugin "${pluginName.name}" successfully loaded.`);
    }
} else {
    localLogger.info('No storage plugin defined. Falling back to node-persist.');
}

module.exports = plugin || fallbackStorage;
