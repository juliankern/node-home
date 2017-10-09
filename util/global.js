global.SmartNode = {};
global.SmartNode.DEVMODE = process.env.NODE_ENV === 'development';

const path = require('path');
const EventEmitter = require('events');

const Logger = require('../classes/Log.class');

const logger = new Logger();

class SmartNode extends EventEmitter {
    constructor() {
        super();

        this.DEVMODE = process.env.NODE_ENV === 'development';
        this.approot = path.resolve('./');

        /**
         * require() wrapper for requires always based on approot
         *
         * @author Julian Kern <mail@juliankern.com>
         *
         * @param  {string} modulepath path to module
         *
         * @return {object}            required module
         */
        // eslint-disable-next-line import/no-dynamic-require, global-require
        this.require = modulepath => require(path.resolve('./', modulepath));

        this.ServerClassInstance = undefined;
        this.ServerStorageInstance = undefined;
    }

    getServerInstance(callback) {
        if (!this.ServerClassInstance) {
            const Class = this.require('classes/Server.class.js');
            const instance = new Class(callback);
            // Object.freeze(instance);
            this.ServerClassInstance = instance;
        }

        return this.ServerClassInstance;
    }

    getServerStorageInstance(callback) {
        if (!this.ServerStorageInstance) {
            this.ServerStorageInstance = new (this.require('classes/Storage.class').Server)({}, () => {
                if (callback) callback();
            });
            Object.freeze(this.ServerStorageInstance);
        }

        return this.ServerStorageInstance;
    }
}

global.SmartNode = new SmartNode();

/* istanbul ignore next */
process.on('unhandledRejection', (err) => { throw logger.error('Unhandeled rejection caught!', err); });
