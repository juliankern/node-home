// const EventEmitter = require('events');
const utils = global.req('util');

const SmartNodeClient = global.req('classes/Client.class');

module.exports = (SmartNodeServer) => {
    // return class SmartNodeRouter extends EventEmitter {
    return class SmartNodeRouter {
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

            this.app.use(require('express-session')({
                secret: 'keyboard cat',
                cookie: app.get('env') === 'production' ? { secure: true } : {},
                saveUninitialized: false,
                resave: true
            }));

            this.app.set('view engine', 'pug');
            this.app.set('views', './views');
            this.app.use(require('express').static('public'));
            this.app.use(require('body-parser').urlencoded({ extended: false }));
            this.app.use(require('connect-flash')());

            this.app.use(this.handler);

            this.init();
        }

        init() {
            this.app.get('/', function (req, res) {
                res.render('index', {});
            });

            this.configRoute(this.app.route('/config/:clientId'));
        }

        configRoute(route) {
            route
            .get((req, res) => {
                let client = SmartNodeServer.getClientById(req.params.clientId);

                res.render('config', {
                    config: client.config,
                    plugin: client.plugin,
                    id: client.id,
                    displayName: client.displayName,
                    configurationFormat: client.configurationFormat,
                    rooms: SmartNodeServer.storage.get('rooms')
                });
            })
            .post((req, res) => {
                let config = {};
                let clients = SmartNodeServer.storage.get('clients');
                let client = SmartNodeServer.getClientById(req.params.clientId);
                let hasConfig = clients[req.params.clientId].config && Object.keys(clients[req.params.clientId].config).length;

                for (let k in req.body) {
                    if (k === 'room' || k === 'newroom') continue;
                    utils.setValueByPath(config, k, req.body[k]);
                }
                
                let errors = SmartNodeServer.validConfiguration(config, client.configurationFormat);
                console.log('SAVE CONFIG', config);

                if (errors) {
                    req.arrayFlash(errors, 'error');
                } else {
                    if ('reset' in req.body) {
                        client.socket.emit('unpair');
                        SmartNodeServer.unpairClient(req.params.clientId);
                        delete clients[req.params.clientId];
                        SmartNodeServer.storage.set('clients', clients);
                        
                        req.flash('success', { message: 'The client was unpaired successfully. You can now set it up again.' });
                        return res.redirect('/');
                    } else {
                        let rooms = SmartNodeServer.storage.get('rooms') || [];
                        let room;
                        // no validation errors, save config and trigger onSetup
                        

                        if (req.body.room === '-1') {
                            config.room = req.body.newroom;
                            rooms.push(config.room);
                            SmartNodeServer.storage.set('rooms', rooms);
                        } else {
                            config.room = req.body.room;
                        }

                        clients[req.params.clientId].config = config;

                        SmartNodeServer.storage.set('clients', clients);
                        SmartNodeServer.updateClient(req.params.clientId, { config: config });
                        client.init();

                        if (!hasConfig) {
                            client.socket.emit('setup', { config });
                            global.muted('Setup completed - waiting for client to load plugin...');
                            req.flash('success', { message: 'The client was setup successfully.' });
                        } else {
                            req.flash('success', { message: 'The client was updated successfully.' });
                        }
                    }
                }

                return res.redirect('/config/' + req.params.clientId)
            })
        }

        handler(req, res, next) {
            // handle some app specific data

            // add error/siccess/info messages to templates 
            Object.assign(res.locals, {
                messages: {
                    success: req.flash('success'),
                    info: req.flash('info'),
                    error: req.flash('error')
                },
                formdata: req.flash('form')[0]
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
    }
}