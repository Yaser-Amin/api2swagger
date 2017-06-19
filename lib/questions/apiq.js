//var inquirer = require("inquirer");
const _ = require('lodash');

var queryParamQuestions = [
  { name: 'description', message: 'Description of Query Param ?', default: 'Query Param description goes here..' },
  { name: 'required', message: 'Is Above Query param required ?', type: 'confirm' },
  { name: 'type', message: 'Type of query param ?', type: 'list', choices: ["string", "number", "boolean"] },
  { name: 'possibleValues', message: 'Comma Separated possible values?' }
];

var urlParamQuestions = [
  { name: 'name', message: 'Name of URL Param ?', default: '' },
  { name: 'description', message: 'Description of URL Param ?', default: '' },
  { name: 'type', message: 'Type of query param ?', type: 'list', choices: ["string", "integer", "boolean"] }
];

var bodyJsonQuestion = [
  { name: 'name', message: 'Name of body Param ?', default: 'body' },
  { name: 'description', message: 'Description of URL Param ?', default: 'Request Payload Body' },
];

var headerParamQuestions = [
  { name: 'name', message: 'Name of Header Param ?' },
  { name: 'description', message: 'Description of URL Param ?', default: 'Header Param Description' },
  { name: 'type', message: 'Type of query param ?', type: 'list', choices: ["string", "integer", "boolean"] }
];

var apiInfoQuestions = [
  { name: 'description', message: 'A verbose explanation of the operation behavior.  ?', default: 'API Method Description' },
  { name: 'summary', message: 'A short summary of what the operation does. ?', default: 'Short Summary of API Method' },
  { name: 'externalDocsUrl', message: 'Additional external documentation for this operation. ?', default: 'http://docs.example.com/management/apis/get/entities' },
  { name: 'operationId', message: 'Unique string used to identify the operation. ?', default: 'uniqueId' },
  { name: 'tags', message: 'A list of tags for API documentation control.  ?', default: 'api2swagger' },
];

module.exports.queryParamQ = function (paramName, paramValue, apiPredefinedConfig, callback) {  
  if (apiPredefinedConfig && apiPredefinedConfig.params && apiPredefinedConfig.params.query
    && apiPredefinedConfig.params.query.filter(x => x.name === paramName).length > 0) {
    let q = apiPredefinedConfig.params.query.find(x => x.name === paramName);
    //set static values
    q.in = 'query';
    callback(q);
    return;
  }
}


module.exports.formParamQ = function (paramName, paramValue, apiPredefinedConfig, callback) {  
  if (apiPredefinedConfig && apiPredefinedConfig.params && apiPredefinedConfig.params.formData
    && apiPredefinedConfig.params.formData.filter(x => x.name === paramName).length > 0) {
    let q = apiPredefinedConfig.params.formData.find(x => x.name === paramName);
    //set static values
    q.in = 'formData';
    callback(q);
    return;
  }
}

module.exports.urlParamQ = function (paramName, callback) {  
  if (apiPredefinedConfig && apiPredefinedConfig.params && apiPredefinedConfig.params.path
    && apiPredefinedConfig.params.path.filter(x => x.name === paramName).length > 0) {
    let q = apiPredefinedConfig.params.path.find(x => x.name === paramName);
    //set static values
    q.in = 'path';
    callback(q);
    return;
  }
}

module.exports.headerParamQ = function (headerName, headerValue, apiPredefinedConfig, callback) {  
  if (apiPredefinedConfig && apiPredefinedConfig.params && apiPredefinedConfig.params.header
    && apiPredefinedConfig.params.header.filter(x => x.name === headerName).length > 0) {
    let q = apiPredefinedConfig.params.header.find(x => x.name === headerName);
    //set static values
    q.in = 'header';
    q.required = true;
    callback(q);
    return;
  }
}

module.exports.bodyJsonQ = function (schema, apiPredefinedConfig, callback) {
  if (apiPredefinedConfig && apiPredefinedConfig.params && apiPredefinedConfig.params.body && apiPredefinedConfig.params.body) {
    let q = apiPredefinedConfig.params.body;
    q.in = 'body';
    q.required = true;
    q.schema = _.merge(q.schema, schema);
    callback(q);
    return;
  }
}

module.exports.apiInfoQ = function (data, callback) {
  if (data && data.apiInfo && data.apiInfo.metadata) {
    callback(data.apiInfo.metadata);
    return;
  }
}