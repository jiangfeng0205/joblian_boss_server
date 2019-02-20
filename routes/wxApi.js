var express = require('express');
var router = express.Router();

var https = require('https'); // 引入https模块
var request = require('request');
var util = require('util'); // 引入util工具包格式化路径
var url = require('url');
var sha1 = require('sha1');
var router = express.Router();
var redisDb = require(__dirname + "/../common/config/db/redis.js");
var configJson = require(__dirname + "/../common/config/config.js").config().wxConfig;

// 获取、缓存access_token
router.get('/getAccessToken', function(req, res, next) {
    new Promise(function(resolve,reject) {
        //格式化请求地址
        var url = util.format(configJson.apiURL.accessTokenApi,configJson.apiDomain,configJson.appID,configJson.appScrect);
        var options = {
            method: 'GET',
            url: url
        };
        var wxAccessToken = 'wxAccessToken';
        var returnData = {};

        redisDb.get(wxAccessToken, function(geterr, accessTokenResult) {
            // access_token未过期时从redis取出缓存
            if (accessTokenResult) {
                var accessToken = JSON.parse(accessTokenResult).access_token;
                returnData.code = 200;
                returnData.message = 'success';
                returnData.data = accessToken;

                resolve(returnData);
            } else {
                // 获取access_token,并在redis中缓存7000秒
                request(options, function (err, res, body) {
                    if (res) {
                        console.log('errrrrrr33--',body)
                        redisDb.set(wxAccessToken, body, function(setErr, setAccessToken) {
                            if (setErr) {
                                console.log('set access_token error', setErr);
                            } else {
                                var accessToken = JSON.parse(body).access_token;
                                returnData.code = 200;
                                returnData.message = 'success';
                                returnData.data = accessToken;

                                resolve(returnData);
                            }

                        },7000);

                    } else {
                        returnData.code = 402;
                        returnData.message = 'error';
                        returnData.data = '';

                        resolve(returnData);
                    }
                });

            }
        });

    }).then(function(data) {
        res.status(200).send(data);
    });
});

// 获取、缓存票据
router.get('/getJsapiTicket', function(req, res, next) {
    new Promise(function(resolve,reject) {
        //格式化请求地址
        var wxAccessToken = 'wxAccessToken';
        var wxJsapiTicket = 'wxJsapiTicket';
        var returnData = {};

        redisDb.get(wxJsapiTicket, function(jsapiTicketErr, jsapiTicketResult){
            if (jsapiTicketResult) {
                var jsapiTicket = JSON.parse(jsapiTicketResult).ticket;
                returnData.code = 200;
                returnData.message = 'success';
                returnData.data = jsapiTicket;

                resolve(returnData);
            } else {

                redisDb.get(wxAccessToken, function(geterr, accessTokenResult) {
                    // access_token未过期时从redis取出缓存
                    if (accessTokenResult) {
                        var accessToken = JSON.parse(accessTokenResult).access_token;
                        var url = util.format(configJson.apiURL.jsapiTicketApi, configJson.apiDomain, accessToken);
                        var options = {
                            method: 'GET',
                            url: url
                        };

                        // 获取access_token,并在redis中缓存7000秒
                        request(options, function (err, res, body) {
                            if (res) {
                                redisDb.set(wxJsapiTicket, body, function(setTicketErr, setTicketResult) {
                                    if (setTicketErr) {
                                        console.log('set jsapi ticket error');
                                    }
                                },7000);

                                var jsapiTicket = JSON.parse(body).ticket;
                                returnData.code = 200;
                                returnData.message = 'success';
                                returnData.data = jsapiTicket;

                                resolve(returnData);
                            } else {
                                returnData.code = 402;
                                returnData.message = 'error';
                                returnData.data = '';

                                resolve(returnData);
                            }
                        });

                    } else {
                        returnData.code = 402;
                        returnData.message = 'get jsapi ticket error';
                        returnData.data = '';

                        resolve(returnData);
                    }
                });
            }
        });

    }).then(function(data) {
        res.status(200).send(data);
    });
});

// 获取签名，返回wxConfig的数据
router.post('/getWxSigin', function(req, res, next) {
    var postData = req.body;
    var wxJsapiTicketTable = 'wxJsapiTicket';
    var appId = configJson.appID;
    var host = req.headers.host;
    var originalUrl = req.originalUrl;
    var nonceStr = randomString();
    var timestamp = parseInt(new Date().getTime() / 1000).toString();
    var url = postData.url;

    console.log('headers--',url);

    var wxConfigData = {
        appId     : appId,
        timestamp : timestamp,
        nonceStr  : nonceStr,
    };

    redisDb.get(wxJsapiTicketTable, function(ticketErr, ticketResult) {
        if (ticketErr) {
            return res.status(200).json({code:402, message:'jsapi ricket error', data:''});
        }
        if (ticketResult) {
            var ticket = JSON.parse(ticketResult).ticket;
            var jsapi_ticket = ticket;
            var ret = {
                jsapi_ticket: ticket,
                noncestr: nonceStr,
                timestamp: timestamp,
                url: url
            };
            var sortRetString = rawString(ret);
            console.log('retttt--', sortRetString);

            var signature = sha1(sortRetString);

            wxConfigData.signature = signature;
            wxConfigData.url = url;

            return res.status(200).json({code:200, message:'success', data:wxConfigData});
        } else {
            return res.status(200).json({code:402, message:'生成signature签名 error', data:''});
        }
    });
});

