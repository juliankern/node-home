/**
 * initialize ATE
 *
 * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
 */
function initATE(Connector, socketEventHandlers) {
    console.log('ATE: setup interceptors', socketEventHandlers);
    // setupInterceptors(socketEventHandlers);

    // let testATEEvent = {
    //     type: 'HELLOAA'
    // };

    // theATEAdapter.handle(testATEEvent);

    // io.on('connection', (socket) => {
    //     theATEAdapter.attachToSocket(socket);
    // });


    return socketEventHandlers;

    function setupInterceptors(socketEventHandlers) {
        // let returnValue = {};

        console.log('ATE: setup interceptor for', socketEventHandlers);
        // for (var [name, originalHandler] of Object.entries(socketEventHandlers)) {
        //     console.log('ATE: setup interceptor for', name);

        //     // let ateHandlerFn = ATEHandlerFactory.getHandlerForType(name, originalHandler);

        //     // socketEventHandlers[name] = ateHandlerFn;
        // }

        // return socketEventHandlers;

    }
}
