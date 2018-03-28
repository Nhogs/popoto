import logger from '../../src/logger/logger'

let backupLEVEL;
let backupTRACE;
let backupOUTPUT;

beforeEach(() => {
    backupLEVEL = logger.LEVEL;
    backupTRACE = logger.TRACE;
    backupOUTPUT = logger.output;
});

afterEach(() => {
    logger.LEVEL = backupLEVEL;
    logger.TRACE = backupTRACE;
    logger.output = backupOUTPUT;
});

test('test properties', () => {
    expect(logger.LogLevels.DEBUG).toBeDefined();
    expect(logger.LogLevels.INFO).toBeDefined();
    expect(logger.LogLevels.WARN).toBeDefined();
    expect(logger.LogLevels.ERROR).toBeDefined();
    expect(logger.LogLevels.NONE).toBeDefined();

    expect(logger.LEVEL).toEqual(logger.LogLevels.NONE);
    expect(logger.TRACE).toEqual(false);
});

test('test LogLevel hierarchy', () => {
    expect(logger.LogLevels.DEBUG).toBeLessThan(logger.LogLevels.INFO);
    expect(logger.LogLevels.INFO).toBeLessThan(logger.LogLevels.WARN);
    expect(logger.LogLevels.WARN).toBeLessThan(logger.LogLevels.ERROR);
    expect(logger.LogLevels.WARN).toBeLessThan(logger.LogLevels.NONE);
});

test('test debug', () => {
    let actual = "";
    logger.OUTPUT = {
        log: function (message) {
            actual = message;
        }
    };

    logger.LEVEL = logger.LogLevels.INFO;
    logger.debug("message");
    expect(actual).toEqual("");

    logger.LEVEL = logger.LogLevels.DEBUG;
    logger.debug("message");
    expect(actual).toEqual("message");
});


test('test info', () => {
    let actual = "";
    logger.OUTPUT = {
        log: function (message) {
            actual = message;
        }
    };

    logger.LEVEL = logger.LogLevels.WARN;
    logger.info("message");
    expect(actual).toEqual("");

    logger.LEVEL = logger.LogLevels.INFO;
    logger.info("message");
    expect(actual).toEqual("message");
});

test('test warn', () => {
    let actual = "";
    logger.OUTPUT = {
        warn: function (message) {
            actual = message;
        }
    };

    logger.LEVEL = logger.LogLevels.ERROR;
    logger.warn("message");
    expect(actual).toEqual("");

    logger.LEVEL = logger.LogLevels.WARN;
    logger.warn("message");
    expect(actual).toEqual("message");
});

test('test error', () => {
    let actual = "";
    logger.OUTPUT = {
        error: function (message) {
            actual = message;
        }
    };

    logger.LEVEL = logger.LogLevels.NONE;
    logger.error("message");
    expect(actual).toEqual("");

    logger.LEVEL = logger.LogLevels.ERROR;
    logger.error("message");
    expect(actual).toEqual("message");
});

test('test debug with trace', () => {
    let actual = "";
    logger.OUTPUT = {
        log: function (message) {
            actual = message;
        }
    };

    logger.TRACE = true;
    logger.LEVEL = logger.LogLevels.INFO;
    logger.debug("message");
    expect(actual).toEqual("");

    logger.LEVEL = logger.LogLevels.DEBUG;
    logger.debug("message");
    expect(actual).toContain("logger.debug");
});

