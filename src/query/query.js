import provider from "../provider/provider";
import dataModel from "../datamodel/dataModel";

var query = {};
/**
 * Define the number of results displayed in result list.
 */
query.MAX_RESULTS_COUNT = 100;
// query.RESULTS_PAGE_NUMBER = 1;
query.VALUE_QUERY_LIMIT = 100;
query.USE_PARENT_RELATION = false;
query.USE_RELATION_DIRECTION = true;
query.COLLECT_RELATIONS_WITH_VALUES = false;
query.prefilter = "";

/**
 * Immutable constant object to identify Neo4j internal ID
 */
query.NEO4J_INTERNAL_ID = Object.freeze({queryInternalName: "NEO4JID"});

/**
 * Function used to filter returned relations
 * return false if the result should be filtered out.
 *
 * @param d relation returned object
 * @returns {boolean}
 */
query.filterRelation = function (d) {
    return true;
};

/**
 * Generate the query to count nodes of a label.
 * If the label is defined as distinct in configuration the query will count only distinct values on constraint attribute.
 */
query.generateTaxonomyCountQuery = function (label) {
    var constraintAttr = provider.node.getConstraintAttribute(label);

    var whereElements = [];

    var predefinedConstraints = provider.node.getPredefinedConstraints(label);
    predefinedConstraints.forEach(function (predefinedConstraint) {
        whereElements.push(predefinedConstraint.replace(new RegExp("\\$identifier", 'g'), "n"));
    });

    if (constraintAttr === query.NEO4J_INTERNAL_ID) {
        return "MATCH (n:`" + label + "`)" + ((whereElements.length > 0) ? " WHERE " + whereElements.join(" AND ") : "") + " RETURN count(DISTINCT ID(n)) as count"
    } else {
        return "MATCH (n:`" + label + "`)" + ((whereElements.length > 0) ? " WHERE " + whereElements.join(" AND ") : "") + " RETURN count(DISTINCT n." + constraintAttr + ") as count"
    }
};

/**
 * Generate Cypher query match and where elements from root node, selected node and a set of the graph links.
 *
 * @param rootNode root node in the graph.
 * @param selectedNode graph target node.
 * @param links list of links subset of the graph.
 * @returns {{matchElements: Array, whereElements: Array}}  list of match and where elements.
 * @param isConstraintNeeded (used only for relation query)
 * @param useCustomConstraints define whether to use the custom constraints (actually it is used only for results)
 */
