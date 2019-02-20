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
var request = require('request');
var cheerio = require('cheerio');
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

router.post('/addPushListByJob', function(req, res){
	var postData = req.body;
	console.log('addPushListjob--', postData);

	redisDb.zadd('job_push:userId'+postData.userId, postData.score, JSON.stringify(postData.data), function(err,result){
		if (err) {
			return res.status(200).json({code:400, message:'save pushlist error', data:''});
		} else {
			if (result){
				return res.status(200).json({code:200, message:'success', data:'success'});
			} else {
				return res.status(200).json({code:402, message:'save false', data:'false'});
			}
		}
	});
})

// 获取推送职位
router.post('/getPushListByJob', function(req, res){
  	var postData = req.body;
  	var begianNum = postData.begianNum;
  	var endNum = postData.endNum;

  	redisDb.zrevrange('job_push:userId'+postData.userId+'', begianNum, endNum, function(err,pushJobList){
    	if (err) {
    		return res.status(200).json({code:402, message:'error', data:''});
    	}

    	if (pushJobList) {
    		var list = [];
    		var tableKeys = [];

    		for (var key in pushJobList) {
    			var job = pushJobList[key];
    			if (job['fromId'] != postData.userId){
    				list.push(job);

    				var tableKey = 'userId'+job.toId+'_fromId'+job.fromId+'_jobId'+job.id+'';
    				tableKeys.push(tableKey);
    			}
    		}

    		if (tableKeys.length > 0) {

	    		var table = 'chat_history_noread_num:userId' + postData.userId + '_userType'+postData.userType;

	    		redisDb.hmget(table, tableKeys, function(err, nums){
	    			console.log('numsss--', nums);
	    			for (var key in list) {
	    				if (nums[key]) {
	    					var numValue = JSON.parse(nums[key]);
	    					list[key]['noread'] = numValue['num'] ? numValue['num'] : 0;
	    				} else {
	    					list[key]['noread'] = 0;
	    				}
	    			}
    				return res.status(200).json({code:200, message:'success', data:list});
	    		})
    		} else {
    			return res.status(200).json({code:200, message:'success', data:list});
    		}
    	}
    });

});

// 获取我的职位
router.post('/getJobListMyself', function(req, res){
  	var postData = req.body;
  	var begianNum = postData.begianNum;
  	var endNum = postData.endNum;

  	redisDb.zrevrange('job_contact_myself:userId'+postData.userId+'', begianNum, endNum, function(err,myJobList){
    	if (err) {
    		return res.status(200).json({code:402, message:'error', data:''});
    	}

    	if (myJobList) {
    		var list = [];
    		var tableKeys = [];

    		for (var key in myJobList) {
    			var job = myJobList[key];
    			if (job['fromId'] != postData.userId){
    				list.push(job);

    				var tableKey = 'userId'+job.toId+'_fromId'+job.fromId+'_jobId'+job.jobId+'';
    				tableKeys.push(tableKey);
    			}
    		}
			// console.log('sfdsf--', tableKeys);
    		if (tableKeys.length > 0) {

	    		var table = 'chat_history_noread_num:userId' + postData.userId + '_userType'+postData.userType;

	    		redisDb.hmget(table, tableKeys, function(err, nums){
	    			console.log('numsss--', nums);
	    			for (var key in list) {
	    				if (nums[key]) {
	    					var numValue = JSON.parse(nums[key]);
	    					list[key]['noread'] = numValue['num'] ? numValue['num'] : 0;
	    				} else {
	    					list[key]['noread'] = 0;
	    				}
	    			}
    				return res.status(200).json({code:200, message:'success', data:list});
	    		})
    		} else {
    			return res.status(200).json({code:200, message:'success', data:list});
    		}

    	}
    });

});

