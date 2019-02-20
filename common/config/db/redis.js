// redis 数据库配置
var redis = require('redis');
var RDS_PORT = 6379;           //端口号
var RDS_HOST = '127.0.1.1';    //服务器IP
var RDS_OPTS = {};             //设置项
var client = redis.createClient(RDS_PORT,RDS_HOST,RDS_OPTS);
var {promisify} = require('util');
//var getAsync = promisify(client.get).bind(client);
var redisDb = {};
var primaryKeys = [
    'edwinbj_company_key',
    'edwinbj_company_job_key',
    'edwinbj_member_key',
    'edwinbj_admin_user_key',
    'edwinbj_job_chat_history_key',
    'edwinbj_job_contact_key',
    'edwinbj_user_key',
];

client.on('error', function(err){
    console.log('redis error :', err);
});

client.on('connect', function(){
    console.log('redis connection success');
});

// 设置自增主键
for (var key in primaryKeys) {
    var primary = primaryKeys[key];
    if (primary) {
        client.hsetnx('primary_key', primary,0);
    }
}


/**
 * 添加string类型的数据
 * @param key 键
 * @params value 值
 * @param callBack(err,result)
 * @params expire (过期时间,单位秒;可为空，为空表示不过期)
 */
redisDb.set = function(key, value, callback, expire){
    client.set(key, value, function(err, result){
        if (err) {
            console.log(err);
            callback(err,null);
            return;
        }

        if (!isNaN(expire) && expire > 0) {
            client.expire(key, parseInt(expire));
        }

        callback(null,result);
    })
}

/**
 * 查询string类型的数据
 * @param key 键
 * @param callBack(err,result)
 */
redisDb.get = function(key, callback){
    client.get(key, function(err,result){
        if (err) {
            console.log(err);
            callback(err,null)
            return;
        }

        callback(null,result);
    });
}

/**
 * 添加hash类型的数据(同时添加多个)
 * @param key 键
 * @param value 值 json
 * @param callBack(err,result)
 * @params expire (过期时间,单位秒;可为空，为空表示不过期)
 */
redisDb.hmset = function(key, values, callback, expire){
    client.hmset(key,values, function(err, result){
        if (err) {
            console.log('hmset error --',err);
            callback(err, null);
            return;
        }

        if (!isNaN(expire) && expire > 0) {
            client.expire(key, parseInt(expire));
        }

        callback(null,result);
    });
}

// sortTable为排序字段，必须为set、sortset、list类型
redisDb.hmget = function(table,values, callback, sortTable = ''){
    if (sortTable == '') {
        client.hmget(table, values, function (err, result){
            if (err) {
                console.log(err);
                callback(err,null);
                return;
            }

            callback(null,result);
        })
    } else {
        client.sort(sortTable, function(err, tableSortResult){
            if (err) {
                console.log('newtable--',err);
                callback(err,null);
                return;
            }

            if (tableSortResult =! null && tableSortResult) {
                client.hmget(table, tableSortResult, function (err, result){
                    if (err) {
                        console.log(err);
                        callback(err,null);
                        return;
                    }

                    callback(null,result);
                })
            }
        })
    }

}

/**
 * 添加hash类型的数据(添加一个)
 * @param key 键
 * @param value 值 string
 * @param callBack(err,result)
 * @params expire (过期时间,单位秒;可为空，为空表示不过期)
 */
redisDb.hset = function(key, id,value, callback, expire){
    client.hset(key,id,value, function(err, result){
        if (err) {
            console.log('hmset error --',err);
            callback(err, null);
            return;
        }

        if (!isNaN(expire) && expire > 0) {
            client.expire(key, parseInt(expire));
        }

        callback(null,result);
    });
}

redisDb.hget = function(table, key, callback){
    client.hget(table, key, function(err, result){
        if (err) {
            console.log(err);
            callback(err,null)
            return;
        }

        callback(null,result);
    })
}

redisDb.hgetall = function(key, callback){
    client.hgetall(key, function(err, result){
        if (err) {
            console.log(err);
            callback(err,null)
            return;
        }

        callback(null,result);
    })
}

redisDb.hvalues = function(table, callback){
    client.hvals(table, function(err, result){
        if (err) {
            console.log(err);
            callback(err,null)
            return;
        }

        callback(null,result);
    })
}

redisDb.hvals = function(table, callback){
    client.sort(table, function(err, result){
        if (err) {
            console.log(err);
            callback(err,null)
            return;
        }

        callback(null,result);
    })
}

redisDb.hexists = function(table, key, callback){
    client.hexists(table, key, function(err, result){
        if (err) {
            callback(err,null);
            return;
        }

        callback(null, result);
    })
}

