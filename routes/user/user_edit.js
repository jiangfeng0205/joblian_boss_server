var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('user/user_edit', { title: '修改用户' });
});

module.exports = router;
