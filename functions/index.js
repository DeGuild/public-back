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
const spawn = require("child-process-promise").spawn;
const path = require("path");
const os = require("os");
const fs = require("fs");
const THUMB_MAX_HEIGHT = 200;
const THUMB_MAX_WIDTH = 200;
// Thumbnail prefix added to file names.
const THUMB_PREFIX = "thumb_";
const readCertificate = async (req, res) => {
  // Grab the text parameter.
  const address = req.params.address;
  const readResult = await admin
    .firestore()
    .collection("Certificate/")
    .doc(address)
    .get();

  if (readResult.data()) {
    try {
      res.json({
        imageUrl: `${readResult.data().url}`,
      });
    } catch (error) {
      res.json(error);
    }
  } else {
    res.status(404).json({
      message: "Certificate not found!",
    });
  }
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
    res.status(404).json({
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
    res.status(404).json({
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

const readProfile = async (req, res) => {
  const address = req.params.address;
  const readResult = await admin
    .firestore()
    .collection(`User`)
    .doc(address)
    .get();
  if (readResult.data()) {
    try {
      res.json(readResult.data());
    } catch (error) {
      res.json(error);
    }
  } else {
    res.status(404).json({
      message: "User not found!",
    });
  }
};

app.use(cors);

app.get("/readCertificate/:address", readCertificate);
app.get("/readMagicScroll/:address/:tokenId", readMagicScroll);
app.get("/readJob/:address/:tokenId", readJob);
app.get("/readProfile/:address", readProfile);

app.get("/allCertificates/:address/:direction", allCertificates);
app.get("/allCertificatesOnce", allCertificates);

app.get("/allMagicScrolls/:address/:tokenId/:direction", allMagicScrolls);
app.get("/allMagicScrolls/:address", allMagicScrolls);

app.get("/allJobs/:address/:tokenId/:direction", allJobs);
app.get("/allJobs/:address/", allJobs);

exports.app = functions.https.onRequest(app);

/**
 * When an image is uploaded in the Storage bucket We generate a thumbnail automatically using
 * ImageMagick.
 * After the thumbnail has been generated and uploaded to Cloud Storage,
 * we write the public URL to the Firebase Realtime Database.
 */
exports.generateThumbnail = functions.storage
  .object()
  .onFinalize(async (object) => {
    // File and directory paths.
    const filePath = object.name;
    const contentType = object.contentType; // This is the image MIME type
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const thumbFilePath = path.normalize(
      path.join(fileDir, `${THUMB_PREFIX}${fileName}`)
    );
    const tempLocalFile = path.join(os.tmpdir(), filePath);
    const tempLocalDir = path.dirname(tempLocalFile);
    const tempLocalThumbFile = path.join(os.tmpdir(), thumbFilePath);

    // Exit if this is triggered on a file that is not an image.
    if (!contentType.startsWith("image/")) {
      return functions.logger.log("This is not an image.");
    }

    // Exit if the image is already a thumbnail.
    if (fileName.startsWith(THUMB_PREFIX)) {
      return functions.logger.log("Already a Thumbnail.");
    }

    // Cloud Storage files.
    const bucket = admin.storage().bucket(object.bucket);
    const file = bucket.file(filePath);
    const thumbFile = bucket.file(thumbFilePath);
    const metadata = {
      contentType: contentType,
      // To enable Client-side caching you can set the Cache-Control headers here. Uncomment below.
      // 'Cache-Control': 'public,max-age=3600',
    };

    // Create the temp directory where the storage file will be downloaded.
    await mkdirp(tempLocalDir);
    // Download file from bucket.
    await file.download({ destination: tempLocalFile });
    functions.logger.log("The file has been downloaded to", tempLocalFile);
    // Generate a thumbnail using ImageMagick.
    await spawn(
      "convert",
      [
        tempLocalFile,
        "-thumbnail",
        `${THUMB_MAX_WIDTH}x${THUMB_MAX_HEIGHT}>`,
        tempLocalThumbFile,
      ],
      { capture: ["stdout", "stderr"] }
    );
    functions.logger.log("Thumbnail created at", tempLocalThumbFile);
    // Uploading the Thumbnail.
    await bucket.upload(tempLocalThumbFile, {
      destination: thumbFilePath,
      metadata: metadata,
    });
    functions.logger.log("Thumbnail uploaded to Storage at", thumbFilePath);
    // Once the image has been uploaded delete the local files to free up disk space.
    fs.unlinkSync(tempLocalFile);
    fs.unlinkSync(tempLocalThumbFile);
    // Get the Signed URLs for the thumbnail and original image.
    const results = await Promise.all([
      thumbFile.getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      }),
      file.getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      }),
    ]);
    functions.logger.log("Got Signed URLs.");
    const thumbResult = results[0];
    const originalResult = results[1];
    const thumbFileUrl = thumbResult[0];
    const fileUrl = originalResult[0];
    // Add the URLs to the Database
    await admin
      .database()
      .ref("images")
      .push({ path: fileUrl, thumbnail: thumbFileUrl });
    return functions.logger.log("Thumbnail URLs saved to database.");
  });
