const storage = require('node-persist');

const tmpStore = require('node-persist');
tmpStore.initSync({ dir: 'storage/server' });

const fallbackStorage = {
    Server: class ServerStorage  {
        constructor({ room, plugin } = {}) {
            this._room = room;
            this._plugin = plugin;
            this._storage = storage;
            this._storage.init({ dir: 'storage/server' });
        }
        
        async get(key) {
            return await this._storage.getItem([this._room, this._plugin, key].filter((e) => !!e).join('.'));
        }
        
        async set(key, value) {
            return await this._storage.setItem([this._room, this._plugin, key].filter((e) => !!e).join('.'), value);
        }
    },
    Client: class ClientStorage {
        constructor(pluginName) {
            this._storage = storage;
            this._storage.init({ dir: `storage/client/${pluginName}` });
        }
        
        async get(key) {
            return await this._storage.getItem(`${key}`);
        }
        
        async set(key, value) {
            return await this._storage.setItem(`${key}`, value);
        }
    }
}

let pluginName = tmpStore.getItemSync('plugins.storage');
pluginName = pluginName ? pluginName[0] : undefined;

let plugin;

if (pluginName) {
    try {
        plugin = require(pluginName.name);
    } catch(e) {
        global.warn(`Cannot load storage plugin "${pluginName.name}". Falling back to node-persist.`);
        global.muted('Error:', e);
    }
    
    if (plugin) {
        if(!('Client' in plugin)) {
            throw global.error(`Plugin ${pluginName.name} is missing a "Client" part. Please contact the author.`)
        }
        
        if(!('Server' in plugin)) {
            throw global.error(`Plugin ${pluginName.name} is missing a "Server" part. Please contact the author.`)
        }
        
        if(!('get' in plugin.Client.prototype)) {
            throw global.error(`Plugin ${pluginName.name} is missing a get()-method within the Client part. Please contact the author.`)
        }
        
        if(!('get' in plugin.Server.prototype)) {
            throw global.error(`Plugin ${pluginName.name} is missing a get()-method within the Server part. Please contact the author.`)
        }
        
        if(!('set' in plugin.Client.prototype)) {
            throw global.error(`Plugin ${pluginName.name} is missing a set()-method within the Client part. Please contact the author.`)
        }
        
        if(!('set' in plugin.Server.prototype)) {
            throw global.error(`Plugin ${pluginName.name} is missing a set()-method within the Server part. Please contact the author.`)
        }
        
        global.success(`Storage plugin "${pluginName.name}" successfully loaded.`)
    }
}

module.exports = plugin || fallbackStorage;