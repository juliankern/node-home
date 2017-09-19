const utils = global.req('util');
const EventEmitter = require('events');

const Storage = global.req('classes/Storage.class');
const Logger = global.req('classes/Log.class');

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
    Server: ['webNotifications', 'globalVars',
        (webNotifications, globalVars) => class SmartNodeServerPlugin extends EventEmitter {
            /**
             * SmartNodeServerPlugin contructor
             *
             * @author Julian Kern <mail@juliankern.com>
             *
             * @param  {object} data holds the data needed to init the plugin
             */
            constructor(data) {
                super();
                this._logger = new Logger();

                this.id = data.id;
                this.socket = data.socket;
                this.config = data.config;
                this.configurationFormat = data.configurationFormat;
                this.plugin = data.plugin;
                this.displayName = data.displayName;

                this.webNotifications = webNotifications;

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

                    globalVars.initRoom(this.room);

                    this.storage = new Storage.Server({ room: this.room, plugin: this.plugin });
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
                    global: globalVars.getGlobals(),
                    room: globalVars.getRoom(this.room),
                };
            }

            removeGlobals() {
                this.globals.global.forEach((path) => {
                    utils.deleteByPath(globalVars.getGlobals(), path);
                });

                this.globals.room.forEach((path) => {
                    utils.deleteByPath(globalVars.getRoom(this.room), path);
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
                    throw this._logger.error(
                        'The plugin doesn\'t define it\'s variables. Please contact the author.');
                }

                if (glo && Object.keys(glo).length > 0 && !this.globals.global.length) {
                    throw this._logger.error(
                        'The plugin doesn\'t define it\'s global variables. Please contact the author.');
                }

                if (room && Object.keys(room).length > 0 && !this.globals.room.length) {
                    throw this._logger.error(
                        'The plugin doesn\'t define it\'s room variables. Please contact the author.');
                }

                const globalPaths = utils.getObjectPaths(glo);
                const roomPaths = utils.getObjectPaths(room);

                globalPaths.forEach((key) => {
                    if (!this.globals.global.includes(key)) {
                        throw this._logger.error(
                            `The plugin tries to change a not previously defined global variable (${key}).
                            Please contact the author.`);
                    }

                    if (utils.getValueByPath(globalVars.getGlobals(), key) === utils.getValueByPath(glo, key)) {
                        // value didn't change at all
                        delete globalPaths[key];
                        utils.deleteByPath(glo, key);
                    } else {
                        utils.setValueByPath(globalVars.getGlobals(), key, utils.getValueByPath(glo, key));
                    }
                });

                roomPaths.forEach((key) => {
                    if (!this.globals.room.includes(key)) {
                        throw this._logger.error(
                            `The plugin tries to change a not previously defined room variable (${key}).
                            Please contact the author.`);
                    }

                    if (utils.getValueByPath(globalVars.getRoom(this.room), key) ===
                        utils.getValueByPath(room, key)
                    ) {
                        // value didn't change at all
                        delete roomPaths[key];
                        utils.deleteByPath(room, key);
                    } else {
                        utils.setValueByPath(
                            globalVars.getRoom(this.room), key, utils.getValueByPath(room, key),
                        );
                    }
                });

                globalVars.changed(
                    this.id,
                    {
                        global: glo,
                        room,
                    },
                );
            }
        },
    ],
    Client: ['storage', storage => class SmartNodeClientPlugin extends EventEmitter {
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
    }],
};