query.generateQueryElements = function (rootNode, selectedNode, links, isConstraintNeeded, useCustomConstraints) {
    var matchElements = [];
    var whereElements = [];
    var relationElements = [];
    var returnElements = [];
    var parameters = {};

    var rootPredefinedConstraints = provider.node.getPredefinedConstraints(rootNode.label);

    rootPredefinedConstraints.forEach(function (predefinedConstraint) {
        whereElements.push(predefinedConstraint.replace(new RegExp("\\$identifier", 'g'), rootNode.internalLabel));
    });

    matchElements.push("(" + rootNode.internalLabel + ":`" + rootNode.label + "`)");

    // Generate root node match element
    if (isConstraintNeeded || rootNode.immutable) {
        var rootValueConstraints = query.generateNodeValueConstraints(rootNode, useCustomConstraints);
        whereElements = whereElements.concat(rootValueConstraints.whereElements);
        for (var param in rootValueConstraints.parameters) {
            if (rootValueConstraints.parameters.hasOwnProperty(param)) {
                parameters[param] = rootValueConstraints.parameters[param];
            }
        }
    }

    var relId = 0;

    // Generate match elements for each links
    links.forEach(function (l) {
        var sourceNode = l.source;
        var targetNode = l.target;

        var rel = "->";

        if (!query.USE_RELATION_DIRECTION || targetNode.isParentRelReverse === true) {
            rel = "-";
        }

        var relIdentifier = "r" + relId++;
        relationElements.push(relIdentifier);
        var predefinedConstraints = provider.node.getPredefinedConstraints(targetNode.label);

        predefinedConstraints.forEach(function (predefinedConstraint) {
            whereElements.push(predefinedConstraint.replace(new RegExp("\\$identifier", 'g'), targetNode.internalLabel));
        });

        if (targetNode !== selectedNode && targetNode.isNegative === true) {
            if (targetNode.value !== undefined && targetNode.value.length > 0) {
                var count = 0;

                targetNode.value.forEach(function (v) {
                    var constraintAttr = provider.node.getConstraintAttribute(v.label);
                    var param;
                    if (count === 0) {
                        param = targetNode.internalLabel + "_" + constraintAttr;
                        count++;
                    } else {
                        param = targetNode.internalLabel + "_" + constraintAttr + count++;
                    }

                    whereElements.push("(NOT (" + sourceNode.internalLabel + ":`" + sourceNode.label + "`)-[:`" + l.label + "`]" + rel + "(:`" + targetNode.label + "`{" + constraintAttr + ":$" + param + "}) )");
                });
            } else {
                whereElements.push("(NOT (" + sourceNode.internalLabel + ":`" + sourceNode.label + "`)-[:`" + l.label + "`]" + rel + "(:`" + targetNode.label + "`) )");
            }
        } else {
            if (query.COLLECT_RELATIONS_WITH_VALUES && targetNode === selectedNode) {
                returnElements.push("COLLECT(" + relIdentifier + ") AS incomingRels");
            }

            var sourceLabelStatement = "";

            if (!useCustomConstraints || provider.node.getGenerateNodeValueConstraints(sourceNode) === undefined) {
                sourceLabelStatement = ":`" + sourceNode.label + "`";
            }

            var targetLabelStatement = "";

            if (!useCustomConstraints || provider.node.getGenerateNodeValueConstraints(targetNode) === undefined) {
                targetLabelStatement = ":`" + targetNode.label + "`";
            }

            matchElements.push("(" + sourceNode.internalLabel + sourceLabelStatement + ")-[" + relIdentifier + ":`" + l.label + "`]" + rel + "(" + targetNode.internalLabel + targetLabelStatement + ")");
        }


        if (targetNode !== selectedNode && (isConstraintNeeded || targetNode.immutable)) {
            var nodeValueConstraints = query.generateNodeValueConstraints(targetNode, useCustomConstraints);
            whereElements = whereElements.concat(nodeValueConstraints.whereElements);
            for (var param in nodeValueConstraints.parameters) {
                if (nodeValueConstraints.parameters.hasOwnProperty(param)) {
                    parameters[param] = nodeValueConstraints.parameters[param];
                }
            }
        }
    });

    return {
        "matchElements": matchElements,
        "whereElements": whereElements,
        "relationElements": relationElements,
        "returnElements": returnElements,
        "parameters": parameters
    };
};

/**
 * Generate the where and parameter statements for the nodes with value
 *
 * @param node the node to generate value constraints
 * @param useCustomConstraints define whether to use custom generation in popoto config
 */
query.generateNodeValueConstraints = function (node, useCustomConstraints) {
    if (useCustomConstraints && provider.node.getGenerateNodeValueConstraints(node) !== undefined) {
        return provider.node.getGenerateNodeValueConstraints(node)(node);
    } else {
        var parameters = {}, whereElements = [];
        if (node.value !== undefined && node.value.length > 0) {
            var constraintAttr = provider.node.getConstraintAttribute(node.label);
            var paramName = node.internalLabel + "_" + constraintAttr;

            if (node.value.length > 1) { // Generate IN constraint
                if (node.isNegative === undefined || !node.isNegative) {
                    parameters[paramName] = [];

                    node.value.forEach(function (value) {
                        var constraintValue;
                        if (constraintAttr === query.NEO4J_INTERNAL_ID) {
                            constraintValue = value.internalID
                        } else {
                            constraintValue = value.attributes[constraintAttr];
                        }

                        parameters[paramName].push(constraintValue);
                    });

                    if (constraintAttr === query.NEO4J_INTERNAL_ID) {
                        whereElements.push("ID(" + node.internalLabel + ") IN " + "{`" + paramName + "`}");
                    } else {
                        whereElements.push(node.internalLabel + "." + constraintAttr + " IN " + "{`" + paramName + "`}");
                    }
                } else {
                    var count = 0;

                    node.value.forEach(function (value) {
                        var constraintValue;
                        if (constraintAttr === query.NEO4J_INTERNAL_ID) {
                            constraintValue = value.internalID
                        } else {
                            constraintValue = value.attributes[constraintAttr];
                        }
                        if (count === 0) {
                            parameters[paramName] = constraintValue;
                            count++;
                        } else {
                            parameters[paramName + count++] = constraintValue;
                        }
                    });
                }

            } else { // Generate = constraint
                if (constraintAttr === query.NEO4J_INTERNAL_ID) {
                    parameters[paramName] = node.value[0].internalID;
                } else {
                    parameters[paramName] = node.value[0].attributes[constraintAttr];
                }

                if (node.isNegative === undefined || !node.isNegative) {
                    var operator = "=";

                    if (constraintAttr === query.NEO4J_INTERNAL_ID) {
                        whereElements.push("ID(" + node.internalLabel + ") " + operator + " " + "{`" + paramName + "`}");
                    } else {
                        whereElements.push(node.internalLabel + "." + constraintAttr + " " + operator + " " + "{`" + paramName + "`}");
                    }
                }
            }
        }

        return {
            parameters: parameters,
            whereElements: whereElements
        }
    }
};

