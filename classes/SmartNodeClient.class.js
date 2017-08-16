// const EventEmitter = require('events');
const moment = require('moment');
const bonjour = require('bonjour');
const socketio = require('socket.io-client');

const storage = require('node-persist');

const SmartNodeClientPlugin = global.req('classes/SmartNodePlugin.class.js').Client();

module.exports = class SmartNodeClient {
    /**
     * SmartNodeClient contructor
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    constructor(config) {
        storage.initSync({ dir: `storage/client/${config.room}/${config.module}` });
        
        this.bonjour = bonjour();
        this.storage = storage;

        this.config = config;
        this.adapter = {};
        this.socket = {};
    }

    /**
     * init function
     *
     * @author Julian Kern <mail@juliankern.com>
     */
    async init() {
        let searchTime = +moment();
        global.log('Starting search for master server...');

        let browser = this.bonjour.find({ type: 'smartnode' });
        
        browser.on('up', (service) => {
            global.muted(`Time to find master server: ${+moment() - searchTime}ms`); searchTime = +moment();

            let address = service.addresses[0].includes(':') ? service.addresses[1] : service.addresses[0];

            global.success('Found an SmartNode server:', `http://${address}:${service.port}`);

            this.socket = socketio(`http://${address}:${service.port}`);
            
            this.socket.on('connect', () => {
                global.muted(`Time to connect master server: ${+moment()-searchTime}ms`);
                global.success('Connected to server! Own ID:', this.socket.id);

                this.socket.emit('register', { 
                    module: this.config.module,
                    room: this.config.room,
                    loaded: this.adapter.loaded
                }, async (d) => {
                    this.adapter = new SmartNodeClientPlugin({
                        socket: this.socket,
                        id: this.socket.id,
                        config: this.config
                    });

                    global.muted('Registered successfully!');
                    this._loadPlugin();
                });
            });

            this.socket.on('disconnect', async (reason) => {
                global.warn('Server disconnected! Reason:', reason);
                this._unloadPlugin();

                global.log('Starting search for master server...'); searchTime = +moment();
            });
        });
    }

    /**
     * load client plugin
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @return {[type]} returns true if loaded
     */
    async _loadPlugin() {
        let plugin;

        try {
            plugin = await require(`${this.adapter.module}`)
                .Client(this.adapter)
                .catch((e) => { global.error('Client load plugin error', e) });
        } catch(e) {
            global.error(`Could not load plugin "${this.adapter.module}" - you probably need to install it via "npm install ${this.adapter.module}" first!`);
            global.muted('Debug', e);
            process.exit(1);
        }

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
        this.adapter.loaded = false;
        this.socket.close();
        return this.adapter.unload();
    }
}