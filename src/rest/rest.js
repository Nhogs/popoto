import jQuery from 'jquery';
import logger from "../logger/logger";

/**
 * logger module.
 * @module logger
 */

var rest = {};

/**
 * Default REST URL used to call Neo4j server with cypher queries to execute.
 * This property should be updated to access to your own server.
 * @type {string}
 */
rest.CYPHER_URL = "http://localhost:7474/db/data/transaction/commit";
rest.WITH_CREDENTIALS = false;

/**
 * Create JQuery ajax POST request to access Neo4j REST API.
 *
 * @param data data object containing Cypher query.
 * @param url url where to post the data, default to popoto.rest.CYPHER_URL property.
 * @returns {*} the JQuery ajax request object.
 */
rest.post = function (data, url) {
    var strData = JSON.stringify(data);
    logger.info("REST POST:" + strData);

    var settings = {
        type: "POST",
        beforeSend: function (request) {
            if (rest.AUTHORIZATION) {
                request.setRequestHeader("Authorization", rest.AUTHORIZATION);
            }
        },
        contentType: "application/json"
    };

    if (data !== undefined) {
        settings.data = strData;
    }

    if (rest.WITH_CREDENTIALS === true) {
        settings.xhrFields = {
            withCredentials: true
        }
    }

    var postURL = rest.CYPHER_URL;

    if (url !== undefined) {
        postURL = url;
    }

    return jQuery.ajax(postURL, settings);
};

rest.response = {
    parse: function (data) {
        logger.debug(JSON.stringify((data)));
        var parsedData = [];

        if (data !== undefined && data.hasOwnProperty("results") && data.results.length > 0 && !(data.hasOwnProperty("errors") && data.errors.length > 0)) {
            parsedData = data.results.map(function (queryResults) {
                var results = [];
                for (var x = 0; x < queryResults.data.length; x++) {
                    var obj = {};

                    for (var i = 0; i < queryResults.columns.length; i++) {
                        obj[queryResults.columns[i]] = queryResults.data[x].row[i];
                    }

                    results.push(obj);
                }
                return results;
            });
        }

        logger.info(JSON.stringify((parsedData)));
        return parsedData
    }
};

export default rest;
