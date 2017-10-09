const EventEmitter = require('events');

module.exports = ['storage', storage => class SmartNodeClientPlugin extends EventEmitter {
    constructor(data) {
        super();

        this.id = data.id;
        this.socket = data.socket;
        this.config = data.config || {};
        this.room = this.config.room;
        this.plugin = this.config.plugin;

        this.loaded = false;

        this.storage = storage;
    }
}];
