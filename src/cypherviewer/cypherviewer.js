import * as d3 from "d3";
import queryviewer from "../queryviewer/queryviewer";
import provider from "../provider/provider";
import query from "../query/query";
import graph from "../graph/graph";

var cypherviewer = {};
cypherviewer.containerId = "popoto-cypher";
cypherviewer.MATCH = "MATCH";
cypherviewer.RETURN = "RETURN";
cypherviewer.WHERE = "WHERE";
cypherviewer.QueryElementTypes = Object.freeze({
    KEYWORD: 0,
    NODE: 1,
    SEPARATOR: 2,
    SOURCE: 3,
    LINK: 4,
    TARGET: 5,
    RETURN: 6,
    WHERE: 7
});

/**
 * Create the Cypher viewer area.
 *
 */
cypherviewer.createQueryArea = function () {
    var id = "#" + cypherviewer.containerId;

    cypherviewer.querySpanElements = d3.select(id).append("p").attr("class", "ppt-query-constraint-elements").selectAll(".queryConstraintSpan");
};

/**
 * Update all the elements displayed on the cypher viewer based on current graph.
 */
cypherviewer.updateQuery = function () {

    // Remove all query span elements
    cypherviewer.querySpanElements = cypherviewer.querySpanElements.data([]);

    cypherviewer.querySpanElements.exit().remove();

    // Update data
    cypherviewer.querySpanElements = cypherviewer.querySpanElements.data(cypherviewer.generateData(graph.links, graph.nodes));

    // Remove old span (not needed as all have been cleaned before)
    // queryviewer.querySpanElements.exit().remove();

    // Add new span
    cypherviewer.querySpanElements = cypherviewer.querySpanElements.enter().append("span")
        .attr("id", function (d) {
            return "cypher-" + d.id;
        })
        .on("mouseover", cypherviewer.mouseOverSpan)
        .on("mouseout", cypherviewer.mouseOutSpan)
        .on("contextmenu", cypherviewer.rightClickSpan)
        .on("click", cypherviewer.clickSpan)
        .merge(cypherviewer.querySpanElements);

    // Update all spans:
    cypherviewer.querySpanElements.filter(function (d) {
        return d.type === cypherviewer.QueryElementTypes.KEYWORD;
    })
        .attr("class", "ppt-span")
        .text(function (d) {
            return " " + d.value + " ";
        });

    cypherviewer.querySpanElements.filter(function (d) {
        return d.type === cypherviewer.QueryElementTypes.SEPARATOR;
    })
        .attr("class", "ppt-span")
        .text(function (d) {
            return d.value + " ";
        });

    cypherviewer.querySpanElements.filter(function (d) {
        return d.type === cypherviewer.QueryElementTypes.NODE;
    })
        .attr("class", function (d) {
            if (d.node.value !== undefined && d.node.value.length > 0) {
                return "ppt-span-root-value";
            } else {
                return "ppt-span-root";
            }
        })
        .text(function (d) {
            return "(" + d.node.internalLabel + ":`" + d.node.label + "`)";
        });

    cypherviewer.querySpanElements.filter(function (d) {
        return d.type === cypherviewer.QueryElementTypes.SOURCE;
    })
        .attr("class", function (d) {
            if (d.node === graph.getRootNode()) {
                if (d.node.value !== undefined && d.node.value.length > 0) {
                    return "ppt-span-root-value";
                } else {
                    return "ppt-span-root";
                }
            } else {
                if (d.node.value !== undefined && d.node.value.length > 0) {
                    return "ppt-span-value";
                } else {
                    return "ppt-span-choose";
                }
            }
        })
        .text(function (d) {
            var sourceNode = d.node;
            return "(" + sourceNode.internalLabel + ":`" + sourceNode.label + "`)";
        });

    cypherviewer.querySpanElements.filter(function (d) {
        return d.type === cypherviewer.QueryElementTypes.LINK;
    })
        .attr("class", "ppt-span-link")
        .text(function (d) {
            if (d.link.target.isParentRelReverse === true) {
                return "<-[:`" + d.link.label + "`]-";
            } else {
                return "-[:`" + d.link.label + "`]-" + (query.USE_RELATION_DIRECTION ? ">" : "");
            }
        });

    cypherviewer.querySpanElements.filter(function (d) {
        return d.type === cypherviewer.QueryElementTypes.TARGET;
    })
        .attr("class", function (d) {
            if (d.node.value !== undefined && d.node.value.length > 0) {
                return "ppt-span-value";
            } else {
                return "ppt-span-choose";
            }
        })
        .text(function (d) {
            return "(" + d.node.internalLabel + ":`" + d.node.label + "`)";
        });

    cypherviewer.querySpanElements.filter(function (d) {
        return d.type === cypherviewer.QueryElementTypes.WHERE;
    })
        .attr("class", function (d) {
            if (d.node === graph.getRootNode()) {
                return "ppt-span-root-value";
            } else {
                return "ppt-span-value";
            }
        })
        .text(function (d) {
            var node = d.node;
            if (node.isNegative === true) {
                if (!node.hasOwnProperty("value") || node.value.length <= 0) {
                    return "(NOT (" + d.link.source.internalLabel + ":`" + d.link.source.label + "`)-[:`" + d.link.label + "`]->(:`" + d.link.target.label + "`))";
                } else {
                    var clauses = [];
                    var constAttr = provider.node.getConstraintAttribute(node.label);
                    node.value.forEach(function (value) {
                        clauses.push(
                            "(NOT (" + d.link.source.internalLabel + ":`" + d.link.source.label + "`)-[:`" + d.link.label + "`]->(:`" + d.link.target.label + "`{" + constAttr + ":" + value.attributes[constAttr] + "}))"
                        );
                    });

                    return clauses.join(" AND ");
                }
            } else {
                var constraintAttr = provider.node.getConstraintAttribute(node.label);

                var text = "";
                var separator = "";

                if (constraintAttr === query.NEO4J_INTERNAL_ID) {
                    text += node.internalLabel + ".id";
                } else {
                    text += node.internalLabel + "." + constraintAttr;
                }

                if (node.hasOwnProperty("value") && node.value.length > 1) {
                    text += " IN [";
                } else {
                    text += " = ";
                }

                node.value.forEach(function (value) {
                    text += separator;
                    separator = ", ";
                    if (constraintAttr === query.NEO4J_INTERNAL_ID) {
                        text += value.internalID;
                    } else {
                        var constraintValue = value.attributes[constraintAttr];
                        if (typeof constraintValue === "boolean" || typeof constraintValue === "number") {
                            text += constraintValue;
                        } else {
                            text += "\"" + constraintValue + "\"";
                        }
                    }
                });

                if (node.value.length > 1) {
                    text += "]";
                }

                return "(" + text + ")";
            }
        });

    cypherviewer.querySpanElements.filter(function (d) {
        return d.type === cypherviewer.QueryElementTypes.RETURN;
    })
        .attr("class", function (d) {
            if (d.node.value !== undefined && d.node.value.length > 0) {
                return "ppt-span-root-value";
            } else {
                return "ppt-span-root";
            }
        })
        .text(function (d) {
            return d.node.internalLabel;
        });

};

