var createError = require('http-errors');
var path = require('path');
var logger = require('morgan');
var md5 = require('md5-node');
var express = require('express');
var app = express();

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var redis = require('redis');
var redisClient = redis.createClient('6379', '127.0.0.1');

app.use(session({
    secret:'sessiontest',
    store:new RedisStore({
        client:redisClient,
        disableTTL:true,
        // ttl:60
    }),
    // store:new RedisStore({
    //     host: '127.0.0.1',
    //     port: 6379,
    //     disableTTL:true,
    //     db:1,
    //     logErrors:false,
    // }),
    resave:false,
    saveUninitialized:false,
    name:'session_id',
}));

// var flash = require('connect-flash');
var flash = require('express-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var indexRouter    = require('./routes/index');
// var usersRouter    = require('./routes/users');
var loginRouter    = require('./routes/login');
var registerRouter = require('./routes/register');
var bannerRouter   = require('./routes/banner');
var chatRouter     = require('./routes/chat');
var wxApiRouter    = require('./routes/wxApi');


// company routers
var companyAddRouter  = require('./routes/company/company_add');
var companyInfoRouter = require('./routes/company/company_info');
var myCompanyRouter   = require('./routes/company/my_company');

// job routers
var jobAddRouter = require('./routes/job/job_add');
var contactJobListRouter = require('./routes/job/contact_job_list');
var historyContactJobListRouter = require('./routes/job/history_contact_job_list');
var pushJobListRouter = require('./routes/job/push_job_list');
var jobListRouter = require('./routes/job/job_list');
var jobCommonRouter = require('./routes/job/jobCommon');

// user routers
var userRouter = require('./routes/user/users');
var userEditRouter = require('./routes/user/user_edit');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser('sessiontest'));

app.use(express.static(path.join(__dirname, 'public')));

// 认证策略
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
var authentication = require(__dirname + "/common/authentication.js");
authentication.usenamePassport();

app.use('/', indexRouter);
// app.use('/users', usersRouter);
app.use('/login', loginRouter);
app.use('/wxApi', wxApiRouter);
app.use('/register', registerRouter);
app.use('/banner', bannerRouter);
app.use('/companyAdd', companyAddRouter);
app.use('/companyInfo', companyInfoRouter);
app.use('/myCompany', myCompanyRouter);
app.use('/jobAdd', jobAddRouter);
app.use('/contactJobList', contactJobListRouter);
app.use('/historyContactJobList', historyContactJobListRouter);
app.use('/pushJobList', pushJobListRouter);
app.use('/jobList', jobListRouter);
app.use('/user', userRouter);
app.use('/jobCommon', jobCommonRouter);
app.use('/chat', chatRouter);

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header("X-Powered-By",' 3.2.1');
    res.header("Content-Type", "application/json;charset=utf-8")
    next();
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  	next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
