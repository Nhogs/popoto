import * as d3 from "d3";
import runner from "../../runner/runner";
import result from "../../result/result";
import cypherviewer from "../../cypherviewer/cypherviewer";
import graph from "../graph";
import provider from "../../provider/provider";
import fitTextRenderer from "./fitTextRenderer";
import dataModel from "../../datamodel/dataModel";
import {update} from "../../popoto";
import queryviewer from "../../queryviewer/queryviewer";
import textRenderer from "./textRenderer";
import logger from "../../logger/logger";
import query from "../../query/query";

var node = {};

// ID of the g element in SVG graph containing all the link elements.
node.gID = "popoto-gnodes";

// Node ellipse size used by default for text nodes.
node.DONUTS_MARGIN = 0;
node.DONUT_WIDTH = 20;

// Define the max number of character displayed in node.
node.NODE_MAX_CHARS = 11;
node.NODE_TITLE_MAX_CHARS = 100;

// Number of nodes displayed per page during value selection.
node.PAGE_SIZE = 10;

// Count box default size
node.CountBox = {x: 16, y: 33, w: 52, h: 19};

// Store choose node state to avoid multiple node expand at the same time
node.chooseWaiting = false;

node.getDonutInnerRadius = function (n) {
    return provider.node.getSize(n) + node.DONUTS_MARGIN;
};

node.getDonutOuterRadius = function (n) {
    return provider.node.getSize(n) + node.DONUTS_MARGIN + node.DONUT_WIDTH;
};

node.pie = d3.pie()
    .sort(null)
    .value(function (d) {
        return 1;
    });

/**
 * Defines the list of possible nodes.
 * ROOT: Node used as graph root. It is the target of the query. Only one node of this type should be available in graph.
 * CHOOSE: Nodes defining a generic node label. From these node is is possible to select a value or explore relations.
 * VALUE: Unique node containing a value constraint. Usually replace CHOOSE nodes once a value as been selected.
 * GROUP: Empty node used to group relations. No value can be selected but relations can be explored. These nodes doesn't have count.
 */
node.NodeTypes = Object.freeze({ROOT: 0, CHOOSE: 1, VALUE: 2, GROUP: 3});

// Used to generate unique internal labels used for example as identifier in Cypher query.
node.internalLabels = {};

/**
 * Create a normalized identifier from a node label.
 * Multiple calls with the same node label will generate different unique identifier.
 *
 * @param nodeLabel
 * @returns {string}
 */
node.generateInternalLabel = function (nodeLabel) {
    var label = nodeLabel ? nodeLabel.toLowerCase().replace(/ /g, '') : "n";

    if (label in node.internalLabels) {
        node.internalLabels[label] = node.internalLabels[label] + 1;
    } else {
        node.internalLabels[label] = 0;
        return label;
    }

    return label + node.internalLabels[label];
};

/**
 * Update Nodes SVG elements using D3.js update mechanisms.
 */
node.updateNodes = function () {
    var data = node.updateData();
    node.removeElements(data.exit());
    node.addNewElements(data.enter());
    node.updateElements();
};

/**
 * Update node data with changes done in dataModel.nodes model.
 */
node.updateData = function () {
    var data = graph.svg.select("#" + node.gID).selectAll(".ppt-gnode").data(dataModel.nodes, function (d) {
        return d.id;
    });

    if (graph.hasGraphChanged) {
        node.updateAutoLoadValues();

        if (!graph.DISABLE_COUNT && !graph.ignoreCount) {
            node.updateCount();
        }
    }
    graph.hasGraphChanged = false;

    return data;
};

/**
 * Update nodes and result counts by executing a query for every nodes with the new graph structure.
 */
node.updateCount = function () {
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
    runner.run(
        {
            "statements": statements
        })
        .then(function (results) {
            logger.info("<== Count nodes");
            var data = runner.toObject(results);

            for (var i = 0; i < countedNodes.length; i++) {
                countedNodes[i].count = data[i][0].count;
            }

            // Update result count with root node new count
            if (result.resultCountListeners.length > 0) {
                result.updateResultsCount();
            }

            node.updateElements();
            graph.link.updateElements();
        })
        .catch(function (error) {
            logger.error(error);
            countedNodes.forEach(function (n) {
                n.count = 0;
            });
            node.updateElements();
            graph.link.updateElements();
        });
};

/**
 * Update values for nodes having preloadData property
 */
