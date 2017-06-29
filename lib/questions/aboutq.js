module.exports.infoQ = (apiPredefinedConfig, callback) => {
  if (apiPredefinedConfig && apiPredefinedConfig.apiInfo && apiPredefinedConfig.apiInfo.info) {
    callback(apiPredefinedConfig.apiInfo.info);
  }
};

module.exports.protocolsQ = (data, apiPredefinedConfig, callback) => {
  if (apiPredefinedConfig && apiPredefinedConfig.apiInfo && apiPredefinedConfig.apiInfo.schemes) {
    callback(JSON.parse(`{ "${apiPredefinedConfig.apiInfo.schemes}" : true }`));
  }
};

module.exports.basePathsQ = (options, apiPredefinedConfig, callback) => {
  if (apiPredefinedConfig && apiPredefinedConfig.apiInfo && apiPredefinedConfig.apiInfo.basePath) {
    callback(apiPredefinedConfig.apiInfo);
  }
};
