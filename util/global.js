const path = require('path');
const Logger = require('../classes/Log.class');

const logger = new Logger();

// add global functions
Object.assign(global, {
    DEVMODE: process.env.NODE_ENV === 'development',
    approot: path.resolve('./'),
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
    req: modulepath => require(path.resolve('./', modulepath)),
});

process.on('unhandledRejection', (err) => { throw logger.error('Unhandeled rejection caught!', err); });
