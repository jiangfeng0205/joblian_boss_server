var express = require('express');
var router = express.Router();
var passport = require('passport');

router.get('/', function(req, res, next) {
    res.render('index', {
        title: 'Express',
        message : req.flash('error').toString(),
    });
});

router.all('/users', isLoggedIn);
router.get('/users', function(req, res, next) {
   res.render('users',{
        title : 'User List',
        username : req.user.username
    })
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()){
        return next()
    }
    res.redirect('/');
}

module.exports = router;