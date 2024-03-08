//express 프레임워크 실행
const express = require("express");
const app = express();
const { ObjectId } = require("mongodb");
const session = require("express-session");
const passport = require("passport");
const MongoStore = require("connect-mongo");

//PUT/DELETE 요청 가능
const methodOverride = require("method-override");
const bcrypt = require("bcrypt");
const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
require("dotenv").config();

app.use(methodOverride("_method"));
//static 파일들 폴더 서버등록
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
//req.body 쓰려면 필수
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//express-session 미들웨어 설정
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

app.use(passport.initialize());
app.use(passport.session());

//라우터 설정
app.use("/", require("./routes/list.js"));
app.use("/", require("./routes/edit.js"));
app.use("/", require("./routes/auth.js"));

const s3 = new S3Client({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.IM_KEY,
    secretAccessKey: process.env.IM_SECRET,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "gnuoy-j",
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()); //업로드시 파일명 변경가능
    },
  }),
});

let db;
let connectDB = require("./database.js");

connectDB
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
// 미들웨어로서 nav.ejs 파일을 렌더링하여 모든 응답에 포함
app.use((req, res, next) => {
  res.locals.user = req.user; // 현재 사용자 정보를 저장하여 템플릿에서 사용 가능하도록 함
  res.locals.nav = "nav";
  next();
});

// 페이지 접속시 응답(라우팅)
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/detail/:id", async (req, res) => {
  try {
    let loginUser = req.user.username;
    let result = await db.collection("post").findOne({ _id: new ObjectId(req.params.id) });
    let comment = await db
      .collection("comments")
      .find({ parentId: new ObjectId(req.params.id) })
      .toArray();

    res.render("detail.ejs", { result: result, comment: comment, loginUser: loginUser });
  } catch (e) {
    res.status(404).send("회원에게만 공개된 게시글입니다.");
  }
});

app.get("/write", (req, res) => {
  if (req.user == undefined) {
    res.send("로그인해주세요");
  } else {
    res.render("write.ejs");
  }
});

let days = require("./date.js");

app.post("/new-post", async (req, res) => {
  upload.single("img1")(req, res, async (err) => {
    if (err) return res.send("img 업로드 에러");
    //이미지 업로드 완료시 실행할 코드
    try {
      if (req.body.title == "") {
        res.send("빈칸");
      } else if (req.body.content == "") {
        res.send("내용빈칸");
      } else {
        await db.collection("post").insertOne({
          user: req.user._id,
          username: req.user.username,
          title: req.body.title,
          content: req.body.content,
          img: req.file ? req.file.location : "",
          day: days.format,
        });
        res.redirect("/list");
      }
    } catch (e) {
      res.status(500).send("서버에러");
    }
  });
});

app.delete("/delete", async (req, res) => {
  await db.collection("post").deleteOne({ _id: new ObjectId(req.query.id), user: new ObjectId(req.user._id) });
  await db.collection("comments").deleteMany({ parentId: new ObjectId(req.query.id) });
  res.send("삭제완료");
});

app.get("/myPage", (req, res) => {
  if (!req.user) {
    res.send("로그인해주세요");
  } else {
    let username = req.user.username;
    res.render("myPage.ejs", { username: username });
  }
});

app.post("/register", async (req, res) => {
  let password = await bcrypt.hash(req.body.password, 10);

  await db.collection("user").insertOne({ username: req.body.username, password: password });
  res.redirect("/");
});
app.get("/register", async (req, res) => {
  res.render("register.ejs");
});

app.post("/chkDuplication", async (req, res) => {
  let result = await db.collection("user").findOne({ username: req.body.username });
  res.send({ result: result });
});

app.get("/search", async (req, res) => {
  let condition = [
    {
      $search: {
        index: "title_index",
        text: { query: req.query.val, path: "title" },
      },
    },
  ];
  let result = await db
    .collection("post")
    // .find({ $text: { $search: req.query.val } })
    .aggregate(condition)
    .toArray();
  res.render("search.ejs", { posts: result });
});

app.post("/comment", async (req, res) => {
  await db.collection("comments").insertOne({
    parentId: new ObjectId(req.query.id),
    username: req.query.user,
    comment: req.body.comment,
    date: days.format,
    time: days.time,
  });

  res.redirect("back");
});

app.get("/message", async (req, res) => {
  let partner = req.query.id;
  let message = await db.collection("message").find().toArray();

  console.log(message);
  res.render("message.ejs", { partner: partner });
});
