import * as d3 from "d3";
import dataModel from "../datamodel/dataModel";
import logger from "../logger/logger";
import provider from "../provider/provider";
import result from "../result/result";
import toolBar from "../toolbar/toolbar";
import {update, updateGraph} from "../popoto";
import link from "./link/link";
import node from "./node/node";

var graph = {};

graph.link = link;
graph.node = node;

graph.DISABLE_RELATION = false;
graph.DISABLE_COUNT = false;

/**
 * ID of the HTML component where the graph query builder elements will be generated in.
 * @type {string}
 */
graph.containerId = "popoto-graph";
graph.hasGraphChanged = true;
// Defines the min and max level of zoom available in graph query builder.
graph.zoom = d3.zoom().scaleExtent([0.1, 10]);
graph.WHEEL_ZOOM_ENABLED = true;
graph.USE_DONUT_FORCE = false;
graph.USE_VORONOI_LAYOUT = false;
graph.USE_FIT_TEXT = false;

/**
 * Define the list of listenable events on graph.
 */
graph.Events = Object.freeze({
    NODE_ROOT_ADD: "root.node.add",
    NODE_EXPAND_RELATIONSHIP: "node.expandRelationship",
    GRAPH_SAVE: "graph.save",
    GRAPH_RESET: "graph.reset",
    GRAPH_NODE_RELATION_ADD: "graph.node.relation_add",
    GRAPH_NODE_VALUE_EXPAND: "graph.node.value_expand",
    GRAPH_NODE_VALUE_COLLAPSE: "graph.node.value_collapse",
    GRAPH_NODE_ADD_VALUE: "graph.node.add_value",
    GRAPH_NODE_DATA_LOADED: "graph.node.data_loaded"
});

graph.listeners = {};

/**
 * Add a listener to the specified event.
 *
 * @param event name of the event to add the listener.
 * @param listener the listener to add.
 */
graph.on = function (event, listener) {
    if (!graph.listeners.hasOwnProperty(event)) {
        graph.listeners[event] = [];
    }

    graph.listeners[event].push(listener);
};

/**
 * Notify the listeners.
 *
 * @param event
 * @param parametersArray
 */
graph.notifyListeners = function (event, parametersArray) {
    if (graph.listeners.hasOwnProperty(event)) {
        graph.listeners[event].forEach(function (listener) {
            listener.apply(event, parametersArray);
        });
    }
};

/**
 * Add a listener on graph save event.
 * @param listener
 */
graph.onSave = function (listener) {
    graph.on(graph.Events.GRAPH_SAVE, listener);
};

/**
 * Add a listener on graph reset event.
 * @param listener
 */
graph.onReset = function (listener) {
    graph.on(graph.Events.GRAPH_RESET, listener);
};

/**
 * Set default graph to a predefined value.
 * @param graph
 */
graph.setDefaultGraph = function (graph) {
    graph.mainLabel = graph;
};

/**
 * Generates all the HTML and SVG element needed to display the graph query builder.
 * Everything will be generated in the container with id defined by graph.containerId.
 */
