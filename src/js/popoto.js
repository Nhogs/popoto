/**
 * Popoto.js is a JavaScript library built with D3.js providing a graph based search interface generated in HTML and SVG usable on any modern browser.
 * This library generates an interactive graph query builder into any website or web based application to create dynamic queries on Neo4j databases and display the results.
 *
 * Copyright (C) 2014-2015 Frederic Ciminera
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * contact@popotojs.com
 */
popoto = function () {
    var popoto = {
        version: "1.0"
    };

    /**
     * Main function to call to use Popoto.js.
     * This function will create all the HTML content based on available IDs in the page.
     * popoto.graph.containerId for the graph query builder.
     * popoto.queryviewer.containerId for the query viewer.
     *
     * @param label Root label to use in the graph query builder.
     */
    popoto.start = function (label) {
        popoto.logger.info("Popoto " + popoto.version + " start on label '" + label + "'.");

        popoto.graph.mainLabel = label;

        if (typeof popoto.rest.CYPHER_URL == 'undefined') {
            popoto.logger.error("popoto.rest.CYPHER_URL is not set but this property is required.");
        } else {
            // TODO introduce component generator mechanism instead for future plugin extensions
            popoto.checkHtmlComponents();

            if (popoto.taxonomy.isActive) {
                popoto.taxonomy.createTaxonomyPanel();
            }

            if (popoto.graph.isActive) {
                popoto.graph.createGraphArea();
                popoto.graph.createForceLayout();
                popoto.graph.addRootNode(label);
            }

            if (popoto.queryviewer.isActive) {
                popoto.queryviewer.createQueryArea();
            }

            if (popoto.cypherviewer.isActive) {
                popoto.cypherviewer.createQueryArea();
            }

            popoto.update();
        }
    };

    /**
     * Check in the HTML page the components to generate.
     */
    popoto.checkHtmlComponents = function () {
        var graphHTMLContainer = d3.select("#" + popoto.graph.containerId);
        var taxonomyHTMLContainer = d3.select("#" + popoto.taxonomy.containerId);
        var queryHTMLContainer = d3.select("#" + popoto.queryviewer.containerId);
        var cypherHTMLContainer = d3.select("#" + popoto.cypherviewer.containerId);
        var resultsHTMLContainer = d3.select("#" + popoto.result.containerId);

        if (graphHTMLContainer.empty()) {
            popoto.logger.debug("The page doesn't contain a container with ID = \"" + popoto.graph.containerId + "\" no graph area will be generated. This ID is defined in popoto.graph.containerId property.");
            popoto.graph.isActive = false;
        } else {
            popoto.graph.isActive = true;
        }

        if (taxonomyHTMLContainer.empty()) {
            popoto.logger.debug("The page doesn't contain a container with ID = \"" + popoto.taxonomy.containerId + "\" no taxonomy filter will be generated. This ID is defined in popoto.taxonomy.containerId property.");
            popoto.taxonomy.isActive = false;
        } else {
            popoto.taxonomy.isActive = true;
        }

        if (queryHTMLContainer.empty()) {
            popoto.logger.debug("The page doesn't contain a container with ID = \"" + popoto.queryviewer.containerId + "\" no query viewer will be generated. This ID is defined in popoto.queryviewer.containerId property.");
            popoto.queryviewer.isActive = false;
        } else {
            popoto.queryviewer.isActive = true;
        }

        if (cypherHTMLContainer.empty()) {
            popoto.logger.debug("The page doesn't contain a container with ID = \"" + popoto.cypherviewer.containerId + "\" no cypher query viewer will be generated. This ID is defined in popoto.cypherviewer.containerId property.");
            popoto.cypherviewer.isActive = false;
        } else {
            popoto.cypherviewer.isActive = true;
        }

        if (resultsHTMLContainer.empty()) {
            popoto.logger.debug("The page doesn't contain a container with ID = \"" + popoto.result.containerId + "\" no result area will be generated. This ID is defined in popoto.result.containerId property.");
            popoto.result.isActive = false;
        } else {
            popoto.result.isActive = true;
        }
    };

    /**
     * Function to call to update all the generated elements including svg graph, query viewer and generated results.
     */
    popoto.update = function () {
        popoto.updateGraph();

        if (popoto.queryviewer.isActive) {
            popoto.queryviewer.updateQuery();
        }
        if (popoto.cypherviewer.isActive) {
            popoto.cypherviewer.updateQuery();
        }
        // Results are updated only if needed.
        // If id found in html page or if result listeners have been added.
        // In this case the query must be executed.
        if (popoto.result.isActive || popoto.result.resultListeners.length > 0 || popoto.result.resultCountListeners.length > 0) {
            popoto.result.updateResults();
        }
    };

    /**
     * Function to call to update the graph only.
     */
    popoto.updateGraph = function () {
        if (popoto.graph.isActive) {
            // Starts the D3.js force simulation.
            // This method must be called when the layout is first created, after assigning the nodes and links.
            // In addition, it should be called again whenever the nodes or links change.
            popoto.graph.force.start();
            popoto.graph.link.updateLinks();
            popoto.graph.node.updateNodes();
        }
    };

    // REST ------------------------------------------------------------------------------------------------------------
    popoto.rest = {};

    /**
     * Default REST URL used to call Neo4j server with cypher queries to execute.
     * This property should be updated to access to your own server.
     * @type {string}
     */
    popoto.rest.CYPHER_URL = "http://localhost:7474/db/data/transaction/commit";

    /**
     * Create JQuery ajax POST request to access Neo4j REST API.
     *
     * @param data data object containing Cypher query
     * @returns {*} the JQuery ajax request object.
     */
    popoto.rest.post = function (data) {
        var strData = JSON.stringify(data);
        popoto.logger.info("REST POST:" + strData);

        return $.ajax({
            type: "POST",
            beforeSend: function (request) {
                if (popoto.rest.AUTHORIZATION) {
                    request.setRequestHeader("Authorization", popoto.rest.AUTHORIZATION);
                }
            },
            url: popoto.rest.CYPHER_URL,
            contentType: "application/json",
            data: strData
        });
    };

    // LOGGER -----------------------------------------------------------------------------------------------------------
    popoto.logger = {};
    popoto.logger.LogLevels = Object.freeze({DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4});
    popoto.logger.LEVEL = popoto.logger.LogLevels.NONE;
    popoto.logger.TRACE = false;

    /**
     * Log a message on console depending on configured log levels.
     * Level is define in popoto.logger.LEVEL property.
     * If popoto.logger.TRACE is set to true, the stack trace is also added in log.
     * @param logLevel Level of the message from popoto.logger.LogLevels.
     * @param message Message to log.
     */
    popoto.logger.log = function (logLevel, message) {
        if (console && logLevel >= popoto.logger.LEVEL) {
            if (popoto.logger.TRACE) {
                message = message + "\n" + new Error().stack
            }
            switch (logLevel) {
                case popoto.logger.LogLevels.DEBUG:
                    console.log(message);
                    break;
                case popoto.logger.LogLevels.INFO:
                    console.log(message);
                    break;
                case popoto.logger.LogLevels.WARN:
                    console.warn(message);
                    break;
                case popoto.logger.LogLevels.ERROR:
                    console.error(message);
                    break;
            }
        }
    };

    /**
     * Log a message in DEBUG level.
     * @param message to log.
     */
    popoto.logger.debug = function (message) {
        popoto.logger.log(popoto.logger.LogLevels.DEBUG, message);
    };

    /**
     * Log a message in INFO level.
     * @param message to log.
     */
    popoto.logger.info = function (message) {
        popoto.logger.log(popoto.logger.LogLevels.INFO, message);
    };

    /**
     * Log a message in WARN level.
     * @param message to log.
     */
    popoto.logger.warn = function (message) {
        popoto.logger.log(popoto.logger.LogLevels.WARN, message);
    };

    /**
     * Log a message in ERROR level.
     * @param message to log.
     */
    popoto.logger.error = function (message) {
        popoto.logger.log(popoto.logger.LogLevels.ERROR, message);
    };

    // TAXONOMIES  -----------------------------------------------------------------------------------------------------

    popoto.taxonomy = {};
    popoto.taxonomy.containerId = "popoto-taxonomy";

    /**
     * Create the taxonomy panel HTML elements.
     */
    popoto.taxonomy.createTaxonomyPanel = function () {
        var htmlContainer = d3.select("#" + popoto.taxonomy.containerId);

        var taxoUL = htmlContainer.append("ul");

        var data = popoto.taxonomy.generateTaxonomiesData();

        var taxos = taxoUL.selectAll(".taxo").data(data);

        var taxoli = taxos.enter().append("li")
            .attr("id", function (d) {
                return d.id
            })
            .attr("value", function (d) {
                return d.label;
            });

        taxoli.append("span")
            .attr("class", "ppt-taxo-tag")
            .html("&nbsp;");

        taxoli.append("span")
            .attr("class", "ppt-label")
            .text(function (d) {
                return popoto.provider.getTaxonomyTextValue(d.label);
            });

        taxoli.append("span")
            .attr("class", "ppt-count");

        // Add an on click event on the taxonomy to clear the graph and set this label as root
        taxoli.on("click", popoto.taxonomy.onClick);

        popoto.taxonomy.addTaxonomyChildren(taxoli);

        // The count is updated for each labels.
        var flattenData = [];
        data.forEach(function (d) {
            flattenData.push(d);
            if (d.children) {
                popoto.taxonomy.flattenChildren(d, flattenData);
            }
        });

        popoto.taxonomy.updateCount(flattenData);
    };

    /**
     * Recursive function to flatten data content.
     *
     */
    popoto.taxonomy.flattenChildren = function (d, vals) {
        d.children.forEach(function (c) {
            vals.push(c);
            if (c.children) {
                vals.concat(popoto.taxonomy.flattenChildren(c, vals));
            }
        });
    };

    /**
     * Updates the count number on a taxonomy.
     *
     * @param taxonomyData
     */
    popoto.taxonomy.updateCount = function (taxonomyData) {
        var statements = [];

        taxonomyData.forEach(function (taxo) {
            statements.push(
                {
                    "statement": popoto.query.generateTaxonomyCountQuery(taxo.label)
                }
            );
        });

        (function (taxonomies) {
            popoto.logger.info("Count taxonomies ==> ");
            popoto.rest.post(
                {
                    "statements": statements
                })
                .done(function (returnedData) {
                    for (var i = 0; i < taxonomies.length; i++) {
                        var count = returnedData.results[i].data[0].row[0];
                        d3.select("#" + taxonomies[i].id)
                            .select(".ppt-count")
                            .text(" (" + count + ")");
                    }
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    popoto.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + popoto.rest.CYPHER_URL + "\" defined in \"popoto.rest.CYPHER_URL\" property: " + errorThrown);
                    d3.select("#popoto-taxonomy")
                        .selectAll(".ppt-count")
                        .text(" (0)");
                });
        })(taxonomyData);
    };

    /**
     * Recursively generate the taxonomy children elements.
     *
     * @param selection
     */
    popoto.taxonomy.addTaxonomyChildren = function (selection) {
        selection.each(function (d) {
            var li = d3.select(this);

            var children = d.children;
            if (d.children) {
                var childLi = li.append("ul")
                    .selectAll("li")
                    .data(children)
                    .enter()
                    .append("li")
                    .attr("id", function (d) {
                        return d.id
                    })
                    .attr("value", function (d) {
                        return d.label;
                    });

                childLi.append("span")
                    .attr("class", "ppt-taxo-tag")
                    .html("&nbsp;");

                childLi.append("span")
                    .attr("class", "ppt-label")
                    .text(function (d) {
                        return popoto.provider.getTaxonomyTextValue(d.label);
                    });

                childLi.append("span")
                    .attr("class", "ppt-count");

                childLi.on("click", popoto.taxonomy.onClick);

                popoto.taxonomy.addTaxonomyChildren(childLi);
            }

        });
    };

    popoto.taxonomy.onClick = function () {
        d3.event.stopPropagation();

        // Workaround to avoid click on taxonomies if root node has not yet been initialized
        // If it contains a count it mean all the initialization has been done
        var root = popoto.graph.getRootNode();
        if (root.count === undefined) {
            return;
        }

        var label = this.attributes.value.value;

        while (popoto.graph.force.nodes().length > 0) {
            popoto.graph.force.nodes().pop();
        }

        while (popoto.graph.force.links().length > 0) {
            popoto.graph.force.links().pop();
        }

        // Reinitialize internal label generator
        popoto.graph.node.internalLabels = {};

        popoto.update();
        popoto.graph.addRootNode(label);
        popoto.graph.hasGraphChanged = true;
        popoto.result.hasChanged = true;
        popoto.update();
        popoto.tools.center();
    };

    /**
     * Parse the list of label providers and return a list of data object containing only searchable labels.
     * @returns {Array}
     */
    popoto.taxonomy.generateTaxonomiesData = function () {
        var id = 0;
        var data = [];

        // Retrieve root providers (searchable and without parent)
        for (var label in popoto.provider.nodeProviders) {
            if (popoto.provider.nodeProviders.hasOwnProperty(label)) {
                if (popoto.provider.getProperty(label, "isSearchable") && !popoto.provider.nodeProviders[label].parent) {
                    data.push({
                        "label": label,
                        "id": "popoto-lbl-" + id++
                    });
                }
            }
        }

        // Add children data for each provider with children.
        data.forEach(function (d) {
            if (popoto.provider.getProvider(d.label).hasOwnProperty("children")) {
                id = popoto.taxonomy.addChildrenData(d, id);
            }
        });

        return data;
    };

    /**
     * Add children providers data.
     * @param parentData
     * @param id
     */
    popoto.taxonomy.addChildrenData = function (parentData, id) {
        parentData.children = [];

        popoto.provider.getProvider(parentData.label).children.forEach(function (d) {
            var childProvider = popoto.provider.getProvider(d);
            var childData = {
                "label": d,
                "id": "popoto-lbl-" + id++
            };
            if (childProvider.hasOwnProperty("children")) {
                id = popoto.taxonomy.addChildrenData(childData, id);
            }
            if (popoto.provider.getProperty(d, "isSearchable")) {
                parentData.children.push(childData);
            }
        });

        return id;
    };

    // TOOLS -----------------------------------------------------------------------------------------------------------

    popoto.tools = {};
    // TODO introduce plugin mechanism to add tools
    popoto.tools.CENTER_GRAPH = true;
    popoto.tools.RESET_GRAPH = true;
    popoto.tools.TOGGLE_TAXONOMY = true;
    popoto.tools.TOGGLE_FULL_SCREEN = true;

    /**
     * Reset the graph to display the root node only.
     */
    popoto.tools.reset = function () {
        while (popoto.graph.force.nodes().length > 0) {
            popoto.graph.force.nodes().pop();
        }

        while (popoto.graph.force.links().length > 0) {
            popoto.graph.force.links().pop();
        }

        // Reinitialize internal label generator
        popoto.graph.node.internalLabels = {};

        popoto.update();
        popoto.graph.addRootNode(popoto.graph.mainLabel);
        popoto.graph.hasGraphChanged = true;
        popoto.result.hasChanged = true;
        popoto.update();
        popoto.tools.center();
    };

    /**
     * Reset zoom and center the view on svg center.
     */
    popoto.tools.center = function () {
        popoto.graph.zoom.translate([0, 0]).scale(1);
        popoto.graph.svg.transition().attr("transform", "translate(" + popoto.graph.zoom.translate() + ")" + " scale(" + popoto.graph.zoom.scale() + ")");
    };

    /**
     * Show, hide taxonomy panel.
     */
    popoto.tools.toggleTaxonomy = function () {
        var taxo = d3.select("#" + popoto.taxonomy.containerId);
        if (taxo.filter(".disabled").empty()) {
            taxo.classed("disabled", true);
        } else {
            taxo.classed("disabled", false);
        }
    };

    popoto.tools.toggleFullScreen = function () {

        var elem = document.getElementById(popoto.graph.containerId);

        if (!document.fullscreenElement &&    // alternative standard method
            !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {  // current working methods
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    };
    // GRAPH -----------------------------------------------------------------------------------------------------------

    popoto.graph = {};

    /**
     * ID of the HTML component where the graph query builder elements will be generated in.
     * @type {string}
     */
    popoto.graph.containerId = "popoto-graph";
    popoto.graph.hasGraphChanged = true;
    // Defines the min and max level of zoom available in graph query builder.
    popoto.graph.zoom = d3.behavior.zoom().scaleExtent([0.1, 10]);
    popoto.graph.WHEEL_ZOOM_ENABLED = true;
    popoto.graph.TOOL_TAXONOMY = "Show/hide taxonomy panel";
    popoto.graph.TOOL_CENTER = "Center view";
    popoto.graph.TOOL_FULL_SCREEN = "Full screen";
    popoto.graph.TOOL_RESET = "Reset graph";

    /**
     * Define the list of listenable events on graph.
     */
    popoto.graph.Events = Object.freeze({NODE_ROOT_ADD: "root.node.add", NODE_EXPAND_RELATIONSHIP: "node.expandRelationship"});

    /**
     * Generates all the HTML and SVG element needed to display the graph query builder.
     * Everything will be generated in the container with id defined by popoto.graph.containerId.
     */
    popoto.graph.createGraphArea = function () {

        var htmlContainer = d3.select("#" + popoto.graph.containerId);

        var toolbar = htmlContainer
            .append("div")
            .attr("class", "ppt-toolbar");

        if (popoto.tools.RESET_GRAPH) {
            toolbar.append("span")
                .attr("id", "popoto-reset-menu")
                .attr("class", "ppt-menu reset")
                .attr("title", popoto.graph.TOOL_RESET)
                .on("click", popoto.tools.reset);
        }

        if (popoto.taxonomy.isActive && popoto.tools.TOGGLE_TAXONOMY) {
            toolbar.append("span")
                .attr("id", "popoto-taxonomy-menu")
                .attr("class", "ppt-menu taxonomy")
                .attr("title", popoto.graph.TOOL_TAXONOMY)
                .on("click", popoto.tools.toggleTaxonomy);
        }

        if (popoto.tools.CENTER_GRAPH) {
            toolbar.append("span")
                .attr("id", "popoto-center-menu")
                .attr("class", "ppt-menu center")
                .attr("title", popoto.graph.TOOL_CENTER)
                .on("click", popoto.tools.center);
        }

        if (popoto.tools.TOGGLE_FULL_SCREEN) {
            toolbar.append("span")
                .attr("id", "popoto-fullscreen-menu")
                .attr("class", "ppt-menu fullscreen")
                .attr("title", popoto.graph.TOOL_FULL_SCREEN)
                .on("click", popoto.tools.toggleFullScreen);
        }

        var svgTag = htmlContainer.append("svg").call(popoto.graph.zoom.on("zoom", popoto.graph.rescale));

        svgTag.on("dblclick.zoom", null)
            .attr("class", "ppt-svg-graph");

        if (!popoto.graph.WHEEL_ZOOM_ENABLED) {
            // Disable mouse wheel events.
            svgTag.on("wheel.zoom", null)
                .on("mousewheel.zoom", null);
        }

        popoto.graph.svg = svgTag.append('svg:g');

        // Create two separated area for links and nodes
        // Links and nodes are separated in a dedicated "g" element
        // and nodes are generated after links to ensure that nodes are always on foreground.
        popoto.graph.svg.append("g").attr("id", popoto.graph.link.gID);
        popoto.graph.svg.append("g").attr("id", popoto.graph.node.gID);

        // This listener is used to center the root node in graph during a window resize.
        // TODO can the listener be limited on the parent container only?
        window.addEventListener('resize', popoto.graph.centerRootNode);
    };

    popoto.graph.centerRootNode = function () {
        popoto.graph.getRootNode().px = popoto.graph.getSVGWidth() / 2;
        popoto.graph.getRootNode().py = popoto.graph.getSVGHeight() / 2;
        popoto.update();
    };

    /**
     * Get the actual width of the SVG element containing the graph query builder.
     * @returns {number}
     */
    popoto.graph.getSVGWidth = function () {
        if (typeof popoto.graph.svg == 'undefined' || popoto.graph.svg.empty()) {
            popoto.logger.debug("popoto.graph.svg is undefined or empty.");
            return 0;
        } else {
            return document.getElementById(popoto.graph.containerId).clientWidth;
        }
    };

    /**
     * Get the actual height of the SVG element containing the graph query builder.
     * @returns {number}
     */
    popoto.graph.getSVGHeight = function () {
        if (typeof popoto.graph.svg == 'undefined' || popoto.graph.svg.empty()) {
            popoto.logger.debug("popoto.graph.svg is undefined or empty.");
            return 0;
        } else {
            return document.getElementById(popoto.graph.containerId).clientHeight;
        }
    };

    /**
     * Function to call on SVG zoom event to update the svg transform attribute.
     */
    popoto.graph.rescale = function () {
        var trans = d3.event.translate,
            scale = d3.event.scale;

        popoto.graph.svg.attr("transform",
            "translate(" + trans + ")"
            + " scale(" + scale + ")");
    };

    /******************************
     * Default parameters used to configure D3.js force layout.
     * These parameter can be modified to change graph behavior.
     ******************************/
    popoto.graph.LINK_DISTANCE = 150;
    popoto.graph.LINK_STRENGTH = 1;
    popoto.graph.FRICTION = 0.8;
    popoto.graph.CHARGE = -1400;
    popoto.graph.THETA = 0.8;
    popoto.graph.GRAVITY = 0.0;

    /**
     * Contains the list off root node add listeners.
     */
    popoto.graph.rootNodeAddListeners = [];
    popoto.graph.nodeExpandRelationsipListeners = [];

    /**
     *  Create the D3.js force layout for the graph query builder.
     */
    popoto.graph.createForceLayout = function () {

        popoto.graph.force = d3.layout.force()
            .size([popoto.graph.getSVGWidth(), popoto.graph.getSVGHeight()])
            .linkDistance(function (d) {
                if (d.type === popoto.graph.link.LinkTypes.RELATION) {
                    return ((3 * popoto.graph.LINK_DISTANCE) / 2);
                } else {
                    return popoto.graph.LINK_DISTANCE;
                }
            })
            .linkStrength(function (d) {
                if (d.linkStrength) {
                    return d.linkStrength;
                } else {
                    return popoto.graph.LINK_STRENGTH;
                }
            })
            .friction(popoto.graph.FRICTION)
            .charge(function (d) {
                if (d.charge) {
                    return d.charge;
                } else {
                    return popoto.graph.CHARGE;
                }
            })
            .theta(popoto.graph.THETA)
            .gravity(popoto.graph.GRAVITY)
            .on("tick", popoto.graph.tick); // Function called on every position update done by D3.js

        // Disable event propagation on drag to avoid zoom and pan issues
        popoto.graph.force.drag()
            .on("dragstart", function (d) {
                d3.event.sourceEvent.stopPropagation();
            })
            .on("dragend", function (d) {
                d3.event.sourceEvent.stopPropagation();
            });
    };

    /**
     * Add a listener to the specified event.
     *
     * @param event name of the event to add the listener.
     * @param listener the listener to add.
     */
    popoto.graph.on = function (event, listener) {
        if (event === popoto.graph.Events.NODE_ROOT_ADD) {
            popoto.graph.rootNodeAddListeners.push(listener);
        }
        if (event === popoto.graph.Events.NODE_EXPAND_RELATIONSHIP) {
            popoto.graph.nodeExpandRelationsipListeners.push(listener);
        }
    };

    /**
     * Adds graph root nodes using the label set as parameter.
     * All the other nodes should have been removed first to avoid inconsistent data.
     *
     * @param label label of the node to add as root.
     */
    popoto.graph.addRootNode = function (label) {
        if (popoto.graph.force.nodes().length > 0) {
            popoto.logger.debug("popoto.graph.addRootNode is called but the graph is not empty.");
        }

        popoto.graph.force.nodes().push({
            "id": "0",
            "type": popoto.graph.node.NodeTypes.ROOT,
            // x and y coordinates are set to the center of the SVG area.
            // These coordinate will never change at runtime except if the window is resized.
            "x": popoto.graph.getSVGWidth() / 2,
            "y": popoto.graph.getSVGHeight() / 2,
            "label": label,
            // The node is fixed to always remain in the center of the svg area.
            // This property should not be changed at runtime to avoid issues with the zoom and pan.
            "fixed": true,
            // Label used internally to identify the node.
            // This label is used for example as cypher query identifier.
            "internalLabel": popoto.graph.node.generateInternalLabel(label)
        });

        // Notify listeners
        popoto.graph.rootNodeAddListeners.forEach(function (listener) {
            listener(popoto.graph.getRootNode());
        });
    };

    /**
     * Get the graph root node.
     * @returns {*}
     */
    popoto.graph.getRootNode = function () {
        return popoto.graph.force.nodes()[0];
    };

    /**
     * Function to call on D3.js force layout tick event.
     * This function will update the position of all links and nodes elements in the graph with the force layout computed coordinate.
     */
    popoto.graph.tick = function () {
        popoto.graph.svg.selectAll("#" + popoto.graph.link.gID + " > g")
            .selectAll("path")
            .attr("d", function (d) {
                var parentAngle = popoto.graph.computeParentAngle(d.target);
                var targetX = d.target.x + (popoto.graph.link.RADIUS * Math.cos(parentAngle)),
                    targetY = d.target.y - (popoto.graph.link.RADIUS * Math.sin(parentAngle));

                var sourceX = d.source.x - (popoto.graph.link.RADIUS * Math.cos(parentAngle)),
                    sourceY = d.source.y + (popoto.graph.link.RADIUS * Math.sin(parentAngle));

                if (d.source.x <= d.target.x) {
                    return "M" + sourceX + " " + sourceY + "L" + targetX + " " + targetY;
                } else {
                    return "M" + targetX + " " + targetY + "L" + sourceX + " " + sourceY;
                }
            });

        popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g")
            .attr("transform", function (d) {
                return "translate(" + (d.x) + "," + (d.y) + ")";
            });
    };

    // LINKS -----------------------------------------------------------------------------------------------------------
    popoto.graph.link = {};

    /**
     * Defines the radius around the node to start link drawing.
     * If set to 0 links will start from the middle of the node.
     */
    popoto.graph.link.RADIUS = 25;

    // ID of the g element in SVG graph containing all the link elements.
    popoto.graph.link.gID = "popoto-glinks";

    /**
     * Defines the different type of link.
     * RELATION is a relation link between two nodes.
     * VALUE is a link between a generic node and a value.
     */
    popoto.graph.link.LinkTypes = Object.freeze({RELATION: 0, VALUE: 1});

    /**
     * Function to call to update the links after modification in the model.
     * This function will update the graph with all removed, modified or added links using d3.js mechanisms.
     */
    popoto.graph.link.updateLinks = function () {
        popoto.graph.link.svgLinkElements = popoto.graph.svg.select("#" + popoto.graph.link.gID).selectAll("g");
        popoto.graph.link.updateData();
        popoto.graph.link.removeElements();
        popoto.graph.link.addNewElements();
        popoto.graph.link.updateElements();
    };

    /**
     * Update the links element with data coming from popoto.graph.force.links().
     */
    popoto.graph.link.updateData = function () {
        popoto.graph.link.svgLinkElements = popoto.graph.link.svgLinkElements.data(popoto.graph.force.links(), function (d) {
            return d.id;
        });
    };

    /**
     * Clean links elements removed from the list.
     */
    popoto.graph.link.removeElements = function () {
        popoto.graph.link.svgLinkElements.exit().remove();
    };

    /**
     * Create new elements.
     */
    popoto.graph.link.addNewElements = function () {

        var newLinkElements = popoto.graph.link.svgLinkElements.enter().append("g")
            .attr("class", "ppt-glink")
            .on("mouseover", popoto.graph.link.mouseOverLink)
            .on("mouseout", popoto.graph.link.mouseOutLink);

        newLinkElements.append("path");

        newLinkElements.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "-4")
            .append("textPath")
            .attr("class", "ppt-textPath")
            .attr("startOffset", "50%");

    };

    /**
     * Update all the elements (new + modified)
     */
    popoto.graph.link.updateElements = function () {
        popoto.graph.link.svgLinkElements
            .attr("id", function (d) {
                return "ppt-glink_" + d.id;
            });

        popoto.graph.link.svgLinkElements.selectAll("path")
            .attr("id", function (d) {
                return "ppt-path_" + d.id
            })
            .attr("class", function (d) {
                if (d.type === popoto.graph.link.LinkTypes.VALUE) {
                    return "ppt-link-value";
                } else {
                    if (d.target.count == 0) {
                        return "ppt-link-relation disabled";
                    } else {
                        if (d.target.value !== undefined) {
                            return "ppt-link-relation value";
                        } else {
                            return "ppt-link-relation";
                        }
                    }
                }
            });

        // Due to a bug on webkit browsers (as of 30/01/2014) textPath cannot be selected
        // To workaround this issue the selection is done with its associated css class
        popoto.graph.link.svgLinkElements.selectAll("text")
            .attr("id", function (d) {
                return "ppt-text_" + d.id
            })
            .attr("class", function (d) {
                if (d.type === popoto.graph.link.LinkTypes.VALUE) {
                    return "ppt-link-text-value";
                } else {
                    if (d.target.count == 0) {
                        return "ppt-link-text-relation disabled";
                    } else {
                        if (d.target.value !== undefined) {
                            return "ppt-link-text-relation value";
                        } else {
                            return "ppt-link-text-relation";
                        }
                    }
                }
            })
            .selectAll(".ppt-textPath")
            .attr("id", function (d) {
                return "ppt-textpath_" + d.id
            })
            .attr("xlink:href", function (d) {
                return "#ppt-path_" + d.id
            })
            .text(function (d) {
                return popoto.provider.getLinkTextValue(d);
            });
    };

    /**
     * Function called when mouse is over the link.
     * This function is used to change the CSS class on hover of the link and query viewer element.
     *
     * TODO try to introduce event instead of directly access query spans here. This could be used in future extensions.
     */
    popoto.graph.link.mouseOverLink = function () {
        d3.select(this).select("path").classed("ppt-link-hover", true);
        d3.select(this).select("text").classed("ppt-link-hover", true);

        var hoveredLink = d3.select(this).data()[0];

        if (popoto.queryviewer.isActive) {
            popoto.queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredLink;
            }).classed("hover", true);
            popoto.queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredLink;
            }).classed("hover", true);
        }

        if (popoto.cypherviewer.isActive) {
            popoto.cypherviewer.querySpanElements.filter(function (d) {
                return d.link === hoveredLink;
            }).classed("hover", true);
        }
    };

    /**
     * Function called when mouse goes out of the link.
     * This function is used to reinitialize the CSS class of the link and query viewer element.
     */
    popoto.graph.link.mouseOutLink = function () {
        d3.select(this).select("path").classed("ppt-link-hover", false);
        d3.select(this).select("text").classed("ppt-link-hover", false);

        var hoveredLink = d3.select(this).data()[0];

        if (popoto.queryviewer.isActive) {
            popoto.queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredLink;
            }).classed("hover", false);
            popoto.queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredLink;
            }).classed("hover", false);
        }

        if (popoto.cypherviewer.isActive) {
            popoto.cypherviewer.querySpanElements.filter(function (d) {
                return d.link === hoveredLink;
            }).classed("hover", false);
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // NODES -----------------------------------------------------------------------------------------------------------

    popoto.graph.node = {};

    // ID of the g element in SVG graph containing all the link elements.
    popoto.graph.node.gID = "popoto-gnodes";

    // Node ellipse size used by default for text nodes.
    popoto.graph.node.ELLIPSE_RX = 50;
    popoto.graph.node.ELLIPSE_RY = 25;
    popoto.graph.node.TEXT_Y = 8;
    popoto.graph.node.BACK_CIRCLE_R = 70;
    // Define the max number of character displayed in ellipses.
    popoto.graph.node.NODE_MAX_CHARS = 11;

    // Number of nodes displayed per page during value selection.
    popoto.graph.node.PAGE_SIZE = 10;

    // Count box default size
    popoto.graph.node.CountBox = {x: 16, y: 33, w: 52, h: 19};

    // Store choose node state to avoid multiple node expand at the same time
    popoto.graph.node.chooseWaiting = false;

    /**
     * Defines the list of possible nodes.
     * ROOT: Node used as graph root. It is the target of the query. Only one node of this type should be available in graph.
     * CHOOSE: Nodes defining a generic node label. From these node is is possible to select a value or explore relations.
     * VALUE: Unique node containing a value constraint. Usually replace CHOOSE nodes once a value as been selected.
     * GROUP: Empty node used to group relations. No value can be selected but relations can be explored. These nodes doesn't have count.
     */
    popoto.graph.node.NodeTypes = Object.freeze({ROOT: 0, CHOOSE: 1, VALUE: 2, GROUP: 3});

    // Variable used to generate unique id for each new nodes.
    popoto.graph.node.idgen = 0;

    // Used to generate unique internal labels used for example as identifier in Cypher query.
    popoto.graph.node.internalLabels = {};

    /**
     * Create a normalized identifier from a node label.
     * Multiple calls with the same node label will generate different unique identifier.
     *
     * @param nodeLabel
     * @returns {string}
     */
    popoto.graph.node.generateInternalLabel = function (nodeLabel) {
        var label = nodeLabel.toLowerCase().replace(/ /g, '');

        if (label in popoto.graph.node.internalLabels) {
            popoto.graph.node.internalLabels[label] = popoto.graph.node.internalLabels[label] + 1;
        } else {
            popoto.graph.node.internalLabels[label] = 0;
            return label;
        }

        return label + popoto.graph.node.internalLabels[label];
    };

    /**
     * Update Nodes SVG elements using D3.js update mechanisms.
     */
    popoto.graph.node.updateNodes = function () {
        if (!popoto.graph.node.svgNodeElements) {
            popoto.graph.node.svgNodeElements = popoto.graph.svg.select("#" + popoto.graph.node.gID).selectAll("g");
        }
        popoto.graph.node.updateData();
        popoto.graph.node.removeElements();
        popoto.graph.node.addNewElements();
        popoto.graph.node.updateElements();
    };

    /**
     * Update node data with changes done in popoto.graph.force.nodes() model.
     */
    popoto.graph.node.updateData = function () {
        popoto.graph.node.svgNodeElements = popoto.graph.node.svgNodeElements.data(popoto.graph.force.nodes(), function (d) {
            return d.id;
        });

        if (popoto.graph.hasGraphChanged) {
            popoto.graph.node.updateCount();
            popoto.graph.hasGraphChanged = false;
        }
    };

    /**
     * Update nodes count by executing a query for every nodes with the new graph structure.
     */
    popoto.graph.node.updateCount = function () {

        var statements = [];

        var counterNodes = popoto.graph.force.nodes()
            .filter(function (d) {
                return d.type !== popoto.graph.node.NodeTypes.VALUE && d.type !== popoto.graph.node.NodeTypes.GROUP;
            });

        counterNodes.forEach(function (node) {
            var query = popoto.query.generateNodeCountCypherQuery(node);
            statements.push(
                {
                    "statement": query
                }
            );
        });

        popoto.logger.info("Count nodes ==> ");
        popoto.rest.post(
            {
                "statements": statements
            })
            .done(function (returnedData) {

                if (returnedData.errors && returnedData.errors.length > 0) {
                    popoto.logger.error("Cypher query error:" + JSON.stringify(returnedData.errors));
                }

                if (returnedData.results && returnedData.results.length > 0) {
                    for (var i = 0; i < counterNodes.length; i++) {
                        counterNodes[i].count = returnedData.results[i].data[0].row[0];
                    }
                } else {
                    counterNodes.forEach(function (node) {
                        node.count = 0;
                    });
                }
                popoto.graph.node.updateElements();
                popoto.graph.link.updateElements();
            })
            .fail(function (xhr, textStatus, errorThrown) {
                popoto.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + popoto.rest.CYPHER_URL + "\" defined in \"popoto.rest.CYPHER_URL\" property: " + errorThrown);
                counterNodes.forEach(function (node) {
                    node.count = 0;
                });
                popoto.graph.node.updateElements();
                popoto.graph.link.updateElements();
            });
    };

    /**
     * Remove old elements.
     * Should be called after updateData.
     */
    popoto.graph.node.removeElements = function () {
        var toRemove = popoto.graph.node.svgNodeElements.exit();

        // Nodes without parent are simply removed.
        toRemove.filter(function (d) {
            return !d.parent;
        }).remove();

        // Nodes with a parent are removed with an animation (nodes are collapsed to their parents before being removed)
        toRemove.filter(function (d) {
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
    popoto.graph.node.addNewElements = function () {
        var gNewNodeElements = popoto.graph.node.svgNodeElements.enter()
            .append("g")
            .on("click", popoto.graph.node.nodeClick)
            .on("mouseover", popoto.graph.node.mouseOverNode)
            .on("mouseout", popoto.graph.node.mouseOutNode);

        // Add right click on all nodes except value
        gNewNodeElements.filter(function (d) {
            return d.type !== popoto.graph.node.NodeTypes.VALUE;
        }).on("contextmenu", popoto.graph.node.clearSelection);

        // Disable right click context menu on value nodes
        gNewNodeElements.filter(function (d) {
            return d.type === popoto.graph.node.NodeTypes.VALUE;
        }).on("contextmenu", function () {
            // Disable context menu on
            d3.event.preventDefault();
        });

        // Most browser will generate a tooltip if a title is specified for the SVG element
        // TODO Introduce an SVG tooltip instead?
        gNewNodeElements.append("title").attr("class", "ppt-svg-title");

        // Nodes are composed of 3 layouts and skeleton are created here.
        popoto.graph.node.addBackgroundElements(gNewNodeElements);
        popoto.graph.node.addMiddlegroundElements(gNewNodeElements);
        popoto.graph.node.addForegroundElements(gNewNodeElements);
    };

    /**
     * Create the background for a new node element.
     * The background of a node is defined by a circle not visible by default (fill-opacity set to 0) but can be used to highlight a node with animation on this attribute.
     * This circle also define the node zone that can receive events like mouse clicks.
     *
     * @param gNewNodeElements
     */
    popoto.graph.node.addBackgroundElements = function (gNewNodeElements) {
        var background = gNewNodeElements
            .append("g")
            .attr("class", "ppt-g-node-background");

        background.append("circle")
            .attr("class", function (d) {
                var cssClass = "ppt-node-background-circle";
                if (d.value !== undefined) {
                    cssClass = cssClass + " selected-value";
                } else if (d.type === popoto.graph.node.NodeTypes.ROOT) {
                    cssClass = cssClass + " root";
                } else if (d.type === popoto.graph.node.NodeTypes.CHOOSE) {
                    cssClass = cssClass + " choose";
                } else if (d.type === popoto.graph.node.NodeTypes.VALUE) {
                    cssClass = cssClass + " value";
                } else if (d.type === popoto.graph.node.NodeTypes.GROUP) {
                    cssClass = cssClass + " group";
                }

                return cssClass;
            })
            .style("fill-opacity", 0)
            .attr("r", popoto.graph.node.BACK_CIRCLE_R);
    };

    /**
     * Create the node main elements.
     *
     * @param gNewNodeElements
     */
    popoto.graph.node.addMiddlegroundElements = function (gNewNodeElements) {
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
    popoto.graph.node.addForegroundElements = function (gNewNodeElements) {
        var foreground = gNewNodeElements
            .append("g")
            .attr("class", "ppt-g-node-foreground");

        // plus sign
        var gRelationship = foreground.filter(function (d) {
            return d.type !== popoto.graph.node.NodeTypes.VALUE;
        }).append("g").attr("class", "ppt-rel-plus-icon");

        gRelationship.append("title")
            .text("Add relationship");

        gRelationship
            .append("circle")
            .attr("class", "ppt-rel-plus-background")
            .attr("cx", "32")
            .attr("cy", "-43")
            .attr("r", "16");

        gRelationship
            .append("path")
            .attr("class", "ppt-rel-plus-path")
            .attr("d", "M 40,-45 35,-45 35,-50 30,-50 30,-45 25,-45 25,-40 30,-40 30,-35 35,-35 35,-40 40,-40 z");

        gRelationship
            .on("mouseover", function () {
                d3.select(this).select(".ppt-rel-plus-background").transition().style("fill-opacity", 0.5);
            })
            .on("mouseout", function () {
                d3.select(this).select(".ppt-rel-plus-background").transition().style("fill-opacity", 0);
            })
            .on("click", function () {
                d3.event.stopPropagation(); // To avoid click event on svg element in background
                popoto.graph.node.expandRelationship.call(this);
            });

        // Minus sign
        var gMinusRelationship = foreground.filter(function (d) {
            return d.type !== popoto.graph.node.NodeTypes.VALUE;
        }).append("g").attr("class", "ppt-rel-minus-icon");

        gMinusRelationship.append("title")
            .text("Remove relationship");

        gMinusRelationship
            .append("circle")
            .attr("class", "ppt-rel-minus-background")
            .attr("cx", "32")
            .attr("cy", "-43")
            .attr("r", "16");

        gMinusRelationship
            .append("path")
            .attr("class", "ppt-rel-minus-path")
            .attr("d", "M 40,-45 25,-45 25,-40 40,-40 z");

        gMinusRelationship
            .on("mouseover", function () {
                d3.select(this).select(".ppt-rel-minus-background").transition().style("fill-opacity", 0.5);
            })
            .on("mouseout", function () {
                d3.select(this).select(".ppt-rel-minus-background").transition().style("fill-opacity", 0);
            })
            .on("click", function () {
                d3.event.stopPropagation(); // To avoid click event on svg element in background
                popoto.graph.node.collapseRelationship.call(this);
            });

        // Arrows icons added only for root and choose nodes
        var gArrow = foreground.filter(function (d) {
            return d.type === popoto.graph.node.NodeTypes.ROOT || d.type === popoto.graph.node.NodeTypes.CHOOSE;
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
                popoto.graph.node.collapseNode(clickedNode);
                popoto.graph.node.expandNode(clickedNode);
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

            if (clickedNode.page * popoto.graph.node.PAGE_SIZE < clickedNode.count) {
                clickedNode.page++;
                popoto.graph.node.collapseNode(clickedNode);
                popoto.graph.node.expandNode(clickedNode);
            }
        });

        // Count box
        var countForeground = foreground.filter(function (d) {
            return d.type !== popoto.graph.node.NodeTypes.GROUP;
        });

        countForeground
            .append("rect")
            .attr("x", popoto.graph.node.CountBox.x)
            .attr("y", popoto.graph.node.CountBox.y)
            .attr("width", popoto.graph.node.CountBox.w)
            .attr("height", popoto.graph.node.CountBox.h)
            .attr("class", "ppt-count-box");

        countForeground
            .append("text")
            .attr("x", 42)
            .attr("y", 48)
            .attr("text-anchor", "middle")
            .attr("class", "ppt-count-text");
    };

    /**
     * Updates all elements.
     */
    popoto.graph.node.updateElements = function () {
        popoto.graph.node.svgNodeElements.attr("id", function (d) {
            return "popoto-gnode_" + d.id;
        });

        popoto.graph.node.svgNodeElements
            .selectAll(".ppt-svg-title")
            .text(function (d) {
                // TODO add new property in config to truncate text and not directly in getTextValue to avoid truncated text in title?
                return popoto.provider.getTextValue(d);
            });

        popoto.graph.node.svgNodeElements.filter(function (n) {
            return n.type !== popoto.graph.node.NodeTypes.ROOT
        }).call(popoto.graph.force.drag);

        popoto.graph.node.updateBackgroundElements();
        popoto.graph.node.updateMiddlegroundElements();
        popoto.graph.node.updateForegroundElements();
    };

    popoto.graph.node.updateBackgroundElements = function () {
        popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-background")
            .selectAll(".ppt-node-background-circle")
            .attr("class", function (d) {
                var cssClass = "ppt-node-background-circle";

                if (d.type === popoto.graph.node.NodeTypes.VALUE) {
                    cssClass = cssClass + " value";
                } else if (d.type === popoto.graph.node.NodeTypes.GROUP) {
                    cssClass = cssClass + " group";
                } else {
                    if (d.value !== undefined) {
                        if (d.type === popoto.graph.node.NodeTypes.ROOT) {
                            cssClass = cssClass + " selected-root-value";
                        } else if (d.type === popoto.graph.node.NodeTypes.CHOOSE) {
                            cssClass = cssClass + " selected-value";
                        }
                    } else {
                        if (d.count == 0) {
                            cssClass = cssClass + " disabled";
                        } else {
                            if (d.type === popoto.graph.node.NodeTypes.ROOT) {
                                cssClass = cssClass + " root";
                            } else if (d.type === popoto.graph.node.NodeTypes.CHOOSE) {
                                cssClass = cssClass + " choose";
                            }
                        }
                    }
                }

                return cssClass;
            })
            .attr("r", popoto.graph.node.BACK_CIRCLE_R);
    };

    /**
     * Update the middle layer of nodes.
     * TODO refactor node generation to allow future extensions (for example add plugin with new node types...)
     */
    popoto.graph.node.updateMiddlegroundElements = function () {

        var middleG = popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-middleground");

        // Clear all content in case node type has changed
        middleG.selectAll("*").remove();

        //-------------------------------
        // Update IMAGE nodes
        var imageMiddle = middleG.filter(function (d) {
            return popoto.provider.getNodeDisplayType(d) === popoto.provider.NodeDisplayTypes.IMAGE;
        }).append("image").attr("class", "ppt-node-image");

        imageMiddle
            .attr("width", function (d) {
                return popoto.provider.getImageWidth(d);
            })
            .attr("height", function (d) {
                return popoto.provider.getImageHeight(d);
            })
            // Center the image on node
            .attr("transform", function (d) {
                return "translate(" + (-popoto.provider.getImageWidth(d) / 2) + "," + (-popoto.provider.getImageHeight(d) / 2) + ")";
            })
            .attr("xlink:href", function (d) {
                return popoto.provider.getImagePath(d);
            });

        //-------------------------
        // Update TEXT nodes
        var ellipseMiddle = middleG.filter(function (d) {
            return popoto.provider.getNodeDisplayType(d) === popoto.provider.NodeDisplayTypes.TEXT;
        }).append("ellipse").attr("rx", popoto.graph.node.ELLIPSE_RX).attr("ry", popoto.graph.node.ELLIPSE_RY);

        // Set class according to node type
        ellipseMiddle
            .attr("rx", popoto.graph.node.ELLIPSE_RX)
            .attr("ry", popoto.graph.node.ELLIPSE_RY)
            .attr("class", function (d) {
                if (d.type === popoto.graph.node.NodeTypes.ROOT) {
                    if (d.value) {
                        return "ppt-node-ellipse selected-root-value"
                    } else {
                        if (d.count == 0) {
                            return "ppt-node-ellipse root disabled";
                        } else {
                            return "ppt-node-ellipse root";
                        }
                    }
                } else if (d.type === popoto.graph.node.NodeTypes.CHOOSE) {
                    if (d.value) {
                        return "ppt-node-ellipse selected-value"
                    } else {
                        if (d.count == 0) {
                            return "ppt-node-ellipse choose disabled";
                        } else {
                            return "ppt-node-ellipse choose";
                        }
                    }
                } else if (d.type === popoto.graph.node.NodeTypes.VALUE) {
                    return "ppt-node-ellipse value";
                } else if (d.type === popoto.graph.node.NodeTypes.GROUP) {
                    return "ppt-node-ellipse group";
                }
            });

        //-------------------------
        // Update SVG nodes
        var svgMiddle = middleG.filter(function (d) {
            return popoto.provider.getNodeDisplayType(d) === popoto.provider.NodeDisplayTypes.SVG;
        }).append("g")
            // Add D3.js nested data with all paths required to render the svg element.
            .selectAll("path").data(function (d) {
                return popoto.provider.getSVGPaths(d);
            });

        // Update nested data elements
        svgMiddle.exit().remove();

        svgMiddle.enter().append("path");

        middleG
            .selectAll("path")
            .attr("d", function (d) {
                return d.d;
            })
            .attr("class", function (d) {
                return d["class"];
            });

        // Update text
        var textMiddle = middleG.filter(function (d) {
            return popoto.provider.isTextDisplayed(d);
        }).append('text')
            .attr('x', 0)
            .attr('y', popoto.graph.node.TEXT_Y)
            .attr('text-anchor', 'middle');
        textMiddle
            .attr('y', popoto.graph.node.TEXT_Y)
            .attr("class", function (d) {
                switch (d.type) {
                    case popoto.graph.node.NodeTypes.CHOOSE:
                        if (d.value === undefined) {
                            if (d.count == 0) {
                                return "ppt-node-text-choose disabled";
                            } else {
                                return "ppt-node-text-choose";
                            }
                        } else {
                            return "ppt-node-text-choose selected-value";
                        }
                    case popoto.graph.node.NodeTypes.GROUP:
                        return "ppt-node-text-group";
                    case popoto.graph.node.NodeTypes.ROOT:
                        if (d.value === undefined) {
                            if (d.count == 0) {
                                return "ppt-node-text-root disabled";
                            } else {
                                return "ppt-node-text-root";
                            }
                        } else {
                            return "ppt-node-text-root selected-value";
                        }
                    case popoto.graph.node.NodeTypes.VALUE:
                        return "ppt-node-text-value";
                }
            })
            .text(function (d) {
                if (popoto.provider.isTextDisplayed(d)) {
                    return popoto.provider.getTextValue(d);
                } else {
                    return "";
                }
            });
    };

    /**
     * Updates the foreground elements
     */
    popoto.graph.node.updateForegroundElements = function () {

        // Updates browse arrows status
        var gArrows = popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-foreground")
            .selectAll(".ppt-node-foreground-g-arrows");
        gArrows.classed("active", function (d) {
            return d.valueExpanded && d.data && d.data.length > popoto.graph.node.PAGE_SIZE;
        });

        gArrows.selectAll(".ppt-larrow").classed("enabled", function (d) {
            return d.page > 1;
        });

        gArrows.selectAll(".ppt-rarrow").classed("enabled", function (d) {
            if (d.data) {
                var count = d.data.length;
                return d.page * popoto.graph.node.PAGE_SIZE < count;
            } else {
                return false;
            }
        });

        // Update count box class depending on node type
        var gForegrounds = popoto.graph.node.svgNodeElements.selectAll(".ppt-g-node-foreground");

        gForegrounds.selectAll(".ppt-count-box").filter(function (d) {
            return d.type !== popoto.graph.node.NodeTypes.CHOOSE;
        }).classed("root", true);

        gForegrounds.selectAll(".ppt-count-box").filter(function (d) {
            return d.type === popoto.graph.node.NodeTypes.CHOOSE;
        }).classed("value", true);

        gForegrounds.selectAll(".ppt-count-box").classed("disabled", function (d) {
            return d.count == 0;
        });

        gForegrounds.selectAll(".ppt-count-text")
            .text(function (d) {
                if (d.count != null) {
                    return d.count;
                } else {
                    return "...";
                }
            })
            .classed("disabled", function (d) {
                return d.count == 0;
            });

        // Hide/Show plus icon (set disabled CSS class) if node already has been expanded.
        gForegrounds.selectAll(".ppt-rel-plus-icon")
            .classed("disabled", function (d) {
                return d.linkExpanded || d.count == 0 || d.linkCount == 0;
            });

        gForegrounds.selectAll(".ppt-rel-minus-icon")
            .classed("disabled", function (d) {
                return (!d.linkExpanded) || d.count == 0 || d.linkCount == 0;
            });

    };

    /**
     * Handle the mouse over event on nodes.
     */
    popoto.graph.node.mouseOverNode = function () {
        d3.event.preventDefault();

        // TODO don't work on IE (nodes unstable) find another way to move node in foreground on mouse over?
        // d3.select(this).moveToFront();

        var hoveredNode = d3.select(this).data()[0];
        d3.select(this).select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0.5);

        if (popoto.queryviewer.isActive) {
            // Hover the node in query
            popoto.queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredNode;
            }).classed("hover", true);
            popoto.queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredNode;
            }).classed("hover", true);
        }

        if (popoto.cypherviewer.isActive) {
            popoto.cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredNode;
            }).classed("hover", true);
        }
    };

    /**
     * Handle mouse out event on nodes.
     */
    popoto.graph.node.mouseOutNode = function () {
        d3.event.preventDefault();

        var hoveredNode = d3.select(this).data()[0];
        d3.select(this).select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0);

        if (popoto.queryviewer.isActive) {
            // Remove hover class on node.
            popoto.queryviewer.queryConstraintSpanElements.filter(function (d) {
                return d.ref === hoveredNode;
            }).classed("hover", false);
            popoto.queryviewer.querySpanElements.filter(function (d) {
                return d.ref === hoveredNode;
            }).classed("hover", false);
        }

        if (popoto.cypherviewer.isActive) {
            popoto.cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredNode;
            }).classed("hover", false);
        }
    };

    /**
     * Handle the click event on nodes.
     */
    popoto.graph.node.nodeClick = function () {
        var clickedNode = d3.select(this).data()[0]; // Clicked node data
        popoto.logger.debug("nodeClick (" + clickedNode.label + ")");

        if (clickedNode.type === popoto.graph.node.NodeTypes.VALUE) {
            popoto.graph.node.valueNodeClick(clickedNode);
        } else if (clickedNode.type === popoto.graph.node.NodeTypes.CHOOSE || clickedNode.type === popoto.graph.node.NodeTypes.ROOT) {
            if (clickedNode.valueExpanded) {
                popoto.graph.node.collapseNode(clickedNode);
            } else {
                popoto.graph.node.chooseNodeClick(clickedNode);
            }
        }
    };

    /**
     * Remove all the value node directly linked to clicked node.
     *
     * @param clickedNode
     */
    popoto.graph.node.collapseNode = function (clickedNode) {
        if (clickedNode.valueExpanded) { // node is collapsed only if it has been expanded first
            popoto.logger.debug("collapseNode (" + clickedNode.label + ")");

            var linksToRemove = popoto.graph.force.links().filter(function (l) {
                return l.source === clickedNode && l.type === popoto.graph.link.LinkTypes.VALUE;
            });

            // Remove children nodes from model
            linksToRemove.forEach(function (l) {
                popoto.graph.force.nodes().splice(popoto.graph.force.nodes().indexOf(l.target), 1);
            });

            // Remove links from model
            for (var i = popoto.graph.force.links().length - 1; i >= 0; i--) {
                if (linksToRemove.indexOf(popoto.graph.force.links()[i]) >= 0) {
                    popoto.graph.force.links().splice(i, 1);
                }
            }

            // Node has been fixed when expanded so we unfix it back here.
            if (clickedNode.type !== popoto.graph.node.NodeTypes.ROOT) {
                clickedNode.fixed = false;
            }

            // Parent node too if not root
            if (clickedNode.parent && clickedNode.parent.type !== popoto.graph.node.NodeTypes.ROOT) {
                clickedNode.parent.fixed = false;
            }

            clickedNode.valueExpanded = false;
            popoto.update();

        } else {
            popoto.logger.debug("collapseNode called on an unexpanded node");
        }
    };

    /**
     * Function called on a value node click.
     * In this case the value is added in the parent node and all the value nodes are collapsed.
     *
     * @param clickedNode
     */
    popoto.graph.node.valueNodeClick = function (clickedNode) {
        popoto.logger.debug("valueNodeClick (" + clickedNode.label + ")");
        clickedNode.parent.value = clickedNode;
        popoto.result.hasChanged = true;
        popoto.graph.hasGraphChanged = true;

        popoto.graph.node.collapseNode(clickedNode.parent);
    };

    /**
     * Function called on choose node click.
     * In this case a query is executed to get all the possible value
     * @param clickedNode
     * TODO optimize with cached data?
     */
    popoto.graph.node.chooseNodeClick = function (clickedNode) {
        popoto.logger.debug("chooseNodeClick (" + clickedNode.label + ") with waiting state set to " + popoto.graph.node.chooseWaiting);
        if (!popoto.graph.node.chooseWaiting && !clickedNode.immutable) {

            // Collapse all expanded nodes first
            popoto.graph.force.nodes().forEach(function (n) {
                if ((n.type == popoto.graph.node.NodeTypes.ROOT || n.type == popoto.graph.node.NodeTypes.CHOOSE) && n.valueExpanded) {
                    popoto.graph.node.collapseNode(n);
                }
            });

            // Set waiting state to true to avoid multiple call on slow query execution
            popoto.graph.node.chooseWaiting = true;

            popoto.logger.info("Values (" + clickedNode.label + ") ==> ");
            popoto.rest.post(
                {
                    "statements": [
                        {
                            "statement": popoto.query.generateValueQuery(clickedNode)
                        }]
                })
                .done(function (data) {
                    clickedNode.id = (++popoto.graph.node.idgen);
                    clickedNode.data = popoto.graph.node.parseResultData(data);
                    clickedNode.page = 1;
                    popoto.graph.node.expandNode(clickedNode);
                    popoto.graph.node.chooseWaiting = false;
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    popoto.graph.node.chooseWaiting = false;
                    popoto.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + popoto.rest.CYPHER_URL + "\" defined in \"popoto.rest.CYPHER_URL\" property: " + errorThrown);
                });
        }
    };

    /**
     * Parse query execution result and generate an array of object.
     * These objects contains of a list of properties made of result attributes with their value.
     *
     * @param data query execution raw data
     * @returns {Array} array of structured object with result attributes.
     */
    popoto.graph.node.parseResultData = function (data) {
        var results = [];

        for (var x = 0; x < data.results[0].data.length; x++) {
            var obj = {};

            for (var i = 0; i < data.results[0].columns.length; i++) {
                obj[data.results[0].columns[i]] = data.results[0].data[x].row[i];
            }

            results.push(obj);
        }

        return results;
    };

    /**
     * Compute the angle in radian between the node and its parent.
     * TODO: clean or add comments to explain the code...
     *
     * @param node node to compute angle.
     * @returns {number} angle in radian.
     */
    popoto.graph.computeParentAngle = function (node) {
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
    popoto.graph.node.expandNode = function (clickedNode) {

        // Get subset of node corresponding to the current node page and page size
        var lIndex = clickedNode.page * popoto.graph.node.PAGE_SIZE;
        var sIndex = lIndex - popoto.graph.node.PAGE_SIZE;

        var dataToAdd = clickedNode.data.slice(sIndex, lIndex);
        var parentAngle = popoto.graph.computeParentAngle(clickedNode);

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
                "id": (++popoto.graph.node.idgen),
                "parent": clickedNode,
                "attributes": d,
                "type": popoto.graph.node.NodeTypes.VALUE,
                "label": clickedNode.label,
                "count": d.count,
                "x": nx,
                "y": ny,
                "internalID": d[popoto.query.NEO4J_INTERNAL_ID.queryInternalName]
            };

            popoto.graph.force.nodes().push(node);

            popoto.graph.force.links().push(
                {
                    id: "l" + (++popoto.graph.node.idgen),
                    source: clickedNode,
                    target: node,
                    type: popoto.graph.link.LinkTypes.VALUE
                }
            );

            i++;
        });

        // Pin clicked node and its parent to avoid the graph to move for selection, only new value nodes will blossom around the clicked node.
        clickedNode.fixed = true;
        if (clickedNode.parent && clickedNode.parent.type !== popoto.graph.node.NodeTypes.ROOT) {
            clickedNode.parent.fixed = true;
        }
        // Change node state
        clickedNode.valueExpanded = true;
        popoto.update();
    };

    /**
     * Function called on a right click on a node.
     *
     * In this case all expanded nodes in the graph will first be closed then if no relation have been added yet a Cypher query is executed to get all the related nodes.
     * A first coordinate pre-computation is done to dispatch the new node correctly around the parent node and the nodes are added with a link in the model.
     *
     * If no relation are found or relation were already added the right click event is used to remove the node current selection.
     *
     */
    popoto.graph.node.expandRelationship = function () {
        // Prevent default right click event opening menu.
        d3.event.preventDefault();

        // Notify listeners
        popoto.graph.nodeExpandRelationsipListeners.forEach(function (listener) {
            listener(this);
        });

        // Get clicked node.
        var clickedNode = d3.select(this).data()[0];

        if (!clickedNode.linkExpanded && !popoto.graph.node.linkWaiting && !clickedNode.valueExpanded) {
            popoto.graph.node.linkWaiting = true;

            popoto.logger.info("Relations (" + clickedNode.label + ") ==> ");
            popoto.rest.post(
                {
                    "statements": [
                        {
                            "statement": popoto.query.generateLinkQuery(clickedNode)
                        }]
                })
                .done(function (data) {
                    var parsedData = popoto.graph.node.parseResultData(data);

                    parsedData = parsedData.filter(function (d) {
                        return popoto.query.filterRelation(d);
                    });

                    if (parsedData.length <= 0) {
                        // Set linkExpanded to true to avoid a new query call on next right click
                        clickedNode.linkExpanded = true;
                        clickedNode.linkCount = 0;
                        popoto.graph.hasGraphChanged = true;
                        popoto.update();
                    } else {
                        var parentAngle = popoto.graph.computeParentAngle(clickedNode);

                        var i = 1;
                        parsedData.forEach(function (d) {
                            var angleDeg;
                            if (parentAngle) {
                                angleDeg = (((360 / (parsedData.length + 1)) * i));
                            } else {
                                angleDeg = (((360 / (parsedData.length)) * i));
                            }

                            var nx = clickedNode.x + (100 * Math.cos((angleDeg * (Math.PI / 180)) - parentAngle)),
                                ny = clickedNode.y + (100 * Math.sin((angleDeg * (Math.PI / 180)) - parentAngle));

                            var isGroupNode = popoto.provider.getIsGroup(d);
                            var node = {
                                "id": "" + (++popoto.graph.node.idgen),
                                "parent": clickedNode,
                                "type": (isGroupNode) ? popoto.graph.node.NodeTypes.GROUP : popoto.graph.node.NodeTypes.CHOOSE,
                                "label": d.label,
                                "fixed": false,
                                "internalLabel": popoto.graph.node.generateInternalLabel(d.label),
                                "x": nx,
                                "y": ny
                            };

                            popoto.graph.force.nodes().push(node);

                            popoto.graph.force.links().push(
                                {
                                    id: "l" + (++popoto.graph.node.idgen),
                                    source: clickedNode,
                                    target: node,
                                    type: popoto.graph.link.LinkTypes.RELATION,
                                    label: d.relationship
                                }
                            );

                            i++;
                        });

                        popoto.graph.hasGraphChanged = true;
                        clickedNode.linkExpanded = true;
                        clickedNode.linkCount = parsedData.length;
                        popoto.update();
                    }
                    popoto.graph.node.linkWaiting = false;
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    popoto.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + popoto.rest.CYPHER_URL + "\" defined in \"popoto.rest.CYPHER_URL\" property: " + errorThrown);
                    popoto.graph.node.linkWaiting = false;
                });
        }
    };

    /**
     * Remove all relationships from context node (including children).
     */
    popoto.graph.node.collapseRelationship = function () {
        d3.event.preventDefault();

        // Get clicked node.
        var clickedNode = d3.select(this).data()[0];

        if (clickedNode.linkExpanded && clickedNode.linkCount > 0 && !popoto.graph.node.linkWaiting && !clickedNode.valueExpanded) {

            // Collapse all expanded choose nodes first to avoid having invalid displayed value node if collapsed relation contains a value.
            popoto.graph.force.nodes().forEach(function (n) {
                if ((n.type === popoto.graph.node.NodeTypes.CHOOSE || n.type === popoto.graph.node.NodeTypes.ROOT) && n.valueExpanded) {
                    popoto.graph.node.collapseNode(n);
                }
            });

            var linksToRemove = popoto.graph.force.links().filter(function (l) {
                return l.source === clickedNode && l.type === popoto.graph.link.LinkTypes.RELATION;
            });

            // Remove children nodes from model
            linksToRemove.forEach(function (l) {
                popoto.graph.node.removeNode(l.target);
            });

            // Remove links from model
            for (var i = popoto.graph.force.links().length - 1; i >= 0; i--) {
                if (linksToRemove.indexOf(popoto.graph.force.links()[i]) >= 0) {
                    popoto.graph.force.links().splice(i, 1);
                }
            }

            clickedNode.linkExpanded = false;
            popoto.result.hasChanged = true;
            popoto.graph.hasGraphChanged = true;
            popoto.update();
        }
    };

    /**
     * Remove a node and its relationships (recursively) from the graph.
     *
     * @param node the node to remove.
     */
    popoto.graph.node.removeNode = function (node) {

        var linksToRemove = popoto.graph.force.links().filter(function (l) {
            return l.source === node;
        });

        // Remove children nodes from model
        linksToRemove.forEach(function (l) {
            popoto.graph.node.removeNode(l.target);
        });

        // Remove links from model
        for (var i = popoto.graph.force.links().length - 1; i >= 0; i--) {
            if (linksToRemove.indexOf(popoto.graph.force.links()[i]) >= 0) {
                popoto.graph.force.links().splice(i, 1);
            }
        }

        popoto.graph.force.nodes().splice(popoto.graph.force.nodes().indexOf(node), 1);

    };

    /**
     * Function to add on node event to clear the selection.
     * Call to this function on a node will remove the selected value and triger a graph update.
     */
    popoto.graph.node.clearSelection = function () {
        // Prevent default event like right click  opening menu.
        d3.event.preventDefault();

        // Get clicked node.
        var clickedNode = d3.select(this).data()[0];

        // Collapse all expanded choose nodes first
        popoto.graph.force.nodes().forEach(function (n) {
            if ((n.type === popoto.graph.node.NodeTypes.CHOOSE || n.type === popoto.graph.node.NodeTypes.ROOT) && n.valueExpanded) {
                popoto.graph.node.collapseNode(n);
            }
        });

        if (clickedNode.value != null && !clickedNode.immutable) {
            // Remove selected value of choose node
            delete clickedNode.value;

            popoto.result.hasChanged = true;
            popoto.graph.hasGraphChanged = true;
            popoto.update();
        }
    };

