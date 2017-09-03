module.exports = (logger) => {
    /**
     * Error Handler dummy
     * used to provide a higher order function which allows exception fail safe calling
     * and provides some error handling along with.
     *
     * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
     */
    class ErrorHandler {
        constructor(errorHandlerFunctions) {
            this.handlers = [];

            // add all entries from param to internal handlers list keeping identity
            if (errorHandlerFunctions && errorHandlerFunctions.length) {
                Array.prototype.push.apply(this.handlers, errorHandlerFunctions);
            }
        }

        /**
         * @description
         * This method is a higher order function which receives a function and will 
         * return a new function which internally wrapped exception handling around the
         * given code.
         *
         * That way the caller does not have to worry about handling exceptions
         * correctly.
         *
         * The return value of the generated function will provide the caller an
         * object with the boolean status `isException` and `payload` containing
         * either the return value from the wrapped function or the exception
         * that occured.
         *
         * @param {function} givenFn some function to wrap with exception handling to make it safe
         *
         * @example
         * <pre>
         * var fnWrappedWithErrorHandling = ErrorHandler.makeExceptionFailSafe(function(params) {
         *     // call This
         *     // call something which might produce errors
         * });
         *
         * // execute the function and let ErrorHandler do its job if necessary
         * var returnedObject = fnWrappedWithErrorHandling(theParameters);
         *
         * // returnObject: { payload: 'the return value', isException: false }
         * </pre>
         */
        makeExceptionFailSafe(givenFn) {
            return givenFn;

            // var errorReturnValue = {
            //     payload: undefined,
            //     isException: false
            // };

            // if (!givenFn || !(givenFn instanceof Function) || !(typeof givenFn === 'function') || !/function .*\(\)/.test(givenFn.toString())) {
            //     return null;
            // }

            // return function exceptionSafeCommands() {
            //     try {
            //         // call original function and store its return value as payload
            //         // NOTE the "this" used when calling the function!
            //         errorReturnValue.payload = givenFn.apply(this, arguments);

            //     } catch (exception) {
            //         // handle exception
            //         this.handleException(exception);

            //         // return to the caller
            //         errorReturnValue.payload = exception;
            //         errorReturnValue.isException = true;

            //     }

            //     return errorReturnValue;
            // }.bind(this);
        }

        handleException(exception) {
            // call each handler once for the given exception
            this.handlers.forEach(function(handler) {
                handler(exception);
            });
        }
    }

    return class SmartNodeSwissArmyKnife {
        constructor() {
            this.errorHandler = new ErrorHandler([
                logger.log.bind(logger, 'SmartNodeSwissArmyKnife caught error:')
            ]);
        }

        makeFailSafe(functionCall) {
            return this.errorHandler.makeExceptionFailSafe(functionCall);
        }
    };

};