// 获取聊天记录
router.post('/getChatHistory', function(req, res) {
    var self = this;
    var data = req.body;
    console.log('chatHistory---', data);

	redisDb.hmget('edwinbj_job_chat_history:fromid'+data.toId+'_toid'+data.fromId+'_jobid'+data.jobId+'', [],  function(err, historyData){
		if (err) {
			return res.status(200).send({code:402,type:'redisdb',errdata:'error'});
		}
		if (historyData == null) {
			return res.status(200).send({code:202,type:'redisdb',data:'chat history empty'});
		}

		if (historyData.length > 0 && historyData) {
			var jsonData = [] ;
			for (var key in historyData) {
				var history = JSON.parse(historyData[key]);
				jsonData.push(history);
			}
			return res.status(200).send({code:200,type:'redisdb',data:jsonData});
		}

		return res.status(200).send({code:200,type:'redisdb',data:''});

	}, 'historyid_collections:edwinbj_job_fromid'+data.toId+'_toid'+data.fromId+'_jobid'+data.jobId+'');

});

// 更改聊天记录状态为已读
router.post('/saveChatHistoryIsread', function(req, res) {
    var self = this;
    var data = req.body;
    // console.log('saveChatHistoryIsread---', data);
    // console.log('edwinbj_job_chat_history:fromid'+ data.fromId+'_toid'+data.toId+'_jobid'+data.jobId+'');

	redisDb.hmget('edwinbj_job_chat_history:fromid'+data.fromId+'_toid'+data.toId+'_jobid'+data.jobId+'', [],  function(err, historyData){
		if (err) {
			return res.status(200).send({code:402,type:'redisdb',errdata:'error'});
		}

		if (historyData && historyData != null && historyData.length > 0) {
			for (var key in historyData) {
				var history = JSON.parse(historyData[key]);

				if (history && history['isread'] == 0) {
					history['isread'] = 1;
					var jsonHistory = JSON.stringify(history);
					redisDb.hset('edwinbj_job_chat_history:fromid'+data.fromId+'_toid'+data.toId+'_jobid'+data.jobId+'', history['id'], jsonHistory, function(err, result){
		                if (err) {
		                    console.log('save  chat history isread error');
		                    return;
		                }else {
		                	console.log('gai--','edwinbj_job_chat_history:fromid'+data.fromId+'_toid'+data.toId+'_jobid'+data.jobId+'');
		                }

		            })
				}
			}
			return res.status(200).send({code:200,type:'redisdb',data:''});
		}

		return res.status(200).send({code:200,type:'redisdb',data:''});

	}, 'historyid_collections:edwinbj_job_fromid'+data.toId+'_toid'+data.fromId+'_jobid'+data.jobId+'');

});

// 保存职位消息未读数量
router.post('/saveChatHistoryNoreadNum', function(req, res) {
	var postData = req.body;
	console.log('saveChatHistoryNoreadNum--',postData);
	var table = 'chat_history_noread_num:userId' + postData.toId + '_userType'+postData.userType;
	var key = 'userId'+postData.toId+'_fromId'+postData.fromId+'_jobId'+postData.jobId+'';
	redisDb.hget(table, key, function(err, numResult){
		// console.log('savenum--',numResult)
		var noreadValue = {};
		var number = 0;
		var numResult =JSON.parse(numResult);

		if (numResult && numResult['num'] != null && numResult['num'] > 0) {
			console.log('numResult2--',numResult);
			number = numResult['num'] ;
		}

		++number;
		// 对方在线数量归零
		if (postData.init === 'init') {
			number = 0;
		}

		noreadValue = {
			num : number,
			sourceUrl : postData.sourceUrl,
		}

		var value = JSON.stringify(noreadValue);

		redisDb.hset(table, key, value, function(err, result){
		    if (err) {
		    	return res.status(200).json({code:402, message:'error', data:''});
		    } else {
			    if (result) {
			        return res.status(200).json({code:200, message:'success', data:''});
			    } else {
					return res.status(200).json({code:202, message:'success', data:''});
			    }

		    }

		})

	});

});

