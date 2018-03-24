const tape = require("tape"),
    popoto = require("../index");

tape("test say hello", function (test) {
    test.equal(popoto.sayHello(), "hello");
    test.end();
});
