const EventEmitter = require('events');

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
        
        setGlobals(g, room) {
            if (!this.globals.global.length && !this.globals.room.length) {
                throw 'The plugin doesn\'t define it\'s variables. Please contact the author.';
            }

            if(g && Object.keys(g).length > 0 && !this.globals.global.length) {
                throw 'The plugin doesn\'t define it\'s global variables. Please contact the author.'
            }

            if(room && Object.keys(room).length > 0 && !this.globals.room.length) {
                throw 'The plugin doesn\'t define it\'s room variables. Please contact the author.'
            }

            if (g)

            Object.assign(globalVariables.global, g);
            globalVariables[this.room] = Object.assign({}, globalVariables[this.room], room);
            
            globalsChanged();
        }
    }
}