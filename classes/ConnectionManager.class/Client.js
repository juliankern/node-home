const EventEmitter = require('events');

const shared = require('./shared.js');

module.exports = class ClientConnectionManager extends EventEmitter {
    constructor(io) {
        super();

        this._io = io;

        this.init();
    }

    init() {
        shared.events.concat([]).forEach((e) => {
            this._io.on(e, this[`on${shared.ucfirst(e)}`].bind(this));
        });
    }

    onConnection() {

    }

    onHandshake() {

    }

    onReady() {

    }
};
