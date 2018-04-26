import * as d3 from "d3";
import cypherviewer from "../cypherviewer/cypherviewer";
import provider from "../provider/provider";
import graph from "../graph/graph";

var queryviewer = {};

queryviewer.containerId = "popoto-query";
queryviewer.QUERY_STARTER = "I'm looking for";
queryviewer.CHOOSE_LABEL = "choose";

/**
 * Create the query viewer area.
 *
 */
queryviewer.createQueryArea = function () {
    var id = "#" + queryviewer.containerId;

    queryviewer.queryConstraintSpanElements = d3.select(id).append("p").attr("class", "ppt-query-constraint-elements").selectAll(".queryConstraintSpan");
    queryviewer.querySpanElements = d3.select(id).append("p").attr("class", "ppt-query-elements").selectAll(".querySpan");
};

/**
 * Update all the elements displayed on the query viewer based on current graph.
 */
queryviewer.updateQuery = function () {

    // Remove all query span elements
    queryviewer.queryConstraintSpanElements = queryviewer.queryConstraintSpanElements.data([]);
    queryviewer.querySpanElements = queryviewer.querySpanElements.data([]);

    queryviewer.queryConstraintSpanElements.exit().remove();
    queryviewer.querySpanElements.exit().remove();

    // Update data
    queryviewer.queryConstraintSpanElements = queryviewer.queryConstraintSpanElements.data(queryviewer.generateConstraintData(graph.links, graph.nodes));
    queryviewer.querySpanElements = queryviewer.querySpanElements.data(queryviewer.generateData(graph.links, graph.nodes));

    // Remove old span (not needed as all have been cleaned before)
    // queryviewer.querySpanElements.exit().remove();

    // Add new span
    queryviewer.queryConstraintSpanElements = queryviewer.queryConstraintSpanElements.enter().append("span")
        .on("contextmenu", queryviewer.rightClickSpan)
        .on("click", queryviewer.clickSpan)
        .on("mouseover", queryviewer.mouseOverSpan)
        .on("mouseout", queryviewer.mouseOutSpan)
        .merge(queryviewer.queryConstraintSpanElements);

    queryviewer.querySpanElements = queryviewer.querySpanElements.enter().append("span")
        .on("contextmenu", queryviewer.rightClickSpan)
        .on("click", queryviewer.clickSpan)
        .on("mouseover", queryviewer.mouseOverSpan)
        .on("mouseout", queryviewer.mouseOutSpan)
        .merge(queryviewer.querySpanElements);

    // Update all span
    queryviewer.queryConstraintSpanElements
        .attr("id", function (d) {
            return d.id
        })
        .attr("class", function (d) {
            if (d.isLink) {
                return "ppt-span-link";
            } else {
                if (d.type === graph.node.NodeTypes.ROOT) {
                    return "ppt-span-root";
                } else if (d.type === graph.node.NodeTypes.CHOOSE) {
                    if (d.ref.value !== undefined && d.ref.value.length > 0) {
                        return "ppt-span-value";
                    } else {
                        return "ppt-span-choose";
                    }
                } else if (d.type === graph.node.NodeTypes.VALUE) {
                    return "ppt-span-value";
                } else if (d.type === graph.node.NodeTypes.GROUP) {
                    return "ppt-span-group";
                } else {
                    return "ppt-span";
                }
            }
        })
        .text(function (d) {
            return d.term + " ";
        });

    queryviewer.querySpanElements
        .attr("id", function (d) {
            return d.id
        })
        .attr("class", function (d) {
            if (d.isLink) {
                return "ppt-span-link";
            } else {
                if (d.type === graph.node.NodeTypes.ROOT) {
                    return "ppt-span-root";
                } else if (d.type === graph.node.NodeTypes.CHOOSE) {
                    if (d.ref.value !== undefined && d.ref.value.length > 0) {
                        return "ppt-span-value";
                    } else {
                        return "ppt-span-choose";
                    }
                } else if (d.type === graph.node.NodeTypes.VALUE) {
                    return "ppt-span-value";
                } else if (d.type === graph.node.NodeTypes.GROUP) {
                    return "ppt-span-group";
                } else {
                    return "ppt-span";
                }
            }
        })
        .text(function (d) {
            return d.term + " ";
        });
};

