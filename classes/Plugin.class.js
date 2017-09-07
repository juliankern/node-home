const utils = global.req('util');
const EventEmitter = require('events');

/**
 * SmartNodeServerPlugin class      
 *
 * @author Julian Kern <mail@juliankern.com>
 *
 * @param  {object} options.storage             storage handle to save/get data
 * @param  {object} options.globalVariables     global variable to hold all globals
 * @param  {function} options.globalsChanged    function to be called when globals get changed
 */
module.exports = {
    Server: SmartNodeServer => class SmartNodeServerPlugin extends EventEmitter {
        /**
         * SmartNodeServerPlugin contructor
         *
         * @author Julian Kern <mail@juliankern.com>
         *
         * @param  {object} data holds the data needed to init the plugin
         */
        constructor(data) {
            super();

            this.id = data.id;
            this.socket = data.socket;
            this.config = data.config;
            this.configurationFormat = data.configurationFormat;
            this.plugin = data.plugin;
            this.displayName = data.displayName;

            // which global variables the plugin will be using, to watch them
            this.globals = {
                global: [],
                room: [],
            };

            this.init();

            this.displayData = [];
        }

        init() {
            if (this.config) {
                this.room = this.config.room;

                SmartNodeServer.globalsInitRoom(this.room);

                this.storage = {
                    get: key => SmartNodeServer.storage
                        .getItemSync(`${this.config.room}.${this.config.plugin}.${key}`),
                    set: (key, value) => SmartNodeServer.storage
                        .setItemSync(`${this.config.room}.${this.config.plugin}.${key}`, value),
                };
            }
        }

        addDisplayData(key, data) {
            this.displayData.push({ key, data });
        }

        updateDisplayData(key, data) {
            Object.assign(this.displayData.find(d => d.key === key).data, data);
        }

        removeDisplayData(key) {
            delete this.displayData.find(d => d.key === key);
        }


        removeAllDisplayData() {
            this.displayData = [];
        }

        getDisplayData(key) {
            return this.displayData.filter(d => d.key === key);
        }

        /**
         * Returns the globals for this room/plugin
         *
         * @author Julian Kern <mail@juliankern.com>
         *
         * @return {object} object holding the data
         */
        getGlobals() {
            return {
                global: SmartNodeServer.globalsGetGlobals(),
                room: SmartNodeServer.globalsGetRoom(this.room),
            };
        }

        removeGlobals() {
            this.globals.global.forEach((path) => {
                utils.deleteByPath(SmartNodeServer.globalsGetGlobals(), path);
            });

            this.globals.room.forEach((path) => {
                utils.deleteByPath(SmartNodeServer.globalsGetRoom(this.room), path);
            });
        }

        /**
         * Function to set new globals
         *
         * @author Julian Kern <mail@juliankern.com>
         *
         * @param  {object} glo  holding the global variables to be changed
         * @param  {object} room holding the room specific variables to be changed
         */
        setGlobals(glo, room) {
            if (!this.globals.global.length && !this.globals.room.length) {
                throw global.error('The plugin doesn\'t define it\'s variables. Please contact the author.');
            }

            if (glo && Object.keys(glo).length > 0 && !this.globals.global.length) {
                throw global.error('The plugin doesn\'t define it\'s global variables. Please contact the author.');
            }

            if (room && Object.keys(room).length > 0 && !this.globals.room.length) {
                throw global.error('The plugin doesn\'t define it\'s room variables. Please contact the author.');
            }

            const globalPaths = utils.getObjectPaths(glo);
            const roomPaths = utils.getObjectPaths(room);

            globalPaths.forEach((key) => {
                if (!this.globals.global.includes(key)) {
                    throw global.error(`The plugin tries to change a not previously defined global variable (${key}). 
                        Please contact the author.`);
                }

                if (utils.getValueByPath(SmartNodeServer.globalsGetGlobals(), key) === utils.getValueByPath(glo, key)) {
                    // value didn't change at all
                    delete globalPaths[key];
                    utils.deleteByPath(glo, key);
                } else {
                    utils.setValueByPath(SmartNodeServer.globalsGetGlobals(), key, utils.getValueByPath(glo, key));
                }
            });

            roomPaths.forEach((key) => {
                if (!this.globals.room.includes(key)) {
                    throw global.error(`The plugin tries to change a not previously defined room variable (${key}). 
                        Please contact the author.`);
                }

                if (utils.getValueByPath(SmartNodeServer.globalsGetRoom(this.room), key) ===
                    utils.getValueByPath(room, key)
                ) {
                    // value didn't change at all
                    delete roomPaths[key];
                    utils.deleteByPath(room, key);
                } else {
                    utils.setValueByPath(
                        SmartNodeServer.globalsGetRoom(this.room), key, utils.getValueByPath(room, key),
                    );
                }
            });

            SmartNodeServer.globalsChanged(
                this.id,
                {
                    global: glo,
                    room,
                },
            );
        }
    },
    Client: SmartNodeClient => class SmartNodeClientPlugin extends EventEmitter {
        constructor(data) {
            super();

            this.id = data.id;
            this.socket = data.socket;
            this.config = data.config || {};
            this.room = this.config.room;
            this.plugin = this.config.plugin;

            this.loaded = false;

            this.storage = {
                get: key => SmartNodeClient.storage.getItemSync(`${key}`),
                set: (key, value) => SmartNodeClient.storage.setItemSync(`${key}`, value),
            };
        }
    },
};
