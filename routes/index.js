var gravatar = require('gravatar');
var moment = require('moment');
var route = require('koa-route');

var User = require('../models/user');
var Post = require('../models/post');
var exception = require('../lib/exception');
var md5 = require('../lib/md5');


module.exports = function (app) {


    /*
     *  通过kindeditor 编辑器 上传图片
     */
    app.use(route.post('/uploadImg',function*(){

        console.log(this.req.body);
        console.log("上传信息:%s",JSON.stringify(this.req.files));
        console.log("上传图片:%s",JSON.stringify(this.req.files.imgFile.path));

        var imginfo ={
            "error": 0,
            "url": this.req.files.imgFile.name
        }
        this.body = imginfo;
      console.log("提交信息:%s",JSON.stringify(this.body));

    }));


  /*
   *  打开首页页面,get方法
   */
  app.use(route.get('/', function* () {
    var page = this.query.p ? parseInt(this.query.p) : 1;
    var posts = yield Post.getFive(this.mongo, null, page);
    var total = yield Post.count(this.mongo);

    yield this.render('index', {
      title: '主页',
      posts: posts,
      page: page,
      user: this.session.user,
      isFirstPage: (page - 1) === 0,
      isLastPage: ((page - 1) * 5 + posts.length) === total,
      flash: this.flash
    });
  }));


  /*
   * 打开注册页面, 当前需要处于未登录状态, get请求
   */
  app.use(route.get('/reg', checkNotLogin));
  app.use(route.get('/reg', function* () {
    yield this.render('reg', {
      title: '注册',
      user: this.session.user,
      flash: this.flash
    });
  }));

  /*
   * 提交注册资料,post请求
   */
  app.use(route.post('/reg', checkNotLogin));
  app.use(route.post('/reg', function* () {
    var body = this.request.body;
    var name = body.name;
    var password = body.password;
    var password_re = body['password-repeat'];
    var email = body.email;

    if (password_re != password) {
      throw exception(exception.RequestError, '两次输入的密码不一致!');
    }

    var user = yield User.get(this.mongo, name);
    if (user) {
      throw exception(exception.RequestError, '用户已存在!');
    }

    var newUser = {
        name: name,
        password: md5(password),
        email: email,
        avatar: gravatar.url()
    };

    yield User.save(this.mongo, newUser);

    delete newUser.password;
    this.session.user = newUser;
    this.flash = '注册成功!';
    this.redirect('/');
  }));


  /*
   * 打开登录页面, 当前需要处于未登录状态, get请求
   */
  app.use(route.get('/login', checkNotLogin));
  app.use(route.get('/login', function* () {
    yield this.render('login', {
      title: '登录',
      user: this.session.user,
      flash: this.flash
    });
  }));


  /*
   * 提交登录按钮,进行用户登录,当前需要处于未登录状态, post请求
   */
  app.use(route.post('/login', checkNotLogin));
  app.use(route.post('/login', function* () {
    var name = this.request.body.name;
    var password = this.request.body.password;

    var user = yield User.get(this.mongo, name);

    if (!user) {
      throw exception(exception.RequestError, '用户不存在!');
    }

    if (user.password != md5(password)) {
      throw exception(exception.RequestError, '密码错误!');
    }

    delete user.password;
    this.session.user = user;
    this.flash = '登录成功!';
    this.redirect('/');
  }));


  /*
   *  打开发表帖子页面,当前需要处于登录状态, get请求
   */
  app.use(route.get('/post', checkLogin));
  app.use(route.get('/post', function* () {
    yield this.render('post', {
      title: '发表',
      user: this.session.user,
      flash: this.flash
    });
  }));

  /*
   * 提交方法帖子按钮,当前需要处于登录状态, post请求
   */
  app.use(route.post('/post', checkLogin));
  app.use(route.post('/post',function* () {
    yield Post.save(this.mongo, this.session.user, this.request.body);

    this.flash = '发布成功!';
    this.redirect('/');
  }));


  /*
   * 打开注销登录页面,当前需要处于登录状态, get请求
   */
  app.use(route.get('/logout', checkLogin));
  app.use(route.get('/logout', function* () {
    this.session.user = null;
    this.flash = '登出成功!';
    this.redirect('/');
  }));



  /*
   * 打开存档页面,不用验证用户是否已登录,get请求
   */
  app.use(route.get('/archive', function* () {
    var posts = yield Post.getArchive(this.mongo);

    yield this.render('archive', {
      title: '存档',
      posts: posts,
      user: this.session.user,
      flash: this.flash
    });
  }));


  /*
   * 打开标签页面,不用验证用户是否已登录,get请求
   */
  app.use(route.get('/tags', function* () {
    var posts = yield Post.getTags(this.mongo);

    yield this.render('tags', {
      title: '标签',
      posts: posts,
      user: this.session.user,
      flash: this.flash
    });
  }));


  /*
   * 在标签页面中点击标签,打开标签详情页面,不用验证用户是否已登录,get请求
   */
  app.use(route.get('/tags/:tag', function* (tag) {
    var posts = yield Post.getTag(this.mongo, tag);

    yield this.render('tag', {
      title: 'TAG:' + tag,
      posts: posts,
      user: this.session.user,
      flash: this.flash
    });
  }));

  /*
   * 打开友情链接页面,不用验证用户是否已登录,get请求
   */
  app.use(route.get('/links', function* () {
    yield this.render('links', {
      title: '友情链接',
      user: this.session.user,
      flash: this.flash
    });
  }));


  /*
   * 打开搜索页面,不用验证用户是否已登录,get请求
   */
  app.use(route.get('/search', function* () {
    var keyword = this.query.keyword;
    var posts = yield Post.search(this.mongo, keyword);

    yield this.render('search', {
      title: "SEARCH:" + keyword,
      posts: posts,
      user: this.session.user,
      flash: this.flash
    });
  }));

  /*
   * 点击用户名称,打开用户帖子列表,不用验证用户是否已登录,get请求
   */
  app.use(route.get('/u/:name', function* (name) {
    var page = this.query.p ? parseInt(this.query.p) : 1;
    var posts = yield Post.getFive(this.mongo, name, page);
    var total = yield Post.count(this.mongo, name);

    yield this.render('user', {
      title: name,
      posts: posts,
      page: page,
      user: this.session.user,
      isFirstPage: (page - 1) == 0,
      isLastPage: ((page - 1) * 5 + posts.length) == total,
      flash: this.flash
    });
  }));


   /*
    * 打开帖子详情页,不用验证用户是否已登录,get 请求
    */
  app.use(route.get('/p/:id', function* (id) {
    var post = yield Post.getOne(this.mongo, id);
      if (!this.session.user) {
          console.log("-----当前用户没有登录-----");
      }
    yield this.render('article', {
      title: post.value.title,
      post: post.value,
      user: this.session.user,
      flash: this.flash
    });
  }));

  /*
   * 用户进行帖子留言,需要验证用户登录,post请求
   */
  app.use(route.post('/p/:id', checkLogin));
  app.use(route.post('/p/:id', function* (id) {
    var body = this.request.body;
    var newComment = {
      name: body.name,
      avatar: gravatar.url(),
      email: body.email,
      website: body.website,
      time: Date.now(),
      content: body.content
    };

    yield Post.postOne(this.mongo, id, newComment);

    this.flash = '留言成功!';
    this.redirect('back');
  }));


  /*
   * 用户点击自己的帖子的编辑按钮,打开编辑页面,get请求
   */
  app.use(route.get('/edit/:id/', checkLogin));
  app.use(route.get('/edit/:id/', function* (id, next) {
    var currentUser = this.session.user;
    var post = yield Post.getEdit(this.mongo, id, currentUser.name);
    //render就是渲染的意思。 而渲染，就是这样一个过程，浏览器根据页面的html代码、css定义、javascript脚本的操作，在浏览器上按照一定的规范(传说中的 DOCTYPE )显示出相应的内容
    yield this.render('edit', {
      title: '编辑',
      post: post,
      user: this.session.user,
      flash: this.flash
    });
  }));

  /*
   *  用户完成帖子编辑并点击提交编辑后,跳转到帖子详情页,post请求
   */
  app.use(route.post('/edit/:id', checkLogin));
  app.use(route.post('/edit/:id', function* (id) {
    var currentUser = this.session.user;
    yield Post.postEdit(this.mongo, id, currentUser.name, this.request.body);

    this.flash = '修改成功!';
    this.redirect('/p/' + id);
  }));

  /*
   * 点击删除帖子,用户只能删除自己的帖子
   */
  app.use(route.get('/delete/:id', checkLogin));
  app.use(route.get('/delete/:id', function* (id) {
    var currentUser = this.session.user;
    yield Post.getDelete(this.mongo, id, currentUser.name);

    this.flash = '删除成功!';
    this.redirect('/');
  }));

  /*
   * 点击转载帖子,用户只能转载别人的帖子
   */
  app.use(route.get('/reprint/:id', checkLogin));
  app.use(route.get('/reprint/:id', function* (id) {
    var currentUser = this.session.user;
    yield Post.getReprint(this.mongo, id, currentUser);

    this.flash = '转载成功!';
    this.redirect('/');
  }));

  app.use(function* () {
    yield this.render('404');
  });
};



function* checkLogin () {
  if (!this.session.user) {
    this.flash = '未登录!';
    return this.redirect('/login');//redirect是服务端根据逻辑,发送一个状态码,告诉浏览器重新去请求那个地址.所以地址栏显示的是新的URL.一般用于用户注销登陆时返回主页面和跳转到其它的网站等
  }
  yield arguments[arguments.length - 1];
}

function* checkNotLogin () {
  if (this.session.user) {
    this.flash = '已登录!';
    return this.redirect('back');
  }
  yield arguments[arguments.length - 1];
}
