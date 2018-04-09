import node from "rollup-plugin-node-resolve";

export default {
    input: "index",
    plugins: [node()],
    external: ["d3", "jquery"],
    output: {
        extend: true,
        file: "dist/popoto.js",
        format: "umd",
        indent: false,
        name: "popoto",
        globals: {
            d3: "d3",
            jquery: "jQuery"
        }
    }
};