// QUERY VIEWER -----------------------------------------------------------------------------------------------------
    popoto.queryviewer = {};
    popoto.queryviewer.containerId = "popoto-query";
    popoto.queryviewer.QUERY_STARTER = "I'm looking for";
    popoto.queryviewer.CHOOSE_LABEL = "choose";

    /**
     * Create the query viewer area.
     *
     */
    popoto.queryviewer.createQueryArea = function () {
        var id = "#" + popoto.queryviewer.containerId;

        popoto.queryviewer.queryConstraintSpanElements = d3.select(id).append("p").attr("class", "ppt-query-constraint-elements").selectAll(".queryConstraintSpan");
        popoto.queryviewer.querySpanElements = d3.select(id).append("p").attr("class", "ppt-query-elements").selectAll(".querySpan");
    };

    /**
     * Update all the elements displayed on the query viewer based on current graph.
     */
    popoto.queryviewer.updateQuery = function () {

        // Remove all query span elements
        popoto.queryviewer.queryConstraintSpanElements = popoto.queryviewer.queryConstraintSpanElements.data([]);
        popoto.queryviewer.querySpanElements = popoto.queryviewer.querySpanElements.data([]);

        popoto.queryviewer.queryConstraintSpanElements.exit().remove();
        popoto.queryviewer.querySpanElements.exit().remove();

        // Update data
        popoto.queryviewer.queryConstraintSpanElements = popoto.queryviewer.queryConstraintSpanElements.data(popoto.queryviewer.generateConstraintData(popoto.graph.force.links(), popoto.graph.force.nodes()));
        popoto.queryviewer.querySpanElements = popoto.queryviewer.querySpanElements.data(popoto.queryviewer.generateData(popoto.graph.force.links(), popoto.graph.force.nodes()));

        // Remove old span (not needed as all have been cleaned before)
        // popoto.queryviewer.querySpanElements.exit().remove();

        // Add new span
        popoto.queryviewer.queryConstraintSpanElements.enter().append("span")
            .on("contextmenu", popoto.queryviewer.rightClickSpan)
            .on("click", popoto.queryviewer.clickSpan)
            .on("mouseover", popoto.queryviewer.mouseOverSpan)
            .on("mouseout", popoto.queryviewer.mouseOutSpan);

        popoto.queryviewer.querySpanElements.enter().append("span")
            .on("contextmenu", popoto.queryviewer.rightClickSpan)
            .on("click", popoto.queryviewer.clickSpan)
            .on("mouseover", popoto.queryviewer.mouseOverSpan)
            .on("mouseout", popoto.queryviewer.mouseOutSpan);

        // Update all span
        popoto.queryviewer.queryConstraintSpanElements
            .attr("id", function (d) {
                return d.id
            })
            .attr("class", function (d) {
                if (d.isLink) {
                    return "ppt-span-link";
                } else {
                    if (d.type === popoto.graph.node.NodeTypes.ROOT) {
                        return "ppt-span-root";
                    } else if (d.type === popoto.graph.node.NodeTypes.CHOOSE) {
                        if (d.ref.value) {
                            return "ppt-span-value";
                        } else {
                            return "ppt-span-choose";
                        }
                    } else if (d.type === popoto.graph.node.NodeTypes.VALUE) {
                        return "ppt-span-value";
                    } else if (d.type === popoto.graph.node.NodeTypes.GROUP) {
                        return "ppt-span-group";
                    } else {
                        return "ppt-span";
                    }
                }
            })
            .text(function (d) {
                return d.term + " ";
            });

        popoto.queryviewer.querySpanElements
            .attr("id", function (d) {
                return d.id
            })
            .attr("class", function (d) {
                if (d.isLink) {
                    return "ppt-span-link";
                } else {
                    if (d.type === popoto.graph.node.NodeTypes.ROOT) {
                        return "ppt-span-root";
                    } else if (d.type === popoto.graph.node.NodeTypes.CHOOSE) {
                        if (d.ref.value) {
                            return "ppt-span-value";
                        } else {
                            return "ppt-span-choose";
                        }
                    } else if (d.type === popoto.graph.node.NodeTypes.VALUE) {
                        return "ppt-span-value";
                    } else if (d.type === popoto.graph.node.NodeTypes.GROUP) {
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

    popoto.queryviewer.generateConstraintData = function (links, nodes) {
        var elmts = [], id = 0;

        // Add query starter
        elmts.push(
            {id: id++, term: popoto.queryviewer.QUERY_STARTER}
        );

        // Add the root node as query term
        if (nodes.length > 0) {
            elmts.push(
                {id: id++, type: nodes[0].type, term: popoto.provider.getSemanticValue(nodes[0]), ref: nodes[0]}
            );
        }

        // Add a span for each link and its target node
        links.forEach(function (l) {

            var sourceNode = l.source;
            var targetNode = l.target;
            if (l.type === popoto.graph.link.LinkTypes.RELATION && targetNode.type !== popoto.graph.node.NodeTypes.GROUP && targetNode.value) {
                if (sourceNode.type === popoto.graph.node.NodeTypes.GROUP) {
                    elmts.push(
                        {id: id++, type: sourceNode.type, term: popoto.provider.getSemanticValue(sourceNode), ref: sourceNode}
                    );
                }

                elmts.push({id: id++, isLink: true, term: popoto.provider.getLinkSemanticValue(l), ref: l});

                if (targetNode.type !== popoto.graph.node.NodeTypes.GROUP) {
                    if (targetNode.value) {
                        elmts.push(
                            {id: id++, type: targetNode.type, term: popoto.provider.getSemanticValue(targetNode), ref: targetNode}
                        );
                    } else {
                        elmts.push(
                            {id: id++, type: targetNode.type, term: "<" + popoto.queryviewer.CHOOSE_LABEL + " " + popoto.provider.getSemanticValue(targetNode) + ">", ref: targetNode}
                        );
                    }
                }
            }
        });

        return elmts;
    };

    // TODO add option nodes in generated query when no value is available
    popoto.queryviewer.generateData = function (links, nodes) {
        var elmts = [], options = [], id = 0;

        // Add a span for each link and its target node
        links.forEach(function (l) {

            var sourceNode = l.source;
            var targetNode = l.target;

            if (targetNode.type === popoto.graph.node.NodeTypes.GROUP) {
                options.push(
                    {id: id++, type: targetNode.type, term: popoto.provider.getSemanticValue(targetNode), ref: targetNode}
                );
            }

            if (l.type === popoto.graph.link.LinkTypes.RELATION && targetNode.type !== popoto.graph.node.NodeTypes.GROUP && !targetNode.value) {
                if (sourceNode.type === popoto.graph.node.NodeTypes.GROUP) {
                    elmts.push(
                        {id: id++, type: sourceNode.type, term: popoto.provider.getSemanticValue(sourceNode), ref: sourceNode}
                    );
                }

                elmts.push({id: id++, isLink: true, term: popoto.provider.getLinkSemanticValue(l), ref: l});

                if (targetNode.type !== popoto.graph.node.NodeTypes.GROUP) {
                    if (targetNode.value) {
                        elmts.push(
                            {id: id++, type: targetNode.type, term: popoto.provider.getSemanticValue(targetNode), ref: targetNode}
                        );
                    } else {
                        elmts.push(
                            {id: id++, type: targetNode.type, term: "<" + popoto.queryviewer.CHOOSE_LABEL + " " + popoto.provider.getSemanticValue(targetNode) + ">", ref: targetNode}
                        );
                    }
                }
            }
        });

        return elmts.concat(options);
    };

    /**
     *
     */
    popoto.queryviewer.mouseOverSpan = function () {
        d3.select(this).classed("hover", function (d) {
            return d.ref;
        });

        var hoveredSpan = d3.select(this).data()[0];

        if (hoveredSpan.ref) {
            var linkElmt = popoto.graph.svg.selectAll("#" + popoto.graph.link.gID + " > g").filter(function (d) {
                return d === hoveredSpan.ref;
            });
            linkElmt.select("path").classed("ppt-link-hover", true);
            linkElmt.select("text").classed("ppt-link-hover", true);

            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === hoveredSpan.ref;
            });

            nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0.5);

            if (popoto.cypherviewer.isActive) {
                popoto.cypherviewer.querySpanElements.filter(function (d) {
                    return d.node === hoveredSpan.ref || d.link === hoveredSpan.ref;
                }).classed("hover", true);
            }
        }
    };

    popoto.queryviewer.rightClickSpan = function () {
        var clickedSpan = d3.select(this).data()[0];

        if (!clickedSpan.isLink && clickedSpan.ref) {
            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === clickedSpan.ref;
            });

            nodeElmt.on("contextmenu").call(nodeElmt.node(), clickedSpan.ref);
        }
    };

    popoto.queryviewer.clickSpan = function () {
        var clickedSpan = d3.select(this).data()[0];

        if (!clickedSpan.isLink && clickedSpan.ref) {
            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === clickedSpan.ref;
            });

            nodeElmt.on("click").call(nodeElmt.node(), clickedSpan.ref);
        }
    };

    /**
     *
     */
    popoto.queryviewer.mouseOutSpan = function () {
        d3.select(this).classed("hover", false);

        var hoveredSpan = d3.select(this).data()[0];

        if (hoveredSpan.ref) {
            var linkElmt = popoto.graph.svg.selectAll("#" + popoto.graph.link.gID + " > g").filter(function (d) {
                return d === hoveredSpan.ref;
            });
            linkElmt.select("path").classed("ppt-link-hover", false);
            linkElmt.select("text").classed("ppt-link-hover", false);

            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === hoveredSpan.ref;
            });
            nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0);

            if (popoto.cypherviewer.isActive) {
                popoto.cypherviewer.querySpanElements.filter(function (d) {
                    return d.node === hoveredSpan.ref || d.link === hoveredSpan.ref;
                }).classed("hover", false);
            }
        }
    };

