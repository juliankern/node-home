// const EventEmitter = require('events');
const utils = global.req('util');

const SmartNodeClient = global.req('classes/SmartNodeClient.class');

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
                res.render('config', SmartNodeServer.getClientById(req.params.clientId));
            })
            .post((req, res) => {
                SmartNodeClient.validateConfig(SmartNodeServer.getClientById(req.params.clientId), req.body);

                res.redirect('/config/' + req.params.clientId)
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