/**
 * Generate the data from graph to use in cypher query viewer.
 * The returned data is a list of elements representing the current query.
 * Example:
 *
 * MATCH
 * (person:`Person`),
 * (person:`Person`)-[:`FOLLOWS`]->(person1:`Person`{`name`:\"Jessica Thompson\"}),
 * (person1:`Person`)-[:`REVIEWED`]->(movie5:`Movie`{`title`:\"The Replacements\"})
 * RETURN person
 *
 * @param links
 * @returns {Array}
 */
cypherviewer.generateData = function (links) {
    var elmts = [], id = 0;
    var rootNode = graph.getRootNode();
    var relevantLinks = query.getRelevantLinks(rootNode, rootNode, links);
    var negativeLinks = relevantLinks.filter(function (rl) {
        return rl.target.isNegative === true && (!rl.target.hasOwnProperty("value") || rl.target.value.length <= 0)
    });

    elmts.push(
        {
            id: id++,
            type: cypherviewer.QueryElementTypes.KEYWORD,
            value: cypherviewer.MATCH
        }
    );

    if (rootNode) {
        elmts.push(
            {
                id: id++,
                type: cypherviewer.QueryElementTypes.NODE,
                node: rootNode
            }
        );
    }

    if (relevantLinks.length > 0 && relevantLinks.length > negativeLinks.length) {
        elmts.push(
            {
                id: id++,
                type: cypherviewer.QueryElementTypes.SEPARATOR,
                value: ","
            }
        );
    }

    for (var i = 0; i < relevantLinks.length; i++) {
        var relevantLink = relevantLinks[i];

        if (relevantLink.target.isNegative === true && (!relevantLink.target.hasOwnProperty("value") || relevantLink.target.value.length <= 0)) {
            // element not added here but in WHERE
        } else {
            elmts.push(
                {
                    id: id++,
                    type: cypherviewer.QueryElementTypes.SOURCE,
                    node: relevantLink.source
                }
            );

            elmts.push(
                {
                    id: id++,
                    type: cypherviewer.QueryElementTypes.LINK,
                    link: relevantLink
                }
            );

            elmts.push(
                {
                    id: id++,
                    type: cypherviewer.QueryElementTypes.TARGET,
                    node: relevantLink.target
                }
            );

            // Add separator except for last element
            if (i < (relevantLinks.length - 1)) {
                elmts.push(
                    {
                        id: id++,
                        type: cypherviewer.QueryElementTypes.SEPARATOR,
                        value: ","
                    }
                );
            }
        }
    }

    if ((rootNode && rootNode.value !== undefined && rootNode.value.length > 0) || (relevantLinks.length > 0)) {
        elmts.push(
            {
                id: id++,
                type: cypherviewer.QueryElementTypes.KEYWORD,
                value: cypherviewer.WHERE
            }
        );
    }

    if (rootNode && rootNode.value !== undefined && rootNode.value.length > 0) {
        elmts.push(
            {
                id: id++,
                type: cypherviewer.QueryElementTypes.WHERE,
                node: rootNode
            }
        );

        if (relevantLinks.length > 0) {
            elmts.push(
                {
                    id: id++,
                    type: cypherviewer.QueryElementTypes.SEPARATOR,
                    value: " AND "
                }
            );
        }
    }

    var needSeparator = false;
    for (var i = 0; i < relevantLinks.length; i++) {
        var relevantLink = relevantLinks[i];
        if (relevantLink.target.isNegative === true) {
            if (needSeparator) {
                elmts.push(
                    {
                        id: id++,
                        type: cypherviewer.QueryElementTypes.SEPARATOR,
                        value: " AND "
                    }
                );
            }
            elmts.push(
                {
                    id: id++,
                    type: cypherviewer.QueryElementTypes.WHERE,
                    node: relevantLink.target,
                    link: relevantLink
                }
            );
            needSeparator = true;
        } else {
            if (relevantLink.target.value !== undefined && relevantLink.target.value.length > 0) {

                if (needSeparator) {
                    elmts.push(
                        {
                            id: id++,
                            type: cypherviewer.QueryElementTypes.SEPARATOR,
                            value: " AND "
                        }
                    );
                }

                elmts.push(
                    {
                        id: id++,
                        type: cypherviewer.QueryElementTypes.WHERE,
                        node: relevantLink.target
                    }
                );

                needSeparator = true;
            }
        }
    }

    elmts.push(
        {
            id: id++,
            type: cypherviewer.QueryElementTypes.KEYWORD,
            value: cypherviewer.RETURN
        }
    );

    if (rootNode) {
        elmts.push(
            {
                id: id++,
                type: cypherviewer.QueryElementTypes.RETURN,
                node: rootNode
            }
        );
    }

    return elmts;
};

