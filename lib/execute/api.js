var url = require('url');
var errorCodes = require('../errorCodes/command');
var questions = require('../questions/aboutq');
var apiq = require('../questions/apiq');
var async = require('async');
var request = require('request');
var HTTPStatus = require('http-status');
var jsonSchemaGenerator = require('json-schema-generator');
var fs = require('fs');
const _ = require('lodash');
//var inquirer = require("inquirer");

module.exports = {
  processRequest: processRequest
};

var swaggerSpec = {};
swaggerSpec.swagger = "2.0";
var hostMatch = false;
var basePathMatch = false;
var createNew = true;


function processRequest(options, cb) {
  if (options.endpoint == null) {
    // Error Code : 01 for missing endPoint
    var errorMessage = errorCodes.errorMessage("01");
    return cb(true, errorMessage);
  }
  // Extract Information needed for Swagger Spec
  var urlObj = url.parse(options.endpoint);
  if (urlObj.host == null) {
    // Error Code : 02 for invalid endPoint
    return cb(true, errorCodes.errorMessage("02"));
  }
  if (options.output == null) {
    // Error Code : 02 for invalid endPoint
    return cb(true, errorCodes.errorMessage("05"));
  }
  var supportedProtocols = ['http', 'https', 'ws', 'wss'];
  if (supportedProtocols.indexOf(urlObj.protocol.slice(0, -1)) == -1) {
    // Error Code : 03 for invalid protocol
    return cb(true, errorCodes.errorMessage("03"));
  }
  var supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'];
  if (options.httpMethod == null) {
    options.httpMethod = 'GET';
  }
  if (supportedMethods.indexOf(options.httpMethod) == -1) {
    // Error Code : 03 for invalid protocol
    return cb(true, errorCodes.errorMessage("04"));
  }
  // Check if swagger source given in output - Update Operation
  try {
    // Query the entry
    stats = fs.lstatSync(options.output);
    var swaggerSpecRead = JSON.parse(fs.readFileSync(options.output, 'utf8'));
    if (swaggerSpecRead.host != urlObj.host) {
      return cb(true, errorCodes.errorMessage("06"));
    }
    hostMatch = true;
    createNew = false;
  }
  catch (e) {
    // Nothing for now..
  }

  // Check for basepath match
  if (!createNew) {
    if (decodeURI(urlObj.pathname).indexOf(swaggerSpecRead.basePath) == -1) {
      return cb(true, errorCodes.errorMessage("07"));
    } else {
      basePathMatch = true;
    }
  }

  var apiPredefinedConfig;

  try {
    apiPredefinedConfig = JSON.parse(fs.readFileSync(options.input, 'utf8').trim());
    if (apiPredefinedConfig.host != urlObj.host) {
      return cb(true, errorCodes.errorMessage("08"));
    }
    //options = replaceOptions(options, apiPredefinedConfig);
  }
  catch (e) {
    // Nothing for now..
  }


  swaggerSpec.host = urlObj.host;
  swaggerSpec.schemes = new Array();
  swaggerSpec.schemes.push(urlObj.protocol.slice(0, -1));
  // Extract Possible Base Paths
  var pathComponents = urlObj.pathname.split("/");
  var possibleBasePaths = new Array();
  var tempBasePath = "";
  for (var key in pathComponents) {
    if (pathComponents[key] != '') {
      tempBasePath = tempBasePath + "/" + pathComponents[key];
      possibleBasePaths.push(tempBasePath);
    }
    else {
      possibleBasePaths.push("/");
    }
  }
  if (!hostMatch && createNew) {
    async.series({
      swaggerInfo: function (callback) {
        getSwaggerInfo(swaggerSpec, apiPredefinedConfig, callback);
      },
      protocols: function (callback) {
        getProtocolInfo(swaggerSpec, urlObj, apiPredefinedConfig, callback);
      },
      basePaths: function (callback) {
        getBasePathsInfo(swaggerSpec, possibleBasePaths, apiPredefinedConfig, callback);
      },
      ioInfo: (callback) => {
        getApiAdditionalInfo(swaggerSpec, apiPredefinedConfig, callback);
      },
      apiInfo: function (callback) {
        getApiInfo(swaggerSpec, urlObj, options, apiPredefinedConfig, callback);
      },
      // TODO : move to the end and loop examples
      runtimeInfo: function (callback) {
        getApiRuntimeInfo(swaggerSpec, urlObj, options, false, apiPredefinedConfig, callback);
      },
      queryParamInfo: function (callback) {
        getQueryParamInfo(swaggerSpec, urlObj, options, apiPredefinedConfig, callback);
      },
      headerInfo: function (callback) {
        getHeaderInfo(swaggerSpec, urlObj, options, apiPredefinedConfig, callback);
      },
      bodyInfo: function (callback) {
        getBodyInfo(swaggerSpec, urlObj, options, apiPredefinedConfig, callback);
      },
      // Make sure you execute this last
      paramsInfo: function (callback) {
        getParamsInfo(swaggerSpec, urlObj, options, apiPredefinedConfig, callback);
      }
    },
      function (err, results) {
        finish(swaggerSpec, options, err, results);
      }
    );
  }
  else {
    // Basepath & hostname matched, updated the swagger spec
    swaggerSpec = swaggerSpecRead;
    async.series({
      ioInfo: (callback) => {
        getApiAdditionalInfo(swaggerSpec, apiPredefinedConfig, callback);
      },
      apiInfo: function (callback) {
        getApiInfo(swaggerSpec, urlObj, options, apiPredefinedConfig, callback);
      },
      runtimeInfo: function (callback) {
        getApiRuntimeInfo(swaggerSpec, urlObj, options, true, apiPredefinedConfig, callback);
      },
      queryParamInfo: function (callback) {
        getQueryParamInfo(swaggerSpec, urlObj, options, apiPredefinedConfig, callback);
      },
      headerInfo: function (callback) {
        getHeaderInfo(swaggerSpec, urlObj, options, apiPredefinedConfig, callback);
      },
      bodyInfo: function (callback) {
        getBodyInfo(swaggerSpec, urlObj, options, apiPredefinedConfig, callback);
      },
      // Make sure you execute this last
      paramsInfo: function (callback) {
        getParamsInfo(swaggerSpec, urlObj, options, apiPredefinedConfig, callback);
      }
    },
      function (err, results) {
        finish(swaggerSpec, options, err, results);
      }
    );
  }
}

