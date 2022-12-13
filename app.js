const express = require("express");
const app = express();
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dbPath = path.join(__dirname, "twitterClone.db");
app.use(express.json());
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000);
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// verifying jwtToken API

const verifyToken = (request, response, next) => {
  const jwtToken = request.headers["authorization"];
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "HOME", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// register user api

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const selectUser = `select * from user where username = '${username}';`;
  const dbUser = await db.get(selectUser);
  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      let hashedPassword = await bcrypt.hash(password, 10);
      const createUser = `insert into user (username,password,name,gender)
      values('${username}','${hashedPassword}','${name}','${gender}')`;
      await db.run(createUser);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

// login user api

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  selectUser = `select * from user where username='${username}';`;
  const dbUser = await db.get(selectUser);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isComparedPassword = await bcrypt.compare(password, dbUser.password);
    if (isComparedPassword !== true) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "HOME");
      response.status(200);
      response.send({ jwtToken });
    }
  }
});

// get tweets of the following api
const convertToObject = (dR) => {
  return {
    name: dR.name,
    username: dR.username,
    tweet: dR.tweet,
    dateTime: dR.date_time,
  };
};

app.get("/user/tweets/feed/", verifyToken, async (request, response) => {
  const getQuery = `select username,tweet,date_time as dateTime from (user INNER JOIN follower on user.user_id = follower.follower_user_id) as user1 
  INNER JOIN tweet on follower.following_user_id = tweet.user_id group by username order by dateTime desc limit 4 ;`;
  const dbResponse = await db.all(getQuery);
  const result = dbResponse.map((dR) => {
    return convertToObject(dR);
  });
  console.log(dbResponse);
  response.send(dbResponse);
});

// user follows people names api

app.get("/user/following/", verifyToken, async (request, response) => {
  const selectUsers = `select name from follower INNER JOIN user on follower.following_user_id = user.user_id `;
  const dbResponse = await db.all(selectUsers);
  console.log(dbResponse);
  response.send(dbResponse);
});

app.get("/user/followers/", async (request, responsoe) => {
  const selectUsers = `select name from follower INNER JOIN user on follower.following_user_id = user.user_id `;
  const dbResponse = await db.all(selectUsers);
  console.log(dbResponse);
  response.send(dbResponse);
});
module.exports = app;
