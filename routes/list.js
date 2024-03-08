const { ObjectId } = require("mongodb");
const router = require("express").Router();

let db;
let connectDB = require("./../database");

connectDB
  .then((client) => {
    db = client.db("forum");
  })
  .catch((err) => {
    console.log(err);
  });

router.get("/list", async (req, res) => {
  let loginUser = req.user.username;
  let result = await db.collection("post").find().toArray();

  let comment = await db
    .collection("comments")
    .find({ parentId: new ObjectId(req.params.id) })
    .toArray();

  res.render("list.ejs", { posts: result, loginUser: loginUser, comment: comment });
});

router.get("/list/:id", async (req, res) => {
  let result = await db
    .collection("post")
    .find()
    //skip은 대용량 처리시 좋지 않음
    .skip((req.params.id - 1) * 5)
    .limit(5)
    .toArray();
  res.render("list.ejs", { posts: result });
});

// router.get("/list/next/:id", async (req, res) => {
//   let result = await db
//     .collection("post")
//     .find({ _id: { $gt: new ObjectId(req.params.id) } })
//     //skip은 대용량 처리시 좋지 않음
//     // .skip((req.params.id - 1) * 5)
//     .limit(5)
//     .toArray();

//   res.render("list.ejs", { posts: result });
// });

module.exports = router;
