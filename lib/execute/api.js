const url = require('url');
const errorCodes = require('../errorCodes/command');
const questions = require('../questions/aboutq');
const apiq = require('../questions/apiq');
const async = require('async');
const request = require('request');
const HTTPStatus = require('http-status');
const jsonSchemaGenerator = require('json-schema-generator');
const fs = require('fs');
const _ = require('lodash');

let hostMatch = false;
let createNew = true;
const supportedProtocols = ['http', 'https', 'ws', 'wss'];
const supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'];

const getApiPath = (urlObj, swaggerSpec) => {
  let apiPath = decodeURI(urlObj.pathname).replace(swaggerSpec.basePath, '');
  if (apiPath === '') {
    apiPath = '/';
  }
  if (apiPath.charAt(0) !== '/') {
    apiPath = `/${apiPath}`;
  }
  return apiPath;
};

const getSwaggerInfo = (INIT_INFO, swaggerSpec, apiPredefinedConfig, callback) => {
  if (!INIT_INFO) { callback(null, true); return; }
  questions.infoQ(apiPredefinedConfig, (answers) => {
    swaggerSpec.info = answers;
    callback(null, true);
  });
};

const getApiAdditionalInfo = (swaggerSpec, apiPredefinedConfig, callback) => {
  if (apiPredefinedConfig && apiPredefinedConfig.apiInfo) {
    if (apiPredefinedConfig.apiInfo.consumes) swaggerSpec.consumes = apiPredefinedConfig.apiInfo.consumes;
    if (apiPredefinedConfig.apiInfo.produces) swaggerSpec.produces = apiPredefinedConfig.apiInfo.produces;
    if (apiPredefinedConfig.apiInfo.host) swaggerSpec.host = apiPredefinedConfig.apiInfo.host;
    if (apiPredefinedConfig.apiInfo.tags) swaggerSpec.tags = apiPredefinedConfig.apiInfo.tags;
  }
  callback(null, true);
};

const getApiInfo = (swaggerSpec, urlObj, options, apiPredefinedConfig, callback) => {
  const apiPath = getApiPath(urlObj, swaggerSpec);
  if (swaggerSpec.paths == null) {
    swaggerSpec.paths = {};
  }
  if (swaggerSpec.paths[apiPath] == null) {
    swaggerSpec.paths[apiPath] = {};
  }
  const pathMethod = options.httpMethod.toLowerCase();
  if (swaggerSpec.paths[apiPath][pathMethod] == null) {
    swaggerSpec.paths[apiPath][pathMethod] = {};
  }
  apiq.apiInfoQ(apiPredefinedConfig, (answers) => {
    // Update API Path Information
    swaggerSpec.paths[apiPath][pathMethod].description = answers.description;
    swaggerSpec.paths[apiPath][pathMethod].summary = answers.summary;
    swaggerSpec.paths[apiPath][pathMethod].externalDocs = answers.externalDocs;
    swaggerSpec.paths[apiPath][pathMethod].operationId = answers.operationId;
    swaggerSpec.paths[apiPath][pathMethod].tags = answers.tags;
    callback(null, true);
  });
};

const getProtocolInfo = (INIT_INFO, swaggerSpec, urlObj, apiPredefinedConfig, callback) => {
  if (!INIT_INFO) { callback(null, true); return; }
  questions.protocolsQ(urlObj.protocol.slice(0, -1), apiPredefinedConfig, (answers) => {
    if (answers.http) {
      swaggerSpec.schemes = _.uniq(swaggerSpec.schemes.concat(['http']));
    } else if (answers.https) {
      swaggerSpec.schemes = _.uniq(swaggerSpec.schemes.concat(['https']));
    }
    callback(null, true);
  });
};

const getBasePathsInfo = (INIT_INFO, swaggerSpec, possibleBasePaths, apiPredefinedConfig, callback) => {
  if (!INIT_INFO) { callback(null, true); return; }
  questions.basePathsQ(possibleBasePaths, apiPredefinedConfig, (answers) => {
    swaggerSpec.basePath = answers.basePath;
    callback(null, true);
  });
};