graph.createGraphArea = function () {

    var htmlContainer = d3.select("#" + graph.containerId);

    toolBar.render(htmlContainer);

    graph.svgTag = htmlContainer.append("svg")
        .attr("class", "ppt-svg-graph")
        // .attr("viewBox", "0 0 800 600") TODO to avoid need of windows resize event
        .call(graph.zoom.on("zoom", graph.rescale));

    graph.svgTag.on("dblclick.zoom", null);

    if (!graph.WHEEL_ZOOM_ENABLED) {
        // Disable mouse wheel events.
        graph.svgTag.on("wheel.zoom", null)
            .on("mousewheel.zoom", null);
    }

    // Objects created inside a <defs> element are not rendered immediately; instead, think of them as templates or macros created for future use.
    graph.svgdefs = graph.svgTag.append("defs");

    // Cross marker for path with id #cross -X-
    graph.svgdefs.append("marker")
        .attr("id", "cross")
        .attr("refX", 10)
        .attr("refY", 10)
        .attr("markerWidth", 20)
        .attr("markerHeight", 20)
        .attr("markerUnits", "strokeWidth")
        .attr("orient", "auto")
        .append("path")
        .attr("class", "ppt-marker-cross")
        .attr("d", "M5,5 L15,15 M15,5 L5,15");

    // Triangle marker for paths with id #arrow --|>
    graph.svgdefs.append("marker")
        .attr("id", "arrow")
        .attr("refX", 9)
        .attr("refY", 3)
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("markerUnits", "strokeWidth")
        .attr("orient", "auto")
        .append("path")
        .attr("class", "ppt-marker-arrow")
        .attr("d", "M0,0 L0,6 L9,3 z");

    // Reversed triangle marker for paths with id #reverse-arrow <|--
    graph.svgdefs.append("marker")
        .attr("id", "reverse-arrow")
        .attr("refX", 0)
        .attr("refY", 3)
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("markerUnits", "strokeWidth")
        .attr("orient", "auto")
        .append("path")
        .attr("class", "ppt-marker-reverse-arrow")
        .attr("d", "M0,3 L9,6 L9,0 z");

    // Gray scale filter for images.
    var grayscaleFilter = graph.svgdefs.append("filter")
        .attr("id", "grayscale");

    grayscaleFilter.append("feColorMatrix")
        .attr("type", "saturate")
        .attr("values", "0");

    // to change brightness
    // var feCT = grayscaleFilter
    //     .append("feComponentTransfer");
    //
    // feCT.append("feFuncR")
    //     .attr("type", "linear")
    //     .attr("slope", "0.2");
    //
    // feCT.append("feFuncG")
    //     .attr("type", "linear")
    //     .attr("slope", "0.2");
    //
    // feCT.append("feFuncB")
    //     .attr("type", "linear")
    //     .attr("slope", "0.2");

    // gooey
    var filter = graph.svgdefs.append("filter").attr("id", "gooey");
    filter.append("feGaussianBlur")
        .attr("in", "SourceGraphic")
        .attr("stdDeviation", "10")
        //to fix safari: http://stackoverflow.com/questions/24295043/svg-gaussian-blur-in-safari-unexpectedly-lightens-image
        .attr("color-interpolation-filters", "sRGB")
        .attr("result", "blur");
    filter.append("feColorMatrix")
        .attr("class", "blurValues")
        .attr("in", "blur")
        .attr("mode", "matrix")
        .attr("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -6")
        .attr("result", "gooey");
    filter.append("feBlend")
        .attr("in", "SourceGraphic")
        .attr("in2", "gooey")
        .attr("operator", "atop");


    graph.svgdefs.append("g")
        .attr("id", "voronoi-clip-path");

    graph.svg = graph.svgTag.append("svg:g");

    // Create two separated area for links and nodes
    // Links and nodes are separated in a dedicated "g" element
    // and nodes are generated after links to ensure that nodes are always on foreground.
    graph.svg.append("g").attr("id", graph.link.gID);
    graph.svg.append("g").attr("id", graph.node.gID);

    // This listener is used to center the root node in graph during a window resize.
    // TODO can the listener be limited on the parent container only?
    window.addEventListener('resize', graph.centerRootNode);
};

graph.getRootNode = function () {
    return dataModel.getRootNode();
};

graph.centerRootNode = function () {
    dataModel.getRootNode().fx = graph.getSVGWidth() / 2;
    dataModel.getRootNode().fy = graph.getSVGHeight() / 2;
    update();
};

/**
 * Get the actual width of the SVG element containing the graph query builder.
 * @returns {number}
 */
graph.getSVGWidth = function () {
    if (typeof graph.svg == 'undefined' || graph.svg.empty()) {
        logger.debug("graph.svg is undefined or empty.");
        return 0;
    } else {
        return document.getElementById(graph.containerId).clientWidth;
    }
};

/**
 * Get the actual height of the SVG element containing the graph query builder.
 * @returns {number}
 */
graph.getSVGHeight = function () {
    if (typeof graph.svg == 'undefined' || graph.svg.empty()) {
        logger.debug("graph.svg is undefined or empty.");
        return 0;
    } else {
        return document.getElementById(graph.containerId).clientHeight;
    }
};

/**
 * Function to call on SVG zoom event to update the svg transform attribute.
 */
