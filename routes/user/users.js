var express = require('express');
var path = require('path');
var router = express.Router();
var app = express();
var fs = require('fs');
var url = require('url');
var glob = require('glob');
var md5 = require('md5-node')
var querystring = require('querystring');
var bodyParser = require('body-parser'); //接收post依赖的中间件
var cookieParser = require('cookie-parser');   //引入 cookie-parser
var session = require('express-session');
app.use(cookieParser('sessiontest'));
app.use(session({
    secret: 'sessiontest',//与cookieParser中的一致
    resave: true,
    saveUninitialized:true
}));

var db = require(__dirname + "/../../common/config/db/db.js");
var redisDb = require(__dirname + "/../../common/config/db/redis.js");
var config = require(__dirname + '/../../common/config/config.js').config();

router.post('/getAdminMemberDetail', function(req, res){
	var postData = req.body;

	redisDb.hget('admin_member', postData.isRegsterAdminMemberId, function(err, result){
		if (err) {
			console.log('getAdminMemberDetail request error');
			return res.status(200).json({code:502, message:'error', data:'error'});
		}

		if (result){
			var data = JSON.parse(result);
			console.log('rrrrr--', data.password)
			data.password = '';

			return res.status(200).json({code:200, message:'success', data:data});
		} else {
			return res.status(200).json({code:402, message:'null', data:''});
		}

	})
});

module.exports = router;