function scan(obj) {
  var k;
  if (obj instanceof Object) {
    for (k in obj) {
      if (k == "required") {
        if (obj[k] instanceof Array) {
          if (obj[k].length == 0) {
            delete obj[k];
          }
        }
      }
      if (obj.hasOwnProperty(k)) {
        //recursive call to scan property
        scan(obj[k]);
      }
    }
  } else {
    //not an Object so obj[k] here is a value
  }
  ;
};

var finish = function (swaggerSpec, options, err, results) {
  if (err != null) {
    console.log("error in the information-gathering phase - no output will be generated");
    return;
  }
  fs.writeFile(options.output, JSON.stringify(swaggerSpec, null, 2), function (err) {
    if (err) {
      console.log("Error writing Swagger JSON File to : " + options.output);
      return;
    }
    console.log("Swagger JSON File successfully generated in : " + options.output);
  });
}

var getSwaggerInfo = function (swaggerSpec, apiPredefinedConfig, callback) {
  questions.infoQ(apiPredefinedConfig, function (answers) {
    swaggerSpec.info = answers;
    callback(null, true);
  });
};

const getApiAdditionalInfo = (swaggerSpec, apiPredefinedConfig, callback) => {
  if (apiPredefinedConfig && apiPredefinedConfig.apiInfo) {
    if (apiPredefinedConfig.apiInfo.consumes) swaggerSpec.consumes = apiPredefinedConfig.apiInfo.consumes;
    if (apiPredefinedConfig.apiInfo.produces) swaggerSpec.produces = apiPredefinedConfig.apiInfo.produces;
    if (apiPredefinedConfig.host) swaggerSpec.host = apiPredefinedConfig.host;
    if (apiPredefinedConfig.tags) swaggerSpec.tags = apiPredefinedConfig.tags;
  }
  callback(null, true);
};