/**
 *
 */
cypherviewer.mouseOverSpan = function () {
    var hoveredSpan = d3.select(this).data()[0];
    if (hoveredSpan.node) {
        // Hover all spans with same node data
        cypherviewer.querySpanElements.filter(function (d) {
            return d.node === hoveredSpan.node;
        }).classed("hover", true);

        // Highlight node in graph
        var nodeElmt = graph.svg.selectAll("#" + graph.node.gID + " > g").filter(function (d) {
            return d === hoveredSpan.node;
        });
        nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0.5);

        // Highlight query viewer
        if (queryviewer.isActive) {
            queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredSpan.node;
            }).classed("hover", true);

            queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredSpan.node;
            }).classed("hover", true);
        }
    } else if (hoveredSpan.link) {
        d3.select(this).classed("hover", true);

        // Highlight link in graph
        var linkElmt = graph.svg.selectAll("#" + graph.link.gID + " > g").filter(function (d) {
            return d === hoveredSpan.link;
        });
        linkElmt.select("path").classed("ppt-link-hover", true);
        linkElmt.select("text").classed("ppt-link-hover", true);
    }
};

cypherviewer.mouseOutSpan = function () {
    var hoveredSpan = d3.select(this).data()[0];
    if (hoveredSpan.node) {
        // Remove hover on all spans with same node data
        cypherviewer.querySpanElements.filter(function (d) {
            return d.node === hoveredSpan.node;
        }).classed("hover", false);

        // Remove highlight on node in graph
        var nodeElmt = graph.svg.selectAll("#" + graph.node.gID + " > g").filter(function (d) {
            return d === hoveredSpan.node;
        });
        nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0);

        if (queryviewer.isActive) {
            queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredSpan.node;
            }).classed("hover", false);

            queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredSpan.node;
            }).classed("hover", false);
        }
    } else if (hoveredSpan.link) {
        d3.select(this).classed("hover", false);

        // Remove highlight on link in graph
        var linkElmt = graph.svg.selectAll("#" + graph.link.gID + " > g").filter(function (d) {
            return d === hoveredSpan.link;
        });
        linkElmt.select("path").classed("ppt-link-hover", false);
        linkElmt.select("text").classed("ppt-link-hover", false);
    }
};

cypherviewer.clickSpan = function () {
    var clickedSpan = d3.select(this).data()[0];

    if (clickedSpan.node) {
        var nodeElmt = graph.svg.selectAll("#" + graph.node.gID + " > g").filter(function (d) {
            return d === clickedSpan.node;
        });

        nodeElmt.on("click").call(nodeElmt.node(), clickedSpan.node);
    }
};

cypherviewer.rightClickSpan = function () {
    var clickedSpan = d3.select(this).data()[0];

    if (clickedSpan.node) {
        var nodeElmt = graph.svg.selectAll("#" + graph.node.gID + " > g").filter(function (d) {
            return d === clickedSpan.node;
        });

        nodeElmt.on("contextmenu").call(nodeElmt.node(), clickedSpan.node);
    }
};

export default cypherviewer