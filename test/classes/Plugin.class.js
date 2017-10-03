/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
const expect = require('chai').expect;
const EventEmitter = require('events');

require('../../util/global.js');

const PluginClass = global.SmartNode.require('classes/Plugin.class');

describe('classes/Plugin.class', () => {
    describe('Client', () => {
        let ClientPlugin = {};

        beforeEach(() => {
            let Client = PluginClass.Client;
            Client = Client[Client.length - 1]('storage');
            ClientPlugin = new Client({
                id: 1,
                socket: 2,
                config: {
                    room: 'room',
                    plugin: 'plugin',
                },
            });
        });

        it('should initialize properly', () => {
            expect(ClientPlugin).to.have.property('loaded', false);
            expect(ClientPlugin).to.have.property('id', 1);
            expect(ClientPlugin).to.have.property('storage', 'storage');
            expect(ClientPlugin).to.have.property('socket', 2);
            expect(ClientPlugin).to.have.property('room', 'room');
            expect(ClientPlugin).to.have.property('plugin', 'plugin');

            expect(ClientPlugin.config).to.deep.equal({ room: 'room', plugin: 'plugin' });
        });

        it('should inherit EventEmitter', () => {
            expect(ClientPlugin).to.be.an.instanceof(EventEmitter);
            expect(typeof ClientPlugin.on === 'function').to.be.true;
        });
    });
});