const getRequestData = (endpoint, options, forHttpRequest = true) => {
  if (typeof (endpoint) === 'string' || endpoint instanceof String) {
    return {
      url: endpoint,
      data: options.data,
      proxy: options.proxy,
      headers: options.headers,
    };
  }

  let data;
  if (endpoint.body) data = forHttpRequest ? `'${JSON.stringify(endpoint.body)}'` : `${JSON.stringify(endpoint.body)}`;
  return {
    url: endpoint.url,
    data,
    proxy: endpoint.proxy,
    headers: endpoint.headers,
  };
};

function scan(obj) {
  if (obj instanceof Object) {
    Object.keys(obj).forEach((k) => {
      if (k === 'required') {
        if (obj[k] instanceof Array) {
          if (obj[k].length === 0) {
            delete obj[k];
          }
        }
      }
      if (obj.hasOwnProperty(k)) {
        // recursive call to scan property
        scan(obj[k]);
      }
    }, this);
  } else {
    // not an Object so obj[k] here is a value
  }
}

const getResponseFromUrl = (endpoint, urlObj, swaggerSpec, options, update, apiPredefinedConfig, callback) => {
  const apiPath = getApiPath(urlObj, swaggerSpec);
  const pathMethod = options.httpMethod.toLowerCase();
  const requestData = getRequestData(endpoint, options, false);
  const requestUrl = {
    url: requestData.url,
    method: pathMethod,
  };
  if (requestData.proxy != null) {
    requestUrl.proxy = requestData.proxy;
  }
  if (requestData.data != null) {
    requestUrl.body = requestData.data;
  }
  if (requestData.headers != null && requestData.headers.length > 0) {
    requestUrl.headers = {};
    for (let i = 0; i < requestData.headers.length; i += 1) {
      const header = requestData.headers[i];
      const keyValue = header.split(':');
      requestUrl.headers[keyValue[0]] = keyValue[1];
    }
  }
  request(requestUrl, (error, response, body) => {
    if (error != null) {
      // problem with the request - report & halt
      console.log('Error calling the API endpoint');
      console.log(`Error returned is: ${error}`);
      callback('error received');
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
      swaggerSpec.paths[apiPath][pathMethod].produces = swaggerSpec.paths[apiPath][pathMethod].produces || [];
      if (response.headers['content-type'] && response.headers['content-type'] !== ''
        && swaggerSpec.paths[apiPath][pathMethod].produces.indexOf(response.headers['content-type']) === -1) {
        swaggerSpec.paths[apiPath][pathMethod].produces.push(response.headers['content-type']);
      }
      swaggerSpec.paths[apiPath][pathMethod].responses = swaggerSpec.paths[apiPath][pathMethod].responses || {};
      swaggerSpec.paths[apiPath][pathMethod].responses[response.statusCode] = {};
      swaggerSpec.paths[apiPath][pathMethod].responses[response.statusCode].description = HTTPStatus[response.statusCode];
      if (body && body !== '' && response.headers['content-type'].indexOf('application/json') > -1) {
        const schemaObj = jsonSchemaGenerator(JSON.parse(body));
        delete schemaObj.$schema;
        // bug with json scheme generator - work around
        // For more details, https://github.com/krg7880/json-schema-generator/issues/13
        scan(schemaObj);
        if (apiPredefinedConfig && apiPredefinedConfig.optionalResponse && apiPredefinedConfig.optionalResponse[response.statusCode]) {
          apiPredefinedConfig.optionalResponse[response.statusCode].forEach((optional) => {
            if (schemaObj.items && schemaObj.items.required && schemaObj.items.required.indexOf(optional) > -1) {
              schemaObj.items.required.splice(schemaObj.items.required.indexOf(optional), 1);
            } else if (schemaObj.required && schemaObj.required.indexOf(optional) > -1) schemaObj.required.splice(schemaObj.required.indexOf(optional), 1);
          }, this);
        }
        if (schemaObj.items && schemaObj.items.required && !schemaObj.items.required.length) delete schemaObj.items.required;
        else if (schemaObj.required && !schemaObj.required.length) delete schemaObj.required;
        swaggerSpec.paths[apiPath][pathMethod].responses[response.statusCode].schema = schemaObj;
      }
      swaggerSpec.paths[apiPath][pathMethod].security = swaggerSpec.paths[apiPath][pathMethod].security || [];
      if (response.request.headers.authorization && response.request.headers.authorization.startsWith('Basic')) {
        const basicSecurity = {
          basicAuth: [],
        };
        swaggerSpec.securityDefinitions = {
          basicAuth: {
            type: 'basic',
            description: 'HTTP Basic Authentication. Works over `HTTP` and `HTTPS`',
          },
        };
        swaggerSpec.paths[apiPath][pathMethod].security.push(basicSecurity);
      }
      callback(null, true);
    }
  });
};

