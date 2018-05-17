var dataModel = {};

dataModel.nodes = [];
dataModel.links = [];

dataModel.getRootNode = function () {
    return dataModel.nodes[0];
};

export default dataModel