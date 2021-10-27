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
//  const cookieParser = require('cookie-parser')();
const cors = require("cors")({ origin: true });
const app = express();


const readCertificate = async (req, res) => {
  // Grab the text parameter.
  const address = req.params.address;
  const readResult = await admin
    .firestore()
    .collection("certificate/")
    .doc(address)
    .get();
  // Send back a message that we've successfully written the message
  functions.logger.log(readResult.data());

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
      .collection("certificate/")
      .orderBy("address", "desc")
      .startAfter(address);

    const items = await startAtSnapshot.limit(limit).get();
    items.forEach((doc) => {
      data.push(doc.id);
    });
  } else if (direction === "previous") {
    const startAtSnapshot = admin
      .firestore()
      .collection("certificate/")
      .orderBy("address", "asc")
      .startAfter(address);

    const items = await startAtSnapshot.limit(limit).get();
    items.forEach((doc) => {
      data.push(doc.id);
    });
  } else {
    const readResult = await admin
      .firestore()
      .collection("certificate/")
      .orderBy("address", "desc")
      .limit(limit)
      .get();
    // Send back a message that we've successfully written the message3
    readResult.forEach((doc) => {
      data.push(doc.id);
    });
    // readResult.map
    functions.logger.log(readResult);
  }

  res.json({
    result: data,
  });
};

const readMagicScroll = async (req, res) => {
  // Grab the text parameter.
  const address = req.params.address;
  const tokenId = req.params.id;
  const readResult = await admin
    .firestore()
    .collection(`MagicShop/${address}/tokens`)
    .doc(tokenId)
    .get();
  // Send back a message that we've successfully written the message
  functions.logger.log(readResult);
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
    // readResult.map
    functions.logger.log(readResult);
  }

  res.json(data.sort());
};


const readJob = async (req, res) => {
  // Grab the text parameter.
  const address = req.params.address;
  const readResult = await admin
    .firestore()
    .collection("certificate/")
    .doc(address)
    .get();
  // Send back a message that we've successfully written the message
  functions.logger.log(readResult.data());

  res.json({
    imageUrl: `${readResult.data().url}`,
  });
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
    // readResult.map
    functions.logger.log(readResult);
  }

  res.json(data.sort());
};

app.use(cors);

app.get("/readCertificate/:address", readCertificate);
app.get("/readMagicScroll/:address/:id", readMagicScroll);
app.get("/readJob/:address/:id", readJob);

app.get("/allJobs/:address/:tokenId/:direction", allJobs);
app.get("/allJobs/:address/", allJobs);

app.get("/allCertificates/:address/:direction", allCertificates);
app.get("/allCertificatesOnce", allCertificates);

app.get("/allMagicScrolls/:address/:direction/:tokenId", allMagicScrolls);
app.get("/allMagicScrolls/:address", allMagicScrolls);

exports.app = functions.https.onRequest(app);