var getApiInfo = function (swaggerSpec, urlObj, options, apiPredefinedConfig, callback) {
  let apiPath = getApiPath(urlObj, swaggerSpec);
  if (swaggerSpec.paths == null) {
    swaggerSpec.paths = {};
  }
  if (swaggerSpec.paths[apiPath] == null) {
    swaggerSpec.paths[apiPath] = {};
  }
  var pathMethod = options.httpMethod.toLowerCase();
  if (swaggerSpec.paths[apiPath][pathMethod] == null) {
    swaggerSpec.paths[apiPath][pathMethod] = {};
  }
  apiq.apiInfoQ(apiPredefinedConfig, function (answers) {
    //Update API Path Information
    swaggerSpec.paths[apiPath][pathMethod]["description"] = answers.description;
    swaggerSpec.paths[apiPath][pathMethod]["summary"] = answers.summary;
    swaggerSpec.paths[apiPath][pathMethod]["externalDocs"] = answers.externalDocs;
    swaggerSpec.paths[apiPath][pathMethod]["operationId"] = answers.operationId;
    swaggerSpec.paths[apiPath][pathMethod]["tags"] = answers.tags;
    callback(null, true);
  });
};

var getProtocolInfo = function (swaggerSpec, urlObj, apiPredefinedConfig, callback) {
  questions.protocolsQ(urlObj.protocol.slice(0, -1), apiPredefinedConfig, function (answers) {
    if (answers.http) {
      swaggerSpec.schemes = _.uniq(swaggerSpec.schemes.concat(['http']));
    }
    else if (answers.https) {
      swaggerSpec.schemes = _.uniq(swaggerSpec.schemes.concat(['https']));
    }
    callback(null, true);
  });
}

var getBasePathsInfo = function (swaggerSpec, possibleBasePaths, apiPredefinedConfig, callback) {
  questions.basePathsQ(possibleBasePaths, apiPredefinedConfig, function (answers) {
    swaggerSpec.basePath = answers.basePath;
    callback(null, true);
  });
}

var getApiRuntimeInfo = function (swaggerSpec, urlObj, options, update, apiPredefinedConfig, callback) {
  console.log("Making an API Call & fetching more details...Please stay tuned..");
  if (apiPredefinedConfig && apiPredefinedConfig.outputExamples && apiPredefinedConfig.outputExamples.length > 0) {
    async.eachSeries(apiPredefinedConfig.outputExamples, function iterator(endpoint, qcallback) {
      getResponseFromUrl(endpoint, urlObj, swaggerSpec, options, update, (error, data) => { console.log(`api endpoint finished`); qcallback(null, true); });
    },
      function done(error, data) {
        callback(null, true);
      });
    return;
  }
  getResponseFromUrl(options.endpoint, urlObj, swaggerSpec, options, update, callback);
}

var getResponseFromUrl = function (endpoint, urlObj, swaggerSpec, options, update, callback) {
  let apiPath = getApiPath(urlObj, swaggerSpec);
  let pathMethod = options.httpMethod.toLowerCase();
  let requestData = getRequestData(endpoint, options, false);
  let requestUrl = {
    url: requestData.url,
    method: pathMethod
  };
  if (requestData.proxy != null) {
    requestUrl['proxy'] = requestData.proxy;
  }
  if (requestData.data != null) {
    requestUrl['body'] = requestData.data;
  }
  if (requestData.headers != null && requestData.headers.length > 0) {
    requestUrl['headers'] = {};
    for (var i = 0; i < requestData.headers.length; i++) {
      var header = requestData.headers[i];
      var keyValue = header.split(":");
      requestUrl['headers'][keyValue[0]] = keyValue[1];
    }
  }
  request(requestUrl, function (error, response, body) {
    if (error != null) {
      //problem with the request - report & halt
      console.log("Error calling the API endpoint");
      console.log("Error returned is: " + error);
      callback("error received");
    } else {
      if (swaggerSpec.paths == null) {
        swaggerSpec.paths = {};
      }
      if (swaggerSpec.paths[apiPath] == null) {
        swaggerSpec.paths[apiPath] = {};
      }
      if (swaggerSpec.paths[apiPath][pathMethod] == null) {
        swaggerSpec.paths[apiPath][pathMethod] = {};
      }
      swaggerSpec.paths[apiPath][pathMethod]["produces"] = swaggerSpec.paths[apiPath][pathMethod]["produces"] || new Array();
      if (response.headers['content-type'] && response.headers['content-type'] != '' && swaggerSpec.paths[apiPath][pathMethod]["produces"].indexOf(response.headers['content-type']) == -1)
        swaggerSpec.paths[apiPath][pathMethod]["produces"].push(response.headers['content-type']);
      swaggerSpec.paths[apiPath][pathMethod]["responses"] = swaggerSpec.paths[apiPath][pathMethod]["responses"] || {};
      swaggerSpec.paths[apiPath][pathMethod]["responses"][response.statusCode] = {};
      swaggerSpec.paths[apiPath][pathMethod]["responses"][response.statusCode].description = HTTPStatus[response.statusCode];
      if (body && body != '' && response.headers['content-type'].indexOf('application/json') > -1) {
        var schemaObj = jsonSchemaGenerator(JSON.parse(body));
        delete schemaObj.$schema;
        // bug with json scheme generator - work around
        // For more details, https://github.com/krg7880/json-schema-generator/issues/13
        scan(schemaObj);
        swaggerSpec.paths[apiPath][pathMethod]["responses"][response.statusCode].schema = schemaObj;
      }
      swaggerSpec.paths[apiPath][pathMethod].security = new Array();
      if (response.request.headers.authorization && response.request.headers.authorization.startsWith('Basic')) {
        var basicSecurity = {
          "basicAuth": []
        };
        swaggerSpec.securityDefinitions = {
          "basicAuth": {
            "type": "basic",
            "description": "HTTP Basic Authentication. Works over `HTTP` and `HTTPS`"
          }
        };
        swaggerSpec.paths[apiPath][pathMethod].security.push(basicSecurity);
      }
      callback(null, true);
    }
  });
}