/**
 * Filter links to get only paths from root to leaf containing a value or being the selectedNode.
 * All other paths in the graph containing no value are ignored.
 *
 * @param rootNode root node of the graph.
 * @param targetNode node in the graph target of the query.
 * @param initialLinks list of links repreasenting the graph to filter.
 * @returns {Array} list of relevant links.
 */
query.getRelevantLinks = function (rootNode, targetNode, initialLinks) {

    var links = initialLinks.slice();
    var filteredLinks = [];
    var finalLinks = [];

    // Filter all links to keep only those containing a value or being the selected node.
    links.forEach(function (l) {
        if ((l.target.value !== undefined && l.target.value.length > 0) || l.target === targetNode || l.target.isNegative) {
            filteredLinks.push(l);
        }
    });

    // All the filtered links are removed from initial links list.
    filteredLinks.forEach(function (l) {
        links.splice(links.indexOf(l), 1);
    });

    // Then all the intermediate links up to the root node are added to get only the relevant links.
    filteredLinks.forEach(function (fl) {
        var sourceNode = fl.source;
        var search = true;

        while (search) {
            var intermediateLink = null;
            links.forEach(function (l) {
                if (l.target === sourceNode) {
                    intermediateLink = l;
                }
            });

            if (intermediateLink === null) { // no intermediate links needed
                search = false
            } else {
                if (intermediateLink.source === rootNode) {
                    finalLinks.push(intermediateLink);
                    links.splice(links.indexOf(intermediateLink), 1);
                    search = false;
                } else {
                    finalLinks.push(intermediateLink);
                    links.splice(links.indexOf(intermediateLink), 1);
                    sourceNode = intermediateLink.source;
                }
            }
        }
    });

    return filteredLinks.concat(finalLinks);
};

/**
 * Get the list of link defining the complete path from node to root.
 * All other links are ignored.
 *
 * @param node The node where to start in the graph.
 * @param links
 */
query.getLinksToRoot = function (node, links) {
    var pathLinks = [];
    var targetNode = node;

    while (targetNode !== dataModel.getRootNode()) {
        var nodeLink;

        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if (link.target === targetNode) {
                nodeLink = link;
                break;
            }
        }

        if (nodeLink) {
            pathLinks.push(nodeLink);
            targetNode = nodeLink.source;
        }
    }

    return pathLinks;
};

/**
 * Generate a Cypher query to retrieve the results matching the current graph.
 *
 * @param isGraph
 * @returns {{statement: string, parameters: (*|{})}}
 */
