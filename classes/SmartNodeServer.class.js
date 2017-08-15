// const EventEmitter = require('events');
const utils = global.req('util');
const storage = require('node-persist');
storage.initSync({ dir: 'storage/server' });

const SmartNodePlugin = global.req('classes/SmartNodePlugin.class.js');

module.exports = class SmartNodeServer {
    /**
     * SmartNodeServerPlugin contructor
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {object} data holds the data needed to init the plugin
     */
    constructor() {
        this.storage = storage;

        this.globals = {
            global: {}
        }

        this.clients = {};
    }

    globalsInitRoom(room) {
        if (!this.globals[room]) this.globals[room] = {};
    }

    globalsGetGlobals() {
        return this.globals.global;
    }

    globalsGetRoom(room) {
        return this.globals[room];
    }

    addClient(id, data) {
        this.clients[id] = new (SmartNodePlugin.Server(this))(data);

        return this.clients[id];
    }

    getClientIdList() {
        return Object.keys(this.clients);
    }

    getClientList() {
        return this.clients;
    }

    getClientById(id) {
        return this.clients[id];
    }

    updateClient(id, data) {
        return Object.assign(this.clients[id], data);
    }

    removeClient(id) {
        return delete this.clients[id];
    }

    /**
     * checks if the client plugin is already loaded, and loads it if neccessary
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {string} id       id of the client
     */
    async clientPluginLoaded(id) {
        if (this.getClientById(id).loaded) {
            // plugin already loaded
            global.debug('Client plugin already loaded and therefore skipped for ', id);
            return false;
        }

        global.success(`Client ${id} has loaded it's plugin: ${this.getClientById(id).module}`);

        await this._loadServerPlugin(id).catch((e) => { global.error('Server load plugin error (2)', e) });

        this.updateClient(id, { loaded: true });
    }

    /**
     * loads server plugin
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {string} id  Client ID
     *
     * @return {bool}       true if every worked
     */
    async _loadServerPlugin(id) {
        // load the plugin mathing to the client
        let adapter = this.getClientById(id);
        let plugin;

        // try to load the plugin and check if it's installed
        try {
            // apparently the plugin is installed
            // => load the server side
            // => hand over client id and useful functions
            plugin = await require(`${adapter.module}`)
                .Server(adapter)
                .catch((e) => { global.error('Server load plugin error', e) });
        } catch(e) {
            // nope, the plugin isn't installed on server side yet - die()
            global.error(`Plugin "${adapter.module}" not found - you need to install it via "npm install ${adapter.module}" first!`);
            global.muted('Debug', e);
            process.exit(1);
        }

        this.updateClient(id, { unload: plugin.unload });

        plugin.load();

        return true;
    }

    /**
     * unloads server plugin
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {string} id client ID
     */
    unloadServerPlugin(id) {
        global.warn('Unloaded plugin for client', id);

        this.getClientById(id).unload();
        this.removeClient(id);
    }

    /**
     * notifies every server plugin exept the initiator about globals changed
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {string} clientId Client ID
     * @param  {object} changed  array of variable paths that got changed
     */
    globalsChanged(clientId, changed) {
        Object.keys(this.clients).filter((id) => {
            return id !== clientId;
        }).forEach((id) => {
            this.clients[id].emit('globalsChanged', { 
                changed
            });
        });
    }
}