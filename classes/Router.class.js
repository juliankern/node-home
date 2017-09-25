// const EventEmitter = require('events');
const utils = global.req('util');
const express = require('express');
const expressSession = require('express-session');
const bodyparser = require('body-parser');
const connectFlash = require('connect-flash');

const Logger = global.req('classes/Log.class');
const RoomModel = new (global.req('models/Room.model'))();

let Room;

module.exports = SmartNodeServer => class SmartNodeRouter {
        /**
     * SmartNodeServerPlugin contructor
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {object} data holds the data needed to init the plugin
     */
    constructor(app) {
        // super();
        this.app = app;

        this.app.use(expressSession({
            secret: 'keyboard cat',
            cookie: app.get('env') === 'production' ? { secure: true } : {},
            saveUninitialized: false,
            resave: true,
        }));

        this.app.set('view engine', 'pug');
        this.app.set('views', './views');
        this.app.use(express.static('public'));
        this.app.use(bodyparser.urlencoded({ extended: false }));
        this.app.use(connectFlash());

        this.app.use(this.handler);

        this._logger = new Logger();
        // this.init();
    }

    async init() {
        Room = await RoomModel.init();

        this.app.get('/', (req, res) => {
            res.render('index', {});
        });

        this.addRoute('/config/:clientId', this.configRoute);

        if (global.DEVMODE) {
            this.addRoute('/styleguide', this.styleguideRoute);
        }
    }

    addRoute(path, handler) {
        handler.call(this, this.app.route(path));
    }

    styleguideRoute(route) {
        route.get((req, res) => res.render('styleguide', { headline: 'Styleguide' }));
    }

    configRoute(route) {
        route
            .get(async (req, res) => {
                const client = SmartNodeServer.getClientById(req.params.clientId);

                if (!client) {
                    return res.redirect('/');
                }

                let rooms = await Room.find().exec();
                rooms = rooms.map((r) => {
                    return r.name;
                })

                return res.render('config', {
                    config: client.config,
                    plugin: client.plugin,
                    id: client.id,
                    displayName: client.displayName,
                    configurationFormat: client.configurationFormat,
                    rooms,
                });
            })
            .post(async (req, res) => {
                const config = {};
                const client = SmartNodeServer.getClientById(req.params.clientId);
                const hasConfig = client.config && Object.keys(client.config).length;

                Object.keys(req.body).forEach((k) => {
                    if (k !== 'room' && k !== 'newroom') {
                        utils.setValueByPath(config, k, req.body[k]);
                    }
                });

                const errors = SmartNodeServer.validConfiguration(config, client.configurationFormat);

                if (errors) {
                    req.arrayFlash(errors, 'error');
                } else if ('reset' in req.body) {
                    client.socket.emit('unpair');
                    SmartNodeServer.unpairClient(req.params.clientId);
                    await SmartNodeServer.clients.registeredClients.remove(req.params.clientId);

                    req.flash('success', { message: `The client was unpaired successfully.
                        You can now set it up again.` });

                    return res.redirect('/');
                } else {
                    // no validation errors, save config and trigger onSetup

                    if (req.body.room === '-1') {
                        config.room = req.body.newroom;
                        await Room.insert({ name: req.body.newroom });
                    } else {
                        config.room = req.body.room;
                    }

                    client.config = config;

                    await SmartNodeServer.updateClient(req.params.clientId, { config });
                    client.init();

                    if (!hasConfig) {
                        client.socket.emit('setup', { config });
                        this.logger.info('Setup completed - waiting for client to load plugin...');
                        req.flash('success', { message: 'The client was setup successfully.' });
                    } else {
                        req.flash('success', { message: 'The client was updated successfully.' });
                    }
                }

                return res.redirect(`/config/${req.params.clientId}`);
            })
        ;
    }

    handler(req, res, next) {
        // handle some app specific data

        // add error/siccess/info messages to templates
        Object.assign(res.locals, {
            messages: {
                success: req.flash('success'),
                info: req.flash('info'),
                error: req.flash('error'),
            },
            formdata: req.flash('form')[0],
        });

        // transform error array to flashes
        req.arrayFlash = (array, type) => {
            array.forEach((err) => {
                req.flash(type, err);
            });
        };

        if (Object.keys(req.body).length > 0) {
            req.flash('form', req.body);
        }

        res.locals.clients = SmartNodeServer.getClientList();

        // console.log('CLIENTLIST: #', res.locals.clients);

        // add error fields to templates
        if (res.locals.messages.error && res.locals.messages.error.length > 0) {
            res.locals.fields = [];
            res.locals.messages.error.forEach((err) => {
                res.locals.fields = res.locals.fields.concat(err.fields);
            });
        }

        next();
    }
};
