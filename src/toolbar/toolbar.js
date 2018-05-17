import graph from "../graph/graph";
import tools from "../tools/tools";

var toolbar = {};

toolbar.TOOL_TAXONOMY = "Show/hide taxonomy panel";
toolbar.TOOL_RELATION = "Show/hide relation";
toolbar.TOOL_CENTER = "Center view";
toolbar.TOOL_FULL_SCREEN = "Full screen";
toolbar.TOOL_RESET = "Reset graph";
toolbar.TOOL_SAVE = "Save graph";
toolbar.TOOL_FIT_TEXT = "Fit text in nodes";

toolbar.render = function (container) {
    var toolbar = container
        .append("div")
        .attr("class", "ppt-toolbar");

    if (tools.TOGGLE_VIEW_RELATION) {
        toolbar.append("span")
            .attr("id", "popoto-toggle-relation")
            .attr("class", "ppt-icon ppt-menu relation")
            .attr("title", toolbar.TOOL_RELATION)
            .on("click", function () {
                tools.toggleViewRelation();
            });
    }

    if (tools.RESET_GRAPH) {
        toolbar.append("span")
            .attr("id", "popoto-reset-menu")
            .attr("class", "ppt-icon ppt-menu reset")
            .attr("title", toolbar.TOOL_RESET)
            .on("click", function () {
                graph.notifyListeners(graph.Events.GRAPH_RESET, []);
                tools.reset();
            });
    }

    if (tools.TOGGLE_TAXONOMY) {
        toolbar.append("span")
            .attr("id", "popoto-taxonomy-menu")
            .attr("class", "ppt-icon ppt-menu taxonomy")
            .attr("title", toolbar.TOOL_TAXONOMY)
            .on("click", tools.toggleTaxonomy);
    }

    if (tools.CENTER_GRAPH) {
        toolbar.append("span")
            .attr("id", "popoto-center-menu")
            .attr("class", "ppt-icon ppt-menu center")
            .attr("title", toolbar.TOOL_CENTER)
            .on("click", tools.center);
    }

    if (tools.TOGGLE_FULL_SCREEN) {
        toolbar.append("span")
            .attr("id", "popoto-fullscreen-menu")
            .attr("class", "ppt-icon ppt-menu fullscreen")
            .attr("title", toolbar.TOOL_FULL_SCREEN)
            .on("click", tools.toggleFullScreen);
    }

    if (tools.SAVE_GRAPH) {
        toolbar.append("span")
            .attr("id", "popoto-save-menu")
            .attr("class", "ppt-icon ppt-menu save")
            .attr("title", toolbar.TOOL_SAVE)
            .on("click", function () {
                graph.notifyListeners(graph.Events.GRAPH_SAVE, [graph.getSchema()]);
            });
    }

    if (tools.TOGGLE_FIT_TEXT) {
        toolbar.append("span")
            .attr("id", "popoto-fit-text-menu")
            .attr("class", "ppt-icon ppt-menu fit-text")
            .attr("title", toolbar.TOOL_FIT_TEXT)
            .on("click", tools.toggleFitText);
    }
};

export default toolbar