query.generateResultQuery = function (isGraph) {
    var rootNode = dataModel.getRootNode();
    var queryElements = query.generateQueryElements(rootNode, rootNode, query.getRelevantLinks(rootNode, rootNode, dataModel.links), true, true);
    var queryMatchElements = queryElements.matchElements,
        queryWhereElements = queryElements.whereElements,
        queryRelationElements = queryElements.relationElements,
        queryReturnElements = [],
        queryEndElements = [],
        queryParameters = queryElements.parameters;

    // Sort results by specified attribute
    var resultOrderByAttribute = provider.node.getResultOrderByAttribute(rootNode.label);
    if (resultOrderByAttribute) {
        var order = provider.node.isResultOrderAscending(rootNode.label) ? "ASC" : "DESC";
        queryEndElements.push("ORDER BY " + resultOrderByAttribute + " " + order);
    }

    queryEndElements.push("LIMIT " + query.MAX_RESULTS_COUNT);

    var resultAttributes = provider.node.getReturnAttributes(rootNode.label);

    if (!isGraph) {
        for (var i = 0; i < resultAttributes.length; i++) {
            var attribute = resultAttributes[i];
            if (attribute === query.NEO4J_INTERNAL_ID) {
                queryReturnElements.push("ID(" + rootNode.internalLabel + ") AS " + query.NEO4J_INTERNAL_ID.queryInternalName);
            } else {
                queryReturnElements.push(rootNode.internalLabel + "." + attribute + " AS " + attribute);
            }
        }
    } else {
        // Only return relations
        queryReturnElements.push(rootNode.internalLabel);
        queryRelationElements.forEach(
            function (el) {
                queryReturnElements.push(el);
            }
        );
    }

    var queryStatement = "MATCH " + queryMatchElements.join(", ") + ((queryWhereElements.length > 0) ? " WHERE " + queryWhereElements.join(" AND ") : "") + " RETURN DISTINCT " + queryReturnElements.join(", ") + " " + queryEndElements.join(" ");

    // Filter the query if defined in config
    var queryStructure = provider.node.filterResultQuery(rootNode.label, {
        statement: queryStatement,
        matchElements: queryMatchElements,
        whereElements: queryWhereElements,
        withElements: [],
        returnElements: queryReturnElements,
        endElements: queryEndElements,
        parameters: queryParameters
    });

    queryStructure.statement = query.prefilter + queryStructure.statement;

    return queryStructure;
};

/**
 * Generate a cypher query to the get the node count, set as parameter matching the current graph.
 *
 * @param countedNode the counted node
 * @returns {string} the node count cypher query
 */
query.generateNodeCountQuery = function (countedNode) {
    var queryElements = query.generateQueryElements(dataModel.getRootNode(), countedNode, query.getRelevantLinks(dataModel.getRootNode(), countedNode, dataModel.links), true, true);
    var queryMatchElements = queryElements.matchElements,
        queryWhereElements = queryElements.whereElements,
        queryReturnElements = [],
        queryEndElements = [],
        queryParameters = queryElements.parameters;

    var countAttr = provider.node.getConstraintAttribute(countedNode.label);

    if (countAttr === query.NEO4J_INTERNAL_ID) {
        queryReturnElements.push("count(DISTINCT ID(" + countedNode.internalLabel + ")) as count");
    } else {
        queryReturnElements.push("count(DISTINCT " + countedNode.internalLabel + "." + countAttr + ") as count");
    }

    var queryStatement = "MATCH " + queryMatchElements.join(", ") + ((queryWhereElements.length > 0) ? " WHERE " + queryWhereElements.join(" AND ") : "") + " RETURN " + queryReturnElements.join(", ");

    // Filter the query if defined in config
    var queryStructure = provider.node.filterNodeCountQuery(countedNode, {
        statement: queryStatement,
        matchElements: queryMatchElements,
        whereElements: queryWhereElements,
        returnElements: queryReturnElements,
        endElements: queryEndElements,
        parameters: queryParameters
    });

    return {
        statement: query.prefilter + queryStructure.statement,
        parameters: queryStructure.parameters
    };
};

/**
 * Generate a Cypher query from the graph model to get all the possible values for the targetNode element.
 *
 * @param targetNode node in the graph to get the values.
 * @returns {string} the query to execute to get all the values of targetNode corresponding to the graph.
 */
