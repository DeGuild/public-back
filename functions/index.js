/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const express = require("express");
const cors = require("cors")({ origin: true });
const app = express();


const readCertificate = async (req, res) => {
  // Grab the text parameter.
  const address = req.params.address;
  const readResult = await admin
    .firestore()
    .collection("Certificate/")
    .doc(address)
    .get();

  res.json({
    imageUrl: `${readResult.data().url}`,
  });
};

const allCertificates = async (req, res) => {
  // Grab the text parameter.
  const limit = 40;
  const address = req.params.address;
  const direction = req.params.direction;
  let data = [];
  if (direction === "next") {
    const startAtSnapshot = admin
      .firestore()
      .collection("Certificate/")
      .orderBy("address", "desc")
      .startAfter(address);

    const items = await startAtSnapshot.limit(limit).get();
    items.forEach((doc) => {
      data.push(doc.id);
    });
  } else if (direction === "previous") {
    const startAtSnapshot = admin
      .firestore()
      .collection("Certificate/")
      .orderBy("address", "asc")
      .startAfter(address);

    const items = await startAtSnapshot.limit(limit).get();
    items.forEach((doc) => {
      data.push(doc.id);
    });
  } else {
    const readResult = await admin
      .firestore()
      .collection("Certificate/")
      .orderBy("address", "desc")
      .limit(limit)
      .get();
    // Send back a message that we've successfully written the message3
    readResult.forEach((doc) => {
      data.push(doc.id);
    });
    // readResult.map
  }

  res.json({
    result: data,
  });
};

const readMagicScroll = async (req, res) => {
  // Grab the text parameter.
  const address = req.params.address;
  const tokenId = parseInt(req.params.tokenId, 10);
  const readResult = await admin
    .firestore()
    .collection(`MagicShop/${address}/tokens`)
    .doc(tokenId)
    .get();
  if (readResult.data()) {
    try {
      res.json(readResult.data());
    } catch (error) {
      res.json(error);
    }
  } else {
    res.json({
      message: "Magic scroll not found!",
    });
  }
};

const allMagicScrolls = async (req, res) => {
  // Grab the text parameter.
  const address = req.params.address;
  const tokenId = parseInt(req.params.tokenId, 10);
  const direction = req.params.direction;

  let data = [];
  if (direction === "next") {
    const startAtSnapshot = admin
      .firestore()
      .collection(`MagicShop/${address}/tokens`)
      .orderBy("tokenId", "asc")
      .startAfter(tokenId);

    const items = await startAtSnapshot.limit(24).get();
    items.forEach((doc) => {
      data.push(doc.data());
    });
  } else if (direction === "previous") {
    const startAtSnapshot = admin
      .firestore()
      .collection(`MagicShop/${address}/tokens`)
      .orderBy("tokenId", "desc")
      .startAfter(tokenId);

    const items = await startAtSnapshot.limit(24).get();
    items.forEach((doc) => {
      data.push(doc.data());
    });
  } else {
    const readResult = await admin
      .firestore()
      .collection(`MagicShop/${address}/tokens`)
      .orderBy("tokenId", "asc")
      .limit(24)
      .get();
    // Send back a message that we've successfully written the message3
    readResult.forEach((doc) => {
      data.push(doc.data());
    });
  }

  res.json(data.sort());
};


const readJob = async (req, res) => {
  const address = req.params.address;
  const tokenId = parseInt(req.params.tokenId, 10);
  const readResult = await admin
    .firestore()
    .collection(`DeGuild/${address}/tokens`)
    .doc(tokenId)
    .get();
  if (readResult.data()) {
    try {
      res.json(readResult.data());
    } catch (error) {
      res.json(error);
    }
  } else {
    res.json({
      message: "Job not found!",
    });
  }
};

const allJobs = async (req, res) => {
  // Grab the text parameter.
  const address = req.params.address;
  const tokenId = parseInt(req.params.tokenId, 10);
  const direction = req.params.direction;

  let data = [];
  if (direction === "next") {
    const startAtSnapshot = admin
      .firestore()
      .collection(`DeGuild/${address}/tokens`)
      .orderBy("tokenId", "asc")
      .startAfter(tokenId);

    const items = await startAtSnapshot.limit(24).get();
    items.forEach((doc) => {
      data.push(doc.data());
    });
  } else if (direction === "previous") {
    const startAtSnapshot = admin
      .firestore()
      .collection(`DeGuild/${address}/tokens`)
      .orderBy("tokenId", "desc")
      .startAfter(tokenId);

    const items = await startAtSnapshot.limit(24).get();
    items.forEach((doc) => {
      data.push(doc.data());
    });
  } else {
    const readResult = await admin
      .firestore()
      .collection(`DeGuild/${address}/tokens`)
      .orderBy("tokenId", "asc")
      .limit(24)
      .get();
    // Send back a message that we've successfully written the message3
    readResult.forEach((doc) => {
      data.push(doc.data());
    });
    // readResult.map
  }

  res.json(data.sort());
};

app.use(cors);

app.get("/readCertificate/:address", readCertificate);
app.get("/readMagicScroll/:address/:tokenId", readMagicScroll);
app.get("/readJob/:address/:tokenId", readJob);

app.get("/allCertificates/:address/:direction", allCertificates);
app.get("/allCertificatesOnce", allCertificates);

app.get("/allMagicScrolls/:address/:tokenId/:direction", allMagicScrolls);
app.get("/allMagicScrolls/:address", allMagicScrolls);

app.get("/allJobs/:address/:tokenId/:direction", allJobs);
app.get("/allJobs/:address/", allJobs);

exports.app = functions.https.onRequest(app);
