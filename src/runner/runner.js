import logger from "../logger/logger";

/**
 * runner module.
 * @module runner
 */

var runner = {};

runner.createSession = function () {
    if (runner.DRIVER !== undefined) {
        return runner.DRIVER.session({defaultAccessMode: "READ"})
    } else {
        throw new Error("popoto.runner.DRIVER must be defined");
    }
};

runner.run = function (statements) {
    logger.info("STATEMENTS:" + JSON.stringify(statements));
    var session = runner.createSession();

    return session.readTransaction(function (transaction) {
        return Promise.all(
            statements.statements.map(function (s) {
                return transaction.run({text: s.statement, parameters: s.parameters});
            })
        )
    })
        .finally(function () {
            session.close();
        })
};

runner.toObject = function (results) {
    return results.map(function (rs) {
        return rs.records.map(function (r) {
            return r.toObject();
        })
    })
}


export default runner;