graph.rescale = function (event) {
    var transform = event.transform;
    if (isNaN(transform.x) || isNaN(transform.y) || isNaN(transform.k)) {
        graph.svg.attr("transform", d3.zoomIdentity);
    } else {
        graph.svg.attr("transform", transform);
    }
};

graph.CHARGE = -500;

/**
 *  Create the D3.js force simultation for the graph query builder.
 */
// TODO ZZZ rename to create createForceSimulation
graph.createForceLayout = function () {

    graph.force = d3.forceSimulation()
        .force("charge", d3.forceManyBody()
            .strength(function (d) {
                    if (d.charge) {
                        return d.charge;
                    } else {
                        return graph.CHARGE;
                    }
                }
            )
        )
        .force(
            "link",
            d3.forceLink().id(
                function (d) {
                    return d.id;
                }
            ).distance(provider.link.getDistance)
        );


    graph.force.nodes(dataModel.nodes);
    graph.force.force("link").links(dataModel.links);

    graph.force.on("tick", graph.tick);
};

/**
 * Adds graph root nodes using the label set as parameter.
 * All the other nodes should have been removed first to avoid inconsistent data.
 *
 * @param label label of the node to add as root.
 */
graph.addRootNode = function (label) {
    if (dataModel.nodes.length > 0) {
        logger.warn("graph.addRootNode is called but the graph is not empty.");
    }
    if (provider.node.getSchema(label) !== undefined) {
        graph.addSchema(provider.node.getSchema(label));
    } else {

        var n = {
            "id": dataModel.generateId(),
            "type": graph.node.NodeTypes.ROOT,
            // x and y coordinates are set to the center of the SVG area.
            // These coordinate will never change at runtime except if the window is resized.
            "x": graph.getSVGWidth() / 2,
            "y": graph.getSVGHeight() / 2,
            "fx": graph.getSVGWidth() / 2,
            "fy": graph.getSVGHeight() / 2,
            "tx": graph.getSVGWidth() / 2,
            "ty": graph.getSVGHeight() / 2,
            "label": label,
            // The node is fixed to always remain in the center of the svg area.
            // This property should not be changed at runtime to avoid issues with the zoom and pan.
            "fixed": true,
            // Label used internally to identify the node.
            // This label is used for example as cypher query identifier.
            "internalLabel": graph.node.generateInternalLabel(label),
            // List of relationships
            "relationships": [],
            "isAutoLoadValue": provider.node.getIsAutoLoadValue(label) === true
        };

        dataModel.nodes.push(n);
        graph.notifyListeners(graph.Events.NODE_ROOT_ADD, [n]);

        graph.node.loadRelationshipData(n, function (relationships) {
            n.relationships = relationships;

            if (provider.node.getIsAutoExpandRelations(label)) {

                graph.ignoreCount = true;
                graph.node.expandRelationships(n, function () {

                    graph.ignoreCount = false;
                    graph.hasGraphChanged = true;
                    updateGraph();
                })
            } else {
                graph.hasGraphChanged = true;
                updateGraph();
            }
        }, Math.PI / 2)
    }
};

