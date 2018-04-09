import {default as d3} from "d3";
import provider from "../provider/provider";
import result from "../result/result";
import graph from "../graph/graph";
import taxonomy from "../taxonomy/taxonomy";
import {update} from "../popoto";

// TOOLS -----------------------------------------------------------------------------------------------------------

var tools = {};
// TODO introduce plugin mechanism to add tools
tools.CENTER_GRAPH = true;
tools.RESET_GRAPH = true;
tools.SAVE_GRAPH = false;
tools.TOGGLE_TAXONOMY = true;
tools.TOGGLE_FULL_SCREEN = true;
tools.TOGGLE_VIEW_RELATION = true;

/**
 * Reset the graph to display the root node only.
 */
tools.reset = function () {
    while (graph.nodes.length > 0) {
        graph.nodes.pop();
    }
    while (graph.links.length > 0) {
        graph.links.pop();
    }

    // Reinitialize internal label generator
    graph.node.internalLabels = {};

    if (typeof graph.mainLabel === 'string' || graph.mainLabel instanceof String) {
        if (provider.node.getSchema(graph.mainLabel) !== undefined) {
            graph.addSchema(provider.node.getSchema(graph.mainLabel));
        } else {
            graph.addRootNode(graph.mainLabel);
        }
    } else {
        graph.addSchema(graph.mainLabel);
    }

    graph.hasGraphChanged = true;
    result.hasChanged = true;
    update();
    tools.center();
};

/**
 * Reset zoom and center the view on svg center.
 */
tools.center = function () {
    graph.svgTag.transition().call(graph.zoom.transform, d3.zoomIdentity);
};

/**
 * Show, hide taxonomy panel.
 */
tools.toggleTaxonomy = function () {
    var taxo = d3.select("#" + taxonomy.containerId);
    if (taxo.filter(".disabled").empty()) {
        taxo.classed("disabled", true);
    } else {
        taxo.classed("disabled", false);
    }

    graph.centerRootNode();
};

/**
 * Show, hide relation donuts.
 */
tools.toggleViewRelation = function () {
    graph.DISABLE_RELATION = !graph.DISABLE_RELATION;
    d3.selectAll(".ppt-g-node-background").classed("hide", graph.DISABLE_RELATION);
    graph.tick();
};

tools.toggleFullScreen = function () {

    var elem = document.getElementById(graph.containerId);

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

export default tools;