import node from "rollup-plugin-node-resolve";

export default {
    input: "index",
    plugins: [node()],
    output: {
        extend: true,
        file: "dist/popoto.js",
        format: "umd",
        indent: false,
        name: "popoto"
    }
};