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

const SmartNodePlugin = global.req('classes/SmartNodePlugin.class.js');
const SmartNodeRouter = global.req('classes/SmartNodeRouter.class.js');

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

        this.clients = {};
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
        let savedClients = this.storage.get('clients');

        savedClients[data.id] = {
            id: data.id,
            plugin: data.plugin,
            configurationFormat: data.configurationFormat,
            displayName: data.displayName,
            config: {}
        };

        if (data.config) {
            savedClients[data.id].config = data.config;
        }

        this.storage.set('clients', savedClients);

        this.connectClient(data);

        return savedClients[data.id];
    }

    connectClient(data) {
        this.clients[data.id] = new (SmartNodePlugin.Server(this))(data); 

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

    getClientBySocketId(id) {
        return this.clients[Object.keys(this.clients).find((c) => {
            return this.clients[c].socket.client.id === id;
        })];
    }

    updateClient(id, data) {
        if (data.config) {
            let savedClients = this.storage.get('clients');
            savedClients[id].config = data.config;
            this.storage.set('clients', savedClients);
        }

        return Object.assign(this.clients[id], data);
    }

    updateClientBySocketId(id, data) {
        return this.updateClient(this.getClientBySocketId(id).id, data);
    }

    removeClient(id) {
        return delete this.clients[id];
    }

    removeClientBySocketId(id) {
        return this.removeClient(this.getClientBySocketId(id).id);
    }

    deleteClient(id) {
        let savedClients = this.storage.get('clients');
        delete savedClients[data.id];
        this.storage.set('clients', savedClients);
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

        this.updateClientBySocketId(id, { unload: plugin.unload });

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
        global.warn('Unloaded plugin for client', id);

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
        Object.keys(this.clients).filter((id) => {
            return id !== clientId;
        }).forEach((id) => {
            this.clients[id].emit('globalsChanged', { 
                changed
            });
        });
    }

    validConfiguration(config, format) {
        let errors = [];

        config = utils.object2pathlist(config);

        parse(config, format);

        return errors.length > 0 ? errors : false;

        function parse(config, format, parentkey) {
            // if both have the same amount of base values
            // if (Object.keys(config).length !== Object.keys(format).length) {
            //     errors.push({ message: 'Configuration mismatch between expected and actual format (1).'); 
            //     return false;
            // }

            // if both have the same base value names
            // if (!utils.arraysEqual(Object.keys(config).sort(), Object.keys(format).sort())) {
            //     errors.push({ message: 'Configuration mismatch between expected and actual format (2).'); 
            //     return false;
            // }
            
            if (+config.room === 0) {
                errors.push({ fields: ['room'], message: `You need to select a room or create a new one.` }); 
                return false;
            }

            if (+config.room === -1 && !config.newroom) {
                errors.push({ fields: ['newroom'], message: `You need to enter a name for the new room.` }); 
                return false;
            }

            // check every field individually
            for (let k in format) {
                // check if every field in the format has a description
                if (!format[k].description || format[k].description.length === 0) {
                    errors.push({ fields: [parentkey ? parentkey+k : k], message: `Field "${format[k].description}" lacks a description.` }); 
                    break;
                }

                // check if required properties are set
                if (
                    (format[k].type !== 'number' && format[k].required && !config[parentkey ? parentkey+k : k]) ||
                    (format[k].type === 'number' && format[k].required && config[parentkey ? parentkey+k : k] === '')
                ) {
                    errors.push({ fields: [parentkey ? parentkey+k : k],  message: `The required field "${format[k].description}" isn't set!` });
                    break;
                }

                // check if property is string
                if (format[k].type === 'string' && typeof config[parentkey ? parentkey+k : k] !== 'string') {
                    errors.push({ fields: [parentkey ? parentkey+k : k],  message: `The field "${format[k].description}" has the wrong type!` });
                    break;
                }

                // check if property is number
                if (format[k].type === 'number' && typeof +config[parentkey ? parentkey+k : k] !== 'number') {
                    errors.push({ fields: [parentkey ? parentkey+k : k],  message: `The field "${format[k].description}" has the wrong type! (2)` });
                    break;
                }

                // check if property is object and has subproperties
                if (format[k].type === 'object') {
                    // check if subproperties are also valid
                    parse(config, format[k].properties, parentkey ? parentkey + '.' + k + '.' : k + '.');
                }

                // is is an select and has properties
                if (format[k].type === 'select' && !(format[k].values && format[k].values.length > 0)) {
                    errors.push({ fields: [parentkey ? parentkey+k : k],  message: `The field "${format[k].description}" is not properly configured. (1)` });
                    break;
                }

                // if is an array and has values
                if (format[k].type === 'array' && !format[k].length) {
                    errors.push({ fields: [parentkey ? parentkey+k : k],  message: `The field "${format[k].description}" is not properly configured. (2)` });
                    break;
                }

                // if is an array and has configured values
                if (format[k].type === 'array' && (typeof config[parentkey ? parentkey+k : k] === 'object' && config[parentkey ? parentkey+k : k].length === format[k].length)) {
                    errors.push({ fields: [parentkey ? parentkey+k : k],  message: `The field "${format[k].description}" is not properly configured. (3)` }); 
                    break;
                }
            }

            return true;
        }
    }
}