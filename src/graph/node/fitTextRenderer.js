import * as d3 from "d3";
import provider from "../../provider/provider";
import appendFittedText from "../../graph/util/appendFittedText";

var fitTextRenderer = {};

fitTextRenderer.getNodeBoundingBox = function(node) {
    return node.getBBox();
};

/**
 * Create the text representation of a node by slicing the text into lines to fit the node.
 *
 * TODO: Clean getLines return and corresponding data.
 * @param nodeSelection
 */
fitTextRenderer.render = function (nodeSelection) {

    var backgroundRectSelection = nodeSelection
        .append("rect")
        .attr("fill", function (node) {
            return provider.node.getColor(node, "back-text", "fill");
        })
        .attr("class", function (node) {
            return provider.node.getCSSClass(node, "back-text")
        });

    appendFittedText(nodeSelection,
        function (d) { return provider.node.getTextValue(d)},
        function (d) { return provider.node.getSize(d) },
        function (d) { return provider.node.getCSSClass(d, "text") });

    backgroundRectSelection
        .attr("x", function (d) {
            var bbox = fitTextRenderer.getNodeBoundingBox(d3.select(this.parentNode).select("text").node());
            return bbox.x - 3;
        })
        .attr("y", function (d) {
            var bbox = fitTextRenderer.getNodeBoundingBox(d3.select(this.parentNode).select("text").node());
            return bbox.y;
        })
        .attr("rx", "5")
        .attr("ry", "5")
        .attr("width", function (d) {
            var bbox = fitTextRenderer.getNodeBoundingBox(d3.select(this.parentNode).select("text").node());
            return bbox.width + 6;
        })
        .attr("height", function (d) {
            var bbox = fitTextRenderer.getNodeBoundingBox(d3.select(this.parentNode).select("text").node());
            return bbox.height;
        })
        .attr("transform", function (d) {
            return d3.select(this.parentNode).select("text").attr("transform")
        });
};

export default fitTextRenderer