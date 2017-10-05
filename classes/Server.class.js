const bonjour = require('bonjour');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const utils = global.SmartNode.require('util');

const SmartNodePlugin = global.SmartNode.require('classes/Plugin.class');
const ServerStorage = global.SmartNode.require('classes/Storage.class').Server;
const WebNotifications = global.SmartNode.require('classes/WebNotifications.class');
const ClientRegistry = (global.SmartNode.require('classes/ClientRegistry.class')(SmartNodePlugin));
const Logger = global.SmartNode.require('classes/Log.class');

const SmartNodeConfig = new (global.SmartNode.require('classes/ServerConfig.class')(utils))();
const ServerClientConnector = new (global.SmartNode.require('classes/ServerClientConnector.class'))();
const SocketEventsHandler = global.SmartNode.require('classes/SocketEventsHandler.class');

module.exports = class SmartNodeServer {
    /**
     * SmartNodeServer contructor
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    constructor(cb) {
        this.app = express();
        this.io = socketio(http.Server(this.app));
        this.webNotifications = {};

        this.bonjour = bonjour();
        this.storage = new ServerStorage({}, () => {
            if (cb) cb();
        });

        this._logger = new Logger();

        this.globals = {
            global: {},
        };

        this.clients = new ClientRegistry(this.storage, this);

        this.globalVars = {
            /**
             * notifies every server plugin exept the initiator about globals changed
             *
             * @author Julian Kern <mail@juliankern.com>
             *
             * @param  {string} clientId Client ID
             * @param  {object} changed  array of variable paths that got changed
             */
            changed: (clientId, changed) => {
                Object.keys(this.getClientList())
                    .filter(id => id !== clientId)
                    .forEach((id) => {
                        this.getClientById(id).emit('globalsChanged', {
                            changed,
                        });
                    });
            },
            initRoom: (room) => {
                if (!this.globals[room]) this.globals[room] = {};
            },
            getGlobals: () => this.globals.global,
            getRoom: room => this.globals[room],
        };
    }

    getNewPlugin(data) {
        const args = SmartNodePlugin.Server;
        const pluginFunction = args.pop();

        const values = args.map((key) => {
            if (key === 'webNotifications') {
                return this.webNotifications;
            } else if (key === 'globalVars') {
                return this.globalVars;
            }

            return null;
        });

        return new (pluginFunction(...values))(data);
    }

    /**
     * init function
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    async init({ port, web, nobonjour }) {
        port = port || (await utils.findPort()); // eslint-disable-line no-param-reassign
        web = web || (await utils.findPort(port + 1)); // eslint-disable-line no-param-reassign

        // socket server to communicate with clients
        this.io.listen(port);
        this.webNotifications = new (WebNotifications(this))(this.app);

        // webserver for configuration
        this.webNotifications.listen(web, () => {
            if (!nobonjour) {
                this.bonjour.publish({ name: 'SmartNode Server', type: 'smartnode', port });
                this.bonjour.published = true;
            }

            this._logger.success(`SmartNode server up and running, socket available on port ${port}`);
            this._logger.success(`Webserver running on port ${web}`);
        });

        this.io.on('connection', (socket) => {
            this._logger.info('Client connected:', socket.client.id);

            return new (SocketEventsHandler(this))(socket, ServerClientConnector);
        });
    }

    close(callback) {
        let client;
        this.io.close();

        if (this.bonjour && this.bonjour.published) {
            this.bonjour.published = false;
            this.bonjour.unpublishAll(() => {
                this._logger.warn('Bonjour service unpublished!');

                this.getClientIdList().forEach((id) => {
                    client = this.getClientById(id);
                    this._logger.debug('close if called', id, client);
                    if (client.loaded) this.unloadServerPlugin(client.socket.client.id);
                });

                callback();
            });
        } else {
            this.getClientIdList().forEach((id) => {
                client = this.getClientById(id);
                this._logger.debug('close else called', id, client);
                if (client.loaded) this.unloadServerPlugin(client.socket.client.id);
            });

            callback();
        }
    }

    registerClient(data) {
        return this.clients.registerClient(data);
    }

    connectClient(data) {
        return this.clients.connectClient(data);
    }

    disconnectClient(id, reason) {
        ServerClientConnector.unregister(id, reason);
        return this.clients.disconnectClient(id);
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
            this._logger.info('Client plugin already loaded and therefore skipped for ', id);
            return false;
        }

        this._logger.success(`Client ${id} has loaded it's plugin: ${this.getClientBySocketId(id).plugin}`);

        await this._loadServerPlugin(id).catch((e) => { this._logger.error('Server load plugin error (2)', e); });

        this.updateClientBySocketId(id, { loaded: true });

        return true;
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
        const adapter = this.getClientBySocketId(id);
        let loaded = false;
        let plugin;

        // try to load the plugin and check if it's installed
        try {
            // apparently the plugin is installed
            // => load the server side
            // => hand over client id and useful functions
            // eslint-disable-next-line global-require, import/no-dynamic-require
            plugin = await require(adapter.plugin)
                .Server(adapter)
                .catch((e) => { this._logger.error('Server load plugin error', e); });
            loaded = true;
        } catch (e) {
            // nope, the plugin isn't installed on server side yet - die()
            // this._logger.error(`Plugin "${adapter.plugin}" not found
            //     - you need to install it via "npm install ${adapter.plugin}" first!`);
            // this._logger.debug('Debug', e);
            // process.exit(1);
            this._logger.warn(`Plugin "${adapter.plugin}" not found
                - please install it via 'npm install' or the webconfig.`);
        }

        if (loaded) {
            let functionError;
            if (!('load' in plugin)) { functionError = 'load'; }
            if (!('unload' in plugin)) { functionError = 'unload'; }
            if (!('unpair' in plugin)) { functionError = 'unpair'; }

            if (functionError) {
                throw this._logger.error(`Plugin "${adapter.plugin}" does not provide a
                    "${functionError}()"-function on the server side.
                    Please contact the author!`);
            }

            this.updateClientBySocketId(id, {
                unload: plugin.unload,
                unpair: plugin.unpair,
                loaded: true,
            });

            plugin.load();
        }


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

        this._logger.warn('Unloaded plugin for client:', client ? client.id : null);

        if (client) {
            if (client.loaded) client.unload();
            this.removeClientBySocketId(id);
        }
    }

    getClientIdList() {
        return this.clients.getClientIdList();
    }

    getClientList() {
        return this.clients.getClientList();
    }

    getClientById(id) {
        return this.clients.getClientById(id);
    }

    getClientBySocketId(socketId) {
        return this.clients.getClientBySocketId(socketId);
    }

    updateClient(id, data) {
        return this.clients.updateClient(id, data);
    }

    updateClientBySocketId(id, data) {
        return this.clients.updateClientBySocketId(id, data);
    }

    removeClient(id) {
        return this.clients.removeClient(id);
    }

    removeClientBySocketId(id) {
        return this.clients.removeClientBySocketId(id);
    }

    deleteClient(id) {
        return this.clients.deleteClient(id);
    }

    unpairClient(id) {
        return this.clients.unpairClient(id);
    }

    validConfiguration(config, format) {
        return SmartNodeConfig.validConfiguration(config, format);
    }
};