var getQueryParamInfo = function (swaggerSpec, urlObj, options, apiPredefinedConfig, callback) {
  let apiPath = getApiPath(urlObj, swaggerSpec);
  var pathMethod = options.httpMethod.toLowerCase();
  if (urlObj.query != null && urlObj.query.split("&").length > 0) {
    var queryParams = urlObj.query.split("&");
    swaggerSpec.paths[apiPath][pathMethod]["parameters"] = new Array();
    async.eachSeries(queryParams, function iterator(queryparam, qcallback) {
      var keyValue = queryparam.split("=");
      apiq.queryParamQ(keyValue[0], keyValue[1], apiPredefinedConfig, function (answers) {
        swaggerSpec.paths[apiPath][pathMethod]["parameters"].push(answers);
        qcallback(null, true);
      });
    }, function done(error, data) {
      callback(null, true);
    });
  }
  else {
    callback(null, true);
  }
}


var getHeaderInfo = function (swaggerSpec, urlObj, options, apiPredefinedConfig, callback) {
  var apiPath = getApiPath(urlObj, swaggerSpec);
  var pathMethod = options.httpMethod.toLowerCase();
  if (swaggerSpec.paths[apiPath][pathMethod]["parameters"] == null) {
    swaggerSpec.paths[apiPath][pathMethod]["parameters"] = new Array();
  }
  let requestInfo = getRequestInfo(apiPredefinedConfig, options);

  if (requestInfo.headers != null && requestInfo.headers.length > 0) {

    async.eachSeries(requestInfo.headers, function iterator(header, qcallback) {
      var keyValue = header.split(":");
      console.log("Api2swagger needs details related to Header : " + keyValue[0]);
      apiq.headerParamQ(keyValue[0], keyValue[1], apiPredefinedConfig, function (answers) {
        swaggerSpec.paths[apiPath][pathMethod]["parameters"].push(answers);
        qcallback(null, true);
      });
    }, function done(error, data) {
      console.log('end mapping headers');
      callback(null, true);
    });
  }
  else {
    console.log('end mapping headers, no headers found');
    callback(null, true);
  }
}