graph.loadSchema = function (graphToLoad) {
    if (dataModel.nodes.length > 0) {
        logger.warn("graph.loadSchema is called but the graph is not empty.");
    }

    var rootNodeSchema = graphToLoad;
    var rootNode = {
        "id": dataModel.generateId(),
        "type": graph.node.NodeTypes.ROOT,
        // x and y coordinates are set to the center of the SVG area.
        // These coordinate will never change at runtime except if the window is resized.
        "x": graph.getSVGWidth() / 2,
        "y": graph.getSVGHeight() / 2,
        "fx": graph.getSVGWidth() / 2,
        "fy": graph.getSVGHeight() / 2,
        "tx": graph.getSVGWidth() / 2,
        "ty": graph.getSVGHeight() / 2,
        "label": rootNodeSchema.label,
        // The node is fixed to always remain in the center of the svg area.
        // This property should not be changed at runtime to avoid issues with the zoom and pan.
        "fixed": true,
        // Label used internally to identify the node.
        // This label is used for example as cypher query identifier.
        "internalLabel": graph.node.generateInternalLabel(rootNodeSchema.label),
        // List of relationships
        "relationships": [],
        "isAutoLoadValue": provider.node.getIsAutoLoadValue(rootNodeSchema.label) === true
    };
    dataModel.nodes.push(rootNode);
    graph.notifyListeners(graph.Events.NODE_ROOT_ADD, [rootNode]);

    var labelSchema = provider.node.getSchema(graphToLoad.label);

    // Add relationship from schema if defined
    if (labelSchema !== undefined && labelSchema.hasOwnProperty("rel") && labelSchema.rel.length > 0) {
        var directionAngle = (Math.PI / 2);

        rootNode.relationships = graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(labelSchema.rel).map(function (d) {

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
        });
    } else {
        graph.node.loadRelationshipData(rootNode, function (relationships) {
            rootNode.relationships = relationships;
            graph.hasGraphChanged = true;
            updateGraph();
        }, Math.PI / 2);
    }

    if (rootNodeSchema.hasOwnProperty("value")) {
        var nodeSchemaValue = [].concat(rootNodeSchema.value);
        rootNode.value = [];
        nodeSchemaValue.forEach(function (value) {
            rootNode.value.push(
                {
                    "id": dataModel.generateId(),
                    "parent": rootNode,
                    "attributes": value,
                    "type": graph.node.NodeTypes.VALUE,
                    "label": rootNode.label
                }
            );
        });
    }

    if (rootNodeSchema.hasOwnProperty("rel")) {
        for (var linkIndex = 0; linkIndex < rootNodeSchema.rel.length; linkIndex++) {
            graph.loadSchemaRelation(rootNodeSchema.rel[linkIndex], rootNode, linkIndex + 1, rootNodeSchema.rel.length);
        }
    }
};

graph.loadSchemaRelation = function (relationSchema, parentNode, linkIndex, parentLinkTotalCount) {
    var targetNodeSchema = relationSchema.target;
    var target = graph.loadSchemaNode(targetNodeSchema, parentNode, linkIndex, parentLinkTotalCount, relationSchema.label, (relationSchema.hasOwnProperty("isReverse") && relationSchema.isReverse === true));

    var newLink = {
        id: "l" + dataModel.generateId(),
        source: parentNode,
        target: target,
        type: graph.link.LinkTypes.RELATION,
        label: relationSchema.label,
        schema: relationSchema
    };

    dataModel.links.push(newLink);

    var labelSchema = provider.node.getSchema(targetNodeSchema.label);

    // Add relationship from schema if defined
    if (labelSchema !== undefined && labelSchema.hasOwnProperty("rel") && labelSchema.rel.length > 0) {
        var directionAngle = (Math.PI / 2);

        target.relationships = graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(labelSchema.rel).map(function (d) {
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
        });
    } else {
        graph.node.loadRelationshipData(target, function (relationships) {
            target.relationships = relationships;
            graph.hasGraphChanged = true;
            updateGraph();
        }, Math.PI / 2);
    }

    if (targetNodeSchema.hasOwnProperty("rel")) {
        for (var linkIndex2 = 0; linkIndex2 < targetNodeSchema.rel.length; linkIndex2++) {
            graph.loadSchemaRelation(targetNodeSchema.rel[linkIndex2], target, linkIndex2 + 1, targetNodeSchema.rel.length);
        }
    }
};

