# api2swagger-ext

Generate Swagger 2.0 (Open API) spec from Curl like API Call.

# Installation

You can install `api2swagger-ext` either through npm or by cloning and linking the code from GitHub.  This document covers the installation details for installing from npm.

## Installation from npm

The `api2swagger-ext` module and its dependencies are designed for Node.js and is available through npm using the following command:

### From a Terminal Window:
```bash
$ sudo npm install -g api2swagger-ext
```

### input file structure

``` json
{
  "apiInfo": {    
    "host": "",
    "basePath": "",
    "schemes": [""],
    "consumes": [""],
    "produces": [""],
    "info": {
      "description": "",
      "title": "",
      "version": "",
      "termsOfService": "",
      "contact": {
        "email": ""
      }
    },
    "tags": [
      {
        "name": "",
        "description": ""
      }
    ],
    "metadata": {
      "tags": [],
      "description": ""
    }
  },
  "params": {
    "path": [],
    "query": [],
    "header": [],
    "body": {}    
  },
  "endpoint": "",
  "method":"",
  "outputExamples": [],
  "optionalResponse":{}
}
```

#### `apiInfo`
This tag contains the description for the API.

|Property|Type|Description
|--|--|--|
|"host"|`string`|API host
|"basePath"|`string`|API base path
|"schemes"|`string`|API supported schemas
|"consumes"|`string`|API supported consumable types
|"produces"|`string`|API output types


#### `info`
|Property|Type|Description
|--|--|--|
|"description"|`string`|API description
|"title"|`string`|API title
|"version"|`string`|API version
|"termsOfService"|`string`|Terms of service text
|"contact"|`object`|Contact info

#### `tags`
Array of API global tags

|Property|Type|Description
|--|--|--|
|"name"|`string`|API Tag name
|"description"|`string`|API Tag description

#### `metadata`
Info related to a single API endpoint

|Property|Type|Description
|--|--|--|
|`tags`|`string []`|Array contains the API endpoint tags
|`description`|`string`|API endpoint description

#### `params`
Contains the API endpoint parameters definitions

|Property|Type|Description
|--|--|--|
|`path`|`object []`|array of parameters that exists in the path|
|`query`|`object []`|array of parameters that exists in the query string|
|`header`|`object []`|array of parameters that exists in the request header|
|`body`|`object`|json object representing the request/response body|

##### `path` & `query`
Each object in the list has the following structure

``` json
{
  "name": "",
  "description": "",
  "required": true,
  "type": "string"
}
```

> No need to add the `locale` path parameter as it is already defined in the shared file.

##### `header`
Each object in the list has the following structure

``` json
{
  "name": "",
  "description": "",
  "type": "string"
}
```

##### `body`
 Body parameter will be constructed based on the API execution response; use this property to override the desired parameter; or to specify the request body for `put`, `patch`, `delete`, and `post` mehods

> Remark : You don't have to provide all parameters sections, just add what you need

### `endpoint`
The full URL of the endpoint including all `path` parameters and replacement tags

### `method`
The HTTP method `GET`, `POST`, `PUT`, `DELETE`, `PATCH`...

### `outputExamples`
An array that contains actual calls to a deployed API to exctract the response from.
The array could be a `string` or `object` array, if we the endpoint doesn't need any parameters outside the URL a `string` that represnts the desired url is enough, otherwise the object should have the follwoing structure

``` json
{
  "url": "",
  "body": {},
  "headers": []
}
```

|Property|Type|Description
|--|--|--|
|`url`|`string`|request url
|`body`|`oject`|dynamic object represending the request body
|`headers`|`string []`|request headers

> Remarks : Make sure that the targeted server is up and running before run the documentation generation

### `optionalResponse`
By default all properties in the response object -for both array and single object- are required, if the response has some optional parameteres the output can be overriden using the `optionalResponse` property using the following structure

```json
{
  "optionalResponse":{
    "RESPONSE CODE" : ["OPTIONAL PARAMETER NAME",...]
  }
}
```

Example
```json
{
  "optionalResponse":{
    "200" : ["id","responseId"]
  }
}
```