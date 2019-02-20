var express = require('express');
var app = express();
var router = express.Router();
var passport = require('passport');
var db = require(__dirname + "/../common/config/db/db.js");
var redisDb = require(__dirname + "/../common/config/db/redis.js");
var md5 = require('md5-node');

router.post('/login', function(req, res, next) {
    var postData = req.body;

    passport.authenticate('userLogin', function(err, users, info) {
        console.log('adminMember--',users)
        console.log('adminMembererr--',err)
        if (err) {
            return res.status(200).send({code:502, message:'error', data:''});
        }

        if (!users) {
            return res.status(200).send({code:402, message:info.message, data:''});
        }

        if (users['usertype'].length == 0 || users['usertype'].length == null) {
            return res.status(200).send({code:402, message:'您还没有选择身份类型', data:''});
        }

        if (users['usertype'].length > 1 && users) {
            return res.status(200).send({code:202, message:'请选择用户类型', data:users});
        }

        if (users['usertype'].length == 1 && users) {
            return res.status(200).send({code:200, message:'登录成功', data:users});
        }

        console.log('dataa--',data)
        req.session.username = users.username;
        req.session.uid      = users.uid;
        req.session.user     = data;

    })(req, res, next);
});

router.post('/login2', function(req, res, next) {
    var postData = req.body;

    passport.authenticate('adminMember', function(err, users, info) {
        console.log('adminMember--',users)
        console.log('adminMembererr--',err)
        if (err) {
            return res.status(200).send({code:502, message:'error', data:''});
        }

        if (!users) {
            return res.status(200).send({code:402, message:info.message, data:''});
        }

        if (users['member'] && users['admin']) {
            var adminMemberData = {};
            var m = users['member'];
            var a = users['admin'];

            adminMemberData.member = {
                'username'   : m.username,
                'uid'        : m.uid,
                'userType'   : m.usertype,
                'parent_uid' : m.parent_uid,
            }
            adminMemberData.admin = {
                'username'   : a.username,
                'uid'        : a.uid,
                'userType'   : 3,
                'm_id'       : a.m_id,
                'parent_uid' : a.parent_uid,
            }

            return res.status(200).send({code:202, message:'请选择用户类型', data:adminMemberData});
        }

        if (users['member'] && !users['admin']) {
            var user = users['member'];
        }

        if (users['admin'] && !users['member']) {
            var user = users['admin'];
            user.usertype = 3;
        }

        var data = {
            'username'   : user.username,
            'uid'        : user.uid,
            'userType'   : user.usertype,
            'm_id'       : user.m_id,
            'parent_uid' : user.parent_uid,
        }

        req.session.username = user.username;
        req.session.uid = user.uid;
        req.session.user = data;
        return res.status(200).send({code:200, message:'登陆成功', data:data});

    })(req, res, next);
});

