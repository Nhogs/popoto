/**
 * logger module.
 * @module logger
 */

// LOGGER -----------------------------------------------------------------------------------------------------------
var logger = {};
logger.LogLevels = Object.freeze({DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4});
logger.LEVEL = logger.LogLevels.NONE;
logger.TRACE = false;

/**
 * Log a message on console depending on configured log levels.
 * Level is define in popoto.logger.LEVEL property.
 * If popoto.logger.TRACE is set to true, the stack trace is also added in log.
 * @param logLevel Level of the message from popoto.logger.LogLevels.
 * @param message Message to log.
 */
logger.log = function (logLevel, message) {
    if (console && logLevel >= logger.LEVEL) {
        if (logger.TRACE) {
            message = message + "\n" + new Error().stack
        }
        switch (logLevel) {
            case logger.LogLevels.DEBUG:
                console.log(message);
                break;
            case logger.LogLevels.INFO:
                console.log(message);
                break;
            case logger.LogLevels.WARN:
                console.warn(message);
                break;
            case logger.LogLevels.ERROR:
                console.error(message);
                break;
        }
    }
};

/**
 * Log a message in DEBUG level.
 * @param message to log.
 */
logger.debug = function (message) {
    logger.log(logger.LogLevels.DEBUG, message);
};

/**
 * Log a message in INFO level.
 * @param message to log.
 */
logger.info = function (message) {
    logger.log(logger.LogLevels.INFO, message);
};

/**
 * Log a message in WARN level.
 * @param message to log.
 */
logger.warn = function (message) {
    logger.log(logger.LogLevels.WARN, message);
};

/**
 * Log a message in ERROR level.
 * @param message to log.
 */
logger.error = function (message) {
    logger.log(logger.LogLevels.ERROR, message);
};

export default logger;
