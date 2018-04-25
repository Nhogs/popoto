import provider from "../../provider/provider";

var fitTextRenderer = {};

var CONTEXT_2D = document.createElement("canvas").getContext("2d");
var DEFAULT_CANVAS_LINE_HEIGHT = 12;

function measureTextWidth(text) {
    return CONTEXT_2D.measureText(text).width;
}

function getLines(text) {
    var words = text.split(/\s+/g); // To hyphenate: /\s+|(?<=-)/
    if (!words[words.length - 1]) words.pop();
    if (!words[0]) words.shift();

    var targetWidth = Math.sqrt(measureTextWidth(text.trim()) * DEFAULT_CANVAS_LINE_HEIGHT);

    var line;
    var lineWidth0 = Infinity;
    var lines = [];

    for (var i = 0, n = words.length; i < n; ++i) {
        var lineText1 = (line ? line.text + " " : "") + words[i];
        var lineWidth1 = measureTextWidth(lineText1);
        if ((lineWidth0 + lineWidth1) / 2 < targetWidth) {
            line.width = lineWidth0 = lineWidth1;
            line.text = lineText1;
        } else {
            lineWidth0 = measureTextWidth(words[i]);
            line = {width: lineWidth0, text: words[i]};
            lines.push(line);
        }
    }

    var textRadius = 0;

    for (var i = 0, n = lines.length; i < n; ++i) {
        var dy = (Math.abs(i - n / 2 + 0.5) + 0.5) * DEFAULT_CANVAS_LINE_HEIGHT;
        var dx = lines[i].width / 2;
        textRadius = Math.max(textRadius, Math.sqrt(dx * dx + dy * dy));
    }

    var lines2 = [];
    lines.map(function (d) {
        lines2.push({"text": d.text, "textRadius": textRadius, "linesLength": lines.length})
    });

    return {"lines": lines2, "textRadius": textRadius}
}


/**
 * Create the text representation of a node by slicing the text into lines to fit the node.
 *
 * TODO: Clean getLines return and corresponding data.
 * @param nodeSelection
 */
fitTextRenderer.render = function (nodeSelection) {

    var textMiddle = nodeSelection.append('text')
        .attr("class", function (node) {
            return provider.node.getCSSClass(node, "text")
        });

    // TODO extract style in CSS
    textMiddle.attr("style", "text-anchor: middle; font: 10px sans-serif")
        .datum(function (d) {
            var text = provider.node.getTextValue(d);
            var lines = getLines(text);
            d.lines = lines.lines;
            d.textRadius = lines.textRadius;
            return d
        });

    textMiddle.selectAll("tspan")
        .data(function (d) {
            return d.lines
        })
        .enter().append("tspan")
        .attr("x", 0)
        .attr("y", function (d, i, nodes) {
            return (i - d.linesLength / 2 + 0.8) * DEFAULT_CANVAS_LINE_HEIGHT;
        })
        .text(function (d) {
            return d.text;
        });

    textMiddle.attr("transform", function (d) {
        var scale = provider.node.getSize(d) / d.textRadius;
        return "translate(" + 0 + "," + 0 + ")" + " scale(" + scale + ")"
    })
};

export default fitTextRenderer