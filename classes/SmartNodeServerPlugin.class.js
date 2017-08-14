const EventEmitter = require('events');
const utils = global.req('util');

module.exports = ({ storage, globalVariables, globalsChanged }) => {
    return class SmartNodeServerPlugin extends EventEmitter {
        constructor(data) {
            super();

            this.id = data.id;
            this.socket = data.socket;
            this.config = data.config;
            this.room = data.config.room;
            this.type = data.config.type;

            // which global variables the plugin will be using, to watch them
            this.globals = { 
                global: [],
                room: []
            };
            
            if (!globalVariables[this.room]) globalVariables[this.room] = {};

            this.storage = {
                get: (key) => {
                    return storage.getItemSync(`${this.config.room}.${this.config.type}.${key}`);
                },
                set: (key, value) => {
                    return storage.setItemSync(`${this.config.room}.${this.config.type}.${key}`, value);
                }
            };
        }

        getGlobals() { 
            return { 
                global: globalVariables.global,
                room: globalVariables[this.room] 
            } 
        }
        
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
                this,
                globalPaths, 
                roomPaths
            );
        }
    }
}