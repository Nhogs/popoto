import {default as d3} from "d3";
import query from "../query/query";
import provider from "../provider/provider";
import logger from "../logger/logger";
import rest from "../rest/rest";
import graph from "../graph/graph";

var result = {};
result.containerId = "popoto-results";
result.hasChanged = true;
result.resultCountListeners = [];
result.resultListeners = [];
result.graphResultListeners = [];
result.RESULTS_PAGE_SIZE = 10;

/**
 * Register a listener to the result count event.
 * This listener will be called on evry result change with total result count.
 */
result.onTotalResultCount = function (listener) {
    result.resultCountListeners.push(listener);
};

result.onResultReceived = function (listener) {
    result.resultListeners.push(listener);
};

result.onGraphResultReceived = function (listener) {
    result.graphResultListeners.push(listener);
};

/**
 * Parse REST returned Graph data and generate a list of nodes and edges.
 *
 * @param data
 * @returns {{nodes: Array, edges: Array}}
 */
result.parseGraphResultData = function (data) {

    var nodes = {}, edges = {};

    data.results[1].data.forEach(function (row) {
        row.graph.nodes.forEach(function (n) {
            if (!nodes.hasOwnProperty(n.id)) {
                nodes[n.id] = n;
            }
        });

        row.graph.relationships.forEach(function (r) {
            if (!edges.hasOwnProperty(r.id)) {
                edges[r.id] = r;
            }
        });
    });

    var nodesArray = [], edgesArray = [];

    for (var n in nodes) {
        if (nodes.hasOwnProperty(n)) {
            nodesArray.push(nodes[n]);
        }
    }

    for (var e in edges) {
        if (edges.hasOwnProperty(e)) {
            edgesArray.push(edges[e])
        }
    }

    return {nodes: nodesArray, edges: edgesArray};
};

result.updateResults = function () {
    if (result.hasChanged) {

        // Abort any old running request before starting a new one
        if (result.resultsXhr !== undefined) {
            result.resultsXhr.abort();
        }

        var resultQuery = query.generateResultQuery();
        result.lastGeneratedQuery = resultQuery;

        var postData = {
            "statements": [
                {
                    "statement": resultQuery.statement,
                    "parameters": resultQuery.parameters,
                    "resultDataContents": ["row"]
                }
            ]
        };

        // Add Graph result query if listener found
        if (result.graphResultListeners.length > 0) {
            var graphQuery = query.generateResultQuery(true);
            result.lastGeneratedQuery = graphQuery;

            postData.statements.push(
                {
                    "statement": graphQuery.statement,
                    "parameters": graphQuery.parameters,
                    "resultDataContents": ["graph"]
                });
        }

        logger.info("Results ==>");

        result.resultsXhr = rest.post(postData)
            .done(function (response) {
                logger.info("<== Results");

                var parsedData = rest.response.parse(response);

                var resultObjects = parsedData[0].map(function (d, i) {
                    return {
                        "resultIndex": i,
                        "label": graph.getRootNode().label,
                        "attributes": d
                    };
                });

                result.lastResults = resultObjects;

                // Notify listeners
                result.resultListeners.forEach(function (listener) {
                    listener(resultObjects);
                });

                if (result.graphResultListeners.length > 0) {
                    var graphResultObjects = result.parseGraphResultData(response);
                    result.graphResultListeners.forEach(function (listener) {
                        listener(graphResultObjects);
                    });
                }

                // Update displayed results only if needed ()
                if (result.isActive) {
                    // Clear all results
                    var results = d3.select("#" + result.containerId).selectAll(".ppt-result").data([]);
                    results.exit().remove();
                    // Update data
                    results = d3.select("#" + result.containerId).selectAll(".ppt-result").data(resultObjects.slice(0, result.RESULTS_PAGE_SIZE), function (d) {
                        return d.resultIndex;
                    });

                    // Add new elements
                    var pElmt = results.enter()
                        .append("div")
                        .attr("class", "ppt-result")
                        .attr("id", function (d) {
                            return "popoto-result-" + d.resultIndex;
                        });

                    // Generate results with providers
                    pElmt.each(function (d) {
                        provider.node.getDisplayResults(d.label)(d3.select(this));
                    });
                }

                result.hasChanged = false;
            })
            .fail(function (xhr, textStatus, errorThrown) {
                if (textStatus !== "abort") {
                    logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + rest.CYPHER_URL + "\" defined in \"rest.CYPHER_URL\" property: " + errorThrown);

                    // Notify listeners
                    result.resultListeners.forEach(function (listener) {
                        listener([]);
                    });
                } else {
                    logger.info("<=X= Results - Aborted!");
                }
            });
    }
};

result.updateResultsCount = function () {
    // Update result counts with root node count
    if (result.resultCountListeners.length > 0) {
        result.resultCountListeners.forEach(function (listener) {
            listener(graph.getRootNode().count);
        });
    }
};

result.generatePreQuery = function () {
    var p = {"ids": []};

    result.lastResults.forEach(function (d) {
        p.ids.push(d.attributes.id)
    });

    return {
        query: "MATCH (d) WHERE d.id IN $ids WITH d",
        param: p
    };
};

export default result