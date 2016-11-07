var marked = require('marked');
var moment = require('moment');
var gravatar = require('gravatar');
var ObjectID = require('mongodb').ObjectID;
var exception = require('../lib/exception');

exports.save = function (mongo, user, data) {
  var tags = {};
  data.tags.forEach(function (tag) {
    if (tag) {
      tags[tag.toLowerCase()] = 1;
    }
  });
  return function (cb) {
    var doc = {
      name: user.name,
      avatar: user.avatar,
      time: Date.now(),
      title: data.title,
      tags: data.tags,
      content: data.content,
      comments: [],
      pv: 0
    };
    mongo
      .db('blog')
      .collection('posts')
      .insert(doc, function (err, res) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        cb(null, res);
      });
  };
};

exports.getFive = function (mongo, name, page) {
  var query = {};
  if (name) {
    query.name = name;
  }
  return function (cb) {
    mongo
      .db('blog')
      .collection('posts')
      .find(query)
      .sort({time: -1})
      .skip((page - 1) * 5)
      .limit(5)
      .toArray(function (err, docs) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        docs.forEach(function (doc) {
            if(doc.length == 1){
                console.log("这一页只有一条数据");
            }
          doc.content = marked(doc.content);
          doc.time = moment(doc.time).format('YYYY-MM-DD HH:mm');
            if(doc.comments.length == 0){
                console.log("======没有评论数据=======");
            }else{
                doc.comments.forEach(function (comment) {
                    comment.time = moment(comment.time).format('YYYY-MM-DD HH:mm');
                });
            }
        });
        cb(null, docs);
      });
  };
};

exports.count = function (mongo, name) {
  var query = {};
  if (name) {
    query.name = name;
  }
  return function (cb) {
    mongo
      .db('blog')
      .collection('posts')
      .count(query, function (err, res) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        cb(null, res);
      });
  };
};

exports.getArchive = function (mongo) {
  return function (cb) {
    mongo
      .db('blog')
      .collection('posts')
      .find({}, {"time": 1, "title": 1})
      .sort({time: -1})
      .toArray(function (err, docs) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        docs.forEach(function (doc) {
          doc.time = moment(doc.time).format('YYYY-MM-DD');
        });
        cb(null, docs);
      });
  };
};

exports.getTags = function (mongo) {
  return function (cb) {
    mongo
      .db('blog')
      .collection('posts')
      .distinct("tags", function (err, res) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        cb(null, res);
      });
  };
};

exports.getTag = function (mongo, tag) {
  return function (cb) {
    mongo
      .db('blog')
      .collection('posts')
      .find({"tags": tag}, {"title": 1, "time": 1})
      .toArray(function (err, docs) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        docs.forEach(function (doc) {
          doc.time = moment(doc.time).format('YYYY-MM-DD');
        });
        cb(null, docs);
      });
  };
};

exports.search = function (mongo, keyword) {
  var pattern = new RegExp(keyword, "i");
  return function (cb) {
    mongo
      .db('blog')
      .collection('posts')
      .find({"title": pattern}, {"time": 1, "title": 1})
      .toArray(function (err, docs) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        docs.forEach(function (doc) {
          doc.time = moment(doc.time).format('YYYY-MM-DD');
        });
        cb(null, docs);
      });
  };
};

exports.getOne = function (mongo, id) {
  return function (cb) {
    mongo
      .db('blog')
      .collection('posts')
      .findAndModify({"_id": new ObjectID(id)}, [], {"$inc": {pv: 1}}, {new: true}, function (err, doc) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        if (!doc) {
          return cb(exception(exception.NotFound, 'NotFound ' + id));
        }else{
          doc.content = marked(doc.value.content);
          doc.time = moment(doc.time).format('YYYY-MM-DD HH:mm');
          if(doc.value.comments.length == 0){
            console.log("======没有评论数据=======");
          }else {
            doc.value.comments.forEach(function (comment) {
              comment.content = marked(comment.content);
              comment.time = moment(comment.time).format('YYYY-MM-DD HH:mm');
            });
          }
        }
        cb(null, doc);
      });
  };
};

/*
 * 查看帖子详情
 */
exports.postOne = function (mongo, id, newComment) {
  return function (cb) {
    mongo
      .db('blog')
      .collection('posts')
      .update({"_id": new ObjectID(id)}, {"$push": {"comments": newComment}}, function (err, res) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        if (!res) {
          return cb(exception(exception.NotFound, 'NotFound ' + id));
        }
        cb(null, res);
      });
  };
};


/*
 * 点击编辑帖子操作
 */
exports.getEdit = function (mongo, id, name) {
  return function (cb) {
    mongo
      .db('blog')
      .collection('posts')
      .findOne({"_id": new ObjectID(id), "name": name}, function (err, doc) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        if (!doc) {
          return cb(exception(exception.NotFound, 'NotFound ' + id));
        }
        cb(null, doc);
      });
  };
};

/*
 * 编辑提交帖子
 */
exports.postEdit = function (mongo, id, name, doc) {
  var tags = {};
    doc.tags.forEach(function (tag) {
    if (tag) {
      tags[tag.toLowerCase()] = 1;
    }
  });
  doc.tags = Object.keys(tags);
  return function (cb) {
    mongo
      .db('blog')
      .collection('posts')
      .update({"_id": new ObjectID(id), "name": name}, {"$set": doc}, function (err, res) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        if (!res) {
          return cb(exception(exception.NotFound, 'NotFound ' + id));
        }
        cb(null, res);
      });
  };
};


/*
 * 获取删除帖子
 */
exports.getDelete = function (mongo, id, name) {
  return function (cb) {
    mongo
      .db('blog')
      .collection('posts')
      .remove({"_id": new ObjectID(id), "name": name}, function (err, res) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        if (!res) {
          return cb(exception(exception.NotFound, 'NotFound ' + id));
        }
        cb(null, res);
      });
  };
};



/*
 * 获取评论回复
 */
exports.getReprint = function (mongo, id, currentUser) {
  return function (cb) {
    mongo
      .db('blog')
      .collection('posts')
      .findAndModify({"_id": new ObjectID(id)}, [], {"$inc": {reprint_num: 1}}, {new: true}, function (err, doc) {
        if (err) {
          return cb(exception(exception.DBError, err.message));
        }
        if (!doc) {
          return cb(exception(exception.NotFound, 'NotFound ' + id));
        }
        delete doc._id;
        doc.reprint_id = id;
        doc.reprint_num = 0;
        doc.title = doc.value.title.match(/^\[转\]/) ? doc.value.title : "[转]" + doc.value.title;
        doc.content = doc.value.content;
        doc.name = currentUser.name;
        doc.avatar = currentUser.avatar;
        doc.tags = doc.value.tags;
        doc.time = Date.now();
        doc.comments = [];
        doc.pv = 0;
        if(doc.value){
            delete doc.value;
            delete doc.lastErrorObject;
            delete doc.ok;
        }
        mongo
          .db('blog')
          .collection('posts')
          .insert(doc, function (err, res) {
            if (err) {
              return cb(exception(exception.DBError, err.message));
            }
            cb(null, res);
          });
      });
  };
};
