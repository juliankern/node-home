const storage = require('node-persist');
const tmpStore = require('node-persist');

const Logger = global.req('classes/Log.class');

const localLogger = new Logger();

tmpStore.initSync({ dir: 'storage/server' });

const fallbackStorage = {
    Server: class ServerStorage {
        constructor({ room, plugin } = {}, cb) {
            this._logger = new Logger();
            this._room = room;
            this._plugin = plugin;
            this._storage = storage;
            this._storage
                .init({ dir: 'storage/server' })
                .then(() => {
                    this._logger.debug('Server storage inited!');

                    if (cb) cb();
                });
        }

        buildPath(key) {
            // console.log('buildPath', key, [this._room, this._plugin, key].filter(e => !!e).join('.'));
            return [this._room, this._plugin, key].filter(e => !!e).join('.');
        }

        async get(key) {
            // console.log('Storage: get', this.buildPath(key), (await this._storage.getItem(this.buildPath(key))));
            return this._storage.getItem(this.buildPath(key));
        }

        async set(key, value) {
            // console.log('Storage: __set', this.buildPath(key), value);
            return this._storage.setItem(this.buildPath(key), value);
        }
    },
    Client: class ClientStorage {
        constructor(pluginName, cb) {
            this._logger = new Logger();
            this._storage = storage;
            this._storage
                .init({ dir: `storage/client/${pluginName}` })
                .then(() => {
                    this._logger.debug('Client storage inited!', pluginName);

                    if (cb) cb();
                });
        }

        async get(key) {
            return this._storage.getItem(key);
        }

        async set(key, value) {
            return this._storage.setItem(key, value);
        }
    },
};

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