redisDb.zadd = function(table, score, value, callback){
    client.zadd(table, score, value, function(err, result){
        if (err) {
            console.log(err);
            callback(err,null)
            return;
        }

        callback(null,result);
    })
}

redisDb.zrange = function(table,begianNum, endNum, callback){
    client.zrange (table, begianNum, endNum, function(err, result){
        if (err) {
            console.log(err);
            callback(err,null)
            return;
        }

        client.sort(table, function(err, tableSortResult){
            callback(null,tableSortResult);
        })
    })
}

redisDb.zrevrange = function(table,begianNum, endNum, callback){
    client.zrevrange (table, begianNum, endNum, function(err, result){
        if (err) {
            console.log(err);
            callback(err,null)
            return;
        }

        if (result) {
            var jsonData = [] ;
            for (var key in result) {
                var fomatData = JSON.parse(result[key]);
                jsonData.push(fomatData);
            }

            callback(null,jsonData);
        }
    })
}

redisDb.zrangebyscore = function(table,begianNum, endNum, callback){
    client.zrangebyscore (table, begianNum, endNum, function(err, result){
        if (err) {
            console.log(err);
            callback(err,null)
            return;
        }

        if (result) {
            var jsonData = [] ;
            for (var key in result) {
                // console.log('ddddddd---', result[key]);
                var fomatData = JSON.parse(result[key]);
                jsonData.push(fomatData);
            }

            callback(null,jsonData);
        }
    })
}

redisDb.zinterstore = function(newTable, num, table1,table2, callback){
    client.zinterstore (newTable, num, table1, table2, function(err, result){
        if (err) {
            console.log(err);
            callback(err,null)
            return;
        }

        client.zrange(newTable, 0, -1, function (getErr, getResult){
            if (getErr) {
                console.log(getErr);
                callback(getErr,null);
                return;
            }

            callback(null,getResult);
        });

    })
}

redisDb.zunionstore = function(newTable, num, values, callback){

    if (num ==5) {
        client.zunionstore (newTable, num, values[4],values[3],values[2],values[1],values[0], function(err, result){
            if (err) {
                console.log(err);
                callback(err,null)
                return;
            }


            client.zrange(newTable, 0, -1, function (getErr, getResult){
                if (getErr) {
                    console.log(getErr);
                    callback(getErr,null);
                    return;
                }

                callback(null,getResult);
            })


        })
    }
    if (num == 4) {
        client.zunionstore (newTable, num, values[3],values[2],values[1],values[0], function(err, result){
            if (err) {
                console.log(err);
                callback(err,null)
                return;
            }

            client.zrange(newTable, 0, -1, function (getErr, getResult){
                if (getErr) {
                    console.log(getErr);
                    callback(getErr,null);
                    return;
                }

                callback(null,getResult);
            })

        })
    }
    if (num == 3) {
        client.zunionstore (newTable, num, values[2],values[1],values[0], function(err, result){
            if (err) {
                console.log(err);
                callback(err,null)
                return;
            }

            client.zrange(newTable, 0, -1, function (getErr, getResult){
                if (getErr) {
                    console.log(getErr);
                    callback(getErr,null);
                    return;
                }

                callback(null,getResult);
            })

        })
    }
    if (num == 2) {
        client.zunionstore (newTable, num, values[1],values[0], function(err, result){
            if (err) {
                console.log(err);
                callback(err,null)
                return;
            }

            client.zrange(newTable, 0, -1, function (getErr, getResult){
                if (getErr) {
                    console.log(getErr);
                    callback(getErr,null);
                    return;
                }

                callback(null,getResult);
            })

        })
    }
    if (num == 1) {
        client.zunionstore (newTable, num, values[0], function(err, result){
            if (err) {
                console.log(err);
                callback(err,null)
                return;
            }

            client.zrange(newTable, 0, -1, function (getErr, getResult){
                if (getErr) {
                    console.log(getErr);
                    callback(getErr,null);
                    return;
                }

                callback(null,getResult);
            })

        })
    }

}

redisDb.zcard = function(table, callback){
    client.zcard(table, function(err, result){
        if (err) {
            callback(err,null);
            return;
        }

        callback(null, result);
    })
}

redisDb.incrby = function(key, num, callback){
    client.incrby(key, num, function(err, result){
        if (err) {
            console.log(err);
            callback(err,null)
            return;
        }

        callback(null,result);
    })
}

redisDb.hincrby = function(table,key, num, callback){
    client.hincrby(table,key, num, function(err, result){
        if (err) {
            console.log(err);
            callback(err,null)
            return;
        }

        callback(null,result);
    })
}

module.exports = redisDb;