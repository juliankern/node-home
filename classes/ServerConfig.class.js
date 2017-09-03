module.exports = (utils) => {
    return class ServerConfig {
        validConfiguration(config, format) {
            let errors = [];

            config = utils.object2pathlist(config);

            parse(config, format);

            return errors.length > 0 ? errors : false;

            function parse(config, format, parentkey) {
                // if both have the same amount of base values
                // if (Object.keys(config).length !== Object.keys(format).length) {
                //     errors.push({ message: 'Configuration mismatch between expected and actual format (1).'); 
                //     return false;
                // }

                // if both have the same base value names
                // if (!utils.arraysEqual(Object.keys(config).sort(), Object.keys(format).sort())) {
                //     errors.push({ message: 'Configuration mismatch between expected and actual format (2).'); 
                //     return false;
                // }
                
                if (+config.room === 0) {
                    errors.push({ fields: ['room'], message: `You need to select a room or create a new one.` }); 
                    return false;
                }

                if (+config.room === -1 && !config.newroom) {
                    errors.push({ fields: ['newroom'], message: `You need to enter a name for the new room.` }); 
                    return false;
                }

                // check every field individually
                for (let k in format) {
                    // check if every field in the format has a description
                    if (!format[k].description || format[k].description.length === 0) {
                        errors.push({ fields: [parentkey ? parentkey+k : k], message: `Field "${format[k].description}" lacks a description.` }); 
                        break;
                    }

                    // check if required properties are set
                    if (
                        (format[k].type === 'number' && format[k].required && config[parentkey ? parentkey+k : k] === '') ||
                        (format[k].type === 'array' && format[k].required && !config[(parentkey ? parentkey+k : k) + '.0']) ||
                        (format[k].type !== 'number' && format[k].type !== 'array' && format[k].required && !config[parentkey ? parentkey+k : k])
                    ) {
                        errors.push({ fields: [parentkey ? parentkey+k : k],  message: `The required field "${format[k].description}" isn't set!` });
                        break;
                    }

                    // check if property is string
                    if (format[k].type === 'string' && typeof config[parentkey ? parentkey+k : k] !== 'string') {
                        errors.push({ fields: [parentkey ? parentkey+k : k],  message: `The field "${format[k].description}" has the wrong type!` });
                        break;
                    }

                    // check if property is number
                    if (format[k].type === 'number' && typeof +config[parentkey ? parentkey+k : k] !== 'number') {
                        errors.push({ fields: [parentkey ? parentkey+k : k],  message: `The field "${format[k].description}" has the wrong type! (2)` });
                        break;
                    }

                    // check if property is object and has subproperties
                    if (format[k].type === 'object') {
                        // check if subproperties are also valid
                        parse(config, format[k].properties, parentkey ? parentkey + '.' + k + '.' : k + '.');
                    }

                    // is is an select and has properties
                    if (format[k].type === 'select' && !(format[k].values && format[k].values.length > 0)) {
                        errors.push({ fields: [parentkey ? parentkey+k : k],  message: `The field "${format[k].description}" is not properly configured. (1)` });
                        break;
                    }

                    // if is an array and has values
                    if (format[k].type === 'array' && !format[k].length) {
                        errors.push({ fields: [parentkey ? parentkey+k : k],  message: `The field "${format[k].description}" is not properly configured. (2)` });
                        break;
                    }

                    // if is an array and has configured values
                    if (format[k].type === 'array' && (typeof config[parentkey ? parentkey+k : k] === 'object' && config[parentkey ? parentkey+k : k].length === format[k].length)) {
                        errors.push({ fields: [parentkey ? parentkey+k : k],  message: `The field "${format[k].description}" is not properly configured. (3)` }); 
                        break;
                    }
                }

                return true;
            }
        }
    }
}