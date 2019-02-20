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
/* GET users listing. */
router.get('/', function(req, res, next) {
  	res.render('job/push_job_list', { title: '推荐的职位' });
});

// 职位详情
router.post('/jobDetail', function(req, res){
  	var postData = req.body;
  	var companyJobSql = 'SELECT job.*,jclass.name AS hyname, jobclass.name AS jobname , city.name AS provincename, '+
                      'comclass1.name AS salaryname, comclass2.name as expname, comclass3.name AS eduname '+
                      'FROM edwinbj_company_job AS job '+
                      'LEFT JOIN edwinbj_job_class AS jclass ON job.hy=jclass.id '+
                      'LEFT JOIN edwinbj_job_class as jobclass ON job.job_post=jobclass.id '+
                      'LEFT JOIN edwinbj_city_class as city on job.provinceid=city.id '+
                      'LEFT JOIN edwinbj_comclass as comclass1 ON job.salary=comclass1.id '+
                      'LEFT JOIN edwinbj_comclass as comclass2 ON job.exp=comclass2.id '+
                      'LEFT JOIN edwinbj_comclass as comclass3 ON job.edu=comclass3.id '+
                      'WHERE job.id='+postData.jobId+''

	db.query(companyJobSql, function(err, result){
	    if (err) {
	        // console.log('错误信息--',err)
	        return res.status(200).json({code:402, message:'该职位不存在或者已经失效', data:''});
	    } else {
	        var dataString = JSON.stringify(result);
	        var data       = JSON.parse(dataString)[0];
	        // return res.status(200).json(result);
	        return res.status(200).json({code:200, message:'success', data:data});
	    }
	})
})


module.exports = router;
