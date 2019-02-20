// passport 权限验证
var express = require('express');
var app = express();
var flash = require('express-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var md5 = require('md5-node');
var db = require(__dirname + "/config/db/db.js");
var redisDb = require(__dirname + "/config/db/redis.js");
var authentication = {};

//保存user对象
passport.serializeUser(function (user, done) {
    done(null, user);
});
//删除user对象
passport.deserializeUser(function (user, done) {
    done(null, user);
});

authentication.usenamePassport = function() {
    passport.use('admin', new LocalStrategy(
        {
            usernameField: 'username',
            passwordField: 'password',
        },
        function(username, password, done) {
            getAdminMemberOne(username, 'username' , function(err, result){
                // console.log('passPort--', result);
                if (result == null) {
                    return done(null, false, { message: '请输入正确用户名' });
                }

                if (username !== result.username) {
                    return done(null, false, { message: '请输入正确用户名' });
                }

                if (md5(password) !== result.password) {
                    return done(null, false, { message: '请输入正确密码' });
                }

                return done(null, result);
            })
        }
    ));

    passport.use('adminByphone', new LocalStrategy(
        {
            usernameField: 'mobile',
            passwordField: 'password',
        },
        function(username, password, done) {
            getAdminMemberOne2(username, 'mobile', function(err, result){
                if (result == null) {
                    return done(null, false, { message: '请正确输入用户名' });
                }

                if (username !== result.mobile) {
                    return done(null, false, { message: '请正确输入用户名' });
                }

                if (md5(password) !== result.password) {
                    return done(null, false, { message: '请正确输入密码' });
                }

                return done(null, result);
            })
        }
    ));

    passport.use('adminMember', new LocalStrategy(
        {
            usernameField: 'username',
            passwordField: 'password',
        },
        function(username, password, done) {
            getAdminMemberOne2(username, 'username' , function(err, result){
                console.log('passPort--', result);
                // 字段过滤
                if (result['admin'] == '' && result['member'] == '') {
                    return done(null, false, { message: '请输入正确的用户名' });
                }

                if (result['admin'] == '' && result['member']['username'] != username) {
                    return done(null, false, { message: '请输入正确的用户名' });
                }

                if (result['admin'] == '' && result['member']['password'] != md5(md5(password)+result['member']['salt']) ) {
                    return done(null, false, { message: '请输入正确的密码' });
                }

                if (result['member'] == '' && result['admin']['username'] != username) {
                    return done(null, false, { message: '请输入正确的用户名' });
                }

                if (result['member'] == '' && result['admin']['password'] != md5(password)) {
                    return done(null, false, { message: '请输入正确的密码' });
                }

                // 多身份用户登录的逻辑
                var usersData = [];
                // 1、角色唯一。
                if (result['admin'] == '' && result['member']['password'] == md5(md5(password)+result['member']['salt']) ) {
                    usersData['member'] = result['member'];
                }

                if (result['member'] == '' && result['admin']['password'] == md5(password)) {
                    usersData['admin'] = result['admin'];
                }
                if (result['admin'] != '' && result['member'] != '') {
                    var adminPassWord  = result['admin']['password'];
                    var memberPassWord = result['member']['password'];
                    var md5PassWord    = md5(password);
                    var twoMd5PassWord = md5(md5(password)+result['member']['salt']);
                    // 2、用户多个角色，且密码不同时。
                    if (md5PassWord == adminPassWord && twoMd5PassWord != memberPassWord) {
                        usersData['admin'] = result['admin'];
                    }

                    if (md5PassWord != adminPassWord && twoMd5PassWord == memberPassWord) {
                        usersData['member'] = result['member'];
                    }

                    if (md5PassWord != adminPassWord && twoMd5PassWord != memberPassWord) {
                        return done(null, false, { message: '请输入正确的密码' });
                    }

                    // 3、用户多个角色且密码相同时。
                    if (md5PassWord == adminPassWord && twoMd5PassWord == memberPassWord) {
                        usersData['admin'] = result['admin'];
                        usersData['member'] = result['member'];
                    }
                }

                return done(null, usersData);

            })
        }
    ));

    passport.use('userLogin', new LocalStrategy(
        {
            usernameField: 'username',
            passwordField: 'password',
        },
        function(username, password, done) {
            getUser(username, 'username' , function(err, result){
                console.log('userLogin--', result);
                if (result == null) {
                    return done(null, false, { message: '请输入正确用户名' });
                }

                if (username !== result.username) {
                    return done(null, false, { message: '请输入正确用户名' });
                }

                if (md5(password) !== result.password) {
                    return done(null, false, { message: '请输入正确密码' });
                }

                return done(null, result);
            })
        }
    ));
}

function getUser(username,tableColunm,callback){
    var userFlagTable = "edwinbj_user_flag";
    var userTable = "admin_member";

    redisDb.hget(userFlagTable, username,  function(err, userFlag){
        if (err) {
            callback(err, null);
        }
        if (userFlag == null) {
            callback('没有该用户', null);
        }

        if (userFlag) {
            var userFlagArr = JSON.parse(userFlag)
            var userId = userFlagArr.id;

            redisDb.hget(userTable, userId, function(errUser, user){

                if (errUser) {
                    callback(errUser, null);
                }

                if (!user || user == null) {
                    callback('没有该用户', null);
                }

                if (user) {
                    callback(null, JSON.parse(user));
                }
            })
        }

    });
}

function getAdminMemberOne(username,tableColunm,callback){
    redisDb.hexists('admin_member',username + '_admin',function(err, result){
        if (result == 0 ) {
            var findAdminSql = 'select * from edwinbj_admin_user where '+tableColunm+'="'+username+'"';

            db.query(findAdminSql, function(err, adminData){
                if (adminData.length > 0){
                    var dataString = JSON.stringify(adminData);
                    var data       = JSON.parse(dataString)[0];
                    var jsondata   = JSON.stringify(data);

                    redisDb.hset('admin_member', username + '_admin', jsondata, function(err, result){
                        callback(null, data);
                        console.log('redis insert admin success');
                    });

                } else {
                    callback(err, null);
                }

            })

        } else {
            redisDb.hget('admin_member', username + '_admin', function(err, result){
                var adminData = JSON.parse(result);
                if (adminData ) {
                    callback(null, adminData);
                } else {
                    callback(err, null);
                }
            })

        }

    });
}

function getAdminMemberOne2(username,tableColunm,callback){
    redisDb.hexists('admin_member',username + '_admin',function(err, result){
        if (result == 0 ) {
            var findAdminSql = 'select * from edwinbj_admin_user where '+tableColunm+'="'+username+'"';

            db.query(findAdminSql, function(err, adminData){
                var users = [];
                if (adminData.length > 0){
                    var dataString = JSON.stringify(adminData);
                    var data       = JSON.parse(dataString)[0];
                    var jsondata   = JSON.stringify(data);

                    users['admin']  = data;
                    getMember(username,tableColunm,data,callback);

                    redisDb.hset('admin_member', username + '_admin', jsondata, function(err, result){
                        console.log('redis insert admin success');
                    });

                } else {
                    getMember(username,tableColunm,'',callback);
                }

            })

        } else {
            redisDb.hget('admin_member', username + '_admin', function(err, result){
                var users = [];
                var adminData = JSON.parse(result);
                if (adminData ) {
                    getMember(username,tableColunm,adminData,callback);
                } else {
                    getMember(username,tableColunm,'',callback);
                }
            })

        }

    });
}

function getMember(username,tableColunm,adminData,call){
    redisDb.hexists('admin_member',username + '_member',function(err, result){
        var users = [];
        users['admin'] = adminData;
        if (result == 0 ) {
            var findAdminSql = 'select * from edwinbj_member where '+tableColunm+'="'+username+'"';
            db.query(findAdminSql, function(err, memberData){
                if (memberData.length > 0){
                    var dataString = JSON.stringify(memberData);
                    var data       = JSON.parse(dataString)[0];
                    var jsondata   = JSON.stringify(data)

                    redisDb.hset('admin_member', username + '_member', jsondata, function(err, result){
                    });

                    users['member'] = data;
                    call(null, users);

                } else {
                    users['member'] = '';
                    call(null, users);
                }

            })

        } else {
            redisDb.hget('admin_member', username + '_member', function(err, result){
                var memberData = JSON.parse(result);
                if (memberData) {
                    users['member'] = memberData;
                    call(null, users);
                } else {
                    users['member'] = '';
                    call(null, users);
                }
            })

        }

    });
}

module.exports = authentication;