graph.loadSchemaNode = function (nodeSchema, parentNode, index, parentLinkTotalCount, parentRel, isReverse) {
    var isGroupNode = provider.node.getIsGroup(nodeSchema);
    var parentAngle = graph.computeParentAngle(parentNode);

    var angleDeg;
    if (parentAngle) {
        angleDeg = (((360 / (parentLinkTotalCount + 1)) * index));
    } else {
        angleDeg = (((360 / (parentLinkTotalCount)) * index));
    }

    var nx = parentNode.x + (200 * Math.cos((angleDeg * (Math.PI / 180)) - parentAngle)),
        ny = parentNode.y + (200 * Math.sin((angleDeg * (Math.PI / 180)) - parentAngle));

    // TODO add force coordinate X X X
    // var tx = nx + ((provider.link.getDistance(newLink)) * Math.cos(link.directionAngle - Math.PI / 2));
    // var ty = ny + ((provider.link.getDistance(newLink)) * Math.sin(link.directionAngle - Math.PI / 2));

    var n = {
        "id": dataModel.generateId(),
        "parent": parentNode,
        "parentRel": parentRel,
        "type": (isGroupNode) ? graph.node.NodeTypes.GROUP : graph.node.NodeTypes.CHOOSE,
        "label": nodeSchema.label,
        "fixed": false,
        "internalLabel": graph.node.generateInternalLabel(nodeSchema.label),
        "x": nx,
        "y": ny,
        "schema": nodeSchema,
        "isAutoLoadValue": provider.node.getIsAutoLoadValue(nodeSchema.label) === true,
        "relationships": []
    };

    if (isReverse === true) {
        n.isParentRelReverse = true;
    }

    if (nodeSchema.hasOwnProperty("isNegative") && nodeSchema.isNegative === true) {
        n.isNegative = true;
        n.count = 0;
    }

    dataModel.nodes.push(n);

    if (nodeSchema.hasOwnProperty("value")) {
        var nodeSchemaValue = [].concat(nodeSchema.value);
        n.value = [];
        nodeSchemaValue.forEach(function (value) {
            n.value.push(
                {
                    "id": dataModel.generateId(),
                    "parent": n,
                    "attributes": value,
                    "type": graph.node.NodeTypes.VALUE,
                    "label": n.label
                }
            );
        });
    }

    return n;
};

/**
 * Adds a complete graph from schema.
 * All the other nodes should have been removed first to avoid inconsistent data.
 *
 * @param graphSchema schema of the graph to add.
 */
graph.addSchema = function (graphSchema) {
    if (dataModel.nodes.length > 0) {
        logger.warn("graph.addSchema is called but the graph is not empty.");
    }

    var rootNodeSchema = graphSchema;

    var rootNode = {
        "id": dataModel.generateId(),
        "type": graph.node.NodeTypes.ROOT,
        // x and y coordinates are set to the center of the SVG area.
        // These coordinate will never change at runtime except if the window is resized.
        "x": graph.getSVGWidth() / 2,
        "y": graph.getSVGHeight() / 2,
        "fx": graph.getSVGWidth() / 2,
        "fy": graph.getSVGHeight() / 2,
        "tx": graph.getSVGWidth() / 2,
        "ty": graph.getSVGHeight() / 2,
        "label": rootNodeSchema.label,
        // The node is fixed to always remain in the center of the svg area.
        // This property should not be changed at runtime to avoid issues with the zoom and pan.
        "fixed": true,
        // Label used internally to identify the node.
        // This label is used for example as cypher query identifier.
        "internalLabel": graph.node.generateInternalLabel(rootNodeSchema.label),
        // List of relationships
        "relationships": [],
        "isAutoLoadValue": provider.node.getIsAutoLoadValue(rootNodeSchema.label) === true
    };
    dataModel.nodes.push(rootNode);
    graph.notifyListeners(graph.Events.NODE_ROOT_ADD, [rootNode]);

    if (rootNodeSchema.hasOwnProperty("rel") && rootNodeSchema.rel.length > 0) {
        var directionAngle = (Math.PI / 2);

        rootNode.relationships = graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(rootNodeSchema.rel).map(function (d) {
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
        });
    }

    // if (!isCollapsed && rootNodeSchema.hasOwnProperty("rel")) {
    //     for (var linkIndex = 0; linkIndex < rootNodeSchema.rel.length; linkIndex++) {
    //         graph.addSchemaRelation(rootNodeSchema.rel[linkIndex], rootNode, linkIndex + 1, rootNodeSchema.rel.length);
    //     }
    // }
};

graph.addSchemaRelation = function (relationSchema, parentNode, linkIndex, parentLinkTotalCount) {
    var targetNodeSchema = relationSchema.target;
    var target = graph.addSchemaNode(targetNodeSchema, parentNode, linkIndex, parentLinkTotalCount, relationSchema.label);

    var newLink = {
        id: "l" + dataModel.generateId(),
        source: parentNode,
        target: target,
        type: graph.link.LinkTypes.RELATION,
        label: relationSchema.label,
        schema: relationSchema
    };

    dataModel.links.push(newLink);
};