queryviewer.generateConstraintData = function (links, nodes) {
    var elmts = [], id = 0;

    // Add query starter
    elmts.push(
        {id: id++, term: queryviewer.QUERY_STARTER}
    );

    // Add the root node as query term
    if (nodes.length > 0) {
        elmts.push(
            {id: id++, type: nodes[0].type, term: provider.node.getSemanticValue(nodes[0]), ref: nodes[0]}
        );
    }

    // Add a span for each link and its target node
    links.forEach(function (l) {

        var sourceNode = l.source;
        var targetNode = l.target;
        if (l.type === graph.link.LinkTypes.RELATION && targetNode.type !== graph.node.NodeTypes.GROUP && targetNode.value !== undefined && targetNode.value.length > 0) {
            if (sourceNode.type === graph.node.NodeTypes.GROUP) {
                elmts.push(
                    {
                        id: id++,
                        type: sourceNode.type,
                        term: provider.node.getSemanticValue(sourceNode),
                        ref: sourceNode
                    }
                );
            }

            elmts.push({id: id++, isLink: true, term: provider.link.getSemanticValue(l), ref: l});

            if (targetNode.type !== graph.node.NodeTypes.GROUP) {
                if (targetNode.value !== undefined && targetNode.value.length > 0) {
                    elmts.push(
                        {
                            id: id++,
                            type: targetNode.type,
                            term: provider.node.getSemanticValue(targetNode),
                            ref: targetNode
                        }
                    );
                } else {
                    elmts.push(
                        {
                            id: id++,
                            type: targetNode.type,
                            term: "<" + queryviewer.CHOOSE_LABEL + " " + provider.node.getSemanticValue(targetNode) + ">",
                            ref: targetNode
                        }
                    );
                }
            }
        }
    });

    return elmts;
};

// TODO add option nodes in generated query when no value is available
queryviewer.generateData = function (links, nodes) {
    var elmts = [], options = [], id = 0;

    // Add a span for each link and its target node
    links.forEach(function (l) {

        var sourceNode = l.source;
        var targetNode = l.target;

        if (targetNode.type === graph.node.NodeTypes.GROUP) {
            options.push(
                {
                    id: id++,
                    type: targetNode.type,
                    term: provider.node.getSemanticValue(targetNode),
                    ref: targetNode
                }
            );
        }

        if (l.type === graph.link.LinkTypes.RELATION && targetNode.type !== graph.node.NodeTypes.GROUP && (targetNode.value === undefined || targetNode.value.length === 0)) {
            if (sourceNode.type === graph.node.NodeTypes.GROUP) {
                elmts.push(
                    {
                        id: id++,
                        type: sourceNode.type,
                        term: provider.node.getSemanticValue(sourceNode),
                        ref: sourceNode
                    }
                );
            }

            elmts.push({id: id++, isLink: true, term: provider.link.getSemanticValue(l), ref: l});

            if (targetNode.type !== graph.node.NodeTypes.GROUP) {
                elmts.push(
                    {
                        id: id++,
                        type: targetNode.type,
                        term: "<" + queryviewer.CHOOSE_LABEL + " " + provider.node.getSemanticValue(targetNode) + ">",
                        ref: targetNode
                    }
                );
            }
        }
    });

    return elmts.concat(options);
};

/**
 *
 */
queryviewer.mouseOverSpan = function () {
    d3.select(this).classed("hover", function (d) {
        return d.ref;
    });

    var hoveredSpan = d3.select(this).data()[0];

    if (hoveredSpan.ref) {
        var linkElmt = graph.svg.selectAll("#" + graph.link.gID + " > g").filter(function (d) {
            return d === hoveredSpan.ref;
        });
        linkElmt.select("path").classed("ppt-link-hover", true);
        linkElmt.select("text").classed("ppt-link-hover", true);

        var nodeElmt = graph.svg.selectAll("#" + graph.node.gID + " > g").filter(function (d) {
            return d === hoveredSpan.ref;
        });

        nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0.5);

        if (cypherviewer.isActive) {
            cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredSpan.ref || d.link === hoveredSpan.ref;
            }).classed("hover", true);
        }
    }
};

queryviewer.rightClickSpan = function () {
    var clickedSpan = d3.select(this).data()[0];

    if (!clickedSpan.isLink && clickedSpan.ref) {
        var nodeElmt = graph.svg.selectAll("#" + graph.node.gID + " > g").filter(function (d) {
            return d === clickedSpan.ref;
        });

        nodeElmt.on("contextmenu").call(nodeElmt.node(), clickedSpan.ref);
    }
};

queryviewer.clickSpan = function () {
    var clickedSpan = d3.select(this).data()[0];

    if (!clickedSpan.isLink && clickedSpan.ref) {
        var nodeElmt = graph.svg.selectAll("#" + graph.node.gID + " > g").filter(function (d) {
            return d === clickedSpan.ref;
        });

        nodeElmt.on("click").call(nodeElmt.node(), clickedSpan.ref);
    }
};

/**
 *
 */
queryviewer.mouseOutSpan = function () {
    d3.select(this).classed("hover", false);

    var hoveredSpan = d3.select(this).data()[0];

    if (hoveredSpan.ref) {
        var linkElmt = graph.svg.selectAll("#" + graph.link.gID + " > g").filter(function (d) {
            return d === hoveredSpan.ref;
        });
        linkElmt.select("path").classed("ppt-link-hover", false);
        linkElmt.select("text").classed("ppt-link-hover", false);

        var nodeElmt = graph.svg.selectAll("#" + graph.node.gID + " > g").filter(function (d) {
            return d === hoveredSpan.ref;
        });
        nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0);

        if (cypherviewer.isActive) {
            cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredSpan.ref || d.link === hoveredSpan.ref;
            }).classed("hover", false);
        }
    }
};

export default queryviewer