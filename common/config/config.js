/*
 * 全局配置文件
 * 数据库的配置请到db.js中单独配置
 */
function config ()
{
    return  {
        // 开启用户认证模式
        'authenticate' : false,

        // 运行模式，api模式， 默认web模式
        'workingType' : 'api',

        // 用户列表类型，onlineUsers表示在线用户，databaseUsers表示数据库用户,communicatedUsers沟通过的用户,false表示不显示用户成员
        'userListType' : 'databaseUsers',

        // 数据库用户表名称(authenticate和userListType参数为真时必须配置此项)
        'databaseUserTable' : 'chat_user',

        //用户多表设置，默认为false
        // 'databaseUserTables' : false,
        'databaseUserTables' : ['chat_user','edwinbj_admin_user', 'edwinbj_member'],

        // 请求方式【POST】、【GET】
        'requestType' : 'POST',

        // 查询类型file，mysql
        'selectType' : 'file',

        // 个人聊天记录类型
        // 'chatHistorytype' : 'muchfile',
        'chatHistorytype' : 'redisdb',

        // 微信配置
        'wxConfig' : {
            "token":"WeiChartToken",
            "appID":"wx4b200d5386bf7628", // appid joblian微信公众平台查看
            "appScrect":"dfb63f3c000857305093200ecc05c550", // appScrect joblian微信公众平台查看

            // "appID":"wx81be4313161d06ae", // appid jf微信公众号测试账号
            // "appScrect":"ae2921daade7bea2006af67744beeff3", // appScrect jf微信公众号测试账号
            "apiDomain":"https://api.weixin.qq.com/",
            "apiURL":{
                "accessTokenApi":"%scgi-bin/token?grant_type=client_credential&appid=%s&secret=%s",
                "jsapiTicketApi":"%scgi-bin/ticket/getticket?type=jsapi&access_token=%s",
            }
        },

    }

}

exports.config = config;
