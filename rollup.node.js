var fs = require("fs"),
    rollup = require("rollup"),
    dependencies = require("./package.json").dependencies;

rollup.rollup({
    input: "index.js",
    external: Object.keys(dependencies)
}).then(function (bundle) {
    return bundle.generate({format: "cjs"});
}).then(function (result) {
    return new Promise(function (resolve, reject) {
        fs.writeFile("dist/popoto.node.js", result.output[0].code, "utf8", function (error) {
            if (error) return reject(error);
            else resolve();
        });
    });
}).catch(abort);

function abort(error) {
    console.error(error.stack);
}