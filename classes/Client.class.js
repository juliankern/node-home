// const EventEmitter = require('events');
const bonjour = require('bonjour');
const socketio = require('socket.io-client'); // eslint-disable-line import/no-extraneous-dependencies

const ClientStorage = global.req('classes/Storage.class').Client;
const SmartNodePlugin = global.req('classes/Plugin.class');

const Logger = new (global.req('classes/Log.class'))();

module.exports = class SmartNodeClient {
    /**
     * SmartNodeClient contructor
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    constructor(options, cb) {
        this.adapter = {};
        this.socket = {};
        this.service = {};

        this.pluginName = options.plugin;
        this.serverAddress = options.server || false;

        this.logger = Logger;

        if (!this.serverAddress) {
            this.bonjour = bonjour();
        }

        Logger.info('new SmartNodeClient:', this.pluginName);
        this.storage = new ClientStorage(this.pluginName, () => {
            if (cb) cb();
        });
    }

    /**
     * init function
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    async init() {
        if (!this.serverAddress) {
            Logger.info('Starting search for master server...');

            this.browser = this.bonjour.find({ type: 'smartnode' });

            this.browser.on('up', (service) => {
                this.service = service;

                this.onFoundMaster();
            });
        } else {
            const address = this.serverAddress.split(':')[0];
            const port = this.serverAddress.split(':')[1] || 80;

            this.service = {
                addresses: [
                    address,
                ],
                port,
            };

            this.onFoundMaster();
        }
    }

    close() {
        if ('close' in this.socket) this.socket.close();
        if (this.browser) this.browser.stop();
        if (this.bonjour) this.bonjour.destroy();
    }

    onFoundMaster() {
        const address = this.service.addresses[0].includes(':') ? this.service.addresses[1] : this.service.addresses[0];

        Logger.success('Found an SmartNode server:', `http://${address}:${this.service.port}`);

        this.socket = socketio(`http://${address}:${this.service.port}`);

        this.socket.on('connect', this.onConnect.bind(this));
        this.socket.on('unpair', this.onUnpair.bind(this));
        this.socket.on('disconnect', this.onDisconnect.bind(this));
        this.socket.on('connect_error', (error) => {
            if (this.serverAddress) {
                Logger.error('Could not find master server. Did you type the server address correctly?');
            }

            throw Logger.error('Client connection error:', error);
        });
    }

    async onConnect() {
        this.adapter = new (SmartNodePlugin.Client(this))({
            socket: this.socket,
            id: this.socket.id,
        });

        const clientId = await this.adapter.storage.get('clientid');

        Logger.success(`Connected to server! Own socket: ${this.socket.id}, own client-ID: ${clientId}`);

        const plugin = await this._getPlugin();
        const [pkg, callback] = plugin.init();

        this.socket.emit('connected', {
            plugin: this.pluginName,
            configurationFormat: pkg.configurationFormat,
            displayName: pkg.displayName,
            id: clientId,
        }, async ({ id }) => {
            // console.log('connected callback', clientId, id);
            if (id !== clientId) {
                await this.adapter.storage.set('clientid', id);
            }

            await this.register();
            callback({ id: clientId });
        });
    }

    onUnpair() {
        this.adapter.storage.set('clientid', undefined);
        this.adapter.unpair();
        this._unloadPlugin();
        delete this.adapter;

        this.onFoundMaster();
    }

    async register() {
        const clientId = await this.adapter.storage.get('clientid');
        Logger.info('emitting register with clientID:', clientId);
        this.socket.emit('register', {
            id: clientId,
        }, (data) => {
            global.muted('Registered successfully!');

            this.adapter.plugin = this.pluginName;

            if (data && data.config && Object.keys(data.config).length) {
                this.adapter.config = data.config;
                this._loadPlugin();
                Logger.info('Setup already done, loading plugin...');
            } else {
                this.socket.on('setup', this.onSetup.bind(this));
                Logger.info('Waiting for setup to complete...');
            }
        });
    }

    async onSetup(data) {
        Logger.info('Setup completed - loading plugin...', data);
        this.adapter.config = data.config;
        this.adapter.room = data.config.room;

        this._loadPlugin();
    }

    async onDisconnect(reason) {
        Logger.info('Server disconnected! Reason:', reason);
        this._unloadPlugin();

        Logger.info('Starting search for master server...');
    }

    async _getPlugin() {
        let plugin;

        try {
            // eslint-disable-next-line global-require, import/no-dynamic-require
            plugin = await require(`${this.pluginName}`)
                .Client(this.adapter)
                .catch((e) => { Logger.error('Client load plugin error', e); });
        } catch (e) {
            Logger.error(`Could not load plugin "${this.pluginName}"
                - you probably need to install it via "npm install ${this.pluginName}" first!`);
            Logger.debug('Debug', e);
            process.exit(1);
        }

        let functionError;
        if (!('init' in plugin)) { functionError = 'init'; }
        if (!('load' in plugin)) { functionError = 'load'; }
        if (!('unload' in plugin)) { functionError = 'unload'; }
        if (!('unpair' in plugin)) { functionError = 'unpair'; }

        if (functionError) {
            throw Logger.error(`Plugin "${this.pluginName}" does not provide a "${functionError}()"
                -function on the client side. Please contact the author!`);
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
        const plugin = await this._getPlugin();
        this.adapter.unload = plugin.unload;
        this.adapter.unpair = plugin.unpair;

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
        this.adapter.socket.close();
    }
};