graph.addSchemaNode = function (nodeSchema, parentNode, index, parentLinkTotalCount, parentRel) {
    var isGroupNode = provider.node.getIsGroup(nodeSchema);
    var isCollapsed = nodeSchema.hasOwnProperty("collapsed") && nodeSchema.collapsed === true;

    var parentAngle = graph.computeParentAngle(parentNode);

    var angleDeg;
    if (parentAngle) {
        angleDeg = (((360 / (parentLinkTotalCount + 1)) * index));
    } else {
        angleDeg = (((360 / (parentLinkTotalCount)) * index));
    }

    var nx = parentNode.x + (200 * Math.cos((angleDeg * (Math.PI / 180)) - parentAngle)),
        ny = parentNode.y + (200 * Math.sin((angleDeg * (Math.PI / 180)) - parentAngle));

    // TODO add force coordinate X X X
    // var tx = nx + ((provider.link.getDistance(newLink)) * Math.cos(link.directionAngle - Math.PI / 2));
    // var ty = ny + ((provider.link.getDistance(newLink)) * Math.sin(link.directionAngle - Math.PI / 2));

    var n = {
        "id": dataModel.generateId(),
        "parent": parentNode,
        "parentRel": parentRel,
        "type": (isGroupNode) ? graph.node.NodeTypes.GROUP : graph.node.NodeTypes.CHOOSE,
        "label": nodeSchema.label,
        "fixed": false,
        "internalLabel": graph.node.generateInternalLabel(nodeSchema.label),
        "x": nx,
        "y": ny,
        "schema": nodeSchema,
        "isAutoLoadValue": provider.node.getIsAutoLoadValue(nodeSchema.label) === true,
        "relationships": []
    };

    if (nodeSchema.hasOwnProperty("rel") && nodeSchema.rel.length > 0) {
        var relMap = {};
        var relSegments = [];

        for (var i = 0; i < nodeSchema.rel.length; i++) {
            var rel = nodeSchema.rel[i];
            var id = rel.label + rel.target.label;

            if (!relMap.hasOwnProperty(id)) {
                relMap[id] = rel;
                relSegments.push(rel);
            }

        }

        n.relationships = graph.node.pie(relSegments).map(function (d) {
            return {
                id: d.data.label + d.data.target.label,
                count: d.data.count || 0,
                label: d.data.label,
                target: d.data.target.label,
                startAngle: d.startAngle,
                endAngle: d.endAngle,
                directionAngle: (d.startAngle + d.endAngle) / 2
            }
        });

    }

    if (nodeSchema.hasOwnProperty("value")) {
        var nodeSchemaValue = [].concat(nodeSchema.value);
        n.value = [];
        nodeSchemaValue.forEach(function (value) {
            n.value.push(
                {
                    "id": dataModel.generateId(),
                    "parent": n,
                    "attributes": value,
                    "type": graph.node.NodeTypes.VALUE,
                    "label": n.label
                }
            );
        });
    }

    dataModel.nodes.push(n);

    if (!isCollapsed && nodeSchema.hasOwnProperty("rel")) {
        for (var linkIndex = 0; linkIndex < nodeSchema.rel.length; linkIndex++) {
            graph.addSchemaRelation(nodeSchema.rel[linkIndex], n, linkIndex + 1, nodeSchema.rel.length);
        }
    }

    return n;
};

/**
 * Get the current schema of the graph.
 * @returns {{}}
 */