// CYPHER VIEWER -----------------------------------------------------------------------------------------------------

    popoto.cypherviewer = {};
    popoto.cypherviewer.containerId = "popoto-cypher";
    popoto.cypherviewer.MATCH = "MATCH";
    popoto.cypherviewer.RETURN = "RETURN";
    popoto.cypherviewer.QueryElementTypes = Object.freeze({KEYWORD: 0, NODE: 1, SEPARATOR: 2, SOURCE: 3, LINK: 4, TARGET: 5, RETURN: 6});

    /**
     * Create the Cypher viewer area.
     *
     */
    popoto.cypherviewer.createQueryArea = function () {
        var id = "#" + popoto.cypherviewer.containerId;

        popoto.cypherviewer.querySpanElements = d3.select(id).append("p").attr("class", "ppt-query-constraint-elements").selectAll(".queryConstraintSpan");
    };

    /**
     * Update all the elements displayed on the cypher viewer based on current graph.
     */
    popoto.cypherviewer.updateQuery = function () {

        // Remove all query span elements
        popoto.cypherviewer.querySpanElements = popoto.cypherviewer.querySpanElements.data([]);

        popoto.cypherviewer.querySpanElements.exit().remove();

        // Update data
        popoto.cypherviewer.querySpanElements = popoto.cypherviewer.querySpanElements.data(popoto.cypherviewer.generateData(popoto.graph.force.links(), popoto.graph.force.nodes()));

        // Remove old span (not needed as all have been cleaned before)
        // popoto.queryviewer.querySpanElements.exit().remove();

        // Add new span
        popoto.cypherviewer.querySpanElements.enter().append("span")
            .attr("id", function (d) {
                return "cypher-" + d.id;
            })
            .on("mouseover", popoto.cypherviewer.mouseOverSpan)
            .on("mouseout", popoto.cypherviewer.mouseOutSpan)
            .on("contextmenu", popoto.cypherviewer.rightClickSpan)
            .on("click", popoto.cypherviewer.clickSpan);

        // Update all spans:
        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.KEYWORD;
        })
            .attr("class", "ppt-span")
            .text(function (d) {
                return " " + d.value + " ";
            });

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.SEPARATOR;
        })
            .attr("class", "ppt-span")
            .text(function (d) {
                return d.value + " ";
            });

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.NODE;
        })
            .attr("class", function (d) {
                if (d.node.value) {
                    return "ppt-span-root-value";
                } else {
                    return "ppt-span-root";
                }
            })
            .text(function (d) {
                var parameters = "";

                if (d.node.value) {
                    var constraintAttr = popoto.provider.getConstraintAttribute(d.node.label);
                    if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                        parameters = "{`id`:" + d.node.value.internalID + "}";
                    } else {
                        var constraintValue = d.node.value.attributes[constraintAttr];
                        if (typeof constraintValue === "boolean" || typeof constraintValue === "number") {
                            parameters = "{`" + constraintAttr + "`:" + constraintValue + "}";
                        } else {
                            parameters = "{`" + constraintAttr + "`:\"" + constraintValue + "\"}";
                        }
                    }
                }

                return "(" + d.node.internalLabel + ":`" + d.node.label + "`" + parameters + ")";
            });

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.SOURCE;
        })
            .attr("class", function (d) {
                if (d.node === popoto.graph.getRootNode()) {
                    if (d.node.value) {
                        return "ppt-span-root-value";
                    } else {
                        return "ppt-span-root";
                    }
                } else {
                    if (d.node.value) {
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

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.LINK;
        })
            .attr("class", "ppt-span-link")
            .text(function (d) {
                return "-[:`" + d.link.label + "`]->";
            });

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.TARGET;
        })
            .attr("class", function (d) {
                if (d.node.value) {
                    return "ppt-span-value";
                } else {
                    return "ppt-span-choose";
                }
            })
            .text(function (d) {
                var targetNode = d.node;
                var parameters = "";

                if (targetNode.value) {
                    var constraintAttr = popoto.provider.getConstraintAttribute(targetNode.label);
                    if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                        parameters = "{`id`:" + targetNode.value.internalID + "}";
                    } else {
                        var constraintValue = targetNode.value.attributes[constraintAttr];
                        if (typeof constraintValue === "boolean" || typeof constraintValue === "number") {
                            parameters = "{`" + constraintAttr + "`:" + constraintValue + "}";
                        } else {
                            parameters = "{`" + constraintAttr + "`:\"" + constraintValue + "\"}";
                        }
                    }
                }

                return "(" + targetNode.internalLabel + ":`" + targetNode.label + "`" + parameters + ")";
            });

        popoto.cypherviewer.querySpanElements.filter(function (d) {
            return d.type === popoto.cypherviewer.QueryElementTypes.RETURN;
        })
            .attr("class", function (d) {
                if (d.node.value) {
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
    popoto.cypherviewer.generateData = function (links) {
        var elmts = [], id = 0;
        var rootNode = popoto.graph.getRootNode();
        var relevantLinks = popoto.query.getRelevantLinks(rootNode, rootNode, links);

        elmts.push(
            {
                id: id++,
                type: popoto.cypherviewer.QueryElementTypes.KEYWORD,
                value: popoto.cypherviewer.MATCH
            }
        );

        if (rootNode) {
            elmts.push(
                {
                    id: id++,
                    type: popoto.cypherviewer.QueryElementTypes.NODE,
                    node: rootNode
                }
            );
        }

        if (relevantLinks.length > 0) {
            elmts.push(
                {
                    id: id++,
                    type: popoto.cypherviewer.QueryElementTypes.SEPARATOR,
                    value: ","
                }
            );
        }

        for (var i = 0; i < relevantLinks.length; i++) {
            elmts.push(
                {
                    id: id++,
                    type: popoto.cypherviewer.QueryElementTypes.SOURCE,
                    node: relevantLinks[i].source
                }
            );

            elmts.push(
                {
                    id: id++,
                    type: popoto.cypherviewer.QueryElementTypes.LINK,
                    link: relevantLinks[i]
                }
            );

            elmts.push(
                {
                    id: id++,
                    type: popoto.cypherviewer.QueryElementTypes.TARGET,
                    node: relevantLinks[i].target
                }
            );

            // Add separator except for last element
            if (i < (relevantLinks.length - 1)) {
                elmts.push(
                    {
                        id: id++,
                        type: popoto.cypherviewer.QueryElementTypes.SEPARATOR,
                        value: ","
                    }
                );
            }
        }

        elmts.push(
            {
                id: id++,
                type: popoto.cypherviewer.QueryElementTypes.KEYWORD,
                value: popoto.cypherviewer.RETURN
            }
        );

        if (rootNode) {
            elmts.push(
                {
                    id: id++,
                    type: popoto.cypherviewer.QueryElementTypes.RETURN,
                    node: rootNode
                }
            );
        }

        return elmts;
    };

    /**
     *
     */
    popoto.cypherviewer.mouseOverSpan = function () {
        var hoveredSpan = d3.select(this).data()[0];
        if (hoveredSpan.node) {
            // Hover all spans with same node data
            popoto.cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredSpan.node;
            }).classed("hover", true);

            // Highlight node in graph
            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === hoveredSpan.node;
            });
            nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0.5);

            // Highlight query viewer
            if (popoto.queryviewer.isActive) {
                popoto.queryviewer.queryConstraintSpanElements.filter(function (d) {
                    return d.ref === hoveredSpan.node;
                }).classed("hover", true);

                popoto.queryviewer.querySpanElements.filter(function (d) {
                    return d.ref === hoveredSpan.node;
                }).classed("hover", true);
            }
        } else if (hoveredSpan.link) {
            d3.select(this).classed("hover", true);

            // Highlight link in graph
            var linkElmt = popoto.graph.svg.selectAll("#" + popoto.graph.link.gID + " > g").filter(function (d) {
                return d === hoveredSpan.link;
            });
            linkElmt.select("path").classed("ppt-link-hover", true);
            linkElmt.select("text").classed("ppt-link-hover", true);
        }
    };

    popoto.cypherviewer.mouseOutSpan = function () {
        var hoveredSpan = d3.select(this).data()[0];
        if (hoveredSpan.node) {
            // Remove hover on all spans with same node data
            popoto.cypherviewer.querySpanElements.filter(function (d) {
                return d.node === hoveredSpan.node;
            }).classed("hover", false);

            // Remove highlight on node in graph
            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === hoveredSpan.node;
            });
            nodeElmt.select(".ppt-g-node-background").selectAll("circle").transition().style("fill-opacity", 0);

            if (popoto.queryviewer.isActive) {
                popoto.queryviewer.queryConstraintSpanElements.filter(function (d) {
                    return d.ref === hoveredSpan.node;
                }).classed("hover", false);

                popoto.queryviewer.querySpanElements.filter(function (d) {
                    return d.ref === hoveredSpan.node;
                }).classed("hover", false);
            }
        } else if (hoveredSpan.link) {
            d3.select(this).classed("hover", false);

            // Remove highlight on link in graph
            var linkElmt = popoto.graph.svg.selectAll("#" + popoto.graph.link.gID + " > g").filter(function (d) {
                return d === hoveredSpan.link;
            });
            linkElmt.select("path").classed("ppt-link-hover", false);
            linkElmt.select("text").classed("ppt-link-hover", false);
        }
    };

    popoto.cypherviewer.clickSpan = function () {
        var clickedSpan = d3.select(this).data()[0];

        if (clickedSpan.node) {
            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === clickedSpan.node;
            });

            nodeElmt.on("click").call(nodeElmt.node(), clickedSpan.node);
        }
    };

    popoto.cypherviewer.rightClickSpan = function () {
        var clickedSpan = d3.select(this).data()[0];

        if (clickedSpan.node) {
            var nodeElmt = popoto.graph.svg.selectAll("#" + popoto.graph.node.gID + " > g").filter(function (d) {
                return d === clickedSpan.node;
            });

            nodeElmt.on("contextmenu").call(nodeElmt.node(), clickedSpan.node);
        }
    };

