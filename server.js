//express 프레임워크 실행
const express = require("express");
const app = express();
const { MongoClient, ObjectId } = require("mongodb");
//PUT/DELETE 요청 가능
const methodOverride = require("method-override");
const bcrypt = require("bcrypt");
require("dotenv").config();

app.use(methodOverride("_method"));
//static 파일들 폴더 서버등록
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
//req.body 쓰려면 필수
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//passport 라이브러리 셋팅
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const MongoStore = require("connect-mongo");

app.use(passport.initialize());
app.use(
  session({
    secret: "암호화에 쓸 비번",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
      dbName: "forum",
    }),
  })
);

app.use(passport.session());

let db;
const url = process.env.DB_URL;

new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");
    //성공시 서버 실행 코드
    app.listen(process.env.PORT, () => {
      console.log("http://localhost:8080 에서 서버 실행중");
    });
  })
  .catch((err) => {
    console.log(err);
  });

// 페이지 접속시 응답(라우팅)
app.get("/", (req, res) => {
  //File 전송시
  res.sendFile(__dirname + "/index.html");
});

app.get("/list", async (req, res) => {
  let result = await db.collection("post").find().toArray();
  //ejs 파일로 데이터 전송
  res.render("list.ejs", { posts: result });
});

app.get("/write", (req, res) => {
  res.render("write.ejs");
});

app.post("/new-post", async (req, res) => {
  try {
    if (req.body.title == "") {
      res.send("빈칸");
    } else if (req.body.content == "") {
      res.send("내용빈칸");
    } else {
      await db.collection("post").insertOne({ title: req.body.title, content: req.body.content });
      res.redirect("/list");
    }
  } catch (e) {
    res.send("서버에러");
  }
});

app.get("/detail/:id", async (req, res) => {
  try {
    let result = await db.collection("post").findOne({ _id: new ObjectId(req.params.id) });
    res.render("detail.ejs", { result: result });
  } catch (e) {
    res.status(404).send("URL ERROR");
  }
});

app.get("/edit/:id", async (req, res) => {
  let result = await db.collection("post").findOne({ _id: new ObjectId(req.params.id) });
  res.render("edit.ejs", { result: result });
});

app.put("/edit", async (req, res) => {
  //inc - 증감, mul - 곱, unset - 필드값삭제
  // await db.collection("post").updateOne({ _id: 5 }, { $inc: { like: 1 } });
  await db
    .collection("post")
    .updateOne({ _id: new ObjectId(req.body.id) }, { $set: { title: req.body.title, content: req.body.content } });
  res.redirect("/list");
});
app.delete("/delete", async (req, res) => {
  await db.collection("post").deleteOne({ _id: new ObjectId(req.query.id) });
  console.log(req.query);
  res.send("삭제완료");
});
app.get("/list/:id", async (req, res) => {
  let result = await db
    .collection("post")
    .find()
    //skip은 대용량 처리시 좋지 않음
    .skip((req.params.id - 1) * 5)
    .limit(5)
    .toArray();
  res.render("list.ejs", { posts: result });
});

app.get("/list/next/:id", async (req, res) => {
  let result = await db
    .collection("post")
    .find({ _id: { $gt: new ObjectId(req.params.id) } })
    //skip은 대용량 처리시 좋지 않음
    // .skip((req.params.id - 1) * 5)
    .limit(5)
    .toArray();

  res.render("list.ejs", { posts: result });
});

//제출 한 아이디/비번 검사하는 코드
passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db.collection("user").findOne({ username: 입력한아이디 });
    if (!result) {
      return cb(null, false, { message: "아이디 DB에 없음" });
    }

    if (await bcrypt.compare(입력한비번, result.password)) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: "비번불일치" });
    }
  })
);

passport.serializeUser((user, done) => {
  //내부코드를 비동기적으로 처리해줌
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username });
  });
});
//유저가 보낸 쿠키분석
passport.deserializeUser(async (user, done) => {
  let result = await db.collection("user").findOne({ _id: new ObjectId(user.id) });
  delete result.password;
  console.log(result);
  process.nextTick(() => {
    done(null, result);
  });
});

app.get("/login", async (req, res) => {
  console.log(req.user);
  res.render("login.ejs");
});

app.post("/login", async (req, res, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) return res.status(500).json(error);
    if (!user) return res.status(401).json(info.message);
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  })(req, res, next);
});

app.get("/myPage", (req, res) => {
  if (!req.user) {
    res.send("로그인해주세요");
  } else {
    let username = req.user.username;
    res.render("myPage.ejs", { username: username });
  }
});

app.get("/register", async (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  let password = await bcrypt.hash(req.body.password, 10);

  console.log(password);
  await db.collection("user").insertOne({ username: req.body.username, password: password });
  res.redirect("/");
});
