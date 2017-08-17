// const EventEmitter = require('events');

const bonjour = require('bonjour');
const app = require('express')();
const http = require('http');
const socketio = require('socket.io');

const utils = global.req('util');
const storage = require('node-persist');
storage.initSync({ dir: 'storage/server' });

const SmartNodePlugin = global.req('classes/SmartNodePlugin.class.js');
const SmartNodeRouter = global.req('classes/SmartNodeRouter.class.js');

module.exports = class SmartNodeServer {
    /**
     * SmartNodeServer contructor
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    constructor() {
        this.server = http.Server(app);
        this.io = socketio(this.server);
        this.bonjour = bonjour();
        this.storage = storage;

        this.globals = {
            global: {}
        }

        this.clients = {};
    }

    /**
     * init function
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    async init(port, Connector, getEventHandlersForSocketFn) {
        port = port || (await utils.findPort());

        this.server.listen(port, () => {
            this.bonjour.publish({ name: 'SmartNode Server', type: 'smartnode', port: port });
            this.bonjour.published = true;

            global.success(`SmartNode server up and running, broadcasting via bonjour on port ${port}`);
        });

        new (SmartNodeRouter(this))(app);

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
    }

    close(callback) {
        this.io.close();


        if(this.bonjour.published) {
            this.bonjour.published = false;
            this.bonjour.unpublishAll(() => {
                global.warn('Bonjour service unpublished!');

                this.getClientIdList().forEach((id) => { 
                    if (this.getClientById(id).loaded) this.unloadServerPlugin(id); 
                });

                callback();
            });
        } else {
            this.getClientIdList().forEach((id) => { 
                if (this.getClientById(id).loaded) this.unloadServerPlugin(id); 
            });

            callback();
        }
    }

    validConfiguration(config, format) {
        let error = false;

        parse(config, format);


        return !error;

        function parse(config, format) {
            // if both have the same amount of base values
            if (Object.keys(config).length !== Object.keys(format).length) {
                error = true; return false;
            }

            // if both have the same base value names
            if (!utils.arraysEqual(Object.keys(config).sort(), Object.keys(format).sort())) {
                error = true; return false;
            }

            // check every field individually
            for (let k in format) {
                // check if every field in the format has a description
                if (!format[k].description || format[k].description.length === 0) {
                    error = true; break;
                }

                // check if required properties are set
                if (
                    (format[k].type !== 'number' && format[k].required && !config[k]) ||
                    (format[k].type === 'number' && format[k].required && config[k] !== '')
                ) {
                    error = true; break;
                }

                // check if property is string
                if (format[k].type === 'string' && typeof config[k] !== 'string') {
                    error = true; break;
                }

                // check if property is number
                if (format[k].type === 'number' && typeof config[k] !== 'number') {
                    error = true; break;
                }

                // check if property is object and has subproperties
                if (format[k].type === 'object' && !(typeof config[k] === 'object' && Object.ks(config[k]).length > 0)) {
                    error = true; break;
                } else {
                    // check if subproperties are also valid
                    parse(config[k], format[k].properties);
                }

                if (format[k].type === 'select' && !(config[k].values && config[k].values.length > 0)) {
                    error = true; break;
                }

                if (format[k].type === 'array' && !format[k].length) {
                    error = true; break;
                }

                if (format[k].type === 'array' && (typeof config[k] === 'object' && config[k].length === format[k].length)) {
                    error = true; break;
                }
            }

            return true;
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

    addClient(data) {
        if (data.config) {
            this.clients[data.id] = new (SmartNodePlugin.Server(this))(data);
        } else {
            this.clients[data.id] = data;
        }

        return this.clients[data.id];
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
        let client = this.getClientById(id);
        global.warn('Unloaded plugin for client', id);

        if (client.loaded) client.unload();
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