query.generateNodeValueQuery = function (targetNode) {

    var rootNode = dataModel.getRootNode();
    var queryElements = query.generateQueryElements(rootNode, targetNode, query.getRelevantLinks(rootNode, targetNode, dataModel.links), true, false);
    var queryMatchElements = queryElements.matchElements,
        queryWhereElements = queryElements.whereElements,
        queryReturnElements = [],
        queryEndElements = [],
        queryParameters = queryElements.parameters;

    // Sort results by specified attribute
    var valueOrderByAttribute = provider.node.getValueOrderByAttribute(targetNode.label);
    if (valueOrderByAttribute) {
        var order = provider.node.isValueOrderAscending(targetNode.label) ? "ASC" : "DESC";
        queryEndElements.push("ORDER BY " + valueOrderByAttribute + " " + order);
    }

    queryEndElements.push("LIMIT " + query.VALUE_QUERY_LIMIT);

    var resultAttributes = provider.node.getReturnAttributes(targetNode.label);
    var constraintAttribute = provider.node.getConstraintAttribute(targetNode.label);

    for (var i = 0; i < resultAttributes.length; i++) {
        if (resultAttributes[i] === query.NEO4J_INTERNAL_ID) {
            queryReturnElements.push("ID(" + targetNode.internalLabel + ") AS " + query.NEO4J_INTERNAL_ID.queryInternalName);
        } else {
            queryReturnElements.push(targetNode.internalLabel + "." + resultAttributes[i] + " AS " + resultAttributes[i]);
        }
    }

    // Add count return attribute on root node
    var rootConstraintAttr = provider.node.getConstraintAttribute(rootNode.label);

    if (rootConstraintAttr === query.NEO4J_INTERNAL_ID) {
        queryReturnElements.push("count(DISTINCT ID(" + rootNode.internalLabel + ")) AS count");
    } else {
        queryReturnElements.push("count(DISTINCT " + rootNode.internalLabel + "." + rootConstraintAttr + ") AS count");
    }

    if (query.COLLECT_RELATIONS_WITH_VALUES) {
        queryElements.returnElements.forEach(function (re) {
            queryReturnElements.push(re);
        });
    }

    var queryStatement = "MATCH " + queryMatchElements.join(", ") + ((queryWhereElements.length > 0) ? " WHERE " + queryWhereElements.join(" AND ") : "") + " RETURN " + queryReturnElements.join(", ") + " " + queryEndElements.join(" ");

    // Filter the query if defined in config
    var queryStructure = provider.node.filterNodeValueQuery(targetNode, {
        statement: queryStatement,
        matchElements: queryMatchElements,
        whereElements: queryWhereElements,
        returnElements: queryReturnElements,
        endElements: queryEndElements,
        parameters: queryParameters
    });

    return {
        statement: query.prefilter + queryStructure.statement,
        parameters: queryStructure.parameters
    };

};

/**
 * Generate a Cypher query to retrieve all the relation available for a given node.
 *
 * @param targetNode
 * @returns {string}
 */
query.generateNodeRelationQuery = function (targetNode) {

    var linksToRoot = query.getLinksToRoot(targetNode, dataModel.links);

    var queryElements = query.generateQueryElements(dataModel.getRootNode(), targetNode, linksToRoot, false, false);
    var queryMatchElements = queryElements.matchElements,
        queryWhereElements = queryElements.whereElements,
        queryReturnElements = [],
        queryEndElements = [],
        queryParameters = queryElements.parameters;

    var rel = query.USE_RELATION_DIRECTION ? "->" : "-";

    queryMatchElements.push("(" + targetNode.internalLabel + ":`" + targetNode.label + "`)-[r]" + rel + "(x)");
    queryReturnElements.push("type(r) AS label");
    if (query.USE_PARENT_RELATION) {
        queryReturnElements.push("head(labels(x)) AS target");
    } else {
        queryReturnElements.push("last(labels(x)) AS target");
    }
    queryReturnElements.push("count(r) AS count");
    queryEndElements.push("ORDER BY count(r) DESC");

    var queryStatement = "MATCH " + queryMatchElements.join(", ") + ((queryWhereElements.length > 0) ? " WHERE " + queryWhereElements.join(" AND ") : "") + " RETURN " + queryReturnElements.join(", ") + " " + queryEndElements.join(" ");
    // Filter the query if defined in config
    var queryStructure = provider.node.filterNodeRelationQuery(targetNode, {
        statement: queryStatement,
        matchElements: queryMatchElements,
        whereElements: queryWhereElements,
        returnElements: queryReturnElements,
        endElements: queryEndElements,
        parameters: queryParameters
    });

    return {
        statement: query.prefilter + queryStructure.statement,
        parameters: queryStructure.parameters
    };

};

export default query