//var inquirer = require("inquirer");
var infoq = [
  { name: 'title', message: 'Title of Swagger Spec ?', default: 'API Program Title.' },
  { name: 'description', message: 'Description of Swagger Spec ?', default: 'API Program description' },
  { name: 'termsOfService', message: 'Terms of Service URL ?', default: 'http://example.com/about/terms' },
  { name: 'version', message: 'Version of your API Program ?', default: '0.0.1' },
  { name: 'contactName', message: 'Contact Name?', default: 'API Docs' },
  { name: 'contactUrl', message: 'Contact URL ?', default: 'http://example.com/contact' },
  { name: 'contactEmail', message: 'Contact Email ?', default: 'apidocs@example.com' },
  { name: 'licenseName', message: 'License Name ?', default: 'Apache 2.0' },
  { name: 'licenseUrl', message: 'License URL ?', default: 'http://example.com' }
];

var httpsq = [
  { name: 'https', message: 'Does your API support https ?', type: 'confirm' }
];

var httpq = [
  { name: 'http', message: 'Does your API support http ?', type: 'confirm' }
];

var basepathq = [
  {
    type: "list",
    name: "basePath",
    message: "Pick Base Path from your API ?"
  }
];

module.exports.infoQ = function (apiPredefinedConfig, callback) {  
  if (apiPredefinedConfig && apiPredefinedConfig.apiInfo && apiPredefinedConfig.apiInfo.info) {
    callback(apiPredefinedConfig.apiInfo.info);
    return;
  }
}

module.exports.protocolsQ = function (data, apiPredefinedConfig, callback) {  
  if (data == 'http') {
    var questions = httpsq;
  } else {
    var questions = httpq;
  }
  if (apiPredefinedConfig && apiPredefinedConfig.apiInfo && apiPredefinedConfig.apiInfo.schemes) {   
    callback(JSON.parse(`{ "${apiPredefinedConfig.apiInfo.schemes}" : true }`));
    return;
  }
}

module.exports.basePathsQ = function (options, apiPredefinedConfig, callback) {  
  if (apiPredefinedConfig && apiPredefinedConfig.apiInfo && apiPredefinedConfig.apiInfo.basePath) {    
    callback(apiPredefinedConfig.apiInfo);
    return;
  }
}


