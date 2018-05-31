var dataModel = {};

dataModel.idGen = 0;

dataModel.generateId = function () {
    return dataModel.idGen++;
};

dataModel.nodes = [];
dataModel.links = [];

dataModel.getRootNode = function () {
    return dataModel.nodes[0];
};

export default dataModel