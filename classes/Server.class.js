// const EventEmitter = require('events');

const bonjour = require('bonjour');
const express = require('express');
const socketio = require('socket.io');

const utils = global.req('util');
const storage = require('node-persist');
storage.initSync({ 
    dir: 'storage/server',
    expiredInterval: 24 * 60 * 60 * 1000
});

const SmartNodePlugin = global.req('classes/Plugin.class');
const SmartNodeRouter = global.req('classes/Router.class');
const SmartNodeConfig = new (global.req('classes/ServerConfig.class')(utils))();
const ConnectedClientRegistry = (global.req('classes/ConnectedClientRegistry.class')(SmartNodePlugin));

module.exports = class SmartNodeServer {
    /**
     * SmartNodeServer contructor
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    constructor() {
        this.app = express();
        this.io = socketio({});
        this.bonjour = bonjour();
        this.storage = storage;

        this.storage.get = this.storage.getItemSync;
        this.storage.set = this.storage.setItemSync;

        if (!this.storage.get('clients')) this.storage.set('clients', {});

        this.globals = {
            global: {}
        }

        this.connectedClients = new ConnectedClientRegistry(this.storage, this);
    }

    getNewPlugin(data) {
        return new (SmartNodePlugin.Server(this))(data);
    }

    /**
     * init function
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    async init({ port, webport }, Connector, getEventHandlersForSocketFn) {
        port = port || (await utils.findPort());
        webport = webport || (await utils.findPort(port + 1));

        new (SmartNodeRouter(this))(this.app);

        this.io.on('connection', (socket) => {
            global.log('Client connected:', socket.client.id);

            let connectionId = Connector.register(socket); 

            if (connectionId === false) {
                global.log('ERROR! Failed to register connection for new Client', socket.client.id);

            } else {
                let handlers = getEventHandlersForSocketFn(Connector, socket);

                global.log('Registering handlers for', connectionId);

                for (var [name, handler] of Object.entries(handlers)) {
                    Connector.addHandler(connectionId, name, handler);
                }

            }
        });

        this.io.listen(port);
        this.app.listen(webport, () => {
            this.bonjour.publish({ name: 'SmartNode Server', type: 'smartnode', port: port });
            this.bonjour.published = true;

            global.success(`SmartNode server up and running, broadcasting via bonjour on port ${port}`);
            global.success(`Webserver running on port ${webport}`);
        });
    }

    close(callback) {
        let client;
        this.io.close();

        if(this.bonjour.published) {
            this.bonjour.published = false;
            this.bonjour.unpublishAll(() => {
                global.warn('Bonjour service unpublished!');

                this.getClientIdList().forEach((id) => { 
                    client = this.getClientById(id);
                    console.log('close if called', id, client);
                    if (client.loaded) this.unloadServerPlugin(client.socket.client.id); 
                });

                callback();
            });
        } else {
            this.getClientIdList().forEach((id) => { 
                client = this.getClientById(id);
                console.log('close else called', id, client);
                if (client.loaded) this.unloadServerPlugin(client.socket.client.id); 
            });

            callback();
        }
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

    registerClient(data) {
        return this.connectedClients.registerClient(data);
    }

    connectClient(data) {
        return this.connectedClients.connectClient(data);
    }

    /**
     * checks if the client plugin is already loaded, and loads it if neccessary
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {string} id       id of the client
     */
    async clientPluginLoaded(id) {
        if (this.getClientBySocketId(id).loaded) {
            // plugin already loaded
            global.debug('Client plugin already loaded and therefore skipped for ', id);
            return false;
        }

        global.success(`Client ${id} has loaded it's plugin: ${this.getClientBySocketId(id).plugin}`);

        await this._loadServerPlugin(id).catch((e) => { global.error('Server load plugin error (2)', e) });

        this.updateClientBySocketId(id, { loaded: true });
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
        let adapter = this.getClientBySocketId(id);
        let plugin;

        // try to load the plugin and check if it's installed
        try {
            // apparently the plugin is installed
            // => load the server side
            // => hand over client id and useful functions
            plugin = await require(`${adapter.plugin}`)
                .Server(adapter)
                .catch((e) => { global.error('Server load plugin error', e) });
        } catch(e) {
            // nope, the plugin isn't installed on server side yet - die()
            global.error(`Plugin "${adapter.plugin}" not found - you need to install it via "npm install ${adapter.plugin}" first!`);
            global.muted('Debug', e);
            process.exit(1);
        }

        let functionError;
        if (!('load' in plugin)) { functionError = "load"; }
        if (!('unload' in plugin)) { functionError = "unload"; }
        if (!('unpair' in plugin)) { functionError = "unpair"; }

        if (functionError) {
            throw `Plugin "${adapter.plugin}" does not provide a "${functionError}()"-function on the server side. Please contact the author!`;
            process.exit(1);
        }

        this.updateClientBySocketId(id, { 
            unload: plugin.unload,
            unpair: plugin.unpair
        });

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
        let client = this.getClientBySocketId(id);
        if (!client) client = this.getClientById(id);

        global.warn('Unloaded plugin for client:', client.id);

        if (client.loaded) client.unload();
        this.removeClientBySocketId(id);
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
        Object.keys(this.getClientList()).filter((id) => {
            return id !== clientId;
        }).forEach((id) => {
            this.getClientById(id).emit('globalsChanged', { 
                changed
            });
        });
    }

    getClientIdList() {
        return this.connectedClients.getClientIdList();
    }

    getClientList() {
        return this.connectedClients.getClientList();
    }

    getClientById(id) {
        return this.connectedClients.getClientById(id);
    }

    getClientBySocketId(socketId) {
        return this.connectedClients.getClientBySocketId(socketId);
    }

    updateClient(id, data) {
        return this.connectedClients.updateClient(id, data);
    }

    updateClientBySocketId(id, data) {
        return this.connectedClients.updateClientBySocketId(id, data);
    }

    removeClient(id) {
        return this.connectedClients.removeClient(id);
    }

    removeClientBySocketId(id) {
        return this.connectedClients.removeClientBySocketId(id);
    }

    deleteClient(id) {
        return this.connectedClients.deleteClient(id);
    }

    unpairClient(id) {
        return this.connectedClients.unpairClient(id);
    }

    validConfiguration(config, format) {
        return SmartNodeConfig.validConfiguration(config, format);
    }
}