const getApiRuntimeInfo = (swaggerSpec, urlObj, options, update, apiPredefinedConfig, callback) => {
  console.log(`Making an API Call to endpoint ${apiPredefinedConfig.endpoint} & fetching more details .....`);
  if (apiPredefinedConfig && apiPredefinedConfig.outputExamples && apiPredefinedConfig.outputExamples.length > 0) {
    async.eachSeries(apiPredefinedConfig.outputExamples, (endpoint, qcallback) => {
      getResponseFromUrl(endpoint, urlObj, swaggerSpec, options, update, apiPredefinedConfig, (error, data) => {
        qcallback(error, data);
      });
    },
      (error, data) => {
        console.log(`api endpoint ${apiPredefinedConfig.endpoint} finished`);
        callback(error, data);
      });
    return;
  }
  getResponseFromUrl(options.endpoint, urlObj, swaggerSpec, options, update, apiPredefinedConfig, callback);
};

const getQueryParamInfo = (swaggerSpec, urlObj, options, apiPredefinedConfig, callback) => {
  const apiPath = getApiPath(urlObj, swaggerSpec);
  const pathMethod = options.httpMethod.toLowerCase();
  if (urlObj.query != null && urlObj.query.split('&').length > 0) {
    const queryParams = urlObj.query.split('&');
    swaggerSpec.paths[apiPath][pathMethod].parameters = swaggerSpec.paths[apiPath][pathMethod].parameters || [];
    async.eachSeries(queryParams, (queryparam, qcallback) => {
      const keyValue = queryparam.split('=');
      apiq.queryParamQ(keyValue[0], keyValue[1], apiPredefinedConfig, (answers) => {
        if (answers) swaggerSpec.paths[apiPath][pathMethod].parameters.push(answers);
        qcallback(null, true);
      });
    }, (error, data) => {
      callback(error, data);
    });
  } else {
    callback(null, true);
  }
};

const getRequestInfo = (apiPredefinedConfig, options) => {
  if (apiPredefinedConfig && apiPredefinedConfig.outputExamples && apiPredefinedConfig.outputExamples.length > 0) {
    return getRequestData(apiPredefinedConfig.outputExamples[0], options, false);
  }
  return options;
};

const getHeaderInfo = (swaggerSpec, urlObj, options, apiPredefinedConfig, callback) => {
  const apiPath = getApiPath(urlObj, swaggerSpec);
  const pathMethod = options.httpMethod.toLowerCase();
  if (!swaggerSpec.paths[apiPath][pathMethod].parameters) swaggerSpec.paths[apiPath][pathMethod].parameters = [];

  const requestInfo = getRequestInfo(apiPredefinedConfig, options);

  if (requestInfo.headers != null && requestInfo.headers.length > 0) {
    async.eachSeries(requestInfo.headers, (header, qcallback) => {
      const keyValue = header.split(':');
      apiq.headerParamQ(keyValue[0], keyValue[1], apiPredefinedConfig, (answers) => {
        if (answers) swaggerSpec.paths[apiPath][pathMethod].parameters.push(answers);
        qcallback(null, true);
      });
    }, (error, data) => {
      callback(error, data);
    });
  } else {
    callback(null, true);
  }
};