router.post('/register', function(req, res, next) {
    var postData = req.body;
    console.log('register--', postData);

    if (!postData.username && !postData.isRegsterAdminMemberId){
        return res.status(200).send({code:202, message:'该用户名不能为空', type:'username', data:'error'});
    }
    if (!postData.phone){
        return res.status(200).send({code:202, message:'手机号不能为空', type:'phone', data:'error'});
    }

    var userFlagTable = "edwinbj_user_flag";
    redisDb.hget(userFlagTable, postData.username,  function(userFlagErr, usernameFlag){
        if (userFlagErr) {
            return res.status(200).send({code:402, message:'系统错误', data:'error'});
        }

        if (usernameFlag && !postData.isRegsterAdminMemberId) {
            return res.status(200).send({code:202, message:'该用户名已经存在', type:'username', data:'error'});
        }

        redisDb.hget(userFlagTable, postData.phone, function(errUser, phoneFlag){
            if (errUser) {
                return res.status(200).send({code:402, message:'系统错误', data:'error'});
            }

            if (phoneFlag && !postData.isRegsterAdminMemberId) {
                return res.status(200).send({code:202, message:'手机号已经存在',type:'phone', data:'error'});
            }

            // 验证成功后注册逻辑
            var primaryKey = 'primary_key';
            var adminUserTable = 'admin_member';
            var type = postData.userType;
            var saveData = '';
            if (postData.isRegsterAdminMemberId) {

                redisDb.hget(adminUserTable, postData.isRegsterAdminMemberId, function(getAmErr, getAmResult) {
                    if (getAmResult && postData.isRegsterAdminMemberId) {
                        saveData = JSON.parse(getAmResult);
                        for (var key in saveData.usertype) {
                            if (saveData.usertype[key] == type) {
                                saveData.usertype.splice(key, 1);
                                saveData.headerImg.splice(key, 1);
                                saveData.phone.splice(key, 1);
                                saveData.email.splice(key, 1);
                            }
                        }
                        saveData.usertype.push(type);
                        saveData.headerImg.push({userType:type, content:postData.headerImg});
                        saveData.phone.push({userType:type, content:postData.phone});
                        saveData.email.push({userType:type, content:postData.email});
                    }

                    redisDb.hset(adminUserTable, postData.isRegsterAdminMemberId, JSON.stringify(saveData), function(setErr, setResult){
                        if (setErr) {
                            console.log('register error');
                        }

                        if (setResult >= 0) {
                            saveData.password = '';
                            saveData.admin_member_id = postData.isRegsterAdminMemberId;

                            return res.status(200).send({code:200, message:'注册成功', data:saveData});
                        }
                    })
                });
            } else {
                redisDb.hincrby(primaryKey,'edwinbj_user_key', 1, function(keyErr, id){
                    if (keyErr) {
                        return res.status(200).send({code:402, message:'系统错误', data:'error'});
                    }

                    if (id) {
                        console.log('kakaxi--', id);
                        var username = postData.username;
                        var phone = postData.phone;
                        var flagdata = JSON.stringify({'id':id});

                        redisDb.hmset(userFlagTable, [username,flagdata,phone,flagdata], function(flagErr, flagResult) {
                            if (flagErr) {
                                return res.status(200).send({code:402, message:'系统错误', data:'error'});
                            }

                            if (flagResult) {
                                if (postData.userType == 3) {
                                    incryKey = 'edwinbj_admin_user_key';
                                    postData.password = md5(postData.password);
                                } else {
                                    incryKey = 'edwinbj_member_key';
                                    var salt = Math.random()*5;
                                    postData.salt = salt;
                                    postData.password = md5(md5(postData.password)+salt);
                                }

                                redisDb.hincrby(primaryKey, incryKey, 1, function(perr, incryId){
                                    if (perr) {
                                        console.log('perr--',perr);
                                    }

                                    if (incryId) {
                                        var uid = incryId;
                                        postData.id = id;
                                        postData.uid = incryId;
                                        postData.usertype = [type];
                                        postData.headerImg = [{userType:type, content:postData.headerImg}];
                                        postData.phone = [{userType:type, content:postData.phone}];
                                        postData.email = [{userType:type, content:postData.email}];
                                        saveData = postData;

                                        redisDb.hset(adminUserTable, id, JSON.stringify(saveData), function(amErr, amResult){
                                            if (amErr) {
                                                console.log('register error');
                                            }

                                            if (amResult) {
                                                saveData.password = '';
                                                saveData.admin_member_id = id;
                                                return res.status(200).send({code:200, message:'注册成功', data:saveData});
                                            }
                                        });

                                    }

                                })
                            }
                        })
                    }

                });
            }
        })

    });
});

