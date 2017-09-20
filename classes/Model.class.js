const EventEmitter = require('events');

const Logger = global.req('classes/Log.class');
const logger = new Logger();

const ModelTester = {
    ObjectId: variable => variable === String(variable) && /^[a-zA-Z0-9]{12}$/.test(variable),
};

module.exports = class Model extends EventEmitter {
    constructor(name, schema, options) {
        super();

        this.Types = {
            Array: Array.isArray,
            Object,
            Number,
            String,
            ObjectId: ModelTester.ObjectId,
        };

        this.name = name;
        this.schema = Object.assign({
            _id: {
                type: this.Types.ObjectId,
                unique: true,
            },
        }, schema);
        this.options = Object.assign({

        }, options);

        this._usedIds = [];
        this._data = {};

        Object.keys(this.schema).forEach((key) => {
            Object.defineProperty(this, key, {
                get: () => this._data[key],
                set: (value) => {
                    if (this._isValueValid(key, value)) {
                        this._data[key] = value;

                        if (this.options.storage) {
                            // ToDo
                        }
                    }
                },
            });
        });
    }

    new(data) {
        Object.keys(this.schema).forEach((key) => {
            if (this.schema[key].required && !data[key]) {
                throw logger.error(`Value ${key} in model ${this.name} is required!`);
            }
        });

        Object.keys(data).forEach((key) => {
            this[key] = data[key]; // triggers above defined setters
        });
    }

    _isValueValid(key, value) {
        if (value !== this.schema[key].type(value)) {
            throw logger.error(`Value ${key} in model ${this.name} needs to be of type ${this.schema[key].type}`);
        }

        return true;
    }
};

