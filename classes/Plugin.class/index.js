/* eslint-disable global-require */
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
    Server: require('./Server'),
    Client: require('./Client'),
};