graph.getSchema = function () {
    var nodesMap = {};

    var rootNode = dataModel.getRootNode();

    nodesMap[rootNode.id] = {
        label: rootNode.label
    };

    if (rootNode.hasOwnProperty("value")) {
        nodesMap[rootNode.id].value = [];
        rootNode.value.forEach(function (value) {
            nodesMap[rootNode.id].value.push(value.attributes)
        });
    }

    var links = dataModel.links;
    if (links.length > 0) {
        links.forEach(function (l) {
            if (l.type === graph.link.LinkTypes.RELATION) {
                var sourceNode = l.source;
                var targetNode = l.target;

                if (!nodesMap.hasOwnProperty(sourceNode.id)) {
                    nodesMap[sourceNode.id] = {
                        label: sourceNode.label
                    };
                    if (sourceNode.hasOwnProperty("isNegative") && sourceNode.isNegative === true) {
                        nodesMap[sourceNode.id].isNegative = true;
                    }
                    if (sourceNode.hasOwnProperty("value")) {
                        nodesMap[sourceNode.id].value = [];
                        sourceNode.value.forEach(function (value) {
                            nodesMap[sourceNode.id].value.push(value.attributes);
                        });
                    }
                }

                if (!nodesMap.hasOwnProperty(targetNode.id)) {
                    nodesMap[targetNode.id] = {
                        label: targetNode.label
                    };
                    if (targetNode.hasOwnProperty("isNegative") && targetNode.isNegative === true) {
                        nodesMap[targetNode.id].isNegative = true;
                    }
                    if (targetNode.hasOwnProperty("value")) {
                        nodesMap[targetNode.id].value = [];
                        targetNode.value.forEach(function (value) {
                            nodesMap[targetNode.id].value.push(value.attributes);
                        });
                    }
                }

                if (!nodesMap[sourceNode.id].hasOwnProperty("rel")) {
                    nodesMap[sourceNode.id].rel = [];
                }

                var rel = {
                    label: l.label,
                    target: nodesMap[targetNode.id]
                };

                if (targetNode.hasOwnProperty("isParentRelReverse") && targetNode.isParentRelReverse === true) {
                    rel.isReverse = true;
                }

                nodesMap[sourceNode.id].rel.push(rel);
            }
        });

    }

    return nodesMap[rootNode.id];
};

/**
 * Function to call on D3.js force layout tick event.
 * This function will update the position of all links and nodes elements in the graph with the force layout computed coordinate.
 */
graph.tick = function () {
    var paths = graph.svg.selectAll("#" + graph.link.gID + " > g");

    // Update link paths
    paths.selectAll(".ppt-link")
        .attr("d", function (d) {
            var linkSource = d.source;
            var linkTarget = d.target;
            var parentAngle = graph.computeParentAngle(linkTarget);
            var sourceMargin = provider.node.getSize(linkSource);
            var targetMargin = provider.node.getSize(linkTarget);

            if (!graph.DISABLE_RELATION && linkSource.hasOwnProperty("relationships") && linkSource.relationships.length > 0) {
                sourceMargin = graph.node.getDonutOuterRadius(linkSource);
            }

            if (!graph.DISABLE_RELATION && linkTarget.hasOwnProperty("relationships") && linkTarget.relationships.length > 0) {
                targetMargin = graph.node.getDonutOuterRadius(linkTarget);
            }

            var targetX = linkTarget.x + ((targetMargin) * Math.cos(parentAngle)),
                targetY = linkTarget.y - ((targetMargin) * Math.sin(parentAngle));

            var sourceX = linkSource.x - ((sourceMargin) * Math.cos(parentAngle)),
                sourceY = linkSource.y + ((sourceMargin) * Math.sin(parentAngle));

            // Add an intermediate point in path center
            var middleX = (targetX + sourceX) / 2,
                middleY = (targetY + sourceY) / 2;

            if (linkSource.x <= linkTarget.x || graph.ignoreMirroLinkLabels === true) {
                return "M" + sourceX + " " + sourceY + "L" + middleX + " " + middleY + "L" + targetX + " " + targetY;
            } else {
                return "M" + targetX + " " + targetY + "L" + middleX + " " + middleY + "L" + sourceX + " " + sourceY;
            }
        })
        .attr("marker-end", function (d) {
            if (graph.link.SHOW_MARKER) {
                if (d.target.isParentRelReverse === true) {
                    if (d.source.x > d.target.x) {
                        return "url(#arrow)";
                    }
                } else {
                    if (d.source.x <= d.target.x) {
                        return "url(#arrow)";
                    }
                }
            }
            return null;
        })
        .attr("marker-start", function (d) {
            if (graph.link.SHOW_MARKER) {
                if (d.target.isParentRelReverse === true) {
                    if (d.source.x <= d.target.x) {
                        return "url(#reverse-arrow)";
                    }
                } else {
                    if (d.source.x > d.target.x) {
                        return "url(#reverse-arrow)";
                    }
                }
            }
            return null;
        });

    // Workaround to WebKit browsers:
    // Updating a path element by itself does not trigger redraw on dependent elements that reference this path.
    // So, even though we update the path, the referencing textPath element will not be redrawn.
    // To workaround this update bug, the xlink:href attribute to “#path” is updated.
    paths.selectAll(".ppt-textPath")
        .attr("xlink:href", function (d) {
            return "#ppt-path_" + d.id;
        });

    graph.svg.selectAll("#" + graph.node.gID + " > g")
        .attr("transform", function (d) {
            return "translate(" + (d.x) + "," + (d.y) + ")";
        });

    if (graph.USE_VORONOI_LAYOUT === true) {

        var clip = d3.select("#voronoi-clip-path").selectAll('.voroclip')
            .data(graph.recenterVoronoi(dataModel.nodes), function (d) {
                return d.point.id;
            });

        clip.enter().append('clipPath')
            .attr('id', function (d) {
                return 'voroclip-' + d.point.id;
            })
            .attr('class', 'voroclip');

        clip.exit().remove();

        clip.selectAll('path').remove();

        clip.append('path')
            .attr('id', function (d) {
                return 'pvoroclip-' + d.point.id;
            })
            .attr('d', function (d) {
                return 'M' + d.join(',') + 'Z';
            });
    }
};

