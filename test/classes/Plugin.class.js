/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
const expect = require('chai').expect;
const EventEmitter = require('events');

require('../../util/global.js');

const PluginClass = global.SmartNode.require('classes/Plugin.class');

describe('Plugin.class', () => {
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
            expect(ClientPlugin.loaded).to.be.false;
            expect(ClientPlugin.id).to.equal(1);
            expect(ClientPlugin.storage).to.equal('storage');
            expect(ClientPlugin.socket).to.equal(2);
            expect(ClientPlugin.room).to.equal('room');
            expect(ClientPlugin.room).to.equal('room');
            expect(ClientPlugin.plugin).to.equal('plugin');
            expect(ClientPlugin.config).to.deep.equal({ room: 'room', plugin: 'plugin' });
        });

        it('should inherit EventEmitter', () => {
            expect(ClientPlugin instanceof EventEmitter).to.be.true;
            expect(typeof ClientPlugin.on === 'function').to.be.true;
        });
    });
});