// 职位未读消息统计
router.post('/jobNoreadTotalNums', function(req, res) {
	var postData = req.body;
	var table = 'chat_history_noread_num:userId' + postData.userId + '_userType'+postData.userType;
	console.log('asdasdasdad-',table)
	var joblistNum = 0;
	var joblistMyselfNum = 0;

	redisDb.hvalues(table, function(err, numResult){
		if (numResult && numResult.length > 0) {
			for (var key in numResult) {
				var r = JSON.parse(numResult[key]);
				if (r.sourceUrl == 'joblistMyself') {
					joblistNum += r.num;
				}

				if (r.sourceUrl == 'joblist') {
					joblistMyselfNum += r.num;
				}
			}
		}

		var data = {
			'joblistNum' : joblistNum,
			'joblistMyselfNum' : joblistMyselfNum,
		}

		return res.status(200).json({code:200,message:'success',data:data});
	});

});

// 行业联动
router.post('/getHyAndCityName', function(req, res) {
  var postData = req.body;
  var jobClassSql = 'SELECT * FROM '+postData.table+' WHERE keyid='+postData.keyid+'';

  db.query(jobClassSql, function(err, result){
      if (err) {;
          return res.status(200).json({code:402,message:'error',data:''});
      } else {
          var dataString = JSON.stringify(result);
          var data       = JSON.parse(dataString)[0];
          // return res.status(200).json(result);

          return res.status(200).json({code:200,message:'success',data:result});
      }
  })

});

// 更新职位
router.post('/saveCompanyJob', function(req, res) {
	var postData = req.body;
	var table = 'edwinbj_company_job';
	var primaryKey = 'primary_key';
	var savePath = __dirname + '/../../public/jobDetailLogs';

	console.log('saveCompanyJob22--', postData);
	console.log('saveCompanyJob22--', postData.companyJobId);
	// return ;

	if (postData.companyJobId > 0) {

		request('http://weixin.joblian.cn/login', function (error, response, body) {
		    if (!error && response.statusCode == 200) {
		        //返回的body为抓到的网页的html内容
		        var $ = cheerio.load(body); //当前的$符相当于拿到了所有的body里面的选择器
		        var navText=$('.login-bg').html(); //拿到导航栏的内容
		        fs.writeFile(savePath + '/static_company_job_' +postData.companyJobId+ '.html',  postData.html, function(err){
		            if (err) {
		                console.log('数据同步失败',err);
		            }
		        });
		    }
		});

		redisDb.hset(table, postData.companyJobId, JSON.stringify(postData), function(err, result){
		    if (err) {
		    	return res.status(200).json({code:402, message:'error', data:'error'});
		    } else {
			    if (result) {
			    	var userCompanyJobTable = 'user_company_job:userId' + postData.userId + '_userType' + postData.userType;

			    	redisDb.zadd(userCompanyJobTable, Date.now(), id, function(userCompanyJobErr,userCompanyJobResult){
                        if (userCompanyJobErr) {
                            return res.status(200).send({code:402, message:'系统错误', data:'error'});
                        } else {
                            if (userCompanyJobResult){
                                 return res.status(200).json({code:200, message:'success', data:postData});
                            } else {
                               return res.status(200).json({code:202, message:'success', data:postData});
                            }
                        }
                    });

			    } else {
					return res.status(200).json({code:200, message:'success', data:'success'});
			    }
		    }

		});

	} else {
		redisDb.hincrby(primaryKey,'edwinbj_company_job_key', 1, function(keyErr, id){
			if (keyErr) {
	            return res.status(200).send({code:402, message:'系统错误', data:'error'});
	        }

	        if (id) {
		        request('http://weixin.joblian.cn/login', function (error, response, body) {
				    if (!error && response.statusCode == 200) {
				      //返回的body为抓到的网页的html内容
				      var $ = cheerio.load(body); //当前的$符相当于拿到了所有的body里面的选择器
				      var navText=$('.login-bg').html(); //拿到导航栏的内容

				      fs.writeFile(savePath + '/static_company_job_' +id+ '.html',  body, function(err){
				            if (err) {
				                console.log('数据同步失败',err);
				            }
				        });
				    }
				});
	        	postData.companyJobId = id;

				redisDb.hset(table, id, JSON.stringify(postData), function(err, result){
				    if (err) {
				    	return res.status(200).json({code:402, message:'error', data:'error'});
				    } else {
					    if (result) {
					    	var userCompanyJobTable = 'user_company_job:userId' + postData.userId + '_userType' + postData.userType;

					    	redisDb.zadd(userCompanyJobTable, Date.now(), id, function(userCompanyJobErr,userCompanyJobResult){
	                            if (userCompanyJobErr) {
	                                return res.status(200).send({code:402, message:'系统错误', data:'error'});
	                            } else {
	                                if (userCompanyJobResult){
	                                     return res.status(200).json({code:200, message:'success', data:postData});
	                                } else {
	                                   return res.status(200).json({code:202, message:'success', data:postData});
	                                }
	                            }
	                        });

					    } else {
							return res.status(200).json({code:202, message:'success', data:'success'});
					    }

				    }

				})
	        }

		});
	}
});