node.updateAutoLoadValues = function () {
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
        runner.run(
            {
                "statements": statements
            })
            .then(function (results) {
                logger.info("<== AutoLoadValue");

                var data = runner.toObject(results)

                for (var i = 0; i < nodesToLoadData.length; i++) {
                    var nodeToQuery = nodesToLoadData[i];
                    var constraintAttr = provider.node.getConstraintAttribute(nodeToQuery.label);
                    // Here results are parsed and values already selected are filtered out
                    nodeToQuery.data = data[i].filter(function (dataToFilter) {
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
            .catch(function (error) {
                logger.error(error);
            });
    }
};

/**
 * Remove old elements.
 * Should be called after updateData.
 */
node.removeElements = function (exitingData) {
    // Nodes without parent are simply removed.
    exitingData.filter(function (d) {
        return !d.parent;
    }).remove();

    // Nodes with a parent are removed with an animation (nodes are collapsed to their parents before being removed)
    exitingData.filter(function (d) {
        return d.parent;
    }).transition().duration(300).attr("transform", function (d) {
        return "translate(" + d.parent.x + "," + d.parent.y + ")";
    }).remove();
};

/**
 * Add all new elements.
 * Only the skeleton of new nodes are added custom data will be added during the element update phase.
 * Should be called after updateData and before updateElements.
 */
node.addNewElements = function (enteringData) {

    var gNewNodeElements = enteringData
        .append("g")
        .attr("class", "ppt-gnode");

    gNewNodeElements.on("click", node.nodeClick)
        .on("mouseover", node.mouseOverNode)
        // .on("mousemove", nUdeXXX.mouseMoveNode)
        .on("mouseout", node.mouseOutNode);

    // Add right click on all nodes except value
    gNewNodeElements.filter(function (d) {
        return d.type !== node.NodeTypes.VALUE;
    }).on("contextmenu", node.clearSelection);

    // Disable right click context menu on value nodes
    gNewNodeElements.filter(function (d) {
        return d.type === node.NodeTypes.VALUE;
    }).on("contextmenu", function (event) {
        // Disable context menu on
        event.preventDefault();
    });

    var nodeDefs = gNewNodeElements.append("defs");

    // Circle clipPath using node radius size
    nodeDefs.append("clipPath")
        .attr("id", function (n) {
            return "node-view" + n.id;
        })
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 0);

    // Nodes are composed of 3 layouts and skeleton are created here.
    node.addBackgroundElements(gNewNodeElements);
    node.addMiddlegroundElements(gNewNodeElements);
    node.addForegroundElements(gNewNodeElements);
};

/**
 * Create the background for a new node element.
 * The background of a node is defined by a circle not visible by default (fill-opacity set to 0) but can be used to highlight a node with animation on this attribute.
 * This circle also define the node zone that can receive events like mouse clicks.
 *
 * @param gNewNodeElements
 */
node.addBackgroundElements = function (gNewNodeElements) {
    var background = gNewNodeElements
        .append("g")
        .attr("class", "ppt-g-node-background")
        .classed("hide", graph.DISABLE_RELATION);

    background.append("g")
        .attr("class", "ppt-donut-labels");
    background.append("g")
        .attr("class", "ppt-donut-segments");
};

/**
 * Create the node main elements.
 *
 * @param gNewNodeElements
 */
node.addMiddlegroundElements = function (gNewNodeElements) {
    var middle = gNewNodeElements
        .append("g")
        .attr("class", "ppt-g-node-middleground");
};

/**
 * Create the node foreground elements.
 * It contains node additional elements, count or tools like navigation arrows.
 *
 * @param gNewNodeElements
 */
node.addForegroundElements = function (gNewNodeElements) {
    var foreground = gNewNodeElements
        .append("g")
        .attr("class", "ppt-g-node-foreground");

    // Arrows icons added only for root and choose nodes
    var gArrow = foreground.filter(function (d) {
        return d.type === node.NodeTypes.ROOT || d.type === node.NodeTypes.CHOOSE;
    })
        .append("g")
        .attr("class", "ppt-node-foreground-g-arrows");

    var glArrow = gArrow.append("g");
    //glArrow.append("polygon")
    //.attr("points", "-53,-23 -33,-33 -33,-13");
    glArrow.append("circle")
        .attr("class", "ppt-larrow")
        .attr("cx", "-43")
        .attr("cy", "-23")
        .attr("r", "17");

    glArrow.append("path")
        .attr("class", "ppt-arrow")
        .attr("d", "m -44.905361,-23 6.742,-6.742 c 0.81,-0.809 0.81,-2.135 0,-2.944 l -0.737,-0.737 c -0.81,-0.811 -2.135,-0.811 -2.945,0 l -8.835,8.835 c -0.435,0.434 -0.628,1.017 -0.597,1.589 -0.031,0.571 0.162,1.154 0.597,1.588 l 8.835,8.834 c 0.81,0.811 2.135,0.811 2.945,0 l 0.737,-0.737 c 0.81,-0.808 0.81,-2.134 0,-2.943 l -6.742,-6.743 z");

    glArrow.on("click", function (event, clickedNode) {
        event.stopPropagation(); // To avoid click event on svg element in background

        // On left arrow click page number is decreased and node expanded to display the new page
        if (clickedNode.page > 1) {
            clickedNode.page--;
            node.collapseNode(clickedNode);
            node.expandNode(clickedNode);
        }
    });

    var grArrow = gArrow.append("g");
    //grArrow.append("polygon")
    //.attr("points", "53,-23 33,-33 33,-13");

    grArrow.append("circle")
        .attr("class", "ppt-rarrow")
        .attr("cx", "43")
        .attr("cy", "-23")
        .attr("r", "17");

    grArrow.append("path")
        .attr("class", "ppt-arrow")
        .attr("d", "m 51.027875,-24.5875 -8.835,-8.835 c -0.811,-0.811 -2.137,-0.811 -2.945,0 l -0.738,0.737 c -0.81,0.81 -0.81,2.136 0,2.944 l 6.742,6.742 -6.742,6.742 c -0.81,0.81 -0.81,2.136 0,2.943 l 0.737,0.737 c 0.81,0.811 2.136,0.811 2.945,0 l 8.835,-8.836 c 0.435,-0.434 0.628,-1.017 0.597,-1.588 0.032,-0.569 -0.161,-1.152 -0.596,-1.586 z");

    grArrow.on("click", function (event, clickedNode) {
        event.stopPropagation(); // To avoid click event on svg element in background

        if (clickedNode.page * node.PAGE_SIZE < clickedNode.count) {
            clickedNode.page++;
            node.collapseNode(clickedNode);
            node.expandNode(clickedNode);
        }
    });

    // Count box
    if (!graph.DISABLE_COUNT) {
        var countForeground = foreground.filter(function (d) {
            return d.type !== node.NodeTypes.GROUP;
        });

        countForeground
            .append("rect")
            .attr("x", node.CountBox.x)
            .attr("y", node.CountBox.y)
            .attr("width", node.CountBox.w)
            .attr("height", node.CountBox.h)
            .attr("class", "ppt-count-box");

        countForeground
            .append("text")
            .attr("x", 42)
            .attr("y", 48)
            .attr("text-anchor", "middle")
            .attr("class", "ppt-count-text");
    }

    var ban = foreground.filter(function (d) {
        return d.type === node.NodeTypes.CHOOSE;
    }).append("g")
        .attr("class", "ppt-g-node-ban")
        .append("path")
        .attr("d", "M89.1 19.2C88 17.7 86.6 16.2 85.2 14.8 83.8 13.4 82.3 12 80.8 10.9 72 3.9 61.3 0 50 0 36.7 0 24.2 5.4 14.8 14.8 5.4 24.2 0 36.7 0 50c0 11.4 3.9 22.1 10.9 30.8 1.2 1.5 2.5 3 3.9 4.4 1.4 1.4 2.9 2.7 4.4 3.9C27.9 96.1 38.6 100 50 100 63.3 100 75.8 94.6 85.2 85.2 94.6 75.8 100 63.3 100 50 100 38.7 96.1 28 89.1 19.2ZM11.9 50c0-10.2 4-19.7 11.1-27C30.3 15.9 39.8 11.9 50 11.9c8.2 0 16 2.6 22.4 7.3L19.3 72.4C14.5 66 11.9 58.2 11.9 50Zm65 27c-7.2 7.1-16.8 11.1-27 11.1-8.2 0-16-2.6-22.4-7.4L80.8 27.6C85.5 34 88.1 41.8 88.1 50c0 10.2-4 19.7-11.1 27z");
};

/**
 * Updates all elements.
 */
node.updateElements = function () {
    var toUpdateElem = graph.svg.select("#" + node.gID).selectAll(".ppt-gnode");

    toUpdateElem.attr("id", function (d) {
        return "popoto-gnode_" + d.id;
    });

    if (graph.USE_VORONOI_LAYOUT) {
        toUpdateElem.attr("clip-path", function (d) {
            return "url(#voroclip-" + d.id + ")";
        });
    }

    toUpdateElem.select("defs")
        .select("clipPath")
        .attr("id", function (n) {
            return "node-view" + n.id;
        }).selectAll("circle")
        .attr("r", function (n) {
            return provider.node.getSize(n);
        });

    // TODO ZZZ move functions?
    toUpdateElem.filter(function (n) {
        return n.type !== node.NodeTypes.ROOT
    }).call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    function dragstarted(event, d) {
        if (!event.active) graph.force.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) graph.force.alphaTarget(0);
        if (d.fixed === false) {
            d.fx = null;
            d.fy = null;
        }

    }

    node.updateBackgroundElements();
    node.updateMiddlegroundElements();
    node.updateForegroundElements();
};

node.updateBackgroundElements = function () {
    var nodeBackgroundElements = graph.svg.select("#" + node.gID).selectAll(".ppt-gnode").selectAll(".ppt-g-node-background");

    nodeBackgroundElements.select(".ppt-donut-labels").selectAll("*").remove();
    nodeBackgroundElements.select(".ppt-donut-segments").selectAll("*").remove();

    var gSegment = nodeBackgroundElements.select(".ppt-donut-segments").selectAll(".ppt-segment-container")
        .data(function (d) {
            var relationships = [];
            if (d.hasOwnProperty("relationships")) {
                relationships = d.relationships;
            }
            return relationships;
        }, function (d) {
            return d.id;
        })
        .enter()
        .append("g")
        .attr("class", ".ppt-segment-container")
        .on("click", node.segmentClick)
        .on("mouseover", function (d) {
            d3.select(this).select(".ppt-text-arc").classed("hover", true)
        })
        .on("mouseout", function (d) {
            d3.select(this).select(".ppt-text-arc").classed("hover", false)
        });

    gSegment.append("title").attr("class", "ppt-svg-title")
        .text(function (d) {
            return d.label + " " + d.target;
        });

    var gLabel = nodeBackgroundElements.select(".ppt-donut-labels").selectAll(".ppt-segment-container")
        .data(function (n) {
            var relationships = [];
            if (n.hasOwnProperty("relationships")) {
                relationships = n.relationships;
            }
            return relationships;
        }, function (relationship) {
            return relationship.id;
        })
        .enter()
        .append("g")
        .attr("class", ".ppt-segment-container")
        .on("click", node.segmentClick)
        .on("mouseover", function (d) {
            d3.select(this).select(".ppt-text-arc").classed("hover", true)
        })
        .on("mouseout", function (d) {
            d3.select(this).select(".ppt-text-arc").classed("hover", false)
        });

    gLabel.append("path")
        .attr("class", "ppt-hidden-arc")
        .attr("id", function (d, i) {
            var n = d3.select(this.parentNode.parentNode).datum();
            return "arc_" + n.id + "_" + i;
        })
        .attr("d", function (relationship) {
            var n = d3.select(this.parentNode.parentNode).datum();

            //A regular expression that captures all in between the start of a string (denoted by ^)
            //and the first capital letter L
            var firstArcSection = /(^.+?)L/;
            var singleArcSection = /(^.+?)M/;

            var intermediateArc = {
                startAngle: relationship.directionAngle - (Math.PI - 0.1),
                endAngle: relationship.directionAngle + (Math.PI - 0.1)
            };

            var arcPath = d3.arc()
                .innerRadius(node.getDonutInnerRadius(n))
                .outerRadius(node.getDonutOuterRadius(n))(intermediateArc);

            //The [1] gives back the expression between the () (thus not the L as well)
            //which is exactly the arc statement
            var res = firstArcSection.exec(arcPath);
            var newArc = "";
            if (res && res.length > 1) {
                newArc = res[1];
            } else {
                newArc = singleArcSection.exec(arcPath)[1];
            }

            //Replace all the comma's so that IE can handle it -_-
            //The g after the / is a modifier that "find all matches rather than stopping after the first match"
            newArc = newArc.replace(/,/g, " ");

            return newArc;
        })
        .style("fill", "none")
        .style("stroke", "none");

    gSegment.append("text")
        .attr("text-anchor", "middle")
        .attr("class", function (d) {
            var n = d3.select(this.parentNode.parentNode).datum();
            if (n.hasOwnProperty("count") && n.count === 0) {
                return "ppt-text-arc disabled";
            } else {
                return "ppt-text-arc";
            }
        })
        .attr("fill", function (d) {
            var n = d3.select(this.parentNode.parentNode).datum();

            return provider.link.getColor({
                label: d.label,
                type: graph.link.LinkTypes.SEGMENT,
                source: n,
                target: {label: d.target}
            }, "segment", "fill");
        })
        .attr("dy", graph.link.TEXT_DY)
        .append("textPath")
        .attr("startOffset", "50%")
        .attr("xlink:href", function (d, i) {
            var n = d3.select(this.parentNode.parentNode.parentNode).datum();
            return "#arc_" + n.id + "_" + i;
        })
        .text(function (d) {
            var n = d3.select(this.parentNode.parentNode.parentNode).datum();

            return provider.link.getTextValue({
                source: n,
                target: {label: d.target},
                label: d.label,
                type: graph.link.LinkTypes.SEGMENT
            });
        });

    gSegment.append("path")
        .attr("class", function (d) {
            var n = d3.select(this.parentNode.parentNode).datum();
            if (n.hasOwnProperty("count") && n.count === 0) {
                return "ppt-segment disabled";
            } else {
                return "ppt-segment";
            }
        })
        .attr("d", function (d) {
            var n = d3.select(this.parentNode.parentNode).datum();
            return d3.arc()
                .innerRadius(node.getDonutInnerRadius(n))
                .outerRadius(node.getDonutOuterRadius(n))(d)
        })
        .attr("fill", function (d) {
            var n = d3.select(this.parentNode.parentNode).datum();
            return provider.link.getColor({
                label: d.label,
                type: graph.link.LinkTypes.RELATION,
                source: n,
                target: {label: d.target}
            }, "path", "fill");
        })
        .attr("stroke", function (d) {
            var n = d3.select(this.parentNode.parentNode).datum();

            return provider.link.getColor({
                label: d.label,
                type: graph.link.LinkTypes.RELATION,
                source: n,
                target: {label: d.target}
            }, "path", "stroke");
        })
    ;

};

/**
 * Update the middle layer of nodes.
 * TODO refactor node generation to allow future extensions (for example add plugin with new node types...)
 */
node.updateMiddlegroundElements = function () {
    var middleG = graph.svg.select("#" + node.gID).selectAll(".ppt-gnode").selectAll(".ppt-g-node-middleground");

    middleG.attr("clip-path", function (n) {
        return "url(#node-view" + n.id + ")";
    });

    // Clear all content in case node type has changed
    middleG.selectAll("*").remove();


    node.updateMiddlegroundElementsTooltip(middleG);

    node.updateMiddlegroundElementsText(middleG.filter(function (d) {
        return provider.node.getNodeDisplayType(d) === provider.node.DisplayTypes.TEXT;
    }));

    node.updateMiddlegroundElementsImage(middleG.filter(function (d) {
        return provider.node.getNodeDisplayType(d) === provider.node.DisplayTypes.IMAGE;
    }));

    node.updateMiddlegroundElementsSymbol(middleG.filter(function (d) {
        return provider.node.getNodeDisplayType(d) === provider.node.DisplayTypes.SYMBOL;
    }));

    node.updateMiddlegroundElementsSVG(middleG.filter(function (d) {
        return provider.node.getNodeDisplayType(d) === provider.node.DisplayTypes.SVG;
    }));

    node.updateMiddlegroundElementsDisplayedText(middleG.filter(function (d) {
        return provider.node.isTextDisplayed(d);
    }));

};

node.updateMiddlegroundElementsTooltip = function (middleG) {
    // Most browser will generate a tooltip if a title is specified for the SVG element
    // TODO Introduce an SVG tooltip instead?
    middleG.append("title")
        .attr("class", function (n) {
            return provider.node.getCSSClass(n, "title")
        })
        .text(function (d) {
            return provider.node.getTextValue(d, node.NODE_TITLE_MAX_CHARS);
        });

};

node.updateMiddlegroundElementsText = function (gMiddlegroundTextNodes) {
    var circle = gMiddlegroundTextNodes.append("circle").attr("r", function (n) {
        return provider.node.getSize(n);
    });

    // Set class according to node type
    circle
        .attr("class", function (n) {
            return provider.node.getCSSClass(n, "circle")
        })
        .attr("fill", function (n) {
            return provider.node.getColor(n, "circle", "fill");
        })
        .attr("stroke", function (n) {
            return provider.node.getColor(n, "circle", "stroke");
        });
};

node.updateMiddlegroundElementsImage = function (gMiddlegroundImageNodes) {
    gMiddlegroundImageNodes.append("circle").attr("r", function (n) {
        return provider.node.getSize(n);
    })
        .attr("class", function (n) {
            return provider.node.getCSSClass(n, "image-background-circle")
        });

    gMiddlegroundImageNodes.append("image")
        .attr("class", function (n) {
            return provider.node.getCSSClass(n, "image")
        })
        .attr("width", function (d) {
            return provider.node.getImageWidth(d);
        })
        .attr("height", function (d) {
            return provider.node.getImageHeight(d);
        })
        // Center the image on node
        .attr("transform", function (d) {
            return "translate(" + (-provider.node.getImageWidth(d) / 2) + "," + (-provider.node.getImageHeight(d) / 2) + ")";
        })
        .attr("xlink:href", function (d) {
            return provider.node.getImagePath(d);
        });
};

node.updateMiddlegroundElementsSymbol = function (gMiddlegroundSymbolNodes) {
    gMiddlegroundSymbolNodes.append("circle").attr("r", function (n) {
        return provider.node.getSize(n);
    })
        .attr("class", function (n) {
            return provider.node.getCSSClass(n, "symbol-background-circle")
        })
        .attr("fill", function (n) {
            return provider.node.getColor(n, "circle", "fill");
        })
        .attr("stroke", function (n) {
            return provider.node.getColor(n, "circle", "stroke");
        });

    gMiddlegroundSymbolNodes.append("use")
        .attr("class", function (n) {
            return provider.node.getCSSClass(n, "symbol")
        })
        .attr("width", function (d) {
            return provider.node.getImageWidth(d);
        })
        .attr("height", function (d) {
            return provider.node.getImageHeight(d);
        })
        // Center the image on node
        .attr("transform", function (d) {
            return "translate(" + (-provider.node.getImageWidth(d) / 2) + "," + (-provider.node.getImageHeight(d) / 2) + ")";
        })
        .attr("xlink:href", function (d) {
            return provider.node.getImagePath(d);
        })
        .attr("fill", function (n) {
            return provider.node.getColor(n, "circle", "fill");
        })
        .attr("stroke", function (n) {
            return provider.node.getColor(n, "circle", "stroke");
        });
};

node.updateMiddlegroundElementsSVG = function (gMiddlegroundSVGNodes) {
    var SVGmiddleG = gMiddlegroundSVGNodes.append("g");

    var circle = SVGmiddleG.append("circle").attr("r", function (n) {
        return provider.node.getSize(n);
    }).attr("class", "ppt-svg-node-background");

    var svgMiddlePaths = SVGmiddleG.selectAll("path").data(function (d) {
        return provider.node.getSVGPaths(d);
    });

    // Update nested data elements
    svgMiddlePaths.exit().remove();
    svgMiddlePaths.enter().append("path");

    SVGmiddleG
        .selectAll("path")
        .attr("class", function (d) {
            var n = d3.select(this.parentNode).datum();
            return provider.node.getCSSClass(n, "path")
        })
        .each(function (d, i) {
            for (var prop in d) {
                if (d.hasOwnProperty(prop)) {
                    d3.select(this).attr(prop, d[prop]);
                }
            }
        })
};

node.updateMiddlegroundElementsDisplayedText = function (middleG) {
    var textDisplayed = middleG.filter(function (d) {
        return provider.node.isTextDisplayed(d);
    });

    if (graph.USE_FIT_TEXT) {
        fitTextRenderer.render(textDisplayed);
    } else {
        textRenderer.render(textDisplayed);
    }
};

/**
 * Updates the foreground elements
 */
node.updateForegroundElements = function () {

    // Updates browse arrows status
    // TODO ZZZ extract variable?
    var gArrows = graph.svg.select("#" + node.gID).selectAll(".ppt-gnode").selectAll(".ppt-g-node-foreground")
        .selectAll(".ppt-node-foreground-g-arrows");
    gArrows.classed("active", function (d) {
        return d.valueExpanded && d.data && d.data.length > node.PAGE_SIZE;
    });

    gArrows.selectAll(".ppt-larrow").classed("enabled", function (d) {
        return d.page > 1;
    });

    gArrows.selectAll(".ppt-rarrow").classed("enabled", function (d) {
        if (d.data) {
            var count = d.data.length;
            return d.page * node.PAGE_SIZE < count;
        } else {
            return false;
        }
    });

    // Update count box class depending on node type
    var gForegrounds = graph.svg.select("#" + node.gID).selectAll(".ppt-gnode").selectAll(".ppt-g-node-foreground");

    gForegrounds.selectAll(".ppt-count-box").filter(function (d) {
        return d.type !== node.NodeTypes.CHOOSE;
    }).classed("root", true);

    gForegrounds.selectAll(".ppt-count-box").filter(function (d) {
        return d.type === node.NodeTypes.CHOOSE;
    }).classed("value", true);

    gForegrounds.selectAll(".ppt-count-box").classed("disabled", function (d) {
        return d.count === 0;
    });

    if (!graph.DISABLE_COUNT) {
        gForegrounds.selectAll(".ppt-count-text")
            .text(function (d) {
                if (d.count !== null) {
                    return d.count;
                } else {
                    return "...";
                }
            })
            .classed("disabled", function (d) {
                return d.count === 0;
            });
    }

    graph.svg.select("#" + node.gID).selectAll(".ppt-gnode").selectAll(".ppt-g-node-foreground").filter(function (n) {
        return n.isNegative === true;
    }).selectAll(".ppt-g-node-ban")
        .attr("transform", function (d) {
            return "translate(" + (-provider.node.getSize(d)) + "," + (-provider.node.getSize(d)) + ") " +
                "scale(" + ((provider.node.getSize(d) * 2) / 100) + ")"; // 100 is the size of the image drawn with the path
        })
        .attr("stroke-width", function (d) {
            return (2 / ((provider.node.getSize(d) * 2) / 100)) + "px";
        });


    graph.svg.select("#" + node.gID).selectAll(".ppt-gnode").selectAll(".ppt-g-node-foreground").selectAll(".ppt-g-node-ban")
        .classed("active", function (n) {
            return n.isNegative === true;
        });
};

node.segmentClick = function (event, d) {
    event.preventDefault();

    var n = d3.select(this.parentNode.parentNode).datum();

    graph.ignoreCount = true;

    graph.addRelationshipData(n, d, function (targetNode) {
        graph.notifyListeners(graph.Events.GRAPH_NODE_RELATION_ADD, [
            dataModel.links.filter(function (l) {
                return l.target === targetNode;
            })
        ]);
        graph.ignoreCount = false;
        graph.hasGraphChanged = true;
        update();
    });
};

/**
 * Handle the mouse over event on nodes.
 */
node.mouseOverNode = function (event) {
    event.preventDefault();

    // TODO don't work on IE (nodes unstable) find another way to move node in foreground on mouse over?
    // d3.select(this).moveToFront();

    // tootip.div.style("display", "inline");

    var hoveredNode = d3.select(this).data()[0];

    if (queryviewer.isActive) {
        // Hover the node in query
        queryviewer.queryConstraintSpanElements.filter(function (d) {
            return d.ref === hoveredNode;
        }).classed("hover", true);
        queryviewer.querySpanElements.filter(function (d) {
            return d.ref === hoveredNode;
        }).classed("hover", true);
    }

    if (cypherviewer.isActive) {
        cypherviewer.querySpanElements.filter(function (d) {
            return d.node === hoveredNode;
        }).classed("hover", true);
    }
};

/**
 * Handle mouse out event on nodes.
 */
node.mouseOutNode = function (event) {
    event.preventDefault();

    // tootip.div.style("display", "none");

    var hoveredNode = d3.select(this).data()[0];

    if (queryviewer.isActive) {
        // Remove hover class on node.
        queryviewer.queryConstraintSpanElements.filter(function (d) {
            return d.ref === hoveredNode;
        }).classed("hover", false);
        queryviewer.querySpanElements.filter(function (d) {
            return d.ref === hoveredNode;
        }).classed("hover", false);
    }

    if (cypherviewer.isActive) {
        cypherviewer.querySpanElements.filter(function (d) {
            return d.node === hoveredNode;
        }).classed("hover", false);
    }
};

/**
 * Handle the click event on nodes.
 */
node.nodeClick = function (event) {
    if (!event.defaultPrevented) { // To avoid click on drag end
        var clickedNode = d3.select(this).data()[0]; // Clicked node data
        logger.debug("nodeClick (" + clickedNode.label + ")");

        if (clickedNode.type === node.NodeTypes.VALUE) {
            node.valueNodeClick(clickedNode);
        } else if (clickedNode.type === node.NodeTypes.CHOOSE || clickedNode.type === node.NodeTypes.ROOT) {
            if (event.ctrlKey) {
                if (clickedNode.type === node.NodeTypes.CHOOSE) {
                    clickedNode.isNegative = !clickedNode.hasOwnProperty("isNegative") || !clickedNode.isNegative;

                    node.collapseAllNode();

                    if (clickedNode.hasOwnProperty("value") && clickedNode.value.length > 0) {

                    } else {

                        if (clickedNode.isNegative) {
                            // Remove all related nodes
                            for (var i = dataModel.links.length - 1; i >= 0; i--) {
                                if (dataModel.links[i].source === clickedNode) {
                                    node.removeNode(dataModel.links[i].target);
                                }
                            }

                            clickedNode.count = 0;
                        }
                    }

                    result.hasChanged = true;
                    graph.hasGraphChanged = true;
                    update();
                } // negation not supported on root node
            } else {
                if (clickedNode.valueExpanded) {
                    node.collapseNode(clickedNode);
                } else {
                    node.chooseNodeClick(clickedNode);
                }
            }
        }
    }
};

/**
 * Remove all the value node directly linked to clicked node.
 *
 * @param clickedNode
 */
node.collapseNode = function (clickedNode) {
    if (clickedNode.valueExpanded) { // node is collapsed only if it has been expanded first
        logger.debug("collapseNode (" + clickedNode.label + ")");

        graph.notifyListeners(graph.Events.GRAPH_NODE_VALUE_COLLAPSE, [clickedNode]);

        var linksToRemove = dataModel.links.filter(function (l) {
            return l.source === clickedNode && l.type === graph.link.LinkTypes.VALUE;
        });

        // Remove children nodes from model
        linksToRemove.forEach(function (l) {
            dataModel.nodes.splice(dataModel.nodes.indexOf(l.target), 1);
        });

        // Remove links from model
        for (var i = dataModel.links.length - 1; i >= 0; i--) {
            if (linksToRemove.indexOf(dataModel.links[i]) >= 0) {
                dataModel.links.splice(i, 1);
            }
        }

        // Node has been fixed when expanded so we unfix it back here.
        if (clickedNode.type !== node.NodeTypes.ROOT) {
            clickedNode.fixed = false;
            clickedNode.fx = null;
            clickedNode.fy = null;
        }

        // Parent node too if not root
        if (clickedNode.parent && clickedNode.parent.type !== node.NodeTypes.ROOT) {
            clickedNode.parent.fixed = false;
            clickedNode.parent.fx = null;
            clickedNode.parent.fy = null;
        }

        clickedNode.valueExpanded = false;
        update();

    } else {
        logger.debug("collapseNode called on an unexpanded node");
    }
};

/**
 * Collapse all nodes with value expanded.
 *
 */
node.collapseAllNode = function () {
    dataModel.nodes.forEach(function (n) {
        if ((n.type === node.NodeTypes.CHOOSE || n.type === node.NodeTypes.ROOT) && n.valueExpanded) {
            node.collapseNode(n);
        }
    });
};

/**
 * Function called on a value node click.
 * In this case the value is added in the parent node and all the value nodes are collapsed.
 *
 * @param clickedNode
 */
node.valueNodeClick = function (clickedNode) {
    logger.debug("valueNodeClick (" + clickedNode.label + ")");

    graph.notifyListeners(graph.Events.GRAPH_NODE_ADD_VALUE, [clickedNode]);

    if (clickedNode.parent.value === undefined) {
        clickedNode.parent.value = [];
    }
    clickedNode.parent.value.push(clickedNode);
    result.hasChanged = true;
    graph.hasGraphChanged = true;

    node.collapseNode(clickedNode.parent);
};

/**
 * Function called on choose node click.
 * In this case a query is executed to get all the possible value
 * @param clickedNode
 * TODO optimize with cached data?
 */
node.chooseNodeClick = function (clickedNode) {
    logger.debug("chooseNodeClick (" + clickedNode.label + ") with waiting state set to " + node.chooseWaiting);
    if (!node.chooseWaiting && !clickedNode.immutable && !(clickedNode.count === 0)) {

        // Collapse all expanded nodes first
        node.collapseAllNode();

        // Set waiting state to true to avoid multiple call on slow query execution
        node.chooseWaiting = true;

        // Don't run query to get value if node isAutoLoadValue is set to true
        if (clickedNode.data !== undefined && clickedNode.isAutoLoadValue) {
            clickedNode.page = 1;
            node.expandNode(clickedNode);
            node.chooseWaiting = false;
        } else {
            logger.info("Values (" + clickedNode.label + ") ==>");
            var nodeValueQuery = query.generateNodeValueQuery(clickedNode);
            runner.run(
                {
                    "statements": [
                        {
                            "statement": nodeValueQuery.statement,
                            "parameters": nodeValueQuery.parameters
                        }]
                })
                .then(function (results) {
                    logger.info("<== Values (" + clickedNode.label + ")");
                    var parsedData = runner.toObject(results);
                    var constraintAttr = provider.node.getConstraintAttribute(clickedNode.label);

                    clickedNode.data = parsedData[0].filter(function (dataToFilter) {
                        var keepData = true;
                        if (clickedNode.hasOwnProperty("value") && clickedNode.value.length > 0) {
                            clickedNode.value.forEach(function (value) {
                                if (value.attributes[constraintAttr] === dataToFilter[constraintAttr]) {
                                    keepData = false;
                                }
                            })
                        }
                        return keepData;
                    });

                    clickedNode.page = 1;
                    node.expandNode(clickedNode);
                    node.chooseWaiting = false;
                })
                .catch(function (error) {
                    node.chooseWaiting = false;
                    logger.error(error);
                });
        }
    }
};

/**
 * Add in all expanded choose nodes the value containing the specified value for the given attribute.
 * And remove it from the nodes data.
 *
 * @param attribute
 * @param value
 */
node.addExpandedValue = function (attribute, value) {

    var isAnyChangeDone = false;

    // For each expanded nodes
    for (var i = dataModel.nodes.length - 1; i >= 0; i--) {
        if (dataModel.nodes[i].valueExpanded) {

            // Look in node data if value can be found in reverse order to be able to remove value without effect on iteration index
            for (var j = dataModel.nodes[i].data.length - 1; j >= 0; j--) {
                if (dataModel.nodes[i].data[j][attribute] === value) {
                    isAnyChangeDone = true;

                    // Create field value if needed
                    if (!dataModel.nodes[i].hasOwnProperty("value")) {
                        dataModel.nodes[i].value = [];
                    }

                    // Add value
                    dataModel.nodes[i].value.push({
                        attributes: dataModel.nodes[i].data[j]
                    });

                    // Remove data added in value
                    dataModel.nodes[i].data.splice(j, 1);
                }
            }

            // Refresh node
            node.collapseNode(dataModel.nodes[i]);
            node.expandNode(dataModel.nodes[i]);
        }
    }

    if (isAnyChangeDone) {
        result.hasChanged = true;
        graph.hasGraphChanged = true;
        update();
    }
};

/**
 * Get all nodes that contains a value.
 *
 * @param label If set return only node of this label.
 * @return {Array} Array of nodes containing at least one value.
 */
node.getContainingValue = function (label) {
    var nodesWithValue = [];
    var links = dataModel.links, nodes = dataModel.nodes;

    if (nodes.length > 0) {

        var rootNode = nodes[0];

        // Add root value
        if (rootNode.value !== undefined && rootNode.value.length > 0) {
            if (label === undefined || label === rootNode.label) {
                nodesWithValue.push(rootNode);
            }
        }

        links.forEach(function (l) {
            var targetNode = l.target;
            if (l.type === graph.link.LinkTypes.RELATION && targetNode.value !== undefined && targetNode.value.length > 0) {
                if (label === undefined || label === targetNode.label) {
                    nodesWithValue.push(targetNode);
                }
            }
        });
    }

    return nodesWithValue;
};


/**
 * Add value in all CHOOSE nodes with specified label.
 *
 * @param label nodes where to insert
 * @param value
 */
node.addValueForLabel = function (label, value) {
    var isAnyChangeDone = false;

    // Find choose node with label
    for (var i = dataModel.nodes.length - 1; i >= 0; i--) {
        if (dataModel.nodes[i].type === node.NodeTypes.CHOOSE && dataModel.nodes[i].label === label) {

            // Create field value if needed
            if (!dataModel.nodes[i].hasOwnProperty("value")) {
                dataModel.nodes[i].value = [];
            }

            // check if value already exists
            var isValueFound = false;
            var constraintAttr = provider.node.getConstraintAttribute(label);
            dataModel.nodes[i].value.forEach(function (val) {
                if (val.attributes.hasOwnProperty(constraintAttr) && val.attributes[constraintAttr] === value.attributes[constraintAttr]) {
                    isValueFound = true;
                }
            });

            if (!isValueFound) {
                // Add value
                dataModel.nodes[i].value.push(value);
                isAnyChangeDone = true;
            }
        }
    }

    return isAnyChangeDone;
};

/**
 * Add a value in a node with the given id and the value of the first attribute if found in its data.
 *
 * @param nodeIds a list of node ids where to add the value.
 * @param displayAttributeValue the value to find in data and to add if found
 */
node.addValue = function (nodeIds, displayAttributeValue) {
    var isAnyChangeDone = false;

    // Find choose node with label
    for (var i = 0; i < dataModel.nodes.length; i++) {
        var n = dataModel.nodes[i];
        if (nodeIds.indexOf(n.id) >= 0) {

            // Create field value in node if needed
            if (!n.hasOwnProperty("value")) {
                n.value = [];
            }

            var displayAttr = provider.node.getReturnAttributes(n.label)[0];

            // Find data for this node and add value
            n.data.forEach(function (d) {
                if (d.hasOwnProperty(displayAttr) && d[displayAttr] === displayAttributeValue) {
                    isAnyChangeDone = true;
                    n.value.push({attributes: d})
                }
            });
        }
    }

    if (isAnyChangeDone) {
        result.hasChanged = true;
        graph.hasGraphChanged = true;
        update();
    }
};

/**
 * Remove a value from a node.
 * If the value is not found nothing is done.
 *
 * @param n
 * @param value
 */
node.removeValue = function (n, value) {
    var isAnyChangeDone = false;

    node.collapseNode(n);

    for (var j = n.value.length - 1; j >= 0; j--) {
        if (n.value[j] === value) {
            n.value.splice(j, 1);

            isAnyChangeDone = true;
        }
    }
    return isAnyChangeDone;
};

node.removeValues = function (n) {
    var isAnyChangeDone = false;

    node.collapseNode(n);

    if (n.value !== undefined && n.value.length > 0) {
        n.value.length = 0;
        isAnyChangeDone = true;
    }

    return isAnyChangeDone
};

/**
 * Get the value in the provided nodeId for a specific value id.
 *
 * @param nodeId
 * @param constraintAttributeValue
 */
node.getValue = function (nodeId, constraintAttributeValue) {
    for (var i = 0; i < dataModel.nodes.length; i++) {
        var n = dataModel.nodes[i];

        if (n.id === nodeId) {
            var constraintAttribute = provider.node.getConstraintAttribute(n.label);

            for (var j = n.value.length - 1; j >= 0; j--) {
                if (n.value[j].attributes[constraintAttribute] === constraintAttributeValue) {
                    return n.value[j]
                }
            }
        }
    }
};

/**
 * Remove in all expanded nodes the value containing the specified value for the given attribute.
 * And move it back to nodes data.
 *
 * @param attribute
 * @param value
 */
node.removeExpandedValue = function (attribute, value) {
    var isAnyChangeDone = false;

    // For each expanded nodes in reverse order as some values can be removed
    for (var i = dataModel.nodes.length - 1; i >= 0; i--) {
        if (dataModel.nodes[i].valueExpanded) {

            var removedValues = [];

            // Remove values
            for (var j = dataModel.nodes[i].value.length - 1; j >= 0; j--) {
                if (dataModel.nodes[i].value[j].attributes[attribute] === value) {
                    isAnyChangeDone = true;

                    removedValues = removedValues.concat(dataModel.nodes[i].value.splice(j, 1));
                }
            }

            //And add them back in data
            for (var k = 0; k < removedValues.length; k++) {
                dataModel.nodes[i].data.push(removedValues[k].attributes);
            }

            // Refresh node
            node.collapseNode(dataModel.nodes[i]);
            node.expandNode(dataModel.nodes[i]);
        }
    }

    if (isAnyChangeDone) {
        result.hasChanged = true;
        graph.hasGraphChanged = true;
        update();
    }
};

/**
 * Return all nodes with isAutoLoadValue property set to true.
 */
node.getAutoLoadValueNodes = function () {
    return dataModel.nodes
        .filter(function (d) {
            return d.hasOwnProperty("isAutoLoadValue") && d.isAutoLoadValue === true && !(d.isNegative === true);
        });
};

/**
 * Add a list of related value if not already found in node.
 * A value is defined with the following structure
 * {
 *   id,
 *   rel,
 *   label
 * }
 *
 * @param n
 * @param values
 * @param isNegative
 */
node.addRelatedValues = function (n, values, isNegative) {
    var valuesToAdd = node.filterExistingValues(n, values);

    if (valuesToAdd.length <= 0) {
        return;
    }

    var statements = [];

    valuesToAdd.forEach(function (v) {
        var constraintAttr = provider.node.getConstraintAttribute(v.label);

        var statement = "MATCH ";
        if (constraintAttr === query.NEO4J_INTERNAL_ID) {
            statement += "(v:`" + v.label + "`) WHERE (ID(v) = $p)";
        } else {
            statement += "(v:`" + v.label + "`) WHERE (v." + constraintAttr + " = $p)";
        }

        var resultAttributes = provider.node.getReturnAttributes(v.label);
        var sep = "";

        statement += " RETURN DISTINCT \"" + v.rel + "\" AS rel, \"" + v.label + "\" AS label, {" + resultAttributes.reduce(function (a, attr) {
            a += sep + attr + ":v." + attr;
            sep = ", ";
            return a
        }, "") + "} AS value LIMIT 1";

        statements.push(
            {
                "statement": statement,
                "parameters": {p: v.id},
                "resultDataContents": ["row"]
            }
        )
    });

    logger.info("addRelatedValues ==>");
    runner.run(
        {
            "statements": statements
        })
        .then(function (results) {
            logger.info("<== addRelatedValues");

            var parsedData = runner.toObject(results);
            var count = 0;
            parsedData.forEach(function (data) {
                if (data.length > 0) {
                    var dataLabel = data[0].label;
                    var dataValue = data[0].value;
                    var dataRel = data[0].rel;

                    var value = {
                        "id": dataModel.generateId(),
                        "parent": n,
                        "attributes": dataValue,
                        "type": node.NodeTypes.VALUE,
                        "label": dataLabel
                    };
                    graph.ignoreCount = true;

                    var nodeRelationships = n.relationships;
                    var nodeRels = nodeRelationships.filter(function (r) {
                        return r.label === dataRel && r.target === dataLabel
                    });

                    var nodeRel = {label: dataRel, target: dataLabel};
                    if (nodeRels.length > 0) {
                        nodeRel = nodeRels[0];
                    }

                    graph.addRelationshipData(n, nodeRel, function () {
                        count++;

                        if (count === parsedData.length) {
                            graph.ignoreCount = false;
                            graph.hasGraphChanged = true;
                            result.hasChanged = true;
                            update();
                        }
                    }, [value], isNegative);
                }
            });
        })
        .catch(function (error) {
            logger.error(error);
        });
};

/**
 * Add a list of related value prefixed by a path of nodes.
 * A value is defined with the following structure
 * {
 *   id,
 *   rel,
 *   label
 * }
 *
 * @param n
 * @param relPath
 * @param values
 * @param isNegative
 */
node.addRelatedBranch = function (n, relPath, values, isNegative) {
    if (relPath.length > 0) {
        var rel = relPath[0];
        relPath = relPath.slice(1);

        var relationships = n.relationships.filter(function (r) {
            return r.label === rel.type && r.target === rel.target;
        });

        if (relationships.length > 0) {
            graph.addRelationshipData(n, relationships[0], function (createdNode) {
                node.addRelatedBranch(createdNode, relPath, values, isNegative);
            });
        }
    } else {
        node.addRelatedValues(n, values, isNegative)
    }
};

/**
 * A value is defined with the following structure
 * {
 *   id,
 *   rel,
 *   label
 * }
 *
 * @param n
 * @param values
 */
node.filterExistingValues = function (n, values) {
    var notFoundValues = [];
    var possibleValueNodes = dataModel.nodes.filter(function (n) {
        return n.parent === n && n.hasOwnProperty("value") && n.value.length > 0;
    });

    values.forEach(function (v) {
        var found = false;
        var constraintAttr = provider.node.getConstraintAttribute(v.label);

        possibleValueNodes.forEach(function (n) {
            if (n.label === v.label) {
                n.value.forEach(function (nv) {
                    if (nv.attributes[constraintAttr] === v.id) {
                        found = true;
                    }
                });
            }
        });

        if (!found) {
            notFoundValues.push(v)
        }
    });

    return notFoundValues;
};

/**
 * Function called to expand a node containing values.
 * This function will create the value nodes with the clicked node internal data.
 * Only nodes corresponding to the current page index will be generated.
 *
 * @param clickedNode
 */
node.expandNode = function (clickedNode) {

    graph.notifyListeners(graph.Events.GRAPH_NODE_VALUE_EXPAND, [clickedNode]);

    // Get subset of node corresponding to the current node page and page size
    var lIndex = clickedNode.page * node.PAGE_SIZE;
    var sIndex = lIndex - node.PAGE_SIZE;

    var dataToAdd = clickedNode.data.slice(sIndex, lIndex);
    var parentAngle = graph.computeParentAngle(clickedNode);

    // Then each node are created and dispatched around the clicked node using computed coordinates.
    var i = 1;
    dataToAdd.forEach(function (d) {
        var angleDeg;
        if (clickedNode.parent) {
            angleDeg = (((360 / (dataToAdd.length + 1)) * i));
        } else {
            angleDeg = (((360 / (dataToAdd.length)) * i));
        }

        var nx = clickedNode.x + (100 * Math.cos((angleDeg * (Math.PI / 180)) - parentAngle)),
            ny = clickedNode.y + (100 * Math.sin((angleDeg * (Math.PI / 180)) - parentAngle));

        var n = {
            "id": dataModel.generateId(),
            "parent": clickedNode,
            "attributes": d,
            "type": node.NodeTypes.VALUE,
            "label": clickedNode.label,
            "count": d.count,
            "x": nx,
            "y": ny,
            "internalID": d[query.NEO4J_INTERNAL_ID.queryInternalName]
        };

        dataModel.nodes.push(n);
        dataModel.links.push(
            {
                id: "l" + dataModel.generateId(),
                source: clickedNode,
                target: n,
                type: graph.link.LinkTypes.VALUE
            }
        );

        i++;
    });

    // Pin clicked node and its parent to avoid the graph to move for selection, only new value nodes will blossom around the clicked node.
    clickedNode.fixed = true;
    clickedNode.fx = clickedNode.x;
    clickedNode.fy = clickedNode.y;
    if (clickedNode.parent && clickedNode.parent.type !== node.NodeTypes.ROOT) {
        clickedNode.parent.fixed = true;
        clickedNode.parent.fx = clickedNode.parent.x;
        clickedNode.parent.fy = clickedNode.parent.y;
    }
    // Change node state
    clickedNode.valueExpanded = true;
    update();
};

/**
 * Fetches the list of relationships of a node and store them in the relationships property.
 *
 * @param n the node to fetch the relationships.
 * @param callback
 * @param directionAngle
 */
node.loadRelationshipData = function (n, callback, directionAngle) {
    var schema = provider.node.getSchema(n.label);

    if (schema !== undefined) {
        if (schema.hasOwnProperty("rel") && schema.rel.length > 0) {
            callback(node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(schema.rel).map(function (d) {
                var data = {
                    id: d.data.label + d.data.target.label,
                    label: d.data.label,
                    target: d.data.target.label,
                    count: 0,
                    startAngle: d.startAngle,
                    endAngle: d.endAngle,
                    directionAngle: (d.startAngle + d.endAngle) / 2
                };

                if (d.data.isReverse === true) {
                    data.isReverse = true;
                }

                return data;
            }));
        } else {
            callback([]);
        }
    } else {
        var nodeRelationQuery = query.generateNodeRelationQuery(n);

        logger.info("Relations (" + n.label + ") ==>");
        runner.run(
            {
                "statements": [
                    {
                        "statement": nodeRelationQuery.statement,
                        "parameters": nodeRelationQuery.parameters
                    }]
            })
            .then(function (results) {
                logger.info("<== Relations (" + n.label + ")");
                var parsedData = runner.toObject(results);

                // Filter data to eventually remove relations if a filter has been defined in config.
                var filteredData = parsedData[0].filter(function (d) {
                    return query.filterRelation(d);
                });

                filteredData = node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(filteredData).map(function (d) {
                    return {
                        id: d.data.label + d.data.target,
                        label: d.data.label,
                        target: d.data.target,
                        count: d.data.count.toString(),
                        startAngle: d.startAngle,
                        endAngle: d.endAngle,
                        directionAngle: (d.startAngle + d.endAngle) / 2
                    }
                });

                callback(filteredData);
            })
            .catch(function (error) {
                logger.error(error);
                callback([]);
            });
    }
};

/**
 * Expands all the relationships available in node.
 *
 * @param n
 * @param callback
 */
node.expandRelationships = function (n, callback) {
    var callbackCount = 0;

    if (n.hasOwnProperty("relationships") && n.relationships.length > 0) {

        for (var i = 0; i < n.relationships.length; i++) {
            graph.addRelationshipData(n, n.relationships[i], function () {
                callbackCount++;

                if (callbackCount === n.relationships.length) {
                    callback();
                }
            })
        }
    } else {
        callback();
    }
};

/**
 * Remove a node and its relationships (recursively) from the graph.
 *
 * @param n the node to remove.
 */
node.removeNode = function (n) {
    var willChangeResults = n.hasOwnProperty("value") && n.value.length > 0;

    var linksToRemove = dataModel.links.filter(function (l) {
        return l.source === n;
    });

    // Remove children nodes from model
    linksToRemove.forEach(function (l) {
        var rc = node.removeNode(l.target);
        willChangeResults = willChangeResults || rc;
    });

    // Remove links to nodes from model
    for (var i = dataModel.links.length - 1; i >= 0; i--) {
        if (dataModel.links[i].target === n) {
            dataModel.links.splice(i, 1);
        }
    }

    dataModel.nodes.splice(dataModel.nodes.indexOf(n), 1);

    return willChangeResults;
};

/**
 * Remove empty branches containing a node.
 *
 * @param n the node to remove.
 * @return true if node have been removed
 */
node.removeEmptyBranches = function (n) {
    var hasValues = n.hasOwnProperty("value") && n.value.length > 0;

    var childrenLinks = dataModel.links.filter(function (l) {
        return l.source === n;
    });

    childrenLinks.forEach(function (l) {
        var hasRemainingNodes = !node.removeEmptyBranches(l.target);
        hasValues = hasValues || hasRemainingNodes;
    });

    if (!hasValues) {
        // Remove links to node from model
        for (var i = dataModel.links.length - 1; i >= 0; i--) {
            if (dataModel.links[i].target === n) {
                dataModel.links.splice(i, 1);
            }
        }

        dataModel.nodes.splice(dataModel.nodes.indexOf(n), 1);
    }

    return !hasValues;
};

/**
 * Get in the parent nodes the closest one to the root.
 *
 * @param n the node to start from.
 * @return {*} the trunk node or the node in parameters if not found.
 */
node.getTrunkNode = function (n) {

    for (var i = 0; i < dataModel.links.length; i++) {
        var l = dataModel.links[i];
        if (l.target === n) {
            if (l.source !== graph.getRootNode()) {
                return node.getTrunkNode(l.source);
            }
        }
    }

    return n;
};

/**
 * Function to add on node event to clear the selection.
 * Call to this function on a node will remove the selected value and trigger a graph update.
 */
node.clearSelection = function (event) {
    // Prevent default event like right click  opening menu.
    event.preventDefault();

    // Get clicked node.
    var clickedNode = d3.select(this).data()[0];

    // Collapse all expanded choose nodes first
    node.collapseAllNode();

    if (clickedNode.value !== undefined && clickedNode.value.length > 0 && !clickedNode.immutable) {
        // Remove last value of chosen node
        clickedNode.value.pop();

        if (clickedNode.isNegative === true) {
            if (clickedNode.value.length === 0) {
                // Remove all related nodes
                for (var i = dataModel.links.length - 1; i >= 0; i--) {
                    if (dataModel.links[i].source === clickedNode) {
                        node.removeNode(dataModel.links[i].target);
                    }
                }

                clickedNode.count = 0;
            }
        }

        result.hasChanged = true;
        graph.hasGraphChanged = true;
        update();
    }
};

export default node;