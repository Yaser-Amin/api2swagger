// var inquirer = require("inquirer");
const _ = require('lodash');

module.exports.queryParamQ = (paramName, paramValue, apiPredefinedConfig, callback) => {
  if (apiPredefinedConfig && apiPredefinedConfig.params && apiPredefinedConfig.params.query
    && apiPredefinedConfig.params.query.filter(x => x && x.name === paramName).length > 0) {
    const q = apiPredefinedConfig.params.query.find(x => x.name === paramName);
    // set static values
    q.in = 'query';
    callback(q);
  }
};

module.exports.formParamQ = (paramName, paramValue, apiPredefinedConfig, callback) => {
  if (apiPredefinedConfig && apiPredefinedConfig.params && apiPredefinedConfig.params.formData
    && apiPredefinedConfig.params.formData.filter(x => x && x.name === paramName).length > 0) {
    const q = apiPredefinedConfig.params.formData.find(x => x.name === paramName);
    // set static values
    q.in = 'formData';
    callback(q);
  }
};

module.exports.urlParamQ = (paramName, apiPredefinedConfig, callback) => {
  if (apiPredefinedConfig && apiPredefinedConfig.params && apiPredefinedConfig.params.path
    && apiPredefinedConfig.params.path.filter(x => x && x.name === paramName).length > 0) {
    const q = apiPredefinedConfig.params.path.find(x => x.name === paramName);
    // set static values
    q.in = 'path';
    callback(q);
  }
};

module.exports.headerParamQ = (headerName, headerValue, apiPredefinedConfig, callback) => {
  if (apiPredefinedConfig && apiPredefinedConfig.params && apiPredefinedConfig.params.header
    && apiPredefinedConfig.params.header.filter(x => x && x.name === headerName).length > 0) {
    const q = apiPredefinedConfig.params.header.find(x => x.name === headerName);
    // set static values
    q.in = 'header';
    q.required = true;
    callback(q);
    return;
  }
  callback(null);
};

module.exports.bodyJsonQ = (schema, apiPredefinedConfig, callback) => {
  if (apiPredefinedConfig && apiPredefinedConfig.params && apiPredefinedConfig.params.body && apiPredefinedConfig.params.body) {
    const q = apiPredefinedConfig.params.body;
    q.in = 'body';
    q.required = true;
    q.schema = _.merge(q.schema, schema);
    callback(q);
  }
};

module.exports.apiInfoQ = (data, callback) => {
  if (data && data.apiInfo && data.apiInfo.metadata) {
    callback(data.apiInfo.metadata);
  }
};