/**
 * Compute the angle in radian between the node and its parent.
 * TODO: clean or add comments to explain the code...
 *
 * @param n node to compute angle.
 * @returns {number} angle in radian.
 */
graph.computeParentAngle = function (n) {
    var angleRadian = 0;
    var r = 100;
    if (n.parent) {
        var xp = n.parent.x;
        var yp = n.parent.y;
        var x0 = n.x;
        var y0 = n.y;
        var dist = Math.sqrt(Math.pow(xp - x0, 2) + Math.pow(yp - y0, 2));

        var k = r / (dist - r);
        var xc = (x0 + (k * xp)) / (1 + k);

        var val = (xc - x0) / r;
        if (val < -1) {
            val = -1;
        }
        if (val > 1) {
            val = 1;
        }

        angleRadian = Math.acos(val);

        if (yp > y0) {
            angleRadian = 2 * Math.PI - angleRadian;
        }
    }
    return angleRadian;
};

/**
 *
 * @param n
 * @param l
 * @param callback
 * @param values
 * @param isNegative
 */
graph.addRelationshipData = function (n, l, callback, values, isNegative) {
    var targetNode = {
        "id": "" + dataModel.generateId(),
        "parent": n,
        "parentRel": l.label,
        "type": graph.node.NodeTypes.CHOOSE,
        "label": l.target,
        "fixed": false,
        "internalLabel": graph.node.generateInternalLabel(l.target),
        "relationships": []
    };

    if (l.isReverse === true) {
        targetNode.isParentRelReverse = true;
    }

    if (values !== undefined && values.length > 0) {
        targetNode.value = values;
    }
    if (isNegative !== undefined && isNegative === true) {
        targetNode.isNegative = true;
    }

    var newLink = {
        id: "l" + dataModel.generateId(),
        source: n,
        target: targetNode,
        type: graph.link.LinkTypes.RELATION,
        label: l.label
    };

    targetNode.x = n.x + ((provider.link.getDistance(newLink) * 2 / 3) * Math.cos(l.directionAngle - Math.PI / 2)) + Math.random() * 10;
    targetNode.y = n.y + ((provider.link.getDistance(newLink) * 2 / 3) * Math.sin(l.directionAngle - Math.PI / 2)) + Math.random() * 10;

    targetNode.tx = n.tx + ((provider.link.getDistance(newLink)) * Math.cos(l.directionAngle - Math.PI / 2));
    targetNode.ty = n.ty + ((provider.link.getDistance(newLink)) * Math.sin(l.directionAngle - Math.PI / 2));

    dataModel.nodes.push(targetNode);
    dataModel.links.push(newLink);

    graph.hasGraphChanged = true;
    updateGraph();

    graph.node.loadRelationshipData(targetNode, function (relationships) {
            targetNode.relationships = relationships;

            graph.hasGraphChanged = true;
            updateGraph();

            if (provider.node.getIsAutoExpandRelations(targetNode.label)) {
                graph.node.expandRelationships(targetNode, function () {
                    callback(targetNode);
                })
            } else {
                callback(targetNode)
            }
        },
        l.directionAngle
    );


};

export default graph