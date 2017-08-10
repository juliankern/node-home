const EventEmitter = require('events');

module.exports = class SmartNodeClientPlugin extends EventEmitter {
    constructor(data) {
        super();

        this.id = data.id;
        this.socket = data.socket;
        this.config = data.config;
        this.room = data.config.room;
        this.type = data.config.type;

        this.loaded = false;

        this.storage = {
            get: (key) => {
                return storage.getItemSync(`${key}`);
            },
            set: (key, value) => {
                return storage.setItemSync(`${key}`, value);
            }
        };
    }
}