// 获取推送职位
router.post('/getMyjobList', function(req, res){
  	var postData = req.body;
  	var begianNum = postData.begianNum;
  	var endNum = postData.endNum;

  	redisDb.zrevrange('user_company_job:userId'+postData.userId+'_userType'+postData.userType, begianNum, endNum, function(err,pushJobList){
    	if (err) {
    		return res.status(200).json({code:402, message:'error', data:''});
    	}

    	if (pushJobList) {
    		var list = [];
    		var tableKeys = [];

    		for (var key in pushJobList) {
    			var jobId = pushJobList[key];

				tableKeys.push(jobId);
    		}

	    	var jobs = [];
    		if (tableKeys.length > 0) {

	    		var table = 'edwinbj_company_job';

	    		redisDb.hmget(table, tableKeys, function(err, companyJobs){

	    			if (companyJobs) {
	    				companyJobs.forEach(function(job){
	    					jobs.push(JSON.parse(job));
	    				})
	    			}
    				return res.status(200).json({code:200, message:'success', data:jobs});
	    		});

    		} else {
    			return res.status(200).json({code:200, message:'success', data:jobs});
    		}
    	}
    });

});

router.post('/getCompanyJobDetail', function(req, res){
	var postData = req.body;

	redisDb.hget('edwinbj_company_job', postData.jobId, function(err, result){
		if (err) {
			console.log('getCompanyJobDetail request error');
			return res.status(200).json({code:502, message:'error', data:'error'});
		}

		if (result){
			var data = JSON.parse(result);

			return res.status(200).json({code:200, message:'success', data:data});
		} else {
			return res.status(200).json({code:402, message:'该职位已经不存在，或者已经下线', data:''});
		}
	});
});

// 保存职位消息未读数量
router.post('/saveWeixinShareJob', function(req, res) {
	var postData = req.body;
	console.log('saveWeixinShareJob--',postData);
	console.log('shareUserType--', postData.shareUserType);
	var table = 'weixinShareJobTable:jobId' + postData.companyJobId;
	var key = postData.jobId;
	var score = parseInt(new Date().getTime() / 1000);

	var value = {
		shareUserId   : postData.shareUserId,
		shareUserType : postData.shareUserType,
		shareUserName : postData.shareUserName,
		jobId         : postData.companyJobId,
		time          : score
	};

	redisDb.zadd(table, score, JSON.stringify(value), function(err,result){
		if (err) {
			return res.status(200).json({code:400, message:' error', data:''});
		} else {
			if (result){
				return res.status(200).json({code:200, message:'success', data:'success'});
			} else {
				return res.status(200).json({code:402, message:'false', data:'false'});
			}
		}
	});

});

router.get('/test', function(req, res){
	return res.status(200).json({code:200,message:'redisdb',data:''});
});

module.exports = router;
