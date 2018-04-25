import {default as d3} from "d3";
import cypherviewer from "../cypherviewer/cypherviewer";
import logger from "../logger/logger";
import provider from "../provider/provider";
import query from "../query/query";
import queryviewer from "../queryviewer/queryviewer";
import result from "../result/result";
import rest from "../rest/rest";
import taxonomy from "../taxonomy/taxonomy";
import tools from "../tools/tools";
import {update, updateGraph} from "../popoto";

var graph = {};

// Counter used internally to generate unique id in graph elements (like nodes and links)
graph.idGen = 0;

// TODO ZZZ extract in a datamodel module
graph.nodes = [];
graph.links = [];

/**
 * ID of the HTML component where the graph query builder elements will be generated in.
 * @type {string}
 */
graph.containerId = "popoto-graph";
graph.hasGraphChanged = true;
// Defines the min and max level of zoom available in graph query builder.
graph.zoom = d3.zoom().scaleExtent([0.1, 10]);
graph.WHEEL_ZOOM_ENABLED = true;
graph.TOOL_TAXONOMY = "Show/hide taxonomy panel";
graph.TOOL_RELATION = "Show/hide relation";
graph.TOOL_CENTER = "Center view";
graph.TOOL_FULL_SCREEN = "Full screen";
graph.TOOL_RESET = "Reset graph";
graph.TOOL_SAVE = "Save graph";
graph.USE_DONUT_FORCE = false;
graph.USE_VORONOI_LAYOUT = false;
graph.FIT_TEXT = false;

/**
 * Define the list of listenable events on graph.
 */
graph.Events = Object.freeze({
    NODE_ROOT_ADD: "root.node.add",
    NODE_EXPAND_RELATIONSHIP: "node.expandRelationship",
    GRAPH_SAVE: "graph.save",
    GRAPH_RESET: "graph.reset",
    GRAPH_NODE_VALUE_EXPAND: "graph.node.value_expand",
    GRAPH_NODE_VALUE_COLLAPSE: "graph.node.value_collapse",
    GRAPH_NODE_ADD_VALUE: "graph.node.add_value",
    GRAPH_NODE_DATA_LOADED: "graph.node.data_loaded"
});

graph.generateId = function () {
    return graph.idGen++;
};

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

    var toolbar = htmlContainer
        .append("div")
        .attr("class", "ppt-toolbar");

    if (tools.TOGGLE_VIEW_RELATION) {
        toolbar.append("span")
            .attr("id", "popoto-toggle-relation")
            .attr("class", "ppt-icon ppt-menu relation")
            .attr("title", graph.TOOL_RELATION)
            .on("click", function () {
                tools.toggleViewRelation();
            });
    }

    if (tools.RESET_GRAPH) {
        toolbar.append("span")
            .attr("id", "popoto-reset-menu")
            .attr("class", "ppt-icon ppt-menu reset")
            .attr("title", graph.TOOL_RESET)
            .on("click", function () {
                graph.notifyListeners(graph.Events.GRAPH_RESET, []);
                tools.reset();
            });
    }

    if (taxonomy.isActive && tools.TOGGLE_TAXONOMY) {
        toolbar.append("span")
            .attr("id", "popoto-taxonomy-menu")
            .attr("class", "ppt-icon ppt-menu taxonomy")
            .attr("title", graph.TOOL_TAXONOMY)
            .on("click", tools.toggleTaxonomy);
    }

    if (tools.CENTER_GRAPH) {
        toolbar.append("span")
            .attr("id", "popoto-center-menu")
            .attr("class", "ppt-icon ppt-menu center")
            .attr("title", graph.TOOL_CENTER)
            .on("click", tools.center);
    }

    if (tools.TOGGLE_FULL_SCREEN) {
        toolbar.append("span")
            .attr("id", "popoto-fullscreen-menu")
            .attr("class", "ppt-icon ppt-menu fullscreen")
            .attr("title", graph.TOOL_FULL_SCREEN)
            .on("click", tools.toggleFullScreen);
    }

    if (tools.SAVE_GRAPH) {
        toolbar.append("span")
            .attr("id", "popoto-save-menu")
            .attr("class", "ppt-icon ppt-menu save")
            .attr("title", graph.TOOL_SAVE)
            .on("click", function () {
                graph.notifyListeners(graph.Events.GRAPH_SAVE, [graph.getSchema()]);
            });
    }

    if (tools.TOGGLE_FIT_TEXT) {
        toolbar.append("span")
            .attr("id", "popoto-fit-text-menu")
            .attr("class", "ppt-icon ppt-menu reset")
            .on("click", tools.toggleFitText);
    }

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

