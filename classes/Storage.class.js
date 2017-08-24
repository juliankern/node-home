const storage = require('node-persist');

module.exports = {
    Server: class ServerStorage  {
        constructor({ room, plugin } = {}) {
            this._room = room;
            this._plugin = plugin;
            this._storage = storage;
            this._storage.initSync({ dir: 'storage/server' });
            console.log('construct server storage', room, plugin);
        }
        
        get(key) {
            return this._storage.getItemSync([this._room, this._plugin, key].filter((e) => !!e).join('.'));
        }
        
        set(key, value) {
            return this._storage.setItemSync([this._room, this._plugin, key].filter((e) => !!e).join('.'), value);
        }
    },
    Client: class ClientStorage {
        constructor(pluginName) {
            this._storage = storage;
            this._storage.initSync({ dir: `storage/client/${pluginName}` });
            console.log('construct client storage', pluginName);
        }
        
        get(key) {
            return this._storage.getItemSync(`${key}`);
        }
        
        set(key, value) {
            return this._storage.setItemSync(`${key}`, value);
        }
    }
}