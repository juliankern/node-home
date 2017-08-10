const EventEmitter = require('events');

module.exports = ({ storage, globalVariables, clients }) => {
    return class SmartNodeServerPlugin extends EventEmitter {
        constructor(data) {
            super();

            this.id = data.id;
            this.socket = data.socket;
            this.config = data.config;
            this.room = data.config.room;
            this.type = data.config.type;

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
            Object.assign(globalVariables.global, g);
            globalVariables[this.room] = Object.assign({}, globalVariables[this.room], room);
            
            Object.keys(clients).forEach((id) => {
                if (id !== this.id) clients[id].emit('globalsChanged', globalVariables);
            });
        }
    }
}