graph.centerRootNode = function () {
    graph.getRootNode().fx = graph.getSVGWidth() / 2;
    graph.getRootNode().fy = graph.getSVGHeight() / 2;
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
graph.rescale = function () {
    graph.svg.attr("transform", d3.event.transform);
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


    graph.force.nodes(graph.nodes);
    graph.force.force("link").links(graph.links);

    graph.force.on("tick", graph.tick);
};

/**
 * Adds graph root nodes using the label set as parameter.
 * All the other nodes should have been removed first to avoid inconsistent data.
 *
 * @param label label of the node to add as root.
 */
graph.addRootNode = function (label) {
    if (graph.nodes.length > 0) {
        logger.warn("graph.addRootNode is called but the graph is not empty.");
    }
    if (provider.node.getSchema(label) !== undefined) {
        graph.addSchema(provider.node.getSchema(label));
    } else {

        var node = {
            "id": graph.generateId(),
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

        graph.nodes.push(node);
        graph.notifyListeners(graph.Events.NODE_ROOT_ADD, [node]);

        graph.node.loadRelationshipData(node, function (relationships) {
            node.relationships = relationships;

            if (provider.node.getIsAutoExpandRelations(label)) {

                graph.ignoreCount = true;
                graph.node.expandRelationships(node, function () {

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
    if (graph.nodes.length > 0) {
        logger.warn("graph.loadSchema is called but the graph is not empty.");
    }

    var rootNodeSchema = graphToLoad;
    var rootNode = {
        "id": graph.generateId(),
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
    graph.nodes.push(rootNode);
    graph.notifyListeners(graph.Events.NODE_ROOT_ADD, [rootNode]);

    var labelSchema = provider.node.getSchema(graphToLoad.label);

    // Add relationship from schema if defined
    if (labelSchema !== undefined && labelSchema.hasOwnProperty("rel") && labelSchema.rel.length > 0) {
        var directionAngle = (Math.PI / 2);

        rootNode.relationships = graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(labelSchema.rel).map(function (d) {
            return {
                id: d.data.label + d.data.target.label,
                label: d.data.label,
                target: d.data.target.label,
                count: 0,
                startAngle: d.startAngle,
                endAngle: d.endAngle,
                directionAngle: (d.startAngle + d.endAngle) / 2
            }
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
                    "id": graph.generateId(),
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
        id: "l" + graph.generateId(),
        source: parentNode,
        target: target,
        type: graph.link.LinkTypes.RELATION,
        label: relationSchema.label,
        schema: relationSchema
    };

    graph.links.push(newLink);

    var labelSchema = provider.node.getSchema(targetNodeSchema.label);

    // Add relationship from schema if defined
    if (labelSchema !== undefined && labelSchema.hasOwnProperty("rel") && labelSchema.rel.length > 0) {
        var directionAngle = (Math.PI / 2);

        target.relationships = graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(labelSchema.rel).map(function (d) {
            return {
                id: d.data.label + d.data.target.label,
                label: d.data.label,
                target: d.data.target.label,
                count: 0,
                startAngle: d.startAngle,
                endAngle: d.endAngle,
                directionAngle: (d.startAngle + d.endAngle) / 2
            }
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

    var node = {
        "id": graph.generateId(),
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
        node.isParentRelReverse = true;
    }

    if (nodeSchema.hasOwnProperty("isNegative") && nodeSchema.isNegative === true) {
        node.isNegative = true;
        node.count = 0;
    }

    graph.nodes.push(node);

    if (nodeSchema.hasOwnProperty("value")) {
        var nodeSchemaValue = [].concat(nodeSchema.value);
        node.value = [];
        nodeSchemaValue.forEach(function (value) {
            node.value.push(
                {
                    "id": graph.generateId(),
                    "parent": node,
                    "attributes": value,
                    "type": graph.node.NodeTypes.VALUE,
                    "label": node.label
                }
            );
        });
    }

    return node;
};

/**
 * Adds a complete graph from schema.
 * All the other nodes should have been removed first to avoid inconsistent data.
 *
 * @param graphSchema schema of the graph to add.
 */
graph.addSchema = function (graphSchema) {
    if (graph.nodes.length > 0) {
        logger.warn("graph.addSchema is called but the graph is not empty.");
    }

    var rootNodeSchema = graphSchema;

    var rootNode = {
        "id": graph.generateId(),
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
    graph.nodes.push(rootNode);
    graph.notifyListeners(graph.Events.NODE_ROOT_ADD, [rootNode]);

    if (rootNodeSchema.hasOwnProperty("rel") && rootNodeSchema.rel.length > 0) {
        var directionAngle = (Math.PI / 2);

        rootNode.relationships = graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(rootNodeSchema.rel).map(function (d) {
            return {
                id: d.data.label + d.data.target.label,
                label: d.data.label,
                target: d.data.target.label,
                count: 0,
                startAngle: d.startAngle,
                endAngle: d.endAngle,
                directionAngle: (d.startAngle + d.endAngle) / 2
            }
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
        id: "l" + graph.generateId(),
        source: parentNode,
        target: target,
        type: graph.link.LinkTypes.RELATION,
        label: relationSchema.label,
        schema: relationSchema
    };

    graph.links.push(newLink);
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

    var node = {
        "id": graph.generateId(),
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

        node.relationships = graph.node.pie(relSegments).map(function (d) {
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
        node.value = [];
        nodeSchemaValue.forEach(function (value) {
            node.value.push(
                {
                    "id": graph.generateId(),
                    "parent": node,
                    "attributes": value,
                    "type": graph.node.NodeTypes.VALUE,
                    "label": node.label
                }
            );
        });
    }

    graph.nodes.push(node);

    if (!isCollapsed && nodeSchema.hasOwnProperty("rel")) {
        for (var linkIndex = 0; linkIndex < nodeSchema.rel.length; linkIndex++) {
            graph.addSchemaRelation(nodeSchema.rel[linkIndex], node, linkIndex + 1, nodeSchema.rel.length);
        }
    }

    return node;
};

/**
 * Get the graph root node.
 * @returns {*}
 */
graph.getRootNode = function () {
    if (graph.force !== undefined) {
        return graph.nodes[0];
    }
};

/**
 * Get the current schema of the graph.
 * @returns {{}}
 */
graph.getSchema = function () {
    var nodesMap = {};

    var rootNode = graph.getRootNode();

    nodesMap[rootNode.id] = {
        label: rootNode.label
    };

    if (rootNode.hasOwnProperty("value")) {
        nodesMap[rootNode.id].value = [];
        rootNode.value.forEach(function (value) {
            nodesMap[rootNode.id].value.push(value.attributes)
        });
    }

    var links = graph.links;
    if (links.length > 0) {
        links.forEach(function (link) {
            if (link.type === graph.link.LinkTypes.RELATION) {
                var sourceNode = link.source;
                var targetNode = link.target;

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
                    label: link.label,
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
            if (graph.link.SHOW_MARKER && d.source.x <= d.target.x) {
                return "url(#arrow)";
            } else {
                return null;
            }
        })
        .attr("marker-start", function (d) {
            if (graph.link.SHOW_MARKER && d.source.x > d.target.x) {
                return "url(#reverse-arrow)";
            } else {
                return null;
            }
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
            .data(graph.recenterVoronoi(graph.nodes), function (d) {
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

// LINKS -----------------------------------------------------------------------------------------------------------
graph.link = {};
graph.link.TEXT_DY = -4;

/**
 * Define whether or not to display path markers.
 */
graph.link.SHOW_MARKER = false;

// ID of the g element in SVG graph containing all the link elements.
graph.link.gID = "popoto-glinks";

/**
 * Defines the different type of link.
 * RELATION is a relation link between two nodes.
 * VALUE is a link between a generic node and a value.
 */
graph.link.LinkTypes = Object.freeze({RELATION: 0, VALUE: 1, SEGMENT: 2});

/**
 * Function to call to update the links after modification in the model.
 * This function will update the graph with all removed, modified or added links using d3.js mechanisms.
 */
graph.link.updateLinks = function () {
    var data = graph.link.updateData();
    graph.link.removeElements(data.exit());
    graph.link.addNewElements(data.enter());
    graph.link.updateElements();
};

/**
 * Update the links element with data coming from graph.links.
 */
graph.link.updateData = function () {
    return graph.svg.select("#" + graph.link.gID).selectAll(".ppt-glink").data(graph.links, function (d) {
        return d.id;
    });
};

/**
 * Clean links elements removed from the list.
 */
graph.link.removeElements = function (exitingData) {
    exitingData.remove();
};

/**
 * Create new elements.
 */
graph.link.addNewElements = function (enteringData) {

    var newLinkElements = enteringData.append("g")
        .attr("class", "ppt-glink")
        .on("click", graph.link.clickLink)
        .on("mouseover", graph.link.mouseOverLink)
        .on("mouseout", graph.link.mouseOutLink);

    newLinkElements.append("path")
        .attr("class", "ppt-link");

    newLinkElements.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", graph.link.TEXT_DY)
        .append("textPath")
        .attr("class", "ppt-textPath")
        .attr("startOffset", "50%");
};

/**
 * Update all the elements (new + modified)
 */
graph.link.updateElements = function () {
    var toUpdateElem = graph.svg.select("#" + graph.link.gID).selectAll(".ppt-glink");

    toUpdateElem
        .attr("id", function (d) {
            return "ppt-glink_" + d.id;
        });

    toUpdateElem.selectAll(".ppt-link")
        .attr("id", function (d) {
            return "ppt-path_" + d.id
        })
        .attr("stroke", function (d) {
            return provider.link.getColor(d, "path", "stroke");
        })
        .attr("class", function (link) {
            return "ppt-link " + provider.link.getCSSClass(link, "path")
        });

    // Due to a bug on webkit browsers (as of 30/01/2014) textPath cannot be selected
    // To workaround this issue the selection is done with its associated css class
    toUpdateElem.selectAll("text")
        .attr("id", function (d) {
            return "ppt-text_" + d.id
        })
        .attr("class", function (link) {
            return provider.link.getCSSClass(link, "text")
        })
        .attr("fill", function (d) {
            return provider.link.getColor(d, "text", "fill");
        })
        .selectAll(".ppt-textPath")
        .attr("id", function (d) {
            return "ppt-textpath_" + d.id;
        })
        .attr("class", function (link) {
            return "ppt-textpath " + provider.link.getCSSClass(link, "text-path")
        })
        .attr("xlink:href", function (d) {
            return "#ppt-path_" + d.id;
        })
        .text(function (d) {
            return provider.link.getTextValue(d);
        });
};

/**
 * Function called when mouse is over the link.
 * This function is used to change the CSS class on hover of the link and query viewer element.
 *
 * TODO try to introduce event instead of directly access query spans here. This could be used in future extensions.
 */
graph.link.mouseOverLink = function () {
    d3.select(this)
        .select("path")
        .attr("class", function (link) {
            return "ppt-link " + provider.link.getCSSClass(link, "path--hover")
        });

    d3.select(this).select("text")
        .attr("class", function (link) {
            return provider.link.getCSSClass(link, "text--hover")
        });

    var hoveredLink = d3.select(this).data()[0];

    if (queryviewer.isActive) {
        queryviewer.queryConstraintSpanElements.filter(function (d) {
            return d.ref === hoveredLink;
        }).classed("hover", true);
        queryviewer.querySpanElements.filter(function (d) {
            return d.ref === hoveredLink;
        }).classed("hover", true);
    }

    if (cypherviewer.isActive) {
        cypherviewer.querySpanElements.filter(function (d) {
            return d.link === hoveredLink;
        }).classed("hover", true);
    }
};

/**
 * Function called when mouse goes out of the link.
 * This function is used to reinitialize the CSS class of the link and query viewer element.
 */
graph.link.mouseOutLink = function () {
    d3.select(this)
        .select("path")
        .attr("class", function (link) {
            return "ppt-link " + provider.link.getCSSClass(link, "path")
        });

    d3.select(this).select("text")
        .attr("class", function (link) {
            return provider.link.getCSSClass(link, "text")
        });

    var hoveredLink = d3.select(this).data()[0];

    if (queryviewer.isActive) {
        queryviewer.queryConstraintSpanElements.filter(function (d) {
            return d.ref === hoveredLink;
        }).classed("hover", false);
        queryviewer.querySpanElements.filter(function (d) {
            return d.ref === hoveredLink;
        }).classed("hover", false);
    }

    if (cypherviewer.isActive) {
        cypherviewer.querySpanElements.filter(function (d) {
            return d.link === hoveredLink;
        }).classed("hover", false);
    }
};

// Delete all related nodes from this link
graph.link.clickLink = function () {
    var clickedLink = d3.select(this).data()[0];

    if (clickedLink.type !== graph.link.LinkTypes.VALUE) {
        // Collapse all expanded choose nodes first to avoid having invalid displayed value node if collapsed relation contains a value.
        graph.node.collapseAllNode();

        var willChangeResults = graph.node.removeNode(clickedLink.target);

        graph.hasGraphChanged = true;
        result.hasChanged = willChangeResults;
        update();
    }

};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// NODES -----------------------------------------------------------------------------------------------------------

graph.node = {};

// ID of the g element in SVG graph containing all the link elements.
graph.node.gID = "popoto-gnodes";

// Node ellipse size used by default for text nodes.
graph.node.DONUTS_MARGIN = 0;
graph.node.DONUT_WIDTH = 20;

graph.DISABLE_RELATION = false;

graph.node.TEXT_Y = 8;

// Define the max number of character displayed in node.
graph.node.NODE_MAX_CHARS = 11;
graph.node.NODE_TITLE_MAX_CHARS = 100;

// Number of nodes displayed per page during value selection.
graph.node.PAGE_SIZE = 10;

// Define if the count should be displayed on nodes.
graph.DISABLE_COUNT = false;

// Count box default size
graph.node.CountBox = {x: 16, y: 33, w: 52, h: 19};

// Store choose node state to avoid multiple node expand at the same time
graph.node.chooseWaiting = false;

graph.node.getDonutInnerRadius = function (node) {
    return provider.node.getSize(node) + graph.node.DONUTS_MARGIN;
};

graph.node.getDonutOuterRadius = function (node) {
    return provider.node.getSize(node) + graph.node.DONUTS_MARGIN + graph.node.DONUT_WIDTH;
};

graph.node.pie = d3.pie()
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
graph.node.NodeTypes = Object.freeze({ROOT: 0, CHOOSE: 1, VALUE: 2, GROUP: 3});

// Used to generate unique internal labels used for example as identifier in Cypher query.
graph.node.internalLabels = {};

/**
 * Create a normalized identifier from a node label.
 * Multiple calls with the same node label will generate different unique identifier.
 *
 * @param nodeLabel
 * @returns {string}
 */
graph.node.generateInternalLabel = function (nodeLabel) {
    var label = nodeLabel ? nodeLabel.toLowerCase().replace(/ /g, '') : "n";

    if (label in graph.node.internalLabels) {
        graph.node.internalLabels[label] = graph.node.internalLabels[label] + 1;
    } else {
        graph.node.internalLabels[label] = 0;
        return label;
    }

    return label + graph.node.internalLabels[label];
};

/**
 * Update Nodes SVG elements using D3.js update mechanisms.
 */
graph.node.updateNodes = function () {
    var data = graph.node.updateData();
    graph.node.removeElements(data.exit());
    graph.node.addNewElements(data.enter());
    graph.node.updateElements();
};

/**
 * Update node data with changes done in graph.nodes model.
 */
graph.node.updateData = function () {
    var data = graph.svg.select("#" + graph.node.gID).selectAll(".ppt-gnode").data(graph.nodes, function (d) {
        return d.id;
    });

    if (graph.hasGraphChanged) {
        graph.node.updateAutoLoadValues();

        if (!graph.DISABLE_COUNT && !graph.ignoreCount) {
            graph.node.updateCount();
        }
    }
    graph.hasGraphChanged = false;

    return data;
};

/**
 * Update nodes and result counts by executing a query for every nodes with the new graph structure.
 */
graph.node.updateCount = function () {

    // Abort any old running request before starting a new one
    if (graph.node.updateCountXhr !== undefined) {
        graph.node.updateCountXhr.abort();
    }

    var statements = [];

    var countedNodes = graph.nodes
        .filter(function (d) {
            return d.type !== graph.node.NodeTypes.VALUE && d.type !== graph.node.NodeTypes.GROUP && (!d.hasOwnProperty("isNegative") || !d.isNegative);
        });

    countedNodes.forEach(function (node) {
        var nodeCountQuery = query.generateNodeCountQuery(node);
        statements.push(
            {
                "statement": nodeCountQuery.statement,
                "parameters": nodeCountQuery.parameters
            }
        );
    });

    logger.info("Count nodes ==>");
    graph.node.updateCountXhr = rest.post(
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

            graph.node.updateElements();
            graph.link.updateElements();
        })
        .fail(function (xhr, textStatus, errorThrown) {
            if (textStatus !== "abort") {
                logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + rest.CYPHER_URL + "\" defined in \"rest.CYPHER_URL\" property: " + errorThrown);
                countedNodes.forEach(function (node) {
                    node.count = 0;
                });
                graph.node.updateElements();
                graph.link.updateElements();
            } else {
                logger.info("<=X= Count nodes - Aborted!");
            }
        });
};

/**
 * Update values for nodes having preloadData property
 */
graph.node.updateAutoLoadValues = function () {
    var statements = [];

    var nodesToLoadData = graph.node.getAutoLoadValueNodes();

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
};

/**
 * Remove old elements.
 * Should be called after updateData.
 */
graph.node.removeElements = function (exitingData) {
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
graph.node.addNewElements = function (enteringData) {

    var gNewNodeElements = enteringData
        .append("g")
        .attr("class", "ppt-gnode")

    gNewNodeElements.on("click", graph.node.nodeClick)
        .on("mouseover", graph.node.mouseOverNode)
        // .on("mousemove", graph.node.mouseMoveNode)
        .on("mouseout", graph.node.mouseOutNode);

    // Add right click on all nodes except value
    gNewNodeElements.filter(function (d) {
        return d.type !== graph.node.NodeTypes.VALUE;
    }).on("contextmenu", graph.node.clearSelection);

    // Disable right click context menu on value nodes
    gNewNodeElements.filter(function (d) {
        return d.type === graph.node.NodeTypes.VALUE;
    }).on("contextmenu", function () {
        // Disable context menu on
        d3.event.preventDefault();
    });

    var nodeDefs = gNewNodeElements.append("defs");

    // Circle clipPath using node radius size
    nodeDefs.append("clipPath")
        .attr("id", function (node) {
            return "node-view" + node.id;
        })
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 0);

    // Nodes are composed of 3 layouts and skeleton are created here.
    graph.node.addBackgroundElements(gNewNodeElements);
    graph.node.addMiddlegroundElements(gNewNodeElements);
    graph.node.addForegroundElements(gNewNodeElements);
};

/**
 * Create the background for a new node element.
 * The background of a node is defined by a circle not visible by default (fill-opacity set to 0) but can be used to highlight a node with animation on this attribute.
 * This circle also define the node zone that can receive events like mouse clicks.
 *
 * @param gNewNodeElements
 */
graph.node.addBackgroundElements = function (gNewNodeElements) {
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
graph.node.addMiddlegroundElements = function (gNewNodeElements) {
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
graph.node.addForegroundElements = function (gNewNodeElements) {
    var foreground = gNewNodeElements
        .append("g")
        .attr("class", "ppt-g-node-foreground");

    // Arrows icons added only for root and choose nodes
    var gArrow = foreground.filter(function (d) {
        return d.type === graph.node.NodeTypes.ROOT || d.type === graph.node.NodeTypes.CHOOSE;
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

    glArrow.on("click", function (clickedNode) {
        d3.event.stopPropagation(); // To avoid click event on svg element in background

        // On left arrow click page number is decreased and node expanded to display the new page
        if (clickedNode.page > 1) {
            clickedNode.page--;
            graph.node.collapseNode(clickedNode);
            graph.node.expandNode(clickedNode);
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

    grArrow.on("click", function (clickedNode) {
        d3.event.stopPropagation(); // To avoid click event on svg element in background

        if (clickedNode.page * graph.node.PAGE_SIZE < clickedNode.count) {
            clickedNode.page++;
            graph.node.collapseNode(clickedNode);
            graph.node.expandNode(clickedNode);
        }
    });

    // Count box
    if (!graph.DISABLE_COUNT) {
        var countForeground = foreground.filter(function (d) {
            return d.type !== graph.node.NodeTypes.GROUP;
        });

        countForeground
            .append("rect")
            .attr("x", graph.node.CountBox.x)
            .attr("y", graph.node.CountBox.y)
            .attr("width", graph.node.CountBox.w)
            .attr("height", graph.node.CountBox.h)
            .attr("class", "ppt-count-box");

        countForeground
            .append("text")
            .attr("x", 42)
            .attr("y", 48)
            .attr("text-anchor", "middle")
            .attr("class", "ppt-count-text");
    }

    var ban = foreground.filter(function (d) {
        return d.type === graph.node.NodeTypes.CHOOSE;
    }).append("g")
        .attr("class", "ppt-g-node-ban")
        .append("path")
        .attr("d", "M89.1 19.2C88 17.7 86.6 16.2 85.2 14.8 83.8 13.4 82.3 12 80.8 10.9 72 3.9 61.3 0 50 0 36.7 0 24.2 5.4 14.8 14.8 5.4 24.2 0 36.7 0 50c0 11.4 3.9 22.1 10.9 30.8 1.2 1.5 2.5 3 3.9 4.4 1.4 1.4 2.9 2.7 4.4 3.9C27.9 96.1 38.6 100 50 100 63.3 100 75.8 94.6 85.2 85.2 94.6 75.8 100 63.3 100 50 100 38.7 96.1 28 89.1 19.2ZM11.9 50c0-10.2 4-19.7 11.1-27C30.3 15.9 39.8 11.9 50 11.9c8.2 0 16 2.6 22.4 7.3L19.3 72.4C14.5 66 11.9 58.2 11.9 50Zm65 27c-7.2 7.1-16.8 11.1-27 11.1-8.2 0-16-2.6-22.4-7.4L80.8 27.6C85.5 34 88.1 41.8 88.1 50c0 10.2-4 19.7-11.1 27z");
};

/**
 * Updates all elements.
 */
graph.node.updateElements = function () {
    var toUpdateElem = graph.svg.select("#" + graph.node.gID).selectAll(".ppt-gnode");

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
        .attr("id", function (node) {
            return "node-view" + node.id;
        }).selectAll("circle")
        .attr("r", function (node) {
            return provider.node.getSize(node);
        });

    // Display voronoi paths
    // TODO ZZZ re|move
    // graph.node.selectAllData.selectAll(".gra").data(["unique"]).enter().append("g").attr("class", "gra").append("use");
    // graph.node.selectAllData.selectAll("use").attr("xlink:href",function(d){
    //     console.log("#pvoroclip-"+d3.select(this.parentNode.parentNode).datum().id);
    //     return "#pvoroclip-"+d3.select(this.parentNode.parentNode).datum().id;
    // }).attr("fill","none").attr("stroke","red").attr("stroke-width","1px");

    // TODO ZZZ move functions?
    toUpdateElem.filter(function (n) {
        return n.type !== graph.node.NodeTypes.ROOT
    }).call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    function dragstarted(d) {
        if (!d3.event.active) graph.force.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) graph.force.alphaTarget(0);
        if (d.fixed === false) {
            d.fx = null;
            d.fy = null;
        }

    }

    graph.node.updateBackgroundElements();
    graph.node.updateMiddlegroundElements();
    graph.node.updateForegroundElements();
};

graph.node.updateBackgroundElements = function () {
    var nodeBackgroundElements = graph.svg.select("#" + graph.node.gID).selectAll(".ppt-gnode").selectAll(".ppt-g-node-background");

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
        .on("click", graph.node.segmentClick)
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
        .data(function (node) {
            var relationships = [];
            if (node.hasOwnProperty("relationships")) {
                relationships = node.relationships;
            }
            return relationships;
        }, function (relationship) {
            return relationship.id;
        })
        .enter()
        .append("g")
        .attr("class", ".ppt-segment-container")
        .on("click", graph.node.segmentClick)
        .on("mouseover", function (d) {
            d3.select(this).select(".ppt-text-arc").classed("hover", true)
        })
        .on("mouseout", function (d) {
            d3.select(this).select(".ppt-text-arc").classed("hover", false)
        });

    gLabel.append("path")
        .attr("class", "ppt-hidden-arc")
        .attr("id", function (d, i) {
            var node = d3.select(this.parentNode.parentNode).datum();
            return "arc_" + node.id + "_" + i;
        })
        .attr("d", function (relationship) {
            var node = d3.select(this.parentNode.parentNode).datum();

            //A regular expression that captures all in between the start of a string (denoted by ^)
            //and the first capital letter L
            var firstArcSection = /(^.+?)L/;
            var singleArcSection = /(^.+?)M/;

            var intermediateArc = {
                startAngle: relationship.directionAngle - (Math.PI - 0.1),
                endAngle: relationship.directionAngle + (Math.PI - 0.1)
            };

            var arcPath = d3.arc()
                .innerRadius(graph.node.getDonutInnerRadius(node))
                .outerRadius(graph.node.getDonutOuterRadius(node))(intermediateArc);

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
            var node = d3.select(this.parentNode.parentNode).datum();
            if (node.hasOwnProperty("count") && node.count === 0) {
                return "ppt-text-arc disabled";
            } else {
                return "ppt-text-arc";
            }
        })
        .attr("fill", function (d) {
            var node = d3.select(this.parentNode.parentNode).datum();

            return provider.link.getColor({
                label: d.label,
                type: graph.link.LinkTypes.SEGMENT,
                source: node,
                target: {label: d.target}
            }, "segment", "fill");
        })
        .attr("dy", graph.link.TEXT_DY)
        .append("textPath")
        .attr("startOffset", "50%")
        .attr("xlink:href", function (d, i) {
            var node = d3.select(this.parentNode.parentNode.parentNode).datum();
            return "#arc_" + node.id + "_" + i;
        })
        .text(function (d) {
            var node = d3.select(this.parentNode.parentNode.parentNode).datum();

            return provider.link.getTextValue({
                source: node,
                target: {label: d.target},
                label: d.label,
                type: graph.link.LinkTypes.SEGMENT
            });
        });

    gSegment.append("path")
        .attr("class", function (d) {
            var node = d3.select(this.parentNode.parentNode).datum();
            if (node.hasOwnProperty("count") && node.count === 0) {
                return "ppt-segment disabled";
            } else {
                return "ppt-segment";
            }
        })
        .attr("d", function (d) {
            var node = d3.select(this.parentNode.parentNode).datum();
            return d3.arc()
                .innerRadius(graph.node.getDonutInnerRadius(node))
                .outerRadius(graph.node.getDonutOuterRadius(node))(d)
        })
        .attr("fill", function (d) {
            var node = d3.select(this.parentNode.parentNode).datum();
            return provider.link.getColor({
                label: d.label,
                type: graph.link.LinkTypes.RELATION,
                source: node,
                target: {label: d.target}
            }, "path", "fill");
        })
        .attr("stroke", function (d) {
            var node = d3.select(this.parentNode.parentNode).datum();

            return provider.link.getColor({
                label: d.label,
                type: graph.link.LinkTypes.RELATION,
                source: node,
                target: {label: d.target}
            }, "path", "stroke");
        })
    ;

};

/**
 * Update the middle layer of nodes.
 * TODO refactor node generation to allow future extensions (for example add plugin with new node types...)
 */
graph.node.updateMiddlegroundElements = function () {
    var middleG = graph.svg.select("#" + graph.node.gID).selectAll(".ppt-gnode").selectAll(".ppt-g-node-middleground");

    middleG.attr("clip-path", function (node) {
        return "url(#node-view" + node.id + ")";
    });

    // Clear all content in case node type has changed
    middleG.selectAll("*").remove();


    graph.node.updateMiddlegroundElementsTooltip(middleG);

    graph.node.updateMiddlegroundElementsText(middleG.filter(function (d) {
        return provider.node.getNodeDisplayType(d) === provider.node.DisplayTypes.TEXT;
    }));

    graph.node.updateMiddlegroundElementsImage(middleG.filter(function (d) {
        return provider.node.getNodeDisplayType(d) === provider.node.DisplayTypes.IMAGE;
    }));

    graph.node.updateMiddlegroundElementsSymbol(middleG.filter(function (d) {
        return provider.node.getNodeDisplayType(d) === provider.node.DisplayTypes.SYMBOL;
    }));

    graph.node.updateMiddlegroundElementsSVG(middleG.filter(function (d) {
        return provider.node.getNodeDisplayType(d) === provider.node.DisplayTypes.SVG;
    }));

    graph.node.updateMiddlegroundElementsDisplayedText(middleG.filter(function (d) {
        return provider.node.isTextDisplayed(d);
    }));

};

graph.node.updateMiddlegroundElementsTooltip = function (middleG) {
    // Most browser will generate a tooltip if a title is specified for the SVG element
    // TODO Introduce an SVG tooltip instead?
    middleG.append("title")
        .attr("class", function (node) {
            return provider.node.getCSSClass(node, "title")
        })
        .text(function (d) {
            return provider.node.getTextValue(d, graph.node.NODE_TITLE_MAX_CHARS);
        });

};

graph.node.updateMiddlegroundElementsText = function (gMiddlegroundTextNodes) {
    var circle = gMiddlegroundTextNodes.append("circle").attr("r", function (node) {
        return provider.node.getSize(node);
    });

    // Set class according to node type
    circle
        .attr("class", function (node) {
            return provider.node.getCSSClass(node, "circle")
        })
        .attr("fill", function (node) {
            return provider.node.getColor(node, "circle", "fill");
        })
        .attr("stroke", function (node) {
            return provider.node.getColor(node, "circle", "stroke");
        });
};

graph.node.updateMiddlegroundElementsImage = function (gMiddlegroundImageNodes) {
    gMiddlegroundImageNodes.append("circle").attr("r", function (node) {
        return provider.node.getSize(node);
    })
        .attr("class", function (node) {
            return provider.node.getCSSClass(node, "image-background-circle")
        });

    gMiddlegroundImageNodes.append("image")
        .attr("class", function (node) {
            return provider.node.getCSSClass(node, "image")
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

graph.node.updateMiddlegroundElementsSymbol = function (gMiddlegroundSymbolNodes) {
    gMiddlegroundSymbolNodes.append("circle").attr("r", function (node) {
        return provider.node.getSize(node);
    })
        .attr("class", function (node) {
            return provider.node.getCSSClass(node, "symbol-background-circle")
        })
        .attr("fill", function (node) {
            return provider.node.getColor(node, "circle", "fill");
        })
        .attr("stroke", function (node) {
            return provider.node.getColor(node, "circle", "stroke");
        });

    gMiddlegroundSymbolNodes.append("use")
        .attr("class", function (node) {
            return provider.node.getCSSClass(node, "symbol")
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
        .attr("fill", function (node) {
            return provider.node.getColor(node, "circle", "fill");
        })
        .attr("stroke", function (node) {
            return provider.node.getColor(node, "circle", "stroke");
        });
};

graph.node.updateMiddlegroundElementsSVG = function (gMiddlegroundSVGNodes) {
    var SVGmiddleG = gMiddlegroundSVGNodes.append("g");

    var circle = SVGmiddleG.append("circle").attr("r", function (node) {
        return provider.node.getSize(node);
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
            var node = d3.select(this.parentNode).datum();
            return provider.node.getCSSClass(node, "path")
        })
        .each(function (d, i) {
            for (var prop in d) {
                if (d.hasOwnProperty(prop)) {
                    d3.select(this).attr(prop, d[prop]);
                }
            }
        })
};

graph.node.updateMiddlegroundElementsDisplayedText = function (middleG) {
    var textDispalyed = middleG.filter(function (d) {
        return provider.node.isTextDisplayed(d);
    });
    var backRects =
        textDispalyed
            .append("rect")
            .attr("fill", function (node) {
                return provider.node.getColor(node, "back-text", "fill");
            })
            .attr("class", function (node) {
                return provider.node.getCSSClass(node, "back-text")
            });

    var textMiddle = textDispalyed.append('text');

    if (graph.FIT_TEXT) {

        var measureWidth = function (text) {
            var context = document.createElement("canvas").getContext("2d");
            return context.measureText(text).width
        };

        var lineHeight = 12;

        var getLines = function (text) {
            var words = text.split(/\s+/g); // To hyphenate: /\s+|(?<=-)/
            if (!words[words.length - 1]) words.pop();
            if (!words[0]) words.shift();

            var targetWidth = Math.sqrt(measureWidth(text.trim()) * lineHeight);

            var line;
            var lineWidth0 = Infinity;
            var lines = [];

            for (var i = 0, n = words.length; i < n; ++i) {
                var lineText1 = (line ? line.text + " " : "") + words[i];
                var lineWidth1 = measureWidth(lineText1);
                if ((lineWidth0 + lineWidth1) / 2 < targetWidth) {
                    line.width = lineWidth0 = lineWidth1;
                    line.text = lineText1;
                } else {
                    lineWidth0 = measureWidth(words[i]);
                    line = {width: lineWidth0, text: words[i]};
                    lines.push(line);
                }
            }

            var textRadius = 0;

            for (var i = 0, n = lines.length; i < n; ++i) {
                var dy = (Math.abs(i - n / 2 + 0.5) + 0.5) * lineHeight;
                var dx = lines[i].width / 2;
                textRadius = Math.max(textRadius, Math.sqrt(dx * dx + dy * dy));
            }

            var lines2 = [];
            lines.map(function (d) {
                lines2.push({"text": d.text, "textRadius": textRadius, "linesLength": lines.length})
            });

            return {"lines":lines2, "textRadius": textRadius}
        };

        textMiddle.attr("style", "text-anchor: middle; font: 10px sans-serif")
            .data(function (d) {
                var text = "";
                if (provider.node.isTextDisplayed(d)) {
                    text = provider.node.getTextValue(d);
                }
                var lines = getLines(text);
                d.lines = lines.lines;
                d.textRadius = lines.textRadius;
                return [d]
            });

        textMiddle.selectAll("tspan")
            .data(function (d) {
                return d.lines
            })
            .enter().append("tspan")
            .attr("x", 0)
            .attr("y", function (d, i, nodes) {
                return (i - d.linesLength / 2 + 0.8) * lineHeight;
            })
            .text(function (d) {
                return d.text;
            });

        textMiddle.attr("transform", function (d) {
            var scale = provider.node.getSize(d) / d.textRadius;
            return "translate(" + 0 + "," + 0 + ")" + " scale(" + scale + ")"
        })

    } else {
        textMiddle.attr('x', 0)
            .attr('y', graph.node.TEXT_Y)
            .attr('text-anchor', 'middle')
            .text(function (d) {
                if (provider.node.isTextDisplayed(d)) {
                    return provider.node.getTextValue(d);
                } else {
                    return "";
                }

            });
    }


    textMiddle.attr("class", function (node) {
        return provider.node.getCSSClass(node, "text")
    })
        .on("mouseover", function (d) {
            d3.select(this.parentNode).attr("clip-path", null);
        })
        .on("mouseout", function (d) {
            d3.select(this.parentNode)
                .attr("clip-path", function (node) {
                    return "url(#node-view" + node.id + ")";
                });
        });

    backRects
        .attr("x", function (d) {
            var bbox = d3.select(this.parentNode).select("text").node().getBBox();
            return bbox.x - 3;
        })
        .attr("y", function (d) {
            var bbox = d3.select(this.parentNode).select("text").node().getBBox();
            return bbox.y;
        })
        .attr("rx", "5")
        .attr("ry", "5")
        .attr("width", function (d) {
            var bbox = d3.select(this.parentNode).select("text").node().getBBox();
            return bbox.width + 6;
        })
        .attr("height", function (d) {
            var bbox = d3.select(this.parentNode).select("text").node().getBBox();
            return bbox.height;
        });
};

/**
 * Updates the foreground elements
 */
graph.node.updateForegroundElements = function () {

    // Updates browse arrows status
    // TODO ZZZ extract variable?
    var gArrows = graph.svg.select("#" + graph.node.gID).selectAll(".ppt-gnode").selectAll(".ppt-g-node-foreground")
        .selectAll(".ppt-node-foreground-g-arrows");
    gArrows.classed("active", function (d) {
        return d.valueExpanded && d.data && d.data.length > graph.node.PAGE_SIZE;
    });

    gArrows.selectAll(".ppt-larrow").classed("enabled", function (d) {
        return d.page > 1;
    });

    gArrows.selectAll(".ppt-rarrow").classed("enabled", function (d) {
        if (d.data) {
            var count = d.data.length;
            return d.page * graph.node.PAGE_SIZE < count;
        } else {
            return false;
        }
    });

    // Update count box class depending on node type
    var gForegrounds = graph.svg.select("#" + graph.node.gID).selectAll(".ppt-gnode").selectAll(".ppt-g-node-foreground");

    gForegrounds.selectAll(".ppt-count-box").filter(function (d) {
        return d.type !== graph.node.NodeTypes.CHOOSE;
    }).classed("root", true);

    gForegrounds.selectAll(".ppt-count-box").filter(function (d) {
        return d.type === graph.node.NodeTypes.CHOOSE;
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

    graph.svg.select("#" + graph.node.gID).selectAll(".ppt-gnode").selectAll(".ppt-g-node-foreground").filter(function (node) {
        return node.isNegative === true;
    }).selectAll(".ppt-g-node-ban")
        .attr("transform", function (d) {
            return "translate(" + (-provider.node.getSize(d)) + "," + (-provider.node.getSize(d)) + ") " +
                "scale(" + ((provider.node.getSize(d) * 2) / 100) + ")"; // 100 is the size of the image drawn with the path
        })
        .attr("stroke-width", function (d) {
            return (2 / ((provider.node.getSize(d) * 2) / 100)) + "px";
        });


    graph.svg.select("#" + graph.node.gID).selectAll(".ppt-gnode").selectAll(".ppt-g-node-foreground").selectAll(".ppt-g-node-ban")
        .classed("active", function (node) {
            return node.isNegative === true;
        });
};

graph.node.segmentClick = function (d) {
    d3.event.preventDefault();

    var node = d3.select(this.parentNode.parentNode).datum();

    graph.ignoreCount = true;

    graph.addRelationshipData(node, d, function () {
        graph.ignoreCount = false;
        graph.hasGraphChanged = true;
        update();
    });
};

/**
 * Handle the mouse over event on nodes.
 */
graph.node.mouseOverNode = function () {
    d3.event.preventDefault();

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

// graph.node.mouseMoveNode = function () {
//     d3.event.preventDefault();
//
//     var hoveredNode = d3.select(this).data()[0];
//
//     tootip.div
//         .text(provider.node.getTextValue(hoveredNode, graph.node.NODE_TITLE_MAX_CHARS))
//         .style("left", (d3.event.pageX - 34) + "px")
//         .style("top", (d3.event.pageY - 12) + "px");
// };

/**
 * Handle mouse out event on nodes.
 */
graph.node.mouseOutNode = function () {
    d3.event.preventDefault();

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
graph.node.nodeClick = function () {
    if (!d3.event.defaultPrevented) { // To avoid click on drag end
        var clickedNode = d3.select(this).data()[0]; // Clicked node data
        logger.debug("nodeClick (" + clickedNode.label + ")");

        if (clickedNode.type === graph.node.NodeTypes.VALUE) {
            graph.node.valueNodeClick(clickedNode);
        } else if (clickedNode.type === graph.node.NodeTypes.CHOOSE || clickedNode.type === graph.node.NodeTypes.ROOT) {
            if (d3.event.ctrlKey) {
                if (clickedNode.type === graph.node.NodeTypes.CHOOSE) {
                    clickedNode.isNegative = !clickedNode.hasOwnProperty("isNegative") || !clickedNode.isNegative;

                    graph.node.collapseAllNode();

                    if (clickedNode.hasOwnProperty("value") && clickedNode.value.length > 0) {

                    } else {

                        if (clickedNode.isNegative) {
                            // Remove all related nodes
                            for (var i = graph.links.length - 1; i >= 0; i--) {
                                if (graph.links[i].source === clickedNode) {
                                    graph.node.removeNode(graph.links[i].target);
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
                    graph.node.collapseNode(clickedNode);
                } else {
                    graph.node.chooseNodeClick(clickedNode);
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
graph.node.collapseNode = function (clickedNode) {
    if (clickedNode.valueExpanded) { // node is collapsed only if it has been expanded first
        logger.debug("collapseNode (" + clickedNode.label + ")");

        graph.notifyListeners(graph.Events.GRAPH_NODE_VALUE_COLLAPSE, [clickedNode]);

        var linksToRemove = graph.links.filter(function (l) {
            return l.source === clickedNode && l.type === graph.link.LinkTypes.VALUE;
        });

        // Remove children nodes from model
        linksToRemove.forEach(function (l) {
            graph.nodes.splice(graph.nodes.indexOf(l.target), 1);
        });

        // Remove links from model
        for (var i = graph.links.length - 1; i >= 0; i--) {
            if (linksToRemove.indexOf(graph.links[i]) >= 0) {
                graph.links.splice(i, 1);
            }
        }

        // Node has been fixed when expanded so we unfix it back here.
        if (clickedNode.type !== graph.node.NodeTypes.ROOT) {
            clickedNode.fixed = false;
            clickedNode.fx = null;
            clickedNode.fy = null;
        }

        // Parent node too if not root
        if (clickedNode.parent && clickedNode.parent.type !== graph.node.NodeTypes.ROOT) {
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
graph.node.collapseAllNode = function () {
    graph.nodes.forEach(function (n) {
        if ((n.type === graph.node.NodeTypes.CHOOSE || n.type === graph.node.NodeTypes.ROOT) && n.valueExpanded) {
            graph.node.collapseNode(n);
        }
    });
};

/**
 * Function called on a value node click.
 * In this case the value is added in the parent node and all the value nodes are collapsed.
 *
 * @param clickedNode
 */
graph.node.valueNodeClick = function (clickedNode) {
    logger.debug("valueNodeClick (" + clickedNode.label + ")");

    graph.notifyListeners(graph.Events.GRAPH_NODE_ADD_VALUE, [clickedNode]);

    if (clickedNode.parent.value === undefined) {
        clickedNode.parent.value = [];
    }
    clickedNode.parent.value.push(clickedNode);
    result.hasChanged = true;
    graph.hasGraphChanged = true;

    graph.node.collapseNode(clickedNode.parent);
};

/**
 * Function called on choose node click.
 * In this case a query is executed to get all the possible value
 * @param clickedNode
 * TODO optimize with cached data?
 */
graph.node.chooseNodeClick = function (clickedNode) {
    logger.debug("chooseNodeClick (" + clickedNode.label + ") with waiting state set to " + graph.node.chooseWaiting);
    if (!graph.node.chooseWaiting && !clickedNode.immutable && !(clickedNode.count === 0)) {

        // Collapse all expanded nodes first
        graph.node.collapseAllNode();

        // Set waiting state to true to avoid multiple call on slow query execution
        graph.node.chooseWaiting = true;

        // Don't run query to get value if node isAutoLoadValue is set to true
        if (clickedNode.data !== undefined && clickedNode.isAutoLoadValue) {
            clickedNode.page = 1;
            graph.node.expandNode(clickedNode);
            graph.node.chooseWaiting = false;
        } else {
            logger.info("Values (" + clickedNode.label + ") ==>");
            var nodeValueQuery = query.generateNodeValueQuery(clickedNode);
            rest.post(
                {
                    "statements": [
                        {
                            "statement": nodeValueQuery.statement,
                            "parameters": nodeValueQuery.parameters
                        }]
                })
                .done(function (response) {
                    logger.info("<== Values (" + clickedNode.label + ")");
                    var parsedData = rest.response.parse(response);
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
                    graph.node.expandNode(clickedNode);
                    graph.node.chooseWaiting = false;
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    graph.node.chooseWaiting = false;
                    logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + rest.CYPHER_URL + "\" defined in \"rest.CYPHER_URL\" property: " + errorThrown);
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
graph.node.addExpandedValue = function (attribute, value) {

    var isAnyChangeDone = false;

    // For each expanded nodes
    for (var i = graph.nodes.length - 1; i >= 0; i--) {
        if (graph.nodes[i].valueExpanded) {

            // Look in node data if value can be found in reverse order to be able to remove value without effect on iteration index
            for (var j = graph.nodes[i].data.length - 1; j >= 0; j--) {
                if (graph.nodes[i].data[j][attribute] === value) {
                    isAnyChangeDone = true;

                    // Create field value if needed
                    if (!graph.nodes[i].hasOwnProperty("value")) {
                        graph.nodes[i].value = [];
                    }

                    // Add value
                    graph.nodes[i].value.push({
                        attributes: graph.nodes[i].data[j]
                    });

                    // Remove data added in value
                    graph.nodes[i].data.splice(j, 1);
                }
            }

            // Refresh node
            graph.node.collapseNode(graph.nodes[i]);
            graph.node.expandNode(graph.nodes[i]);
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
graph.node.getContainingValue = function (label) {
    var nodesWithValue = [];
    var links = graph.links, nodes = graph.nodes;

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
graph.node.addValueForLabel = function (label, value) {
    var isAnyChangeDone = false;

    // Find choose node with label
    for (var i = graph.nodes.length - 1; i >= 0; i--) {
        if (graph.nodes[i].type === graph.node.NodeTypes.CHOOSE && graph.nodes[i].label === label) {

            // Create field value if needed
            if (!graph.nodes[i].hasOwnProperty("value")) {
                graph.nodes[i].value = [];
            }

            // check if value already exists
            var isValueFound = false;
            var constraintAttr = provider.node.getConstraintAttribute(label);
            graph.nodes[i].value.forEach(function (val) {
                if (val.attributes.hasOwnProperty(constraintAttr) && val.attributes[constraintAttr] === value.attributes[constraintAttr]) {
                    isValueFound = true;
                }
            });

            if (!isValueFound) {
                // Add value
                graph.nodes[i].value.push(value);
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
graph.node.addValue = function (nodeIds, displayAttributeValue) {
    var isAnyChangeDone = false;

    // Find choose node with label
    for (var i = 0; i < graph.nodes.length; i++) {
        var node = graph.nodes[i];
        if (nodeIds.indexOf(node.id) >= 0) {

            // Create field value in node if needed
            if (!node.hasOwnProperty("value")) {
                node.value = [];
            }

            var displayAttr = provider.node.getReturnAttributes(node.label)[0];

            // Find data for this node and add value
            node.data.forEach(function (d) {
                if (d.hasOwnProperty(displayAttr) && d[displayAttr] === displayAttributeValue) {
                    isAnyChangeDone = true;
                    node.value.push({attributes: d})
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
 * @param node
 * @param value
 */
graph.node.removeValue = function (node, value) {
    var isAnyChangeDone = false;

    // Remove values having same constraintAttributeValue
    for (var j = node.value.length - 1; j >= 0; j--) {
        if (node.value[j] === value) {
            graph.node.collapseNode(node);
            node.value.splice(j, 1);

            // Add values back in data
            // Not needed as node is collapsed and if clicked data will be reloaded
            // for (var k = 0; k < removedValues.length; k++) {
            //     node.data.push(removedValues[k].attributes);
            // }
            isAnyChangeDone = true;
        }
    }
    return isAnyChangeDone
};

/**
 * Get the value in the provided nodeId for a specific value id.
 *
 * @param nodeId
 * @param constraintAttributeValue
 */
graph.node.getValue = function (nodeId, constraintAttributeValue) {
    for (var i = 0; i < graph.nodes.length; i++) {
        var node = graph.nodes[i];

        if (node.id === nodeId) {
            var constraintAttribute = provider.node.getConstraintAttribute(node.label);

            for (var j = node.value.length - 1; j >= 0; j--) {
                if (node.value[j].attributes[constraintAttribute] === constraintAttributeValue) {
                    return node.value[j]
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
graph.node.removeExpandedValue = function (attribute, value) {
    var isAnyChangeDone = false;

    // For each expanded nodes in reverse order as some values can be removed
    for (var i = graph.nodes.length - 1; i >= 0; i--) {
        if (graph.nodes[i].valueExpanded) {

            var removedValues = [];

            // Remove values
            for (var j = graph.nodes[i].value.length - 1; j >= 0; j--) {
                if (graph.nodes[i].value[j].attributes[attribute] === value) {
                    isAnyChangeDone = true;

                    removedValues = removedValues.concat(graph.nodes[i].value.splice(j, 1));
                }
            }

            //And add them back in data
            for (var k = 0; k < removedValues.length; k++) {
                graph.nodes[i].data.push(removedValues[k].attributes);
            }

            // Refresh node
            graph.node.collapseNode(graph.nodes[i]);
            graph.node.expandNode(graph.nodes[i]);
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
graph.node.getAutoLoadValueNodes = function () {
    return graph.nodes
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
 * @param node
 * @param values
 * @param isNegative
 */
graph.node.addRelatedValues = function (node, values, isNegative) {
    var valuesToAdd = graph.node.filterExistingValues(node, values);

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
    rest.post(
        {
            "statements": statements
        })
        .done(function (response) {
            logger.info("<== addRelatedValues");

            var parsedData = rest.response.parse(response);
            var count = 0;
            parsedData.forEach(function (data) {
                if (data.length > 0) {
                    var dataLabel = data[0].label;
                    var dataValue = data[0].value;
                    var dataRel = data[0].rel;

                    var value = {
                        "id": graph.generateId(),
                        "parent": node,
                        "attributes": dataValue,
                        "type": graph.node.NodeTypes.VALUE,
                        "label": dataLabel
                    };
                    graph.ignoreCount = true;

                    var nodeRelationships = node.relationships;
                    var nodeRels = nodeRelationships.filter(function (r) {
                        return r.label === dataRel && r.target === dataLabel
                    });

                    var nodeRel = {label: dataRel, target: dataLabel};
                    if (nodeRels.length > 0) {
                        nodeRel = nodeRels[0];
                    }

                    graph.addRelationshipData(node, nodeRel, function () {
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
        .fail(function (xhr, textStatus, errorThrown) {
            console.error(xhr, textStatus, errorThrown);
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
 * @param node
 * @param relPath
 * @param values
 * @param isNegative
 */
graph.node.addRelatedBranch = function (node, relPath, values, isNegative) {
    if (relPath.length > 0) {
        var rel = relPath[0];
        relPath = relPath.slice(1);

        var relationships = node.relationships.filter(function (r) {
            return r.label === rel.type && r.target === rel.target;
        });

        if (relationships.length > 0) {
            graph.addRelationshipData(node, relationships[0], function (createdNode) {
                graph.node.addRelatedBranch(createdNode, relPath, values, isNegative);
            });
        }
    } else {
        graph.node.addRelatedValues(node, values, isNegative)
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
 * @param node
 * @param values
 */
graph.node.filterExistingValues = function (node, values) {
    var notFoundValues = [];
    var possibleValueNodes = graph.nodes.filter(function (n) {
        return n.parent === node && n.hasOwnProperty("value") && n.value.length > 0;
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
 * Compute the angle in radian between the node and its parent.
 * TODO: clean or add comments to explain the code...
 *
 * @param node node to compute angle.
 * @returns {number} angle in radian.
 */
graph.computeParentAngle = function (node) {
    var angleRadian = 0;
    var r = 100;
    if (node.parent) {
        var xp = node.parent.x;
        var yp = node.parent.y;
        var x0 = node.x;
        var y0 = node.y;
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
 * Function called to expand a node containing values.
 * This function will create the value nodes with the clicked node internal data.
 * Only nodes corresponding to the current page index will be generated.
 *
 * @param clickedNode
 */
graph.node.expandNode = function (clickedNode) {

    graph.notifyListeners(graph.Events.GRAPH_NODE_VALUE_EXPAND, [clickedNode]);

    // Get subset of node corresponding to the current node page and page size
    var lIndex = clickedNode.page * graph.node.PAGE_SIZE;
    var sIndex = lIndex - graph.node.PAGE_SIZE;

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

        var node = {
            "id": graph.generateId(),
            "parent": clickedNode,
            "attributes": d,
            "type": graph.node.NodeTypes.VALUE,
            "label": clickedNode.label,
            "count": d.count,
            "x": nx,
            "y": ny,
            "internalID": d[query.NEO4J_INTERNAL_ID.queryInternalName]
        };

        graph.nodes.push(node);
        graph.links.push(
            {
                id: "l" + graph.generateId(),
                source: clickedNode,
                target: node,
                type: graph.link.LinkTypes.VALUE
            }
        );

        i++;
    });

    // Pin clicked node and its parent to avoid the graph to move for selection, only new value nodes will blossom around the clicked node.
    clickedNode.fixed = true;
    clickedNode.fx = clickedNode.x;
    clickedNode.fy = clickedNode.y;
    if (clickedNode.parent && clickedNode.parent.type !== graph.node.NodeTypes.ROOT) {
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
 * @param node the node to fetch the relationships.
 * @param callback
 * @param directionAngle
 */
graph.node.loadRelationshipData = function (node, callback, directionAngle) {
    var schema = provider.node.getSchema(node.label);

    if (schema !== undefined) {
        if (schema.hasOwnProperty("rel") && schema.rel.length > 0) {
            callback(graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(schema.rel).map(function (d) {
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
        var nodeRelationQuery = query.generateNodeRelationQuery(node);

        logger.info("Relations (" + node.label + ") ==>");
        rest.post(
            {
                "statements": [
                    {
                        "statement": nodeRelationQuery.statement,
                        "parameters": nodeRelationQuery.parameters
                    }]
            })
            .done(function (response) {
                logger.info("<== Relations (" + node.label + ")");
                var parsedData = rest.response.parse(response);

                // Filter data to eventually remove relations if a filter has been defined in config.
                var filteredData = parsedData[0].filter(function (d) {
                    return query.filterRelation(d);
                });

                filteredData = graph.node.pie.startAngle(directionAngle - Math.PI).endAngle(directionAngle + Math.PI)(filteredData).map(function (d) {
                    return {
                        id: d.data.label + d.data.target,
                        label: d.data.label,
                        target: d.data.target,
                        count: d.data.count,
                        startAngle: d.startAngle,
                        endAngle: d.endAngle,
                        directionAngle: (d.startAngle + d.endAngle) / 2
                    }
                });

                callback(filteredData);
            })
            .fail(function (xhr, textStatus, errorThrown) {
                logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + rest.CYPHER_URL + "\" defined in \"rest.CYPHER_URL\" property: " + errorThrown);
                callback([]);
            });
    }
};

/**
 * Expands all the relationships available in node.
 *
 * @param node
 * @param callback
 */
graph.node.expandRelationships = function (node, callback) {
    var callbackCount = 0;

    if (node.hasOwnProperty("relationships") && node.relationships.length > 0) {

        for (var i = 0; i < node.relationships.length; i++) {
            graph.addRelationshipData(node, node.relationships[i], function () {
                callbackCount++;

                if (callbackCount === node.relationships.length) {
                    callback();
                }
            })
        }
    } else {
        callback();
    }
};

/**
 *
 * @param node
 * @param link
 * @param callback
 * @param values
 * @param isNegative
 */
graph.addRelationshipData = function (node, link, callback, values, isNegative) {
    var targetNode = {
        "id": "" + graph.generateId(),
        "parent": node,
        "parentRel": link.label,
        "type": graph.node.NodeTypes.CHOOSE,
        "label": link.target,
        "fixed": false,
        "internalLabel": graph.node.generateInternalLabel(link.target),
        "relationships": []
    };

    if (link.isReverse === true) {
        targetNode.isParentRelReverse = true;
    }

    if (values !== undefined && values.length > 0) {
        targetNode.value = values;
    }
    if (isNegative !== undefined && isNegative === true) {
        targetNode.isNegative = true;
    }

    var newLink = {
        id: "l" + graph.generateId(),
        source: node,
        target: targetNode,
        type: graph.link.LinkTypes.RELATION,
        label: link.label
    };

    targetNode.x = node.x + ((provider.link.getDistance(newLink) * 2 / 3) * Math.cos(link.directionAngle - Math.PI / 2)) + Math.random() * 10;
    targetNode.y = node.y + ((provider.link.getDistance(newLink) * 2 / 3) * Math.sin(link.directionAngle - Math.PI / 2)) + Math.random() * 10;

    targetNode.tx = node.tx + ((provider.link.getDistance(newLink)) * Math.cos(link.directionAngle - Math.PI / 2));
    targetNode.ty = node.ty + ((provider.link.getDistance(newLink)) * Math.sin(link.directionAngle - Math.PI / 2));

    graph.nodes.push(targetNode);
    graph.links.push(newLink);

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
        link.directionAngle
    );


};

/**
 * Remove a node and its relationships (recursively) from the graph.
 *
 * @param node the node to remove.
 */
graph.node.removeNode = function (node) {
    var willChangeResults = node.hasOwnProperty("value") && node.value.length > 0;

    var linksToRemove = graph.links.filter(function (l) {
        return l.source === node;
    });

    // Remove children nodes from model
    linksToRemove.forEach(function (l) {
        var rc = graph.node.removeNode(l.target);
        willChangeResults = willChangeResults || rc;
    });

    // Remove links from model
    for (var i = graph.links.length - 1; i >= 0; i--) {
        if (graph.links[i].target === node) {
            graph.links.splice(i, 1);
        }
    }

    graph.nodes.splice(graph.nodes.indexOf(node), 1);

    return willChangeResults;
};

/**
 * Function to add on node event to clear the selection.
 * Call to this function on a node will remove the selected value and trigger a graph update.
 */
graph.node.clearSelection = function () {
    // Prevent default event like right click  opening menu.
    d3.event.preventDefault();

    // Get clicked node.
    var clickedNode = d3.select(this).data()[0];

    // Collapse all expanded choose nodes first
    graph.node.collapseAllNode();

    if (clickedNode.value !== undefined && clickedNode.value.length > 0 && !clickedNode.immutable) {
        // Remove last value of chosen node
        clickedNode.value.pop();

        if (clickedNode.isNegative === true) {
            if (clickedNode.value.length === 0) {
                // Remove all related nodes
                for (var i = graph.links.length - 1; i >= 0; i--) {
                    if (graph.links[i].source === clickedNode) {
                        graph.node.removeNode(graph.links[i].target);
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

graph.voronoi = d3.voronoi()
    .x(function (d) {
        return d.x;
    })
    .y(function (d) {
        return d.y;
    });

graph.recenterVoronoi = function (nodes) {
    var shapes = [];

    var voronois = graph.voronoi.polygons(nodes.map(function (d) {
        d.x = d.x || 0;
        d.y = d.y || 0;
        return d
    }));

    voronois.forEach(function (d) {
        if (!d.length) {
            return;
        }

        var n = [];
        d.forEach(function (c) {
            n.push([c[0] - d.data.x, c[1] - d.data.y]);
        });

        n.point = d.data;
        shapes.push(n);
    });
    return shapes;
};

export default graph