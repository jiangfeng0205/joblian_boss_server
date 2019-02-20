var express = require('express');
var router = express.Router();

var https = require('https'); // 引入https模块
var request = require('request');
var util = require('util'); // 引入util工具包格式化路径
var fs = require('fs'); // 引入fs更新本地文件
var router = express.Router();
var redisDb = require(__dirname + "/../common/config/db/redis.js");
var configJson = require(__dirname + "/../common/config/config.js").config().wxConfig;

router.get('/', function(req, res, next) {
    new Promise(function(resolve,reject) {
        //格式化请求地址
        var url = util.format(configJson.apiURL.accessTokenApi,configJson.apiDomain,configJson.appID,configJson.appScrect);
        console.log('uurl--', url);
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
                        redisDb.set(wxAccessToken, body, function(setErr, setAccessToken) {
                            if (setErr) {
                                console.log('set access_token error');
                            }
                        },7000);

                        var accessToken = JSON.parse(body).access_token;
                        returnData.code = 200;
                        returnData.message = 'success';
                        returnData.data = accessToken;

                        resolve(returnData);
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


module.exports = router;