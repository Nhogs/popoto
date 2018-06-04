import node from "./node"
import dataModel from "../../datamodel/dataModel"
import logger from "../../logger/logger"
import rest from "../../rest/rest"
import provider from "../../provider/provider"
import query from "../../query/query"
import result from "../../result/result"
import graph from "../graph"
/**
 * Update node data with changes done in dataModel.nodes model.
 */
export default function () {
    var data = graph.svg.select("#" + node.gID).selectAll(".ppt-gnode").data(dataModel.nodes, function (d) {
        return d.id;
    });

    if (graph.hasGraphChanged) {
        updateAutoLoadValues();

        if (!graph.DISABLE_COUNT && !graph.ignoreCount) {
            updateCount();
        }
    }
    graph.hasGraphChanged = false;

    return data;
};

/**
 * Update nodes and result counts by executing a query for every nodes with the new graph structure.
 */
function updateCount() {

    // Abort any old running request before starting a new one
    if (node.updateCountXhr !== undefined) {
        node.updateCountXhr.abort();
    }

    var statements = [];

    var countedNodes = dataModel.nodes
        .filter(function (d) {
            return d.type !== node.NodeTypes.VALUE && d.type !== node.NodeTypes.GROUP && (!d.hasOwnProperty("isNegative") || !d.isNegative);
        });

    countedNodes.forEach(function (n) {
        var nodeCountQuery = query.generateNodeCountQuery(n);
        statements.push(
            {
                "statement": nodeCountQuery.statement,
                "parameters": nodeCountQuery.parameters
            }
        );
    });

    logger.info("Count nodes ==>");
    node.updateCountXhr = rest.post(
        {
            "statements": statements
        })
        .done(function (response) {
            logger.info("<== Count nodes");
            var parsedData = rest.response.parse(response);

            // TODO throw exception in parser in case of failure?
            // if (parsedData.status === "success") {
            //     logger.error("Cypher query error:" + JSON.stringify(parsedData.errors));
            //     countedNodes.forEach(function (node) {
            //         node.count = 0;
            //     });
            // }

            for (var i = 0; i < countedNodes.length; i++) {
                countedNodes[i].count = parsedData[i][0].count;
            }

            // Update result count with root node new count
            if (result.resultCountListeners.length > 0) {
                result.updateResultsCount();
            }

            node.updateElements();
            graph.link.updateElements();
        })
        .fail(function (xhr, textStatus, errorThrown) {
            if (textStatus !== "abort") {
                logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + rest.CYPHER_URL + "\" defined in \"rest.CYPHER_URL\" property: " + errorThrown);
                countedNodes.forEach(function (n) {
                    n.count = 0;
                });
                node.updateElements();
                graph.link.updateElements();
            } else {
                logger.info("<=X= Count nodes - Aborted!");
            }
        });
}

/**
 * Update values for nodes having preloadData property
 */
function updateAutoLoadValues() {
    var statements = [];

    var nodesToLoadData = node.getAutoLoadValueNodes();

    for (var i = 0; i < nodesToLoadData.length; i++) {
        var nodeToQuery = nodesToLoadData[i];
        var nodeValueQuery = query.generateNodeValueQuery(nodeToQuery);
        statements.push(
            {
                "statement": nodeValueQuery.statement,
                "parameters": nodeValueQuery.parameters
            }
        );
    }

    if (statements.length > 0) {
        logger.info("AutoLoadValue ==>");
        rest.post(
            {
                "statements": statements
            })
            .done(function (response) {
                logger.info("<== AutoLoadValue");

                var parsedData = rest.response.parse(response);

                for (var i = 0; i < nodesToLoadData.length; i++) {
                    var nodeToQuery = nodesToLoadData[i];
                    var constraintAttr = provider.node.getConstraintAttribute(nodeToQuery.label);
                    // Here results are parsed and values already selected are filtered out
                    nodeToQuery.data = parsedData[i].filter(function (dataToFilter) {
                        var keepData = true;
                        if (nodeToQuery.hasOwnProperty("value") && nodeToQuery.value.length > 0) {
                            nodeToQuery.value.forEach(function (value) {
                                if (value.attributes[constraintAttr] === dataToFilter[constraintAttr]) {
                                    keepData = false;
                                }
                            })
                        }
                        return keepData;
                    });

                    nodeToQuery.page = 1;
                }

                graph.notifyListeners(graph.Events.GRAPH_NODE_DATA_LOADED, [nodesToLoadData]);
            })
            .fail(function (xhr, textStatus, errorThrown) {
                logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + rest.CYPHER_URL + "\" defined in \"rest.CYPHER_URL\" property: " + errorThrown);
            });
    }
}
