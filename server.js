"use strict";
//dependencies
require("dotenv").config();
const express = require("express");
const path = require("path");
const fetch = require("node-fetch");
const btoa = require("btoa");
const app = express();

const redirect = encodeURIComponent(process.env.redirect);

//use this port to start the app
app.listen(50451, () => {
  console.info("Running on port 50451");
});

//redirect to the oauth url to get user permission to access discord data
app.get("/", (req, res) => {
  //   res.status(200).sendFile(path.join(__dirname, "index.html"));
  res.redirect(process.env.oauthURL);
});

//callback after permission is granted
app.get("/api/auth/discord/callback", async (req, res) => {
  if (!req.query.code) res.status("404").end();
  const code = req.query.code;
  const creds = btoa(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`);
  const response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${process.env.REDIRECT_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
    },
  });
  //gets the user data
  const json = await response.json();
  const getUser = await fetch("https://discordapp.com/api/users/@me", {
    method: "GET",
    headers: {
      authorization: `${json.token_type} ${json.access_token}`,
    },
  });
  //parses user data to json
  const user = await getUser.json();

  //adds user to a guild (if they were not in this guild already), this fetch is not needed if you do not want
  const joinGuild = await fetch(`https://discordapp.com/api/guilds/${process.env.GUILD_ID}/members/${user.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bot " + process.env.BOT_TOKEN,
    },
    body: JSON.stringify({ access_token: json.access_token }),
  });
  //Action below was setup to redirect to a Google Form with a pre-filled field containing the users Discord tag. Any user data can be accessed and you can do whatever you want with it at this point.
  const form = process.env.FORM + `&entry.####=${user.username}%23${user.discriminator}`;
  res.redirect(form);
});
