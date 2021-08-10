import resolve from "rollup-plugin-node-resolve";
import copy from 'rollup-plugin-copy';

export default {
    input: "index",
    plugins: [
        resolve({}),
        copy({
            targets: [{
                src: "css/font/popoto/*", dest: "dist/font/popoto/"
            }, {
                src: "css/font-icon-list.html", dest: "dist/"
            }]
        })
    ],
    external: ["d3"],
    output: {
        extend: true,
        file: "dist/popoto.js",
        format: "umd",
        indent: false,
        name: "popoto",
        globals: {
            d3: "d3",
        }
    }
};