var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  	res.render('user/user', {
  		title: '用户详情',
  		username : req.user.username,
	});
});

module.exports = router;
