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

const addCertificate = async (req, res) => {
  const address = req.body.address;
  const url = req.body.url
    ? req.body.url
    : "https://firebasestorage.googleapis.com/v0/b/deguild-2021.appspot.com/o/0.png?alt=media&token=131e4102-2ca3-4bf0-9480-3038c45aa372";
  // Push the new message into Firestore using the Firebase Admin SDK.
  await admin
    .firestore()
    .collection("certificate/")
    .doc(`${address}`)
    .set({ url, address });

  // Send back a message that we've successfully written the message
  res.json({
    result: "Successful",
  });
};

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

const deleteCertificate = async (req, res) => {
  // Grab the text parameter.
  const address = req.body.address;
  // Push the new message into Firestore using the Firebase Admin SDK.
  await admin.firestore().collection("certificate/").doc(`${address}`).delete();

  // Send back a message that we've successfully written the message
  res.json({
    result: "Successful",
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

app.use(cors);
app.post("/addCertificate", addCertificate);
app.get("/readCertificate/:address", readCertificate);
app.post("/deleteCertificate", deleteCertificate);
app.get("/allCertificates/:address/:direction", allCertificates);
app.get("/allCertificatesOnce", allCertificates);
// app.use(cookieParser);
// app.use(validateFirebaseIdToken);

exports.app = functions.https.onRequest(app);