// 生成随机字符串
function randomString(len) {
    len = len || 16;
    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
    var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    var maxLen = $chars.length;
    var str = '';
    for (i = 0; i < len; i++) {
        str += $chars.charAt(Math.floor(Math.random() * maxLen));
    }
    return str;
}

// 字典序排序并生成字符串
function rawString(args) {
    var keys = Object.keys(args);
    var newArgs = {};
    keys = keys.sort()

    keys.forEach(function(key) {
        newArgs[key.toLowerCase()] = args[key];
    });

    var string = '';

    for (var k in newArgs) {
      string += '&' + k + '=' + newArgs[k];
    }

    string = string.substr(1);

    return string;
};

/**
 * 生成、缓存access_token、ticket
 * 获取signature
 * 返回wxConfig
 */
router.post('/getWxConfig', function(req, res, next) {
    var postData = req.body;
    var wxJsapiTicketTable = 'wxJsapiTicket';
    var wxAccessTokenTable = 'wxAccessToken';
    var appId = configJson.appID;
    var host = req.headers.host;
    var originalUrl = req.originalUrl;
    var nonceStr = randomString();
    var timestamp = parseInt(new Date().getTime() / 1000).toString();
    var url = postData.url;
    var wxConfigData = {
        appId     : appId,
        timestamp : timestamp,
        nonceStr  : nonceStr,
    };

    // 一、查看jsapi_ticket票据是否存在
    redisDb.get(wxJsapiTicketTable, function(ticketErr, ticketResult) {
        if (ticketErr) {
            return res.status(200).json({code:402, message:'jsapi ricket error', data:''});
        }

        // 二、票据存在时，生成签名并给客户端返回wxConfig数据
        if (ticketResult) {
            var ticket = JSON.parse(ticketResult).ticket;

            var ret = {
                jsapi_ticket: ticket,
                noncestr: nonceStr,
                timestamp: timestamp,
                url: url
            };
            var sortRetString = rawString(ret);
            var signature = sha1(sortRetString);

            wxConfigData.signature = signature;
            wxConfigData.url = url;

            return res.status(200).json({code:200, message:'success', data:wxConfigData});
        } else {
            // 三、票据不存在时，重新生成jsapi_ticket票据
            redisDb.get(wxAccessTokenTable, function(geterr, accessTokenResult) {
                // access_token未过期时从redis取出缓存
                if (accessTokenResult) {
                    var accessToken = JSON.parse(accessTokenResult).access_token;
                    var jsapiTicketUrl = util.format(configJson.apiURL.jsapiTicketApi, configJson.apiDomain, accessToken);
                    var options = {
                        method: 'GET',
                        url: jsapiTicketUrl
                    };

                    // 获取票据,并在redis中缓存7000秒.
                    request(options, function (err, r, body) {
                        if (r) {
                            redisDb.set(wxJsapiTicketTable, body, function(setTicketErr, setTicketResult) {
                                if (setTicketErr) {
                                    console.log('set jsapi ticket error');
                                }
                            },7000);

                            var jsapiTicket = JSON.parse(body).ticket;

                            var ret = {
                                jsapi_ticket: jsapiTicket,
                                noncestr: nonceStr,
                                timestamp: timestamp,
                                url: url
                            };
                            var sortRetString = rawString(ret);
                            var signature = sha1(sortRetString);

                            wxConfigData.signature = signature;
                            wxConfigData.url = url;

                            return res.status(200).json({code:200, message:'success', data:wxConfigData});

                        } else {

                            return res.status(200).json({code:402, message:'get jsapi ticket error', data:''});
                        }
                    });

                } else {
                    // access_token过期后重新生成access_token,并在redis中缓存7000秒
                    var accessTokenUrl = util.format(configJson.apiURL.accessTokenApi,configJson.apiDomain,configJson.appID,configJson.appScrect);
                    var options = {
                        method: 'GET',
                        url: accessTokenUrl
                    };
                    request(options, function (err, accessTokenRes, body) {
                        if (accessTokenRes) {
                            console.log('errrrrrr33--',body)
                            redisDb.set(wxAccessTokenTable, body, function(setErr, setAccessToken) {
                                if (setErr) {
                                    console.log('set access_token cache error')
                                }

                            },7000);

                            var accessToken = JSON.parse(body).access_token;
                            var jsapiTicketUrl = util.format(configJson.apiURL.jsapiTicketApi, configJson.apiDomain, accessToken);
                            var ticketOptions = {
                                method: 'GET',
                                url: jsapiTicketUrl
                            };

                            // 获取票据,并在redis中缓存7000秒.
                            request(ticketOptions, function (err, r, body) {
                                if (r) {
                                    redisDb.set(wxJsapiTicketTable, body, function(setTicketErr, setTicketResult) {
                                        if (setTicketErr) {
                                            console.log('set jsapi ticket cache error');
                                        }
                                    },7000);

                                    var jsapiTicket = JSON.parse(body).ticket;

                                    var ret = {
                                        jsapi_ticket: jsapiTicket,
                                        noncestr: nonceStr,
                                        timestamp: timestamp,
                                        url: url
                                    };
                                    var sortRetString = rawString(ret);
                                    var signature = sha1(sortRetString);

                                    wxConfigData.signature = signature;
                                    wxConfigData.url = url;

                                    return res.status(200).json({code:200, message:'success', data:wxConfigData});

                                } else {

                                    return res.status(200).json({code:402, message:'get jsapi ticket error', data:''});
                                }
                            });

                        } else {
                            return res.status(200).json({code:402, message:'get access_token error', data:''});
                        }
                    });

                }
            });
        }
    });

});

module.exports = router;