const EventEmitter = require('events');
const utils = global.req('util');

/**
 * SmartNodeServerPlugin class      
 *
 * @author Julian Kern <mail@juliankern.com>
 *
 * @param  {object} options.storage             storage handle to save/get data
 * @param  {object} options.globalVariables     global variable to hold all globals
 * @param  {function} options.globalsChanged    function to be called when globals get changed => triggers events on all other plugins
 */
module.exports = {
    Server: ({ storage, globalVariables, globalsChanged }) => {
        return class SmartNodeServerPlugin extends EventEmitter {
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
                this.room = data.config.room;
                this.module = data.config.module;

                // which global variables the plugin will be using, to watch them
                this.globals = { 
                    global: [],
                    room: []
                };
                
                if (!globalVariables[this.room]) globalVariables[this.room] = {};

                this.storage = {
                    get: (key) => {
                        return storage.getItemSync(`${this.config.room}.${this.config.module}.${key}`);
                    },
                    set: (key, value) => {
                        return storage.setItemSync(`${this.config.room}.${this.config.module}.${key}`, value);
                    }
                };

                this.displayData = [];
            }

            saveDisplayData(key, data) {
                this.displayData.push({ key, data });
            }

            getDisplayData(key) {
                return this.displayData.filter((d) => { return d.key === key; });
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
                    global: globalVariables.global,
                    room: globalVariables[this.room] 
                } 
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
                    throw 'The plugin doesn\'t define it\'s variables. Please contact the author.';
                }

                if(glo && Object.keys(glo).length > 0 && !this.globals.global.length) {
                    throw 'The plugin doesn\'t define it\'s global variables. Please contact the author.'
                }

                if(room && Object.keys(room).length > 0 && !this.globals.room.length) {
                    throw 'The plugin doesn\'t define it\'s room variables. Please contact the author.'
                }

                let globalPaths = utils.getObjectPaths(glo);
                let roomPaths = utils.getObjectPaths(room);

                globalPaths.forEach((key) => {
                    if (!this.globals.global.includes(key)) {
                        throw `The plugin tries to change a not previously defined global variable (${key}). Please contact the author.`
                    }
                    
                    if (utils.getValueByPath(globalVariables.global, key) === utils.getValueByPath(glo, key)) {
                        // value didn't change at all
                        delete globalPaths[key];
                        utils.deleteByPath(glo, key);
                    } else {
                        utils.setValueByPath(globalVariables.global, key, utils.getValueByPath(glo, key));
                    }
                });
                
                roomPaths.forEach((key) => {
                    if (!this.globals.room.includes(key)) {
                        throw `The plugin tries to change a not previously defined room variable (${key}). Please contact the author.`
                    }
                    
                    if (utils.getValueByPath(globalVariables[this.room], key) === utils.getValueByPath(room, key)) {
                        // value didn't change at all
                        delete roomPaths[key];
                        utils.deleteByPath(room, key);
                    } else {
                        utils.setValueByPath(globalVariables[this.room], key, utils.getValueByPath(room, key));
                    }
                });
                            
                globalsChanged(
                    this.id,
                    {
                        global: glo,
                        room
                    }
                );
            }
        }
    },
    Client: () => {
        return class SmartNodeClientPlugin extends EventEmitter {
            constructor(data) {
                super();

                this.id = data.id;
                this.socket = data.socket;
                this.config = data.config;
                this.room = data.config.room;
                this.module = data.config.module;

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
    }
}