router.post('/saveClass', function(req, res, next) {
    var postData = req.body;
    var type = postData.userType;
    console.log('saveClass--', postData);

    redisDb.hget('admin_member', postData.adminMemberId, function(amErr, adminMember){
        if (amErr) {
            console.log('getAdminMember error');
        }

        if (adminMember) {
            var saveData = JSON.parse(adminMember);

            if (postData.isRegsterAdminMemberId) {

                for (var key in saveData.usertype) {
                    if (saveData.usertype[key] == type) {
                        saveData.usertype.splice(key, 1);
                        saveData.description.splice(key, 1);
                        saveData.jobClassTitle.splice(key, 1);
                        saveData.cityClassTitle.splice(key, 1);
                        saveData.hangyeClassTitle.splice(key, 1);
                    }
                }

                saveData.usertype.push(type);
                saveData.description.push({userType:type,content:postData.description});
                saveData.jobClassTitle.push({userType:type, content:postData.jobClassTitle});
                saveData.cityClassTitle.push({userType:type, flag:postData.cityClassTitle});
                saveData.hangyeClassTitle.push({userType:type, flag:postData.hangyeClassTitle});
            } else {
                saveData.description      = [{userType:type,content:postData.description}];
                saveData.jobClassTitle    = [{userType:type, flag:postData.jobClassTitle}];
                saveData.cityClassTitle   = [{userType:type, flag:postData.cityClassTitle}];
                saveData.hangyeClassTitle = [{userType:type, flag:postData.hangyeClassTitle}];
            }

            // 添加 jobclass(职能)用户分类集合
            for (var key in saveData.jobClassTitle) {
                var jobClass = saveData.jobClassTitle[key];
                console.log()
                if (jobClass.flag) {
                    for (var index in jobClass.flag) {
                        var jobValue = {
                            userId : saveData.uid,
                            userType : jobClass.userType,
                            adminMemberId : saveData.id
                        }
                        jobValue = JSON.stringify(jobValue);

                        // 给每个职能添加个用户集合记录该职能下有哪些用户
                        redisDb.zadd('company_job_jobClass:jobid'+jobClass.flag[index].id, Date.now(), jobValue, function(jobClassErr,jobClassResult){
                            if (jobClassErr) {
                                console.log('job class save error');
                            } else {
                                if (jobClassResult){
                                    console.log('job class save success');
                                }
                            }
                        });
                    }
                }
            }

            // 添加 hangyeclass(行业)用户分类集合
            for (var key in saveData.hangyeClassTitle) {
                var hangyeClass = saveData.hangyeClassTitle[key];

                if (hangyeClass.flag) {
                    for (var hangyeIndex in hangyeClass.flag) {
                        var yangyeValue = {
                            userId : saveData.uid,
                            userType : hangyeClass.userType,
                            adminMemberId : saveData.id
                        }
                        yangyeValue = JSON.stringify(yangyeValue);

                        redisDb.zadd('company_job_hangyeClass:hangyeid'+hangyeClass.flag[hangyeIndex].id, Date.now(), yangyeValue, function(hangyeClassErr,hangyeClassResult){
                            if (hangyeClassErr) {
                                console.log('job class save error');
                            } else {
                                if (hangyeClassResult){
                                    console.log('job class save success');
                                }
                            }
                        });
                    }
                }
            }

            // 添加 cityclass(地域)用户分类集合
            for (var key in saveData.cityClassTitle) {
                var cityClass = saveData.cityClassTitle[key];

                if (cityClass.flag) {
                    for (var cityIndex in cityClass.flag) {
                        var cityValue = {
                            userId : saveData.uid,
                            userType : cityClass.userType,
                            adminMemberId : saveData.id
                        }
                        cityValue = JSON.stringify(cityValue);

                        redisDb.zadd('company_job_cityClass:cityid'+cityClass.flag[cityIndex].id, Date.now(), cityValue, function(cityClassErr,cityClassResult){
                            if (cityClassErr) {
                                console.log('job class save error');
                            } else {
                                if (cityClassResult){
                                    console.log('job class save success');
                                }
                            }
                        });
                    }
                }
            }

            // 写入用户主表
            redisDb.hset('admin_member', postData.adminMemberId, JSON.stringify(saveData), function(err, result) {
                if (err) {
                    console.log('saveAdminMember error');
                } else {
                    return res.status(200).send({code:200, message:'完善成功', data:'success'});
                }
            });

        }
    })

});


module.exports = router;
