var exception = require('../lib/exception');

/*
 * 用户注册调用的接口
 */
exports.save = function (mongo, doc) {
  return function (cb) {
    mongo
      .db('blog')
      .collection('users')
      .insert(doc, function (err, res) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        cb(null, res);
      });
  };
};

/*
 * 用户登录调用的接口
 */
exports.get = function (mongo, name) {
  return function (cb) {
    mongo
      .db('blog')
      .collection('users')
      .findOne({"name": name}, {"_id": 0}, function (err, doc) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        cb(null, doc);
      });
  };
};