const getBodyInfo = (swaggerSpec, urlObj, options, apiPredefinedConfig, callback) => {
  const apiPath = getApiPath(urlObj, swaggerSpec);
  const pathMethod = options.httpMethod.toLowerCase();
  if (!swaggerSpec.paths[apiPath][pathMethod].parameters) swaggerSpec.paths[apiPath][pathMethod].parameters = [];

  // get example data to be the input instead of the options.data
  const requestInfo = getRequestInfo(apiPredefinedConfig, options);
  if (requestInfo.data != null) {
    // json data - Check, Form Data - Check
    if (requestInfo.headers.length > 0) {
      const headerKeyValues = {};
      for (let i = 0; i < requestInfo.headers.length; i += 1) {
        const split = requestInfo.headers[i].split(':');
        headerKeyValues[split[0].trim()] = split[1].trim();
      }
      if (headerKeyValues['Content-Type'].indexOf('application/json') > -1 || headerKeyValues['content-type'].indexOf('application/json') > -1) {
        // Found JSON
        const schemaObj = jsonSchemaGenerator(JSON.parse(requestInfo.data));
        delete schemaObj.$schema;
        // bug with json scheme generator - work around
        // For more details, https://github.com/krg7880/json-schema-generator/issues/13
        scan(schemaObj);
        // get details
        apiq.bodyJsonQ(schemaObj, apiPredefinedConfig, (answers) => {
          if (answers) swaggerSpec.paths[apiPath][pathMethod].parameters.push(answers);
          callback(null, true);
        });
      } else if (headerKeyValues['Content-Type'] === 'application/x-www-form-urlencoded') {
        if (requestInfo.data.split('&').length > 0) {
          const formParams = requestInfo.data.split('&');
          async.eachSeries(formParams, (formParam, qcallback) => {
            const keyValue = formParam.split('=');
            apiq.formParamQ(keyValue[0], keyValue[1], apiPredefinedConfig, (answers) => {
              if (answers) swaggerSpec.paths[apiPath][pathMethod].parameters.push(answers);
              qcallback(null, true);
            });
          }, (error, data) => {
            callback(error, data);
          });
        } else {
          callback(null, true);
        }
      } else {
        callback(null, true);
      }
    } else {
      apiq.bodyJsonQ(requestInfo.data, apiPredefinedConfig, (answers) => {
        if (answers) swaggerSpec.paths[apiPath][pathMethod].parameters.push(answers);
        callback(null, true);
      });
    }
  } else {
    callback(null, true);
  }
};

const getParamsInfo = (swaggerSpec, urlObj, options, apiPredefinedConfig, callback) => {
  if (apiPredefinedConfig && apiPredefinedConfig.params && apiPredefinedConfig.params.path && apiPredefinedConfig.params.path.length > 0) {
    const apiPath = getApiPath(urlObj, swaggerSpec);
    const pathMethod = options.httpMethod.toLowerCase();
    swaggerSpec.paths[apiPath][pathMethod].parameters = swaggerSpec.paths[apiPath][pathMethod].parameters || [];
    apiPredefinedConfig.params.path.forEach((param) => {
      if (swaggerSpec.paths[apiPath][pathMethod].parameters.filter(a => a && a.name === param.name).length === 0) {
        const q = param;
        q.in = 'path';
        if (q) swaggerSpec.paths[apiPath][pathMethod].parameters.push(q);
      }
    }, this);
    callback(null, true);
    return;
  }

  callback(null, true);
};

const finish = (swaggerSpec, options, err) => {
  if (err != null) {
    console.log(`error in the information-gathering phase - no output will be generated\n${err}`);
    return;
  }
  fs.writeFile(options.output, JSON.stringify(swaggerSpec, null, 2), (error) => {
    if (error) {
      console.log(`Error writing Swagger JSON File to : ${options.output}`);
      return;
    }
    console.log(`Swagger JSON File successfully generated in : ${options.output}`);
  });
};

