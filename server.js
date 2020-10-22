const express= require('express');
const fetch= require('node-fetch');
const cookieSession= require('cookie-session');

const dotenv = require('dotenv');

// Load env vars
dotenv.config({path:'./config/config.env'})

const app = express();
app.use(
  cookieSession({
    secret: process.env.COOKIE_SECRET
  })
);

const client_id = process.env.GITHUB_CLIENT_ID;
const client_secret = process.env.GITHUB_CLIENT_SECRET;
// console.log({ client_id, client_secret });

app.get("/", (req, res) => {
  console.log(req.session);
  res.send("welcome to oauth "+req.session.githubId );
});

app.get("/login/github", (req, res) => {
  const redirect_uri = "http://localhost:9000/login/github/callback";
  const url= `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${redirect_uri}`;
  res.redirect(url);
});

async function getAccessToken({ code, client_id, client_secret }) {
  const request = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id,
      client_secret,
      code
    })
  });
  const text = await request.text();
  const params = new URLSearchParams(text);
  return params.get("access_token");
}

async function fetchGitHubUser(token) {
  const request = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: "token " + token
    }
  });
  return await request.json();
}

app.get("/login/github/callback", async (req, res) => {
  const code = req.query.code;
  const access_token = await getAccessToken({ code, client_id, client_secret });
  const user = await fetchGitHubUser(access_token);
  //
  console.log("userrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr")
  console.log(user)
  //
  if (user) {
    req.session.access_token = access_token;
    req.session.githubId = user.id;
    res.redirect("/admin");
  } else {
    res.send("Login did not succeed!");
  }
});

app.get("/admin", async (req, res) => {
  if (req.session) {
    const access_token = await req.session.access_token;
    const user = await fetchGitHubUser(access_token);
    res.send(`Hello ${user.login} !!! <pre>` + JSON.stringify(user, null, 2));
  } else {
    res.redirect("/login/github");
  }
});

app.get("/logout", (req, res) => {
  if (req.session) req.session = null;
  res.redirect("/");
});

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log("Listening on localhost:" + PORT));