// QUERY ------------------------------------------------------------------------------------------------------------
    popoto.query = {};
    /**
     * Define the number of results displayed in result list.
     */
    popoto.query.RESULTS_PAGE_SIZE = 100;
    popoto.query.VALUE_QUERY_LIMIT = 1000;
    popoto.query.USE_PARENT_RELATION = false;
    popoto.query.USE_RELATION_DIRECTION = true;

    /**
     * Immutable constant object to identify Neo4j internal ID
     */
    popoto.query.NEO4J_INTERNAL_ID = Object.freeze({queryInternalName: "NEO4JID"});

    /**
     * Function used to filter returned relations
     * return false if the result should be filtered out.
     *
     * @param d relation returned object
     * @returns {boolean}
     */
    popoto.query.filterRelation = function (d) {
        return true;
    };

    /**
     * Generate the query to count nodes of a label.
     * If the label is defined as distinct in configuration the query will count only distinct values on constraint attribute.
     */
    popoto.query.generateTaxonomyCountQuery = function (label) {
        var constraintAttr = popoto.provider.getConstraintAttribute(label);

        var whereElements = [];

        var predefinedConstraints = popoto.provider.getPredefinedConstraints(label);
        predefinedConstraints.forEach(function (predefinedConstraint) {
            whereElements.push(predefinedConstraint.replace(new RegExp("\\$identifier", 'g'), "n"));
        });

        if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
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
     * @param isConstraintNeeded
     */
    popoto.query.generateQueryElements = function (rootNode, selectedNode, links, isConstraintNeeded) {
        var matchElements = [];
        var whereElements = [];
        var rel = popoto.query.USE_RELATION_DIRECTION ? "->" : "-";

        var rootPredefinedConstraints = popoto.provider.getPredefinedConstraints(rootNode.label);

        rootPredefinedConstraints.forEach(function (predefinedConstraint) {
            whereElements.push(predefinedConstraint.replace(new RegExp("\\$identifier", 'g'), rootNode.internalLabel));
        });

        // Generate root node match element
        if (rootNode.value && (isConstraintNeeded || rootNode.immutable)) {
            var rootConstraintAttr = popoto.provider.getConstraintAttribute(rootNode.label);
            if (rootConstraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                matchElements.push("(" + rootNode.internalLabel + ":`" + rootNode.label + "`)");
                whereElements.push("ID(" + rootNode.internalLabel + ") = " + rootNode.value.internalID);
            } else {
                var constraintValue = rootNode.value.attributes[rootConstraintAttr];

                if (typeof constraintValue === "boolean" || typeof constraintValue === "number") {
                    matchElements.push("(" + rootNode.internalLabel + ":`" + rootNode.label + "`{`" + rootConstraintAttr + "`:" + constraintValue + "})");
                } else {
                    matchElements.push("(" + rootNode.internalLabel + ":`" + rootNode.label + "`{`" + rootConstraintAttr + "`:\"" + constraintValue + "\"})");
                }
            }
        } else {
            matchElements.push("(" + rootNode.internalLabel + ":`" + rootNode.label + "`)");
        }

        // Generate match elements for each links
        links.forEach(function (l) {
            var sourceNode = l.source;
            var targetNode = l.target;

            var predefinedConstraints = popoto.provider.getPredefinedConstraints(targetNode.label);

            predefinedConstraints.forEach(function (predefinedConstraint) {
                whereElements.push(predefinedConstraint.replace(new RegExp("\\$identifier", 'g'), targetNode.internalLabel));
            });

            if (targetNode.value && targetNode !== selectedNode && (isConstraintNeeded || rootNode.immutable)) {
                var constraintAttr = popoto.provider.getConstraintAttribute(targetNode.label);
                var constraintValue = targetNode.value.attributes[constraintAttr];
                if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                    matchElements.push("(" + sourceNode.internalLabel + ":`" + sourceNode.label + "`)-[:`" + l.label + "`]" + rel + "(" + targetNode.internalLabel + ":`" + targetNode.label + "`)");
                    whereElements.push("ID(" + targetNode.internalLabel + ") = " + targetNode.value.internalID);
                } else {
                    if (typeof constraintValue === "boolean" || typeof constraintValue === "number") {
                        matchElements.push("(" + sourceNode.internalLabel + ":`" + sourceNode.label + "`)-[:`" + l.label + "`]" + rel + "(" + targetNode.internalLabel + ":`" + targetNode.label + "`{`" + constraintAttr + "`:" + constraintValue + "})");
                    } else {
                        matchElements.push("(" + sourceNode.internalLabel + ":`" + sourceNode.label + "`)-[:`" + l.label + "`]" + rel + "(" + targetNode.internalLabel + ":`" + targetNode.label + "`{`" + constraintAttr + "`:\"" + constraintValue + "\"})");
                    }
                }
            } else {
                matchElements.push("(" + sourceNode.internalLabel + ":`" + sourceNode.label + "`)-[:`" + l.label + "`]" + rel + "(" + targetNode.internalLabel + ":`" + targetNode.label + "`)");
            }
        });

        return {"matchElements": matchElements, "whereElements": whereElements};
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
    popoto.query.getRelevantLinks = function (rootNode, targetNode, initialLinks) {

        var links = initialLinks.slice();
        var filteredLinks = [];
        var finalLinks = [];

        // Filter all links to keep only those containing a value or being the selected node.
        links.forEach(function (l) {
            if (l.target.value || l.target === targetNode) {
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
    popoto.query.getLinksToRoot = function (node, links) {
        var pathLinks = [];
        var targetNode = node;

        while (targetNode !== popoto.graph.getRootNode()) {
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
     * Generate a Cypher query to retrieve all the relation available for a given node.
     *
     * @param targetNode
     * @returns {string}
     */
    popoto.query.generateLinkQuery = function (targetNode) {

        var linksToRoot = popoto.query.getLinksToRoot(targetNode, popoto.graph.force.links());
        var queryElements = popoto.query.generateQueryElements(popoto.graph.getRootNode(), targetNode, linksToRoot, false);
        var matchElements = queryElements.matchElements,
            returnElements = [],
            whereElements = queryElements.whereElements,
            endElements = [];
        var rel = popoto.query.USE_RELATION_DIRECTION ? "->" : "-";

        matchElements.push("(" + targetNode.internalLabel + ":`" + targetNode.label + "`)-[r]" + rel + "(x)");
        returnElements.push("type(r) AS relationship");
        if (popoto.query.USE_PARENT_RELATION) {
            returnElements.push("head(labels(x)) AS label");
        } else {
            returnElements.push("last(labels(x)) AS label");
        }
        returnElements.push("count(r) AS count");
        endElements.push("ORDER BY count(r) DESC");

        return "MATCH " + matchElements.join(", ") + ((whereElements.length > 0) ? " WHERE " + whereElements.join(" AND ") : "") + " RETURN " + returnElements.join(", ") + " " + endElements.join(" ");
    };

    /**
     * Generate a Cypher query
     * @returns {string}
     */
    popoto.query.generateResultCypherQuery = function () {

        var rootNode = popoto.graph.getRootNode();
        var queryElements = popoto.query.generateQueryElements(rootNode, rootNode, popoto.query.getRelevantLinks(rootNode, rootNode, popoto.graph.force.links()), true);
        var matchElements = queryElements.matchElements,
            returnElements = [],
            whereElements = queryElements.whereElements,
            endElements = [];

        // Sort results by specified attribute
        var resultOrderByAttribute = popoto.provider.getResultOrderByAttribute(rootNode.label);
        if (resultOrderByAttribute) {
            var order = popoto.provider.isResultOrderAscending(rootNode.label) ? "ASC" : "DESC";
            endElements.push("ORDER BY " + resultOrderByAttribute + " " + order);
        }

        endElements.push("LIMIT " + popoto.query.RESULTS_PAGE_SIZE);

        var resultAttributes = popoto.provider.getReturnAttributes(rootNode.label);
        var constraintAttribute = popoto.provider.getConstraintAttribute(rootNode.label);

        for (var i = 0; i < resultAttributes.length; i++) {
            var attribute = resultAttributes[i];
            if (attribute === popoto.query.NEO4J_INTERNAL_ID) {
                if (attribute == constraintAttribute) {
                    returnElements.push("ID(" + rootNode.internalLabel + ") AS " + popoto.query.NEO4J_INTERNAL_ID.queryInternalName);
                } else {
                    returnElements.push("COLLECT(DISTINCT ID(" + rootNode.internalLabel + ")) AS " + popoto.query.NEO4J_INTERNAL_ID.queryInternalName);
                }
            } else {
                if (attribute == constraintAttribute) {
                    returnElements.push(rootNode.internalLabel + "." + attribute + " AS " + attribute);
                } else {
                    returnElements.push("COLLECT(DISTINCT " + rootNode.internalLabel + "." + attribute + ") AS " + attribute);
                }
            }
        }

        return "MATCH " + matchElements.join(", ") + ((whereElements.length > 0) ? " WHERE " + whereElements.join(" AND ") : "") + " RETURN DISTINCT " + returnElements.join(", ") + " " + endElements.join(" ");
    };

    popoto.query.generateResultCypherQueryCount = function () {

        var rootNode = popoto.graph.getRootNode();
        var queryElements = popoto.query.generateQueryElements(rootNode, rootNode, popoto.query.getRelevantLinks(rootNode, rootNode, popoto.graph.force.links()), true);
        var constraintAttribute = popoto.provider.getConstraintAttribute(rootNode.label);
        var matchElements = queryElements.matchElements,
            returnElements = [],
            whereElements = queryElements.whereElements,
            endElements = [];

        if (constraintAttribute === popoto.query.NEO4J_INTERNAL_ID) {
            returnElements.push("count(DISTINCT ID(" + rootNode.internalLabel + ")) AS count");
        } else {
            returnElements.push("count(DISTINCT " + rootNode.internalLabel + "." + constraintAttribute + ") AS count");
        }

        return "MATCH " + matchElements.join(", ") + ((whereElements.length > 0) ? " WHERE " + whereElements.join(" AND ") : "") + " RETURN " + returnElements.join(", ") + (endElements.length > 0 ? " " + endElements.join(" ") : "");
    };

    /**
     * Generate the query to update node counts.
     *
     * @param countedNode the counted node
     * @returns {string} the node count cypher query;
     */
    popoto.query.generateNodeCountCypherQuery = function (countedNode) {

        var queryElements = popoto.query.generateQueryElements(popoto.graph.getRootNode(), countedNode, popoto.query.getRelevantLinks(popoto.graph.getRootNode(), countedNode, popoto.graph.force.links()), true);
        var matchElements = queryElements.matchElements,
            whereElements = queryElements.whereElements,
            returnElements = [];

        var countAttr = popoto.provider.getConstraintAttribute(countedNode.label);

        if (countAttr === popoto.query.NEO4J_INTERNAL_ID) {
            returnElements.push("count(DISTINCT ID(" + countedNode.internalLabel + ")) as count");
        } else {
            returnElements.push("count(DISTINCT " + countedNode.internalLabel + "." + countAttr + ") as count");
        }

        return "MATCH " + matchElements.join(", ") + ((whereElements.length > 0) ? " WHERE " + whereElements.join(" AND ") : "") + " RETURN " + returnElements.join(", ");
    };

    /**
     * Generate a Cypher query from the graph model to get all the possible values for the targetNode element.
     *
     * @param targetNode node in the graph to get the values.
     * @returns {string} the query to execute to get all the values of targetNode corresponding to the graph.
     */
    popoto.query.generateValueQuery = function (targetNode) {

        var rootNode = popoto.graph.getRootNode();
        var queryElements = popoto.query.generateQueryElements(rootNode, targetNode, popoto.query.getRelevantLinks(rootNode, targetNode, popoto.graph.force.links()), true);
        var matchElements = queryElements.matchElements,
            endElements = [],
            whereElements = queryElements.whereElements,
            returnElements = [];

        // Sort results by specified attribute
        var valueOrderByAttribute = popoto.provider.getValueOrderByAttribute(targetNode.label);
        if (valueOrderByAttribute) {
            var order = popoto.provider.isValueOrderAscending(targetNode.label) ? "ASC" : "DESC";
            endElements.push("ORDER BY " + valueOrderByAttribute + " " + order);
        }

        endElements.push("LIMIT " + popoto.query.VALUE_QUERY_LIMIT);

        var resultAttributes = popoto.provider.getReturnAttributes(targetNode.label);
        var constraintAttribute = popoto.provider.getConstraintAttribute(targetNode.label);

        for (var i = 0; i < resultAttributes.length; i++) {
            if (resultAttributes[i] === popoto.query.NEO4J_INTERNAL_ID) {
                if (resultAttributes[i] == constraintAttribute) {
                    returnElements.push("ID(" + targetNode.internalLabel + ") AS " + popoto.query.NEO4J_INTERNAL_ID.queryInternalName);
                } else {
                    returnElements.push("COLLECT (DISTINCT ID(" + targetNode.internalLabel + ")) AS " + popoto.query.NEO4J_INTERNAL_ID.queryInternalName);
                }
            } else {
                if (resultAttributes[i] == constraintAttribute) {
                    returnElements.push(targetNode.internalLabel + "." + resultAttributes[i] + " AS " + resultAttributes[i]);
                } else {
                    returnElements.push("COLLECT(DISTINCT " + targetNode.internalLabel + "." + resultAttributes[i] + ") AS " + resultAttributes[i]);
                }
            }
        }

        // Add count return attribute on root node
        var rootConstraintAttr = popoto.provider.getConstraintAttribute(rootNode.label);

        if (rootConstraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
            returnElements.push("count(DISTINCT ID(" + rootNode.internalLabel + ")) AS count");
        } else {
            returnElements.push("count(DISTINCT " + rootNode.internalLabel + "." + rootConstraintAttr + ") AS count");
        }

        return "MATCH " + matchElements.join(", ") + ((whereElements.length > 0) ? " WHERE " + whereElements.join(" AND ") : "") + " RETURN DISTINCT " + returnElements.join(", ") + " " + endElements.join(" ");
    };

    ///////////////////////////////////////////////////////////////////
    // Results

    popoto.result = {};
    popoto.result.containerId = "popoto-results";
    popoto.result.hasChanged = true;
    popoto.result.resultCountListeners = [];
    popoto.result.resultListeners = [];

    /**
     * Register a listener to the result count event.
     * This listener will be called on evry result change with total result count.
     */
    popoto.result.onTotalResultCount = function (listener) {
        popoto.result.resultCountListeners.push(listener);
    };

    popoto.result.onResultReceived = function (listener) {
        popoto.result.resultListeners.push(listener);
    };

    /**
     * Parse REST returned data and generate a list of result objects.
     *
     * @param data
     * @returns {Array}
     */
    popoto.result.parseResultData = function (data) {

        var results = [];
        if (data.results && data.results.length > 0) {
            for (var x = 0; x < data.results[0].data.length; x++) {

                var obj = {
                    "resultIndex": x,
                    "label": popoto.graph.getRootNode().label,
                    "attributes": {}
                };

                for (var i = 0; i < data.results[0].columns.length; i++) {
                    // Some results can be an array as collect is used in query
                    // So all values are converted to string
                    obj.attributes[data.results[0].columns[i]] = "" + data.results[0].data[x].row[i];
                }

                results.push(obj);
            }
        }

        return results;
    };

    popoto.result.updateResults = function () {
        if (popoto.result.hasChanged) {
            var query = popoto.query.generateResultCypherQuery();

            popoto.logger.info("Results ==> ");
            popoto.rest.post(
                {
                    "statements": [
                        {
                            "statement": query
                        }]
                })
                .done(function (data) {

                    if (data.errors && data.errors.length > 0) {
                        popoto.logger.error("Cypher query error:" + JSON.stringify(data.errors));
                    }

                    // Parse data
                    var resultObjects = popoto.result.parseResultData(data);

                    // Notify listeners
                    popoto.result.resultListeners.forEach(function (listener) {
                        listener(resultObjects);
                    });

                    // Update displayed results only if needed ()
                    if (popoto.result.isActive) {
                        // Clear all results
                        var results = d3.select("#" + popoto.result.containerId).selectAll(".ppt-result").data([]);
                        results.exit().remove();

                        // Update data
                        results = d3.select("#" + popoto.result.containerId).selectAll(".ppt-result").data(resultObjects, function (d) {
                            return d.resultIndex;
                        });

                        // Add new elements
                        var pElmt = results.enter()
                            .append("p")
                            .attr("class", "ppt-result")
                            .attr("id", function (d) {
                                return "popoto-result-" + d.resultIndex;
                            });

                        // Generate results with providers
                        pElmt.each(function (d) {
                            popoto.provider.getDisplayResultFunction(d.label)(d3.select(this));
                        });
                    }

                    popoto.result.hasChanged = false;
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    popoto.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + popoto.rest.CYPHER_URL + "\" defined in \"popoto.rest.CYPHER_URL\" property: " + errorThrown);

                    // Notify listeners
                    popoto.result.resultListeners.forEach(function (listener) {
                        listener([]);
                    });

                });

            // Execute query to get total result count
            // But only if needed, if listeners have been added
            if (popoto.result.resultCountListeners.length > 0) {
                popoto.logger.info("Results count ==> ");
                popoto.rest.post(
                    {
                        "statements": [
                            {
                                "statement": popoto.query.generateResultCypherQueryCount()
                            }]
                    })
                    .done(function (data) {

                        if (data.errors && data.errors.length > 0) {
                            popoto.logger.error("Cypher query error:" + JSON.stringify(data.errors));
                        }

                        var count = 0;

                        if (data.results && data.results.length > 0) {
                            count = data.results[0].data[0].row[0];
                        }

                        popoto.result.resultCountListeners.forEach(function (listener) {
                            listener(count);
                        });

                    })
                    .fail(function (xhr, textStatus, errorThrown) {
                        popoto.logger.error(textStatus + ": error while accessing Neo4j server on URL:\"" + popoto.rest.CYPHER_URL + "\" defined in \"popoto.rest.CYPHER_URL\" property: " + errorThrown);

                        popoto.result.resultCountListeners.forEach(function (listener) {
                            listener(0);
                        });
                    });
            }
        }
    };

// NODE LABEL PROVIDERS -----------------------------------------------------------------------------------------------------

    popoto.provider = {};
    popoto.provider.linkProvider = {};
    popoto.provider.taxonomyProvider = {};
    popoto.provider.nodeProviders = {};

    /**
     *  Get the text representation of a link.
     *
     * @param link the link to get the text representation.
     * @returns {string} the text representation of the link.
     */
    popoto.provider.getLinkTextValue = function (link) {
        if (popoto.provider.linkProvider.hasOwnProperty("getLinkTextValue")) {
            return popoto.provider.linkProvider.getLinkTextValue(link);
        } else {
            if (popoto.provider.DEFAULT_LINK_PROVIDER.hasOwnProperty("getLinkTextValue")) {
                return popoto.provider.DEFAULT_LINK_PROVIDER.getLinkTextValue(link);
            } else {
                popoto.logger.error("No provider defined for getLinkTextValue");
            }
        }
    };

    /**
     *  Get the semantic text representation of a link.
     *
     * @param link the link to get the semantic text representation.
     * @returns {string} the semantic text representation of the link.
     */
    popoto.provider.getLinkSemanticValue = function (link) {
        if (popoto.provider.linkProvider.hasOwnProperty("getLinkSemanticValue")) {
            return popoto.provider.linkProvider.getLinkSemanticValue(link);
        } else {
            if (popoto.provider.DEFAULT_LINK_PROVIDER.hasOwnProperty("getLinkSemanticValue")) {
                return popoto.provider.DEFAULT_LINK_PROVIDER.getLinkSemanticValue(link);
            } else {
                popoto.logger.error("No provider defined for getLinkSemanticValue");
            }
        }
    };

    /**
     * Label provider used by default if none have been defined for a label.
     * This provider can be changed if needed to customize default behavior.
     * If some properties are not found in user customized providers, default values will be extracted from this provider.
     */
    popoto.provider.DEFAULT_LINK_PROVIDER = Object.freeze(
        {
            /**
             * Function used to return the text representation of a link.
             *
             * The default behavior is to return the internal relation name as text for relation links.
             * And return the target node text value for links between a node and its expanded values but only if text is not displayed on value node.
             *
             * @param link the link to represent as text.
             * @returns {string} the text representation of the link.
             */
            "getLinkTextValue": function (link) {
                if (link.type === popoto.graph.link.LinkTypes.VALUE) {
                    // Links between node and list of values.

                    if (popoto.provider.isTextDisplayed(link.target)) {
                        // Don't display text on link if text is displayed on target node.
                        return "";
                    } else {
                        // No text is displayed on target node then the text is displayed on link.
                        return popoto.provider.getTextValue(link.target);
                    }

                } else {

                    // Link
                    return link.label
                }
            },

            /**
             * Function used to return a descriptive text representation of a link.
             * This representation should be more complete than getLinkTextValue and can contain semantic data.
             * This function is used for example to generate the label in the query viewer.
             *
             * The default behavior is to return the getLinkTextValue.
             *
             * @param link the link to represent as text.
             * @returns {string} the text semantic representation of the link.
             */
            "getLinkSemanticValue": function (link) {
                return popoto.provider.getLinkTextValue(link);
            }
        });
    popoto.provider.linkProvider = popoto.provider.DEFAULT_LINK_PROVIDER;

    /**
     *  Get the text representation of a taxonomy.
     *
     * @param label the label used for the taxonomy.
     * @returns {string} the text representation of the taxonomy.
     */
    popoto.provider.getTaxonomyTextValue = function (label) {
        if (popoto.provider.taxonomyProvider.hasOwnProperty("getTextValue")) {
            return popoto.provider.taxonomyProvider.getTextValue(label);
        } else {
            if (popoto.provider.DEFAULT_TAXONOMY_PROVIDER.hasOwnProperty("getTextValue")) {
                return popoto.provider.DEFAULT_TAXONOMY_PROVIDER.getTextValue(label);
            } else {
                popoto.logger.error("No provider defined for taxonomy getTextValue");
            }
        }
    };

    /**
     * Label provider used by default if none have been defined for a label.
     * This provider can be changed if needed to customize default behavior.
     * If some properties are not found in user customized providers, default values will be extracted from this provider.
     */
    popoto.provider.DEFAULT_TAXONOMY_PROVIDER = Object.freeze(
        {
            /**
             * Function used to return the text representation of a taxonomy.
             *
             * The default behavior is to return the label without changes.
             *
             * @param label the label used to represent the taxonomy.
             * @returns {string} the text representation of the taxonomy.
             */
            "getTextValue": function (label) {
                return label;
            }
        });
    popoto.provider.taxonomyProvider = popoto.provider.DEFAULT_TAXONOMY_PROVIDER;

    /**
     * Define the different type of rendering of a node for a given label.
     * TEXT: default rendering type, the node will be displayed with an ellipse and a text in it.
     * IMAGE: the node is displayed as an image using the image tag in the svg graph.
     * In this case an image path is required.
     * SVG: the node is displayed using a list of svg path, each path can contain its own color.
     */
    popoto.provider.NodeDisplayTypes = Object.freeze({TEXT: 0, IMAGE: 1, SVG: 2});

    /**
     * Get the label provider for the given label.
     * If no provider is defined for the label:
     * First search in parent provider.
     * Then if not found will create one from default provider.
     *
     * @param label to retrieve the corresponding label provider.
     * @returns {object} corresponding label provider.
     */
    popoto.provider.getProvider = function (label) {
        if (label === undefined) {
            popoto.logger.error("Node label is undefined, no label provider can be found.");
        } else {
            if (popoto.provider.nodeProviders.hasOwnProperty(label)) {
                return popoto.provider.nodeProviders[label];
            } else {
                popoto.logger.debug("No direct provider found for label " + label);

                // Search in all children list definitions to find the parent provider.
                for (var p in popoto.provider.nodeProviders) {
                    if (popoto.provider.nodeProviders.hasOwnProperty(p)) {
                        var provider = popoto.provider.nodeProviders[p];
                        if (provider.hasOwnProperty("children")) {
                            if (provider["children"].indexOf(label) > -1) {
                                popoto.logger.debug("No provider is defined for label (" + label + "), parent (" + p + ") will be used");
                                // A provider containing the required label in its children definition has been found it will be cloned.

                                var newProvider = {"parent": p};
                                for (var pr in provider) {
                                    if (provider.hasOwnProperty(pr) && pr != "children" && pr != "parent") {
                                        newProvider[pr] = provider[pr];
                                    }
                                }

                                popoto.provider.nodeProviders[label] = newProvider;
                                return popoto.provider.nodeProviders[label];
                            }
                        }
                    }
                }

                popoto.logger.debug("No label provider defined for label (" + label + ") default one will be created from popoto.provider.DEFAULT_PROVIDER");

                popoto.provider.nodeProviders[label] = {};
                // Clone default provider properties in new provider.
                for (var prop in popoto.provider.DEFAULT_PROVIDER) {
                    if (popoto.provider.DEFAULT_PROVIDER.hasOwnProperty(prop)) {
                        popoto.provider.nodeProviders[label][prop] = popoto.provider.DEFAULT_PROVIDER[prop];
                    }
                }
                return popoto.provider.nodeProviders[label];
            }
        }
    };

    /**
     * Get the property or function defined in node label provider.
     * If the property is not found search is done in parents.
     * If not found in parent, property defined in popoto.provider.DEFAULT_PROVIDER is returned.
     * If not found in default provider, defaultValue is set and returned.
     *
     * @param label node label to get the property in its provider.
     * @param name name of the property to retrieve.
     * @returns {*} node property defined in its label provider.
     */
    popoto.provider.getProperty = function (label, name) {
        var provider = popoto.provider.getProvider(label);

        if (!provider.hasOwnProperty(name)) {
            var providerIterator = provider;

            // Check parents
            var isPropertyFound = false;
            while (providerIterator.hasOwnProperty("parent") && !isPropertyFound) {
                providerIterator = popoto.provider.getProvider(providerIterator.parent);
                if (providerIterator.hasOwnProperty(name)) {

                    // Set attribute in child to optimize next call.
                    provider[name] = providerIterator[name];
                    isPropertyFound = true;
                }
            }

            if (!isPropertyFound) {
                popoto.logger.debug("No \"" + name + "\" property found for node label provider (" + label + "), default value will be used");
                if (popoto.provider.DEFAULT_PROVIDER.hasOwnProperty(name)) {
                    provider[name] = popoto.provider.DEFAULT_PROVIDER[name];
                } else {
                    popoto.logger.error("No default value for \"" + name + "\" property found for label provider (" + label + ")");
                }
            }
        }
        return provider[name];
    };

    /**
     * Return the "isSearchable" property for the node label provider.
     * Is Searchable defined whether the label can be used as graph query builder root.
     * If true the label can be displayed in the taxonomy filter.
     *
     * @param label
     * @returns {*}
     */
    popoto.provider.getIsSearchable = function (label) {
        return popoto.provider.getProperty(label, "isSearchable");
    };

    /**
     * Return the list of attributes defined in node label provider.
     * Parents return attributes are also returned.
     *
     * @param label used to retrieve parent attributes.
     * @returns {Array} list of return attributes for a node.
     */
    popoto.provider.getReturnAttributes = function (label) {
        var provider = popoto.provider.getProvider(label);
        var attributes = {}; // Object is used as a Set to merge possible duplicate in parents

        if (provider.hasOwnProperty("returnAttributes")) {
            for (var i = 0; i < provider.returnAttributes.length; i++) {
                if (provider.returnAttributes[i] === popoto.query.NEO4J_INTERNAL_ID) {
                    attributes[popoto.query.NEO4J_INTERNAL_ID.queryInternalName] = true;
                } else {
                    attributes[provider.returnAttributes[i]] = true;
                }
            }
        }

        // Add parent attributes
        while (provider.hasOwnProperty("parent")) {
            provider = popoto.provider.getProvider(provider.parent);
            if (provider.hasOwnProperty("returnAttributes")) {
                for (var j = 0; j < provider.returnAttributes.length; j++) {
                    if (provider.returnAttributes[j] === popoto.query.NEO4J_INTERNAL_ID) {
                        attributes[popoto.query.NEO4J_INTERNAL_ID.queryInternalName] = true;
                    } else {
                        attributes[provider.returnAttributes[j]] = true;
                    }
                }
            }
        }

        // Add default provider attributes if any but not internal id as this id is added only if none has been found.
        if (popoto.provider.DEFAULT_PROVIDER.hasOwnProperty("returnAttributes")) {
            for (var k = 0; k < popoto.provider.DEFAULT_PROVIDER.returnAttributes.length; k++) {
                if (popoto.provider.DEFAULT_PROVIDER.returnAttributes[k] !== popoto.query.NEO4J_INTERNAL_ID) {
                    attributes[popoto.provider.DEFAULT_PROVIDER.returnAttributes[k]] = true;
                }
            }
        }

        // Add constraint attribute in the list
        var constraintAttribute = popoto.provider.getConstraintAttribute(label);
        if (constraintAttribute === popoto.query.NEO4J_INTERNAL_ID) {
            attributes[popoto.query.NEO4J_INTERNAL_ID.queryInternalName] = true;
        } else {
            attributes[constraintAttribute] = true;
        }


        // Add all in array
        var attrList = [];
        for (var attr in attributes) {
            if (attributes.hasOwnProperty(attr)) {
                if (attr == popoto.query.NEO4J_INTERNAL_ID.queryInternalName) {
                    attrList.push(popoto.query.NEO4J_INTERNAL_ID);
                } else {
                    attrList.push(attr);
                }
            }
        }

        // If no attributes have been found internal ID is used
        if (attrList.length <= 0) {
            attrList.push(popoto.query.NEO4J_INTERNAL_ID);
        }
        return attrList;
    };

    /**
     * Return the attribute to use as constraint attribute for a node defined in its label provider.
     *
     * @param label
     * @returns {*}
     */
    popoto.provider.getConstraintAttribute = function (label) {
        return popoto.provider.getProperty(label, "constraintAttribute");
    };

    /**
     * Return a list of predefined constraint defined in the node label configuration.
     *
     * @param label
     * @returns {*}
     */
    popoto.provider.getPredefinedConstraints = function (label) {
        return popoto.provider.getProperty(label, "getPredefinedConstraints")();
    };


    popoto.provider.getValueOrderByAttribute = function (label) {
        return popoto.provider.getProperty(label, "valueOrderByAttribute");
    };

    popoto.provider.isValueOrderAscending = function (label) {
        return popoto.provider.getProperty(label, "isValueOrderAscending");
    };

    popoto.provider.getResultOrderByAttribute = function (label) {
        return popoto.provider.getProperty(label, "resultOrderByAttribute");
    };

    popoto.provider.isResultOrderAscending = function (label) {
        return popoto.provider.getProperty(label, "isResultOrderAscending");
    };

    /**
     * Return the value of the getTextValue function defined in the label provider corresponding to the parameter node.
     * If no "getTextValue" function is defined in the provider, search is done in parents.
     * If none is found in parent default provider method is used.
     *
     * @param node
     */
    popoto.provider.getTextValue = function (node) {
        return popoto.provider.getProperty(node.label, "getTextValue")(node);
    };


    /**
     * Return the value of the getTextValue function defined in the label provider corresponding to the parameter node.
     * If no "getTextValue" function is defined in the provider, search is done in parents.
     * If none is found in parent default provider method is used.
     *
     * @param node
     */
    popoto.provider.getTextValue = function (node) {
        return popoto.provider.getProperty(node.label, "getTextValue")(node);
    };

    /**
     * Return the value of the getSemanticValue function defined in the label provider corresponding to the parameter node.
     * The semantic value is a more detailed description of the node used for example in the query viewer.
     * If no "getTextValue" function is defined in the provider, search is done in parents.
     * If none is found in parent default provider method is used.
     *
     * @param node
     * @returns {*}
     */
    popoto.provider.getSemanticValue = function (node) {
        return popoto.provider.getProperty(node.label, "getSemanticValue")(node);
    };

    /**
     * Return a list of SVG paths objects, each defined by a "d" property containing the path and "f" property for the color.
     *
     * @param node
     * @returns {*}
     */
    popoto.provider.getSVGPaths = function (node) {
        return popoto.provider.getProperty(node.label, "getSVGPaths")(node);
    };

    /**
     * Check in label provider if text must be displayed with images nodes.
     * @param node
     * @returns {*}
     */
    popoto.provider.isTextDisplayed = function (node) {
        return popoto.provider.getProperty(node.label, "getIsTextDisplayed")(node);
    };

    /**
     * Return the getIsGroup property.
     *
     * @param node
     * @returns {*}
     */
    popoto.provider.getIsGroup = function (node) {
        return popoto.provider.getProperty(node.label, "getIsGroup")(node);
    };

    /**
     * Return the node display type.
     * can be TEXT, IMAGE, SVG or GROUP.
     *
     * @param node
     * @returns {*}
     */
    popoto.provider.getNodeDisplayType = function (node) {
        return popoto.provider.getProperty(node.label, "getDisplayType")(node);
    };

    /**
     * Return the file path of the image defined in the provider.
     *
     * @param node the node to get the image path.
     * @returns {string} the path of the node image.
     */
    popoto.provider.getImagePath = function (node) {
        return popoto.provider.getProperty(node.label, "getImagePath")(node);
    };

    /**
     * Return the width size of the node image.
     *
     * @param node the node to get the image width.
     * @returns {int} the image width.
     */
    popoto.provider.getImageWidth = function (node) {
        return popoto.provider.getProperty(node.label, "getImageWidth")(node);
    };

    /**
     * Return the height size of the node image.
     *
     * @param node the node to get the image height.
     * @returns {int} the image height.
     */
    popoto.provider.getImageHeight = function (node) {
        return popoto.provider.getProperty(node.label, "getImageHeight")(node);
    };

    /**
     * Return the displayResults function defined in label parameter's provider.
     *
     * @param label
     * @returns {*}
     */
    popoto.provider.getDisplayResultFunction = function (label) {
        return popoto.provider.getProperty(label, "displayResults");
    };

    /**
     * Label provider used by default if none have been defined for a label.
     * This provider can be changed if needed to customize default behavior.
     * If some properties are not found in user customized providers, default values will be extracted from this provider.
     */
    popoto.provider.DEFAULT_PROVIDER = Object.freeze(
        {
            /**********************************************************************
             * Label specific parameters:
             *
             * These attributes are specific to a node label and will be used for every node having this label.
             **********************************************************************/

            /**
             * Defines whether this label can be used as root element of the graph query builder.
             * This property is also used to determine whether the label can be displayed in the taxonomy filter.
             *
             * The default value is true.
             */
            "isSearchable": true,

            /**
             * Defines the list of attribute to return for node of this label.
             * All the attributes listed here will be added in generated cypher queries and available in result list and in node provider's functions.
             *
             * The default value contains only the Neo4j internal id.
             * This id is used by default because it is a convenient way to identify a node when nothing is known about its attributes.
             * But you should really consider using your application attributes instead, it is a bad practice to rely on this attribute.
             */
            "returnAttributes": [popoto.query.NEO4J_INTERNAL_ID],

            /**
             * Defines the attribute used to order the value displayed on node.
             *
             * Default value is "count" attribute.
             */
            "valueOrderByAttribute": "count",

            /**
             * Defines whether the value query order by is ascending, if false order by will be descending.
             *
             * Default value is false (descending)
             */
            "isValueOrderAscending": false,

            /**
             * Defines the attribute used to order the results.
             *
             * Default value is "null" to disable order by.
             */
            "resultOrderByAttribute": null,

            /**
             * Defines whether the result query order by is ascending, if false order by will be descending.
             *
             * Default value is true (ascending)
             */
            "isResultOrderAscending": true,

            /**
             * Defines the attribute of the node to use in query constraint for nodes of this label.
             * This attribute is used in the generated cypher query to build the constraints with selected values.
             *
             * The default value is the Neo4j internal id.
             * This id is used by default because it is a convenient way to identify a node when nothing is known about its attributes.
             * But you should really consider using your application attributes instead, it is a bad practice to rely on this attribute.
             */
            "constraintAttribute": popoto.query.NEO4J_INTERNAL_ID,

            /**
             * Return the list of predefined constraints to add for the given label.
             * These constraints will be added in every generated Cypher query.
             *
             * For example if the returned list contain ["$identifier.born > 1976"] for "Person" nodes everywhere in popoto.js the generated Cypher query will add the constraint
             * "WHERE person.born > 1976"
             *
             * @returns {Array}
             */
            "getPredefinedConstraints": function () {
                return [];
            },

            /**********************************************************************
             * Node specific parameters:
             *
             * These attributes are specific to nodes (in graph or query viewer) for a given label.
             * But they can be customized for nodes of the same label.
             * The parameters are defined by a function that will be called with the node as parameter.
             * In this function the node internal attributes can be used to customize the value to return.
             **********************************************************************/

            /**
             * Function returning the display type of a node.
             * This type defines how the node will be drawn in the graph.
             *
             * The result must be one of the following values:
             *
             * popoto.provider.NodeDisplayTypes.IMAGE
             *  In this case the node will be drawn as an image and "getImagePath" function is required to return the node image path.
             *
             * popoto.provider.NodeDisplayTypes.SVG
             *  In this case the node will be drawn as SVG paths and "getSVGPaths"
             *
             * popoto.provider.NodeDisplayTypes.TEXT
             *  In this case the node will be drawn as a simple ellipse.
             *
             * Default value is TEXT.
             *
             * @param node the node to extract its type.
             * @returns {number} one value from popoto.provider.NodeDisplayTypes
             */
            "getDisplayType": function (node) {
                return popoto.provider.NodeDisplayTypes.TEXT;
            },

            /**
             * Function defining whether the node is a group node.
             * In this case no count are displayed and no value can be selected on the node.
             *
             * Default value is false.
             */
            "getIsGroup": function (node) {
                return false;
            },

            /**
             * Function defining whether the node text representation must be displayed on graph.
             * If true the value returned for getTextValue on node will be displayed on graph.
             *
             * This text will be added in addition to the getDisplayType representation.
             * It can be displayed on all type of node display, images, SVG or text.
             *
             * Default value is true
             *
             * @param node the node to display on graph.
             * @returns {boolean} true if text must be displayed on graph for the node.
             */
            "getIsTextDisplayed": function (node) {
                return true;
            },

            /**
             * Function used to return the text representation of a node.
             *
             * The default behavior is to return the label of the node
             * or the value of constraint attribute of the node if it contains value.
             *
             * The returned value is truncated using popoto.graph.node.NODE_MAX_CHARS property.
             *
             * @param node the node to represent as text.
             * @returns {string} the text representation of the node.
             */
            "getTextValue": function (node) {
                var text;
                var constraintAttr = popoto.provider.getProperty(node.label, "constraintAttribute");
                if (node.type === popoto.graph.node.NodeTypes.VALUE) {
                    if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                        text = "" + node.internalID;
                    } else {
                        text = "" + node.attributes[constraintAttr];
                    }
                } else {
                    if (node.value === undefined) {
                        text = node.label;
                    } else {
                        if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                            text = "" + node.value.internalID;
                        } else {
                            text = "" + node.value.attributes[constraintAttr];
                        }
                    }
                }
                // Text is truncated to fill the ellipse
                return text.substring(0, popoto.graph.node.NODE_MAX_CHARS);
            },

            /**
             * Function used to return a descriptive text representation of a link.
             * This representation should be more complete than getTextValue and can contain semantic data.
             * This function is used for example to generate the label in the query viewer.
             *
             * The default behavior is to return the getTextValue not truncated.
             *
             * @param node the node to represent as text.
             * @returns {string} the text semantic representation of the node.
             */
            "getSemanticValue": function (node) {
                var text;
                var constraintAttr = popoto.provider.getProperty(node.label, "constraintAttribute");
                if (node.type === popoto.graph.node.NodeTypes.VALUE) {
                    if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                        text = "" + node.internalID;
                    } else {
                        text = "" + node.attributes[constraintAttr];
                    }
                } else {
                    if (node.value === undefined) {
                        text = node.label;
                    } else {
                        if (constraintAttr === popoto.query.NEO4J_INTERNAL_ID) {
                            text = "" + node.value.internalID;
                        } else {
                            text = "" + node.value.attributes[constraintAttr];
                        }
                    }
                }
                return text;
            },

            /**
             * Function returning the image file path to use for a node.
             * This function is only used for popoto.provider.NodeDisplayTypes.IMAGE type nodes.
             *
             * @param node
             * @returns {string}
             */
            "getImagePath": function (node) {
                if (node.type === popoto.graph.node.NodeTypes.VALUE) {
                    return "css/image/node-yellow.png";
                } else {
                    if (node.value === undefined) {
                        if (node.type === popoto.graph.node.NodeTypes.ROOT) {
                            return "css/image/node-blue.png";
                        }
                        if (node.type === popoto.graph.node.NodeTypes.CHOOSE) {
                            return "css/image/node-green.png";
                        }
                        if (node.type === popoto.graph.node.NodeTypes.GROUP) {
                            return "css/image/node-black.png";
                        }
                    } else {
                        return "css/image/node-orange.png";
                    }
                }
            },

            /**
             * Function returning the image width of the node.
             * This function is only used for popoto.provider.NodeDisplayTypes.IMAGE type nodes.
             *
             * @param node
             * @returns {number}
             */
            "getImageWidth": function (node) {
                return 125;
            },

            /**
             * Function returning the image height of the node.
             * This function is only used for popoto.provider.NodeDisplayTypes.IMAGE type nodes.
             *
             * @param node
             * @returns {number}
             */
            "getImageHeight": function (node) {
                return 125;
            },

            /**********************************************************************
             * Results specific parameters:
             *
             * These attributes are specific to result display.
             **********************************************************************/

            /**
             * Generate the result entry content using d3.js mechanisms.
             *
             * The parameter of the function is the &lt;p&gt; selected with d3.js
             *
             * The default behavior is to generate a &lt;table&gt; containing all the return attributes in a &lt;th&gt; and their value in a &lt;td&gt;.
             *
             * @param pElmt the &lt;p&gt; element generated in the result list.
             */
            "displayResults": function (pElmt) {
                var result = pElmt.data()[0];

                var returnAttributes = popoto.provider.getReturnAttributes(result.label);

                var table = pElmt.append("table").attr("class", "ppt-result-table");

                returnAttributes.forEach(function (attribute) {
                    var attributeName = (attribute === popoto.query.NEO4J_INTERNAL_ID) ? popoto.query.NEO4J_INTERNAL_ID.queryInternalName : attribute;

                    var tr = table.append("tr");
                    tr.append("th").text(function () {
                        if (attribute === popoto.query.NEO4J_INTERNAL_ID) {
                            return "internal ID:"
                        } else {
                            return attribute + ":";
                        }
                    });
                    if (result.attributes[attributeName] !== undefined) {
                        tr.append("td").text(function (result) {
                            return result.attributes[attributeName];
                        });
                    }
                });
            }

        });

    return popoto;
}();