const processWithPredefined = (apiPredefinedConfig, options, existingOutput, cb) => {
  const urlObj = url.parse(options.endpoint);
  if (apiPredefinedConfig && !apiPredefinedConfig.host && apiPredefinedConfig.apiInfo.host) { apiPredefinedConfig.host = apiPredefinedConfig.apiInfo.host; }
  if (apiPredefinedConfig && apiPredefinedConfig.host !== urlObj.host) return cb(true, errorCodes.errorMessage('08'));
  try {
    // Extract Possible Base Paths
    const pathComponents = urlObj.pathname.split('/');
    const possibleBasePaths = [];
    let tempBasePath = '';
    pathComponents.forEach((key) => {
      if (pathComponents[key] !== '') {
        tempBasePath = `${tempBasePath}/${pathComponents[key]}`;
        possibleBasePaths.push(tempBasePath);
      } else {
        possibleBasePaths.push('/');
      }
    }, this);
    let OUTPUT;
    let INIT_INFO = false;
    if (!hostMatch && createNew) {
      const swaggerSpec = { swagger: '2.0' };
      swaggerSpec.host = urlObj.host;
      swaggerSpec.schemes = swaggerSpec.schemes || [];
      swaggerSpec.schemes.push(urlObj.protocol.slice(0, -1));

      OUTPUT = swaggerSpec;
      INIT_INFO = true;
    } else {
      OUTPUT = existingOutput;
    }

    return async.series({
      swaggerInfo(callback) {
        getSwaggerInfo(INIT_INFO, OUTPUT, apiPredefinedConfig, callback);
      },
      protocols(callback) {
        getProtocolInfo(INIT_INFO, OUTPUT, urlObj, apiPredefinedConfig, callback);
      },
      basePaths(callback) {
        getBasePathsInfo(INIT_INFO, OUTPUT, possibleBasePaths, apiPredefinedConfig, callback);
      },
      ioInfo: (callback) => {
        getApiAdditionalInfo(OUTPUT, apiPredefinedConfig, callback);
      },
      apiInfo(callback) {
        getApiInfo(OUTPUT, urlObj, options, apiPredefinedConfig, callback);
      },
      runtimeInfo(callback) {
        getApiRuntimeInfo(OUTPUT, urlObj, options, false, apiPredefinedConfig, callback);
      },
      queryParamInfo(callback) {
        getQueryParamInfo(OUTPUT, urlObj, options, apiPredefinedConfig, callback);
      },
      headerInfo(callback) {
        getHeaderInfo(OUTPUT, urlObj, options, apiPredefinedConfig, callback);
      },
      bodyInfo(callback) {
        getBodyInfo(OUTPUT, urlObj, options, apiPredefinedConfig, callback);
      },
      // Make sure you execute this last
      paramsInfo(callback) {
        getParamsInfo(OUTPUT, urlObj, options, apiPredefinedConfig, callback);
      },
    },
      (err, results) => {
        finish(OUTPUT, options, err, results);
        return cb(err, results);
      });
  } catch (e) {
    return cb(true, e);
  }
};

const executeTo = (existingOutput, options, cb) => {
  const urlObj = url.parse(options.endpoint);
  if (existingOutput && existingOutput.host !== urlObj.host) return cb(true, errorCodes.errorMessage('06'));
  if (existingOutput) {
    createNew = false;
    hostMatch = true;
  }

  // Check for basepath match
  if (!createNew && existingOutput) {
    if (decodeURI(urlObj.pathname).indexOf(existingOutput.basePath) === -1) return cb(true, errorCodes.errorMessage('07'));
  }

  if (options.input) {
    try {
      if (typeof options.input === 'string') {
        try {
          return fs.stat(options.input, (err) => {
            if (err) {
              if (err.code === 'ENOENT') return processWithPredefined(undefined, options, existingOutput, cb);
              return cb(true, err);
            }
            return fs.readFile(options.input, 'utf8', (error, data) => {
              if (err) return cb(true, error);
              return processWithPredefined(JSON.parse(data), options, existingOutput, cb);
            });
          });
        } catch (e) {
          return cb(true, e);
        }
      } else {
        return processWithPredefined(options.input, options, existingOutput, cb);
      }
    } catch (e) {
      return cb(true, e);
    }
  } else {
    return processWithPredefined(undefined, options, existingOutput, cb);
  }
};

function processRequest(options, cb) {
  // Extract Information needed for Swagger Spec
  const urlObj = url.parse(options.endpoint);

  if (options.endpoint == null) return cb(true, errorCodes.errorMessage('01'));
  if (urlObj.host == null) return cb(true, errorCodes.errorMessage('02'));
  if (options.output == null) return cb(true, errorCodes.errorMessage('05'));
  if (supportedProtocols.indexOf(urlObj.protocol.slice(0, -1)) === -1) return cb(true, errorCodes.errorMessage('03'));
  if (supportedMethods.indexOf(options.httpMethod) === -1) return cb(true, errorCodes.errorMessage('04'));

  try {
    return fs.stat(options.output, (err) => {
      if (err) {
        if (err.code === 'ENOENT') return executeTo(undefined, options, cb);
        return cb(true, err);
      }
      return fs.readFile(options.output, 'utf8', (error, data) => {
        if (err) return cb(true, error);
        try {
          const parsed = JSON.parse(data);
          return executeTo(parsed, options, cb);
        } catch (ex) {
          console.log(`error while reading json file`);
          console.log(data);
          return cb(ex, data);
        }
      });
    });
  } catch (e) {
    return cb(true, e);
  }
}

module.exports = {
  processRequest,
};
