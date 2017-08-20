module.exports = (logger) => {

    /**
     * Toolkit for ATE Event management. This provides helper methods and logic to
     * handle, mangle or detect things about Events the ATE handles.
     *
     * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
     */
    class ATEEventToolkit {
        static isEvent(event) {
            return event && (typeof event === 'object') && ('type' in event);
        }

        static isEventTypeString(given) {
            return given && ('toLowerCase' in given);
        }
    }

    /**
     * This allows ATE to store or persist Events. This might become handy if there
     * are different types of backends we can handle Events with or to make sure the
     * events are still available during and after restarts of the application.
     *
     * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
     */
    class ATEEventStorage {
        constructor() {
            this.events = {};
            this.clientBasedLog = {};
        }

        add(event) {
            if (!ATEEventToolkit.isEvent(event)) {
                return false;
            }

            if (!this.has(event)) {
                this.events[event.type] = [];
            }

            // TODO: check this logic to only do what is necessary to correctly store the log entry of a particular event. We here do logic to distinguish, which we shouldn't.

            const currentTimestamp = new Date();

            logger.debug('ATEEventStorage.add clientId=' + event.clientId + ' PluginUID=' + event.clientPluginUID);

            this.events[event.type].push(genLoggable(event, currentTimestamp));

            this.clientBasedLog[event.clientPluginUID] = this.clientBasedLog[event.clientPluginUID] || [];
            this.clientBasedLog[event.clientPluginUID].push(genHistoryEntry(event, currentTimestamp));

            logger.debug('ATEEventStorage.add new count=' + this.events[event.type].length);
            logger.debug('ATEEventStorage.add ' + event.clientPluginUID, this.clientBasedLog[event.clientPluginUID]);

            return true;

            function genHistoryEntry(event, currentTimestamp) {
                return { type: event.type, timestamp: currentTimestamp, event: event };
            }

            function genLoggable(event, currentTimestamp) {
                return { event: event, timestamp: currentTimestamp };
            }
        }

        has(event) {
            if (!this.events || !event) {
                return false;
            }

            if (ATEEventToolkit.isEvent(event)) {
                return event.type && (event.type in this.events);
            }

            return (event in this.events);
        }

        get(event) {
            // when there is no event given, we do not know what to return
            if (!event) {
                return false;
            }

            // we primarily assume, given param is already the expected type.
            let type = event;

            // check if event param is an object and we need to extract the type
            if (event && typeof event === 'object' && ('type' in event)) {
                type = event.type;
            }

            // we need to check again, because what before was stored under
            // event.type might not useable for us. we expect this to be a string,
            // so we ducktype that for some ease.
            if (!ATEEventToolkit.isEventTypeString(event)) {
                return false;
            }

            // if that event is not registered, then there is nothing to return
            if (!this.has(event)) {
                return false;
            }
        }

        removeOldestClientRegistration(clientPluginUID) {
            this.clientBasedLog[clientPluginUID].shift();
            logger.debug('ATEEventStorage.removeOldestClientRegistration ' + clientPluginUID, this.clientBasedLog[clientPluginUID]);
        }

        getClientBasedHistory(clientPluginUID) {
            return this.clientBasedLog[clientPluginUID];
        }
    }

    function hasClientPluginUID(event) {
        return event && ('clientPluginUID' in event) && (event.clientPluginUID !== '');
    }

    function genClientPluginUID(event) {
        return event && ('payload' in event) && event.payload && (typeof event.payload === 'object') && ('module' in event.payload) && ('room' in event.payload) && event.payload.module + '' + event.payload.room || '';
    }

    function getClientPluginUID(event) {
        return event && ('clientPluginUID' in event) && event.clientPluginUID || genClientPluginUID(event);
    }

    /**
     * The central Event Log of the ATE. This gives or provides Events the ATE 
     * receives and handles.
     *
     * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
     */
    class ATEEventLog {
        constructor(storage) {
            this.storage = storage;
        }

        log(event) {
            // TODO: implement logic here to distinguish and work on the events?
            return this.storage.add(event);
        }

        hasLoggedEventTypeBefore(eventType) {
            return this.storage.has(eventType);
        }

        // getLoggedEventsOfType(eventType) {
        //     return this.storage.get(eventType);
        // }

        getClientRegistrationHistory(event) {
            let clientHistory = this.storage.getClientBasedHistory(event.clientPluginUID);

            if (!clientHistory) {
                return [];
            }

            return clientHistory.filter((clientHistoryEntry) => {
                return (clientHistoryEntry.type === 'register') || (clientHistoryEntry.type === 'disconnect');
            });
        }

        removeOldestClientRegistration(event) {
            const clientPluginUID = getClientPluginUID(event);
            this.storage.removeOldestClientRegistration(clientPluginUID);
        }
    }

    /**
     *
     * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
     */
    return class ATE {
        constructor(config) {
            this.config = config;

            let storage = new ATEEventStorage();
            this.logger = new ATEEventLog(storage);
        }

        handle(event, payload) {
            logger.log('ATE Received Event!', JSON.stringify(event));

            // create clientId if missing, because every event must have 
            // such an identificator of the client
            if (!hasClientPluginUID(event)) {
                event.clientPluginUID = genClientPluginUID(event);
            }

            // FIXME: remove - this is only for testing purpose and only required for disconnect event
            // if (!hasClientPluginUID(event)) {

            event.clientPluginUID = 'smartnode-thermostatlivingroom';

            // }

            if (isConnectionEvent(event)) {
                logger.log('>>>>>>>>>>>>>>>>>> CON COUNT', getNumberOfConnectionsForEvent.call(this, event));
            }

            if (event.type === 'register') {
                this.logger.log(event);
      
                if (hasAction(event.type)) {
                    // TODO: if action, use registry to receive the action (=Command Design Pattern)
                    ;
                }

                return true;

            }

            if (event.type === 'disconnect') {
                logger.log('DISCON');

                // TODO: do we need a different method to call upon a disconnect event compared to a register event?
                this.logger.log(event);
                // this.logger.removeOldestClientRegistration({ clientId: 'smartnode-thermostatlivingroom' });

                // logger.log('>>>>>>>>>>>>>>>>>> CON COUNT - AFTER DISCONNECT HANDLE', getNumberOfConnectionsForEvent.call(this, event));
            }

            function isConnectionEvent(event) {
                var _connectionEvents = [ 'register', 'disconnect' ];
    
                return event && ('type' in event) && _connectionEvents.includes(event.type);
            }

            function getNumberOfConnectionsForEvent(event) {
                // get connection related list of events from history log
                // then reduce these to the difference between the number of 
                // register events and the number of disconnect events.
                return (this.logger.getClientRegistrationHistory(event) || []).reduce((accumulator, historyEvent) => {
                    if (historyEvent && (typeof historyEvent === 'object') && ('type' in historyEvent)) {
                        return (historyEvent.type === 'register') 
                                ? accumulator + 1
                                : accumulator - 1;
                    }

                    return accumulator;
                }, 0);
            }

            function hasAction(eventType) {
                return false; // TODO: implement type based decision if a kind of reaction is required
            }
        }

        hasLogged(event) {
            ;
        }
    };
    
}
