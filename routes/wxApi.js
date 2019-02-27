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
 * 微信js-sdk
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

// 微信网页授权
router.get('/wxOAuthUserinfo', function(req, res, next) {
    // 1、用户同意授权，获取code
    var redirect_uri = 'http://ceshi.joblian.cn/wxApi/getWxUserOpenId';
    var redirect_uri = encodeURIComponent(redirect_uri);
    var appid        = configJson.appID;
    // var appid        = 'wxc3718b06f767373f';
    var jobId        = 666;
    var url = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid='+appid+'&redirect_uri='+redirect_uri+'&response_type=code&scope=snsapi_userinfo&state='+jobId+'#wechat_redirect'

    res.redirect(url);
});

// 微信静默方式网页授权
router.get('/wxOAuthBase', function(req, res, next) {
    // 1、用户同意授权，获取code
    var redirect_uri = 'http://ceshi.joblian.cn/wxApi/getWxBaseOpenId';
    var redirect_uri = encodeURIComponent(redirect_uri);
    var appid        = configJson.appID;
    // var appid        = 'wxc3718b06f767373f';
    var jobId        = 666;
    var url = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid='+appid+'&redirect_uri='+redirect_uri+'&response_type=code&scope=snsapi_base&state='+jobId+'#wechat_redirect'

    res.redirect(url);
});

router.post('/getWxUserOpenId', function(req, res, next) {
    // 2、通过code换取网页授权access_token
    var postData  = req.body;
    var code      = postData.code;
    var jobId     = postData.state;
    var appid     = configJson.appID;
    var appsecret = configJson.appScrect;

    var accessTokenOptions = {
        method: 'GET',
        url: 'https://api.weixin.qq.com/sns/oauth2/access_token?appid='+appid+'&secret='+appsecret+'&code='+code+'&grant_type=authorization_code'
    };

    request(accessTokenOptions, function (err, result, body) {
        if (result) {
            var data = JSON.parse(body);
            var table = 'wxShareOpenidTable:jobId' + jobId;
            var score = parseInt(new Date().getTime() / 1000);

            var userInfoOptions = {
                method : 'GET',
                url    : 'https://api.weixin.qq.com/sns/userinfo?access_token='+data.access_token+'&openid='+data.openid+'&lang=zh_CN'
            }

            request(userInfoOptions, function(err, userResult, body) {
                if (userResult) {
                    var userInfo = JSON.parse(body);

                    var value = {
                        jobId     : jobId,
                        openid    : userInfo.openid,
                        city      : userInfo.city,
                        province  : userInfo.province,
                        country   : userInfo.country,
                        headimgurl: userInfo.headimgurl,
                        nickname  : userInfo.nickname,
                        sex       : userInfo.sex,
                        unionid   : userInfo.unionid,
                        time      : score
                    };

                    saveOpenId(table, score, value);

                    return res.status(200).json({code:200, message:'wx OAuth success', data:userInfo});
                } else {
                    return res.status(200).json({code:400, message:'wx OAuth error', data:'error'});
                }
            });


        } else {
            return res.status(200).json({code:400, message:'wx OAuth error', data:'error'});
        }
    });

});

router.post('/getWxBaseOpenId', function(req, res, next) {
    var postData  = req.body;
    var code      = postData.code;
    var jobId     = postData.state;
    var appid     = configJson.appID;
    var appsecret = configJson.appScrect;

    var accessTokenOptions = {
        method: 'GET',
        url: 'https://api.weixin.qq.com/sns/oauth2/access_token?appid='+appid+'&secret='+appsecret+'&code='+code+'&grant_type=authorization_code'
    };

    request(accessTokenOptions, function (err, result, body) {
        if (result) {
            var baseInfo = JSON.parse(body);

            var table = 'wxShareOpenidTable:jobId' + jobId;
            var score = parseInt(new Date().getTime() / 1000);


            var userInfoOptions = {
                method : 'GET',
                url    : 'https://api.weixin.qq.com/sns/userinfo?access_token='+baseInfo.access_token+'&openid='+baseInfo.openid+'&lang=zh_CN'
            }

            request(userInfoOptions, function(err, userResult, body) {
                if (userResult) {
                    var userInfo = JSON.parse(body);

                    var value = {
                        jobId     : jobId,
                        openid    : baseInfo.openid,
                        city      : userInfo.city,
                        province  : userInfo.province,
                        country   : userInfo.country,
                        headimgurl: userInfo.headimgurl,
                        nickname  : userInfo.nickname,
                        sex       : userInfo.sex,
                        unionid   : userInfo.unionid,
                        time      : score
                    };

                    saveOpenId(table, score, value);

                    return res.status(200).json({code:200, message:'wx OAuth success', data:userInfo});
                } else {
                    return res.status(200).json({code:400, message:'wx OAuth error', data:'error'});
                }
            });

            // return res.status(200).json({code:200, message:'wx OAuth success', data:baseInfo});
        } else {
            return res.status(200).json({code:400, message:'wx OAuth error', data:'error'});
        }
    });


});

function saveOpenId (table, score, value) {
    redisDb.zadd(table, score, JSON.stringify(value), function(err,result){
        if (err) {
            console.log('save weixin openid error');
        } else {
            if (result){
                console.log('save weixin openid success');
            } else {
                console.log('save weixin open_id error');
            }
        }
    });
}

module.exports = router;