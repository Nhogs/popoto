import * as d3 from "d3";
import provider from "../../provider/provider";

var textRenderer = {};
textRenderer.TEXT_Y = 8; // TODO move this in dedicated config

textRenderer.getNodeBoundingBox = function(node) {
    return node.getBBox();
};

/**
 * Create the text representation of a node with a SVG rect element as background.
 *
 * TODO: clean mouseover text because this renderer change parent clip-path attribute
 * @param nodeSelection
 */
textRenderer.render = function (nodeSelection) {

    var backgroundRectSelection = nodeSelection
        .append("rect")
        .attr("fill", function (node) {
            return provider.node.getColor(node, "back-text", "fill");
        })
        .attr("class", function (node) {
            return provider.node.getCSSClass(node, "back-text")
        });

    nodeSelection.append('text')
        .attr('x', 0)
        .attr('y', textRenderer.TEXT_Y)
        .attr('text-anchor', 'middle')
        .attr("class", function (node) {
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
        })
        .text(function (d) {
            return provider.node.getTextValue(d);
        });

    backgroundRectSelection
        .attr("x", function (d) {
            var bbox = textRenderer.getNodeBoundingBox(d3.select(this.parentNode).select("text").node());
            return bbox.x - 3;
        })
        .attr("y", function (d) {
            var bbox = textRenderer.getNodeBoundingBox(d3.select(this.parentNode).select("text").node());
            return bbox.y;
        })
        .attr("rx", "5")
        .attr("ry", "5")
        .attr("width", function (d) {
            var bbox = textRenderer.getNodeBoundingBox(d3.select(this.parentNode).select("text").node());
            return bbox.width + 6;
        })
        .attr("height", function (d) {
            var bbox = textRenderer.getNodeBoundingBox(d3.select(this.parentNode).select("text").node());
            return bbox.height;
        });
};

export default textRenderer