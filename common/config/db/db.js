// mysql 数据库配置
var mysql = require('mysql');
var pool = mysql.createPool({
    // 本地数据库配置
    // host: '127.0.0.1',
    // user: 'root',
    // password: 'jiangfeng',
    // database: 'char'

    // 远程数据库配置
    host: 'rm-m5esx9bqyq876b0f6o.mysql.rds.aliyuncs.com',
    user: 'zidoor_edwinbj',
    password: 'JobLian_edwinbj8',
    database: 'zidoor3'
});

function query(sql, callback) {
    pool.getConnection(function (err, connection) {
        // Use the connection
        try {
            connection.query(sql, function (err, rows) {
                callback(err, rows);
                connection.release();//释放链接
            });
        } catch (err) {
            console.log('数据库连接失败');
        }

    });
}
exports.query = query;