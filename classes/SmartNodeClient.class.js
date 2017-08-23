// const EventEmitter = require('events');
const moment = require('moment');
const bonjour = require('bonjour');
const socketio = require('socket.io-client');

const storage = require('node-persist');

const SmartNodePlugin = global.req('classes/SmartNodePlugin.class.js');

module.exports = class SmartNodeClient {
    /**
     * SmartNodeClient contructor
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    constructor(pluginName) {
        this.bonjour = bonjour();
        this.storage = storage;
        this.storage.initSync({ dir: `storage/client/${pluginName}` });

        this.pluginName = pluginName;
        this.adapter = {};
        this.socket = {};
    }

    /**
     * init function
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    async init() {
        global.log('Starting search for master server...');

        let browser = this.bonjour.find({ type: 'smartnode' });
        
        browser.on('up', (service) => {
            let address = service.addresses[0].includes(':') ? service.addresses[1] : service.addresses[0];

            global.success('Found an SmartNode server:', `http://${address}:${service.port}`);

            this.socket = socketio(`http://${address}:${service.port}`);
            
            this.socket.on('connect', async () => { await this.onConnect(); });
            this.socket.on('disconnect', async () => { await this.onDisconnect(); });
        });
    }

    async onConnect() {

        this.adapter = new (SmartNodePlugin.Client(this))({
            socket: this.socket,
            id: this.socket.id,
        });

        let clientId = this.adapter.storage.get('clientid');

        global.success(`Connected to server! Own socket: ${this.socket.id}, own client-ID: ${clientId}`);

        let plugin = await this._getPlugin();
        let [pkg, callback] = plugin.init();

        this.socket.emit('connected', { 
            plugin: this.pluginName,
            configurationFormat: pkg.configurationFormat,
            displayName:  pkg.displayName,
            id: clientId
        }, (data) => {
            global.muted('Connected!', data);

            this.adapter.storage.set('clientid', data.id);

            this.register();
        });

    }

    register() {
        this.socket.emit('register', { 
            id: this.adapter.storage.get('clientid')
        }, (data) => {
            global.muted('Registered successfully!');

            if (data.config) {
                this.adapter.config = data.config;
                this._loadPlugin();
                global.muted('Setup already done, loading plugin...');
            } else {
                this.socket.on('setup', this.onSetup);
                global.muted('Waiting for setup to complete...');
            }
        });
    }

    async onSetup(data) {
        console.log('setup completed', data);
        // this.storage.set('configuration', configuration);

        // this._loadPlugin();
    }

    async onDisconnect(reason) {
        global.warn('Server disconnected! Reason:', reason);
        this._unloadPlugin();

        global.log('Starting search for master server...');
    }

    async _getPlugin() {
        let plugin;

        try {
            plugin = await require(`${this.pluginName}`)
                .Client(this.adapter)
                .catch((e) => { global.error('Client load plugin error', e) });
        } catch(e) {
            global.error(`Could not load plugin "${this.pluginName}" - you probably need to install it via "npm install ${this.pluginName}" first!`);
            global.muted('Debug', e);
            process.exit(1);
        }

        return plugin;
    }

    /**
     * load client plugin
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @return {[type]} returns true if loaded
     */
    async _loadPlugin() {
        let plugin = await this._getPlugin();
        this.adapter.unload = plugin.unload;

        return plugin.load().then((loaded) => {
            if (loaded) this.adapter.loaded = true;
        });
    }

    /**
     * unloads plugin and cleans up
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    async _unloadPlugin() {
        if (this.adapter.loaded) this.adapter.unload();
        this.adapter.loaded = false;
        this.socket.close();
    }
}