var getBodyInfo = function (swaggerSpec, urlObj, options, apiPredefinedConfig, callback) {
  var apiPath = getApiPath(urlObj, swaggerSpec);
  var pathMethod = options.httpMethod.toLowerCase();
  if (swaggerSpec.paths[apiPath][pathMethod]["parameters"] == null) {
    swaggerSpec.paths[apiPath][pathMethod]["parameters"] = new Array();
  }
  // get example data to be the input instead of the options.data
  let requestInfo = getRequestInfo(apiPredefinedConfig, options);
  if (requestInfo.data != null) {
    console.log("Please provide more details regarding request payload..");
    // json data - Check, Form Data - Check
    if (requestInfo.headers.length > 0) {
      var headerKeyValues = {};
      for (var i = 0; i < requestInfo.headers.length; i++) {
        var split = requestInfo.headers[i].split(':');
        headerKeyValues[split[0].trim()] = split[1].trim();
      }
      if (headerKeyValues['Content-Type'].indexOf('application/json') > -1 || headerKeyValues['content-type'].indexOf('application/json') > -1) {
        // Found JSON        
        var schemaObj = jsonSchemaGenerator(JSON.parse(requestInfo.data));
        delete schemaObj.$schema;
        // bug with json scheme generator - work around
        // For more details, https://github.com/krg7880/json-schema-generator/issues/13
        scan(schemaObj);
        // get details
        apiq.bodyJsonQ(schemaObj, apiPredefinedConfig, function (answers) {
          swaggerSpec.paths[apiPath][pathMethod]["parameters"].push(answers);
          callback(null, true);
        });
      }
      else if (headerKeyValues['Content-Type'] == 'application/x-www-form-urlencoded') {
        if (requestInfo.data.split("&").length > 0) {
          var formParams = requestInfo.data.split("&");
          async.eachSeries(formParams, function iterator(formParam, qcallback) {
            var keyValue = formParam.split("=");
            apiq.formParamQ(keyValue[0], keyValue[1], apiPredefinedConfig, function (answers) {
              swaggerSpec.paths[apiPath][pathMethod]["parameters"].push(answers);
              qcallback(null, true);
            });
          }, function done(error, data) {
            callback(null, true);
          });
        }
        else {
          callback(null, true);
        }
      }
      else {
        callback(null, true);
      }
    }
    else {
      apiq.bodyJsonQ(requestInfo.data, apiPredefinedConfig, function (answers) {
        swaggerSpec.paths[apiPath][pathMethod]["parameters"].push(answers);
        callback(null, true);
      });
    }
  }
  else {
    callback(null, true);
  }
}

var getParamsInfo = function (swaggerSpec, urlObj, options, apiPredefinedConfig, callback) {
  if (apiPredefinedConfig && apiPredefinedConfig.params && apiPredefinedConfig.params.path && apiPredefinedConfig.params.path.length > 0) {
    let apiPath = getApiPath(urlObj, swaggerSpec);
    var pathMethod = options.httpMethod.toLowerCase();

    if (swaggerSpec.paths[apiPath][pathMethod]["parameters"] == null) {
      swaggerSpec.paths[apiPath][pathMethod]["parameters"] = new Array();
    }
    apiPredefinedConfig.params.path.forEach(function (param) {
      if (swaggerSpec.paths[apiPath][pathMethod]["parameters"].filter(a => a.name === param.name).length === 0) {
        let q = param;
        q.in = 'path';
        swaggerSpec.paths[apiPath][pathMethod]["parameters"].push(q);
      }
    }, this);
    callback(null, true);
    return;
  }
  else {
    callback(null, true);
  }
}

const getApiPath = (urlObj, swaggerSpec) => {
  let apiPath = decodeURI(urlObj.pathname).replace(swaggerSpec.basePath, "");
  if (apiPath == "") {
    apiPath = "/";
  }
  if (apiPath.charAt(0) != "/") {
    apiPath = "/" + apiPath;
  }
  return apiPath;
}

const getRequestData = (endpoint, options, forHttpRequest = true) => {
  if (typeof (endpoint) === 'string' || endpoint instanceof String) {
    return {
      url: endpoint,
      data: options.data,
      proxy: options.proxy,
      headers: options.headers
    }
  }
  else {
    let data = undefined;
    if (endpoint.body) data = forHttpRequest ? `'${JSON.stringify(endpoint.body)}'` : `${JSON.stringify(endpoint.body)}`;
    return {
      url: endpoint.url,
      data: data,
      proxy: endpoint.proxy,
      headers: endpoint.headers
    }
  }
}

const getRequestInfo = (apiPredefinedConfig, options) => {
  if (apiPredefinedConfig && apiPredefinedConfig.outputExamples && apiPredefinedConfig.outputExamples.length > 0)
    return getRequestData(apiPredefinedConfig.outputExamples[0], options, false);
  return options;
}