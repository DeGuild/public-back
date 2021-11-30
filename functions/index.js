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

const skillCertificatePlusABI =
  require("./contracts/SkillCertificates/V2/ISkillCertificate+.sol/ISkillCertificatePlus.json").abi;
const deGuildPlusABI =
  require("./contracts/DeGuild/V2/IDeGuild+.sol/IDeGuildPlus.json").abi;
const magicScrollsPlusABI =
  require("./contracts/MagicShop/V2/IMagicScrolls+.sol/IMagicScrollsPlus.json").abi;
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

const mkdirp = require("mkdirp");
const spawn = require("child-process-promise").spawn;
const path = require("path");
const os = require("os");
const fs = require("fs");

const THUMB_MAX_HEIGHT = 200;
const THUMB_MAX_WIDTH = 200;
// Thumbnail prefix added to file names.
const THUMB_PREFIX = "thumb_";
const API_PREFIX = "api";

const readCertificate = async (req, res) => {
  // Grab the text parameter.
  const address = req.params.address;
  const tokenId = req.params.tokenId;

  const readResult = await admin
    .firestore()
    .collection(`Certificate/${address}/tokens`)
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
      message: "Certificate not found!",
    });
  }
};

const allGuildCertificates = async (req, res) => {
  // Grab the text parameter.
  const readResult = await admin.firestore().collection(`Certificate`).get();
  // Send back a message that we've successfully written the message3
  functions.logger.log(readResult.docs);
  readResult.docs.forEach((doc) => {
    functions.logger.log(doc.id);
  });

  const allSkills = await Promise.all(
    readResult.docs.map(async (doc) => {
      let data = [];
      const snapshot = await admin
        .firestore()
        .collection(`Certificate/${doc.id}/tokens`)
        .orderBy("tokenId", "asc")
        .get();
      snapshot.forEach((doc) => {
        data.push(doc.data());
      });
      return data.sort();
    })
  );
  res.json(allSkills);
};

const allGuildCertificatesQueryWeb3 = async (req, res) => {
  const web3 = createAlchemyWeb3(functions.config().web3.api);

  // Grab the text parameter.
  const readResult = await admin.firestore().collection(`Certificate`).get();
  const qSkill = req.params.skillName;
  // Send back a message that we've successfully written the message3
  functions.logger.log(readResult.docs);
  readResult.docs.forEach((doc) => {
    functions.logger.log(doc.id);
  });

  let allSkills;
  if (qSkill) {
    allSkills = await Promise.all(
      readResult.docs.map(async (doc) => {
        let data = [];
        const snapshot = await admin
          .firestore()
          .collection(`Certificate/${doc.id}/tokens`)
          .orderBy("title", "asc")
          .where("title", ">=", qSkill)
          .get();
        snapshot.forEach((doc) => {
          data.push(doc.data());
        });
        return data.sort();
      })
    );
  } else {
    allSkills = await Promise.all(
      readResult.docs.map(async (doc) => {
        let data = [];
        const snapshot = await admin
          .firestore()
          .collection(`Certificate/${doc.id}/tokens`)
          .orderBy("tokenId", "asc")
          .get();
        snapshot.forEach((doc) => {
          data.push(doc.data());
        });
        return data.sort();
      })
    );
  }

  const allSkillsFlatten = [].concat.apply(...allSkills);
  function thumbThis(url) {
    // console.log(url);

    const original = url.slice(0, 125);
    const file = url.slice(125);
    // console.log(`${original}thumb_${file}`);
    return `${original}thumb_${file}`;
  }
  functions.logger.log(allSkillsFlatten);

  const mergedSkills = await Promise.all(
    allSkillsFlatten.map(async (ele) => {
      const manager = new web3.eth.Contract(
        skillCertificatePlusABI,
        ele.address
      );
      const caller = await manager.methods.shop().call();
      const shop = new web3.eth.Contract(magicScrollsPlusABI, caller);
      const shopCaller = await shop.methods.name().call();
      return {
        name: ele.title,
        image: thumbThis(ele.url),
        address: ele.address,
        tokenId: ele.tokenId,
        shopName: shopCaller,
        added: false,
      };
    })
  );
  res.json(mergedSkills);
};

const allCertificates = async (req, res) => {
  // Grab the text parameter.
  const address = req.params.address;
  const tokenId = parseInt(req.params.tokenId, 10);
  const direction = req.params.direction;

  let data = [];
  if (direction === "next") {
    const startAtSnapshot = admin
      .firestore()
      .collection(`Certificate/${address}/tokens`)
      .orderBy("tokenId", "asc")
      .startAfter(tokenId);

    const items = await startAtSnapshot.limit(24).get();
    items.forEach((doc) => {
      data.push(doc.data());
    });
  } else if (direction === "previous") {
    const startAtSnapshot = admin
      .firestore()
      .collection(`Certificate/${address}/tokens`)
      .orderBy("tokenId", "desc")
      .startAfter(tokenId);

    const items = await startAtSnapshot.limit(24).get();
    items.forEach((doc) => {
      data.push(doc.data());
    });
  } else {
    const readResult = await admin
      .firestore()
      .collection(`Certificate/${address}/tokens`)
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

const allCertificatesWeb3 = async (req, res) => {
  const web3 = createAlchemyWeb3(functions.config().web3.api);
  const addressUser = req.params.addressU;
  const page = req.params.page;

  const certCollection = await admin
    .firestore()
    .collection(`Certificate`)
    .get();
  const everyCertificateAddress = certCollection.docs.map((doc) => doc.id);
  const events = await Promise.all(
    everyCertificateAddress.map(async (address) => {
      const certificateManager = new web3.eth.Contract(
        skillCertificatePlusABI,
        address
      );
      const mintedCertificates = await certificateManager.getPastEvents(
        "CertificateMinted",
        {
          filter: { student: addressUser },
          fromBlock: 0,
          toBlock: "latest",
        }
      );
      return mintedCertificates.map((ele) => {
        return { address, token: ele.returnValues };
      });
    })
  );
  functions.logger.log(events);
  const userCertificates = [].concat.apply([], events);
  functions.logger.log(userCertificates);

  const verifedEvents = await Promise.all(
    userCertificates.map(async (ele) => {
      const certificateManager = new web3.eth.Contract(
        skillCertificatePlusABI,
        ele.address
      );
      const verification = await certificateManager.methods.verify(
        ele.token.student,
        ele.token.typeId
      );
      return { verification, address: ele.address, token: ele.token };
    })
  );

  const userVerifiedCertificates = verifedEvents.filter(
    (obj) => obj.verification
  );

  // from the block when the contract is deployed
  functions.logger.log(userVerifiedCertificates);
  let slicedSkills;
  if (page * 8 < userVerifiedCertificates.length) {
    slicedSkills = userVerifiedCertificates.slice(page * 8, (page + 1) * 8);
  } else {
    res.status(404).json({
      message: "Out of page",
    });
    return;
  }

  const userPage = await Promise.all(
    slicedSkills.map(async (ele) => {
      const readResult = await admin
        .firestore()
        .collection(`Certificate/${ele.address}/tokens`)
        .doc(ele.token.typeId)
        .get();
      return readResult.data();
    })
  );
  functions.logger.log(userPage);

  //pull data to scrolls

  //fit data offchain to onchain

  res.json(userPage);
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

const pageMagicScrollsWeb3 = async (req, res) => {
  // Grab the text parameter.
  const web3 = createAlchemyWeb3(functions.config().web3.api);
  const addressMagicShop = req.params.addressM;
  const addressUser = req.params.addressU;
  const page = req.params.page;

  const magicShop = new web3.eth.Contract(
    magicScrollsPlusABI,
    addressMagicShop
  );

  // from the block when the contract is deployed
  const scrollsTypes = await magicShop.getPastEvents("ScrollAdded", {
    fromBlock: 0,
    toBlock: "latest",
  });

  functions.logger.log(scrollsTypes);
  let slicedTypes;
  if (page * 8 < scrollsTypes.length) {
    slicedTypes = scrollsTypes.slice(page * 8, (page + 1) * 8);
  } else {
    res.status(404).json({
      message: "Out of page",
    });
    return;
  }
  functions.logger.log(slicedTypes);

  //pull data to scrolls
  const scrollsTypesCombined = await Promise.all(
    slicedTypes.map(async (event) => {
      try {
        const isPurchasable = await magicShop.methods
          .isPurchasableScroll(event.returnValues.scrollType, addressUser)
          .call();
        const info = await magicShop.methods
          .scrollTypeInfo(event.returnValues.scrollType)
          .call();

        const fromDb = await admin
          .firestore()
          .collection(`MagicShop/${addressMagicShop}/tokens`)
          .doc(event.returnValues.scrollType)
          .get();

        const offChain = fromDb ? fromDb.data() : {};

        const token = {
          tokenId: event.returnValues.scrollType,
          url: offChain.url,
          name: offChain.name,
          courseId: offChain.courseId,
          description: offChain.description,
          isPurchasable,
          price: web3.utils.fromWei(info[1], "ether"),
          prerequisiteId: info[2],
          prerequisite: info[3],
          hasLesson: info[4],
          hasPrerequisite: info[5],
          available: info[6],
        };
        return token;
      } catch (err) {
        return null;
      }
    })
  );
  functions.logger.log(scrollsTypesCombined);
  //fit data offchain to onchain

  res.json(scrollsTypesCombined);
};
const pageMagicScrollsWeb3Inventory = async (req, res) => {
  // Grab the text parameter.
  const web3 = createAlchemyWeb3(functions.config().web3.api);
  const addressMagicShop = req.params.addressM;
  const addressUser = req.params.addressU;
  const page = req.params.page;

  const magicShop = new web3.eth.Contract(
    magicScrollsPlusABI,
    addressMagicShop
  );

  const consumed = await magicShop.getPastEvents("ScrollConsumed", {
    fromBlock: 0,
    toBlock: "latest",
  });

  const burned = await magicShop.getPastEvents("ScrollBurned", {
    fromBlock: 0,
    toBlock: "latest",
  });
  functions.logger.log("c", consumed);
  functions.logger.log("b", burned);

  // from the block when the contract is deployed
  const scrollsEvent = await magicShop.getPastEvents("ScrollBought", {
    filter: { buyer: addressUser },
    fromBlock: 0,
    toBlock: "latest",
  });

  functions.logger.log(scrollsEvent);
  let slicedEvents;
  if (page * 8 < scrollsEvent.length) {
    slicedEvents = scrollsEvent.slice(page * 8, (page + 1) * 8);
  } else {
    res.status(404).json({
      message: "Out of page",
    });
    return;
  }
  functions.logger.log(slicedEvents);

  //pull data to scrolls
  const scrollsCombined = await Promise.all(
    slicedEvents.map(async (event) => {
      try {
        const isPurchasable = await magicShop.methods
          .isPurchasableScroll(event.returnValues.scrollType, addressUser)
          .call();
        const info = await magicShop.methods
          .scrollTypeInfo(event.returnValues.scrollType)
          .call();

        const fromDb = await admin
          .firestore()
          .collection(`MagicShop/${addressMagicShop}/tokens`)
          .doc(event.returnValues.scrollType)
          .get();

        const isConsume = consumed.filter(
          (ele) => ele.returnValues.scrollId === event.returnValues.scrollId
        );
        const isBurned = burned.filter(
          (ele) => ele.returnValues.scrollId === event.returnValues.scrollId
        );
        let state = 1;
        if (isConsume.length > 0) {
          state = 2;
        }
        if (isBurned.length > 0) {
          state = 3;
        }
        const offChain = fromDb ? fromDb.data() : {};

        const token = {
          tokenId: event.returnValues.scrollId,
          url: offChain.url,
          name: offChain.name,
          courseId: offChain.courseId,
          description: offChain.description,
          isPurchasable,
          state,
          price: web3.utils.fromWei(info[1], "ether"),
          prerequisiteId: info[2],
          prerequisite: info[3],
          hasLesson: info[4],
          hasPrerequisite: info[5],
          available: info[6],
        };
        return token;
      } catch (err) {
        return null;
      }
    })
  );
  functions.logger.log(scrollsCombined);
  //fit data offchain to onchain

  res.json(scrollsCombined);
};
const allMagicScrollsWeb3 = async (req, res) => {
  // Grab the text parameter.
  const web3 = createAlchemyWeb3(functions.config().web3.api);
  const addressMagicShop = req.params.addressM;

  const magicShop = new web3.eth.Contract(
    magicScrollsPlusABI,
    addressMagicShop
  );

  // from the block when the contract is deployed
  const scrollsTypes = await magicShop.getPastEvents("ScrollAdded", {
    fromBlock: 0,
    toBlock: "latest",
  });
  functions.logger.log(scrollsTypes);

  //pull data to scrolls
  const scrollsTypesCombined = await Promise.all(
    scrollsTypes.map(async (event) => {
      try {
        const fromDb = await admin
          .firestore()
          .collection(`MagicShop/${addressMagicShop}/tokens`)
          .doc(event.returnValues.scrollType)
          .get();

        const offChain = fromDb ? fromDb.data() : {};

        const token = {
          tokenId: event.returnValues.scrollType,
          url: offChain.url,
          name: offChain.name,
          courseId: offChain.courseId,
          description: offChain.description,
        };
        return token;
      } catch (err) {
        return null;
      }
    })
  );
  functions.logger.log("i should return?", scrollsTypesCombined);
  //fit data offchain to onchain

  res.json(scrollsTypesCombined);
};

const getAllCM = async (req, res) => {
  // Grab the text parameter.
  const web3 = createAlchemyWeb3(functions.config().web3.api);

  const addressShop = req.params.addressM;
  const magicShop = new web3.eth.Contract(magicScrollsPlusABI, addressShop);

  // from the block when the contract is deployed
  const events = await magicShop.getPastEvents("ApprovalForCM", {
    fromBlock: 0,
    toBlock: "latest",
  });

  functions.logger.log("i should return?", events);

  const certificateManager = events.map((event) => event.returnValues.account);

  if (certificateManager.length > 0) {
    res.json(certificateManager);
  } else {
    res.status(404).json({
      message: `${addressShop} has no approved manager!`,
    });
  }
};
const allCourses = async (req, res) => {
  // Grab the text parameter.
  const web3 = createAlchemyWeb3(functions.config().web3.api);

  const readResult = await admin.firestore().collection(`Certificate`).get();
  // Send back a message that we've successfully written the message3
  readResult.docs.forEach((doc) => {
    functions.logger.log(doc.id);
  });

  const allSkills = await Promise.all(
    readResult.docs.map(async (doc) => {
      let data = [];
      const snapshot = await admin
        .firestore()
        .collection(`Certificate/${doc.id}/tokens`)
        .orderBy("tokenId", "asc")
        .get();
      snapshot.forEach((doc) => {
        data.push(doc.data());
      });
      return data.sort();
    })
  );
  const courses = [].concat.apply([], allSkills);
  functions.logger.log("courses", courses);

  const coursesWithType = await Promise.all(
    courses.map(async (course) => {
      const obj = course;
      const certificateManager = new web3.eth.Contract(
        skillCertificatePlusABI,
        obj.address
      );
      const typeAccepted = await certificateManager.methods
        .typeAccepted(obj.tokenId.toString())
        .call();
      obj.typeAccepted = typeAccepted;
      return obj;
    })
  );

  res.json(coursesWithType);
};
const readJob = async (req, res) => {
  const address = req.params.address;
  const tokenId = req.params.tokenId;
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

const fetchSkills = async (addresses, tokenIds) => {
  const skillsOnChain = [];
  for (let index = 0; index < addresses.length; index += 1) {
    const address = addresses[index];
    tokenIds[index].forEach((id) => skillsOnChain.push([address, id]));
  }
  const displayableSkills = await Promise.all(
    skillsOnChain.map(async (pair) => {
      const manager = new web3.eth.Contract(skillCertificatePlusABI, pair[0]);
      const URI = await manager.methods.tokenURI(pair[1]).call();
      const response = await fetch(URI, { mode: "cors" });
      const caller = await manager.methods.shop().call();
      const shop = new web3.eth.Contract(magicScrollsPlusABI, caller);
      const shopCaller = await shop.methods.name().call();
      const data = await response.json();

      return {
        name: data.title,
        image: `${data.url.slice(0, 125)}thumb_${data.url.slice(125)}`,
        address: data.address,
        tokenId: data.tokenId,
        shopName: shopCaller,
        added: false,
      };
    })
  );

  return displayableSkills;
};
const idToJobs = async (deGuildAddress, jobId, blockNumber, jobName) => {
  try {
    const readResult = await admin
      .firestore()
      .collection(`DeGuild/${deGuildAddress}/tokens`)
      .doc(jobId)
      .get();
    if (!readResult.data()) {
      return {};
    }
    const infoOffChain = readResult.data();

    const deGuild = new web3.eth.Contract(deGuildPlusABI, deGuildAddress);
    const infoOnChain = await deGuild.methods.jobInfo(jobId).call();

    const skillsFetched = await fetchSkills(infoOnChain[3], infoOnChain[4]);
    const block = await web3.eth.getBlock(blockNumber);

    const readResult2 = await admin
      .firestore()
      .collection(`User`)
      .doc(userAddress)
      .get();

    let info = {
      name: "Unknown",
      url: noImg,
    };
    if (readResult2.data()) {
      info = readResult2.data();
      info.url = `${info.url.slice(0, 125)}thumb_${info.url.slice(125)}`;
    }
    const { timestamp } = block;
    const deadline = new Date(timestamp * 1000);
    deadline.setDate(deadline.getDate() + infoOffChain.time);

    const jobObject = {
      id: tokenId,
      time: infoOffChain.time,
      reward: web3.utils.fromWei(infoOnChain[0]),
      client: infoOnChain[1],
      clientName: info.name,
      taker: infoOnChain[2],
      skills: skillsFetched,
      state: parseInt(infoOnChain[5], 10),
      difficulty: infoOnChain[6],
      level: parseInt(infoOffChain.level, 10),
      image: info.url,
      title: infoOffChain.title,
      note: infoOffChain.note,
      submission: infoOffChain.submission,
      description: infoOffChain.description,
      submitted: infoOffChain.submission.length > 0,
      deadline,
      status:
        infoOffChain.submission.length > 0 ? "Submitted" : "No submission",
    };

    return jobObject;
  } catch (err) {
    return {};
  }
};

const postedJob = async (req, res) => {
  const web3 = createAlchemyWeb3(functions.config().web3.api);

  const deGuildAddress = req.params.addressD;
  const userAddress = req.params.addressU;
  const pageIdx = req.params.pageIdx;
  const sortWith = req.params.sortWith;
  const order = req.params.order;
  const jobName = req.params.jobName;
  let jobs = [];
  const deGuild = new web3.eth.Contract(deGuildPlusABI, deGuildAddress);

  const caller = await deGuild.getPastEvents("JobAdded", {
    filter: { client: userAddress },
    fromBlock: 0,
    toBlock: "latest",
  });
  // console.log(caller);idToJob(ele.returnValues[0], ele.blockNumber)
  const history = await Promise.all(
    caller.map(async (ele) => {
      const job = await idToJobs(
        deGuildAddress,
        ele.returnValues[0],
        ele.blockNumber,
        jobName
      );
      return job;
    })
  );

  jobs = history.filter((job) => job.title);
  let slicedEvents;
  if (pageIdx * 8 < jobs.length) {
    slicedEvents = jobs.slice(pageIdx * 8, (pageIdx + 1) * 8);
  } else {
    res.status(404).json({
      message: "Out of page",
    });
    return;
  }
  functions.logger.log(slicedEvents);

  if (order === "asc") {
    jobs = jobs.sort((a, b) =>
      parseInt(a[sortWith], 10) > parseInt(b[sortWith], 10) ? 1 : -1
    );
  } else {
    jobs = jobs.sort((a, b) =>
      parseInt(a[sortWith], 10) < parseInt(b[sortWith], 10) ? 1 : -1
    );
  }

  res.json(jobs);
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

const shareCertificate = async (req, res) => {
  const web3 = createAlchemyWeb3(functions.config().web3.api);
  const addressCertificate = req.params.addressC;
  const addressUser = req.params.addressU;
  const tokenType = req.params.tokenType;

  const manager = new web3.eth.Contract(
    skillCertificatePlusABI,
    addressCertificate
  );

  try {
    const caller = await manager.methods.verify(addressUser, tokenType).call();
    const name = await manager.methods.name().call();

    const readResult = await admin
      .firestore()
      .collection(`Certificate/${addressCertificate}/tokens`)
      .doc(tokenType)
      .get();
    const readData = readResult.data();

    let title;
    let image;
    if (caller) {
      image = readData.url;
      title = `${readData.title} by ${name}`;
    } else {
      image =
        "https://firebasestorage.googleapis.com/v0/b/deguild-2021.appspot.com/o/images%2FChecked_03.png?alt=media&token=8c1448ae-0a42-4804-8dea-1bbd865a184a";
      title = "NOT VERIFIED";
    }

    functions.logger.log(caller);
    functions.logger.log(readData);
    res.status(200).send(`<!doctype html>
    <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width,initial-scale=1.0">

      <link rel="icon" href="https://certificate-manager.web.app/certificate-icon.png">
      <title> Reveal the amazing certificate I have! </title>

      <!-- Facebook, Whatsapp -->
      <meta property="og:site_name" content="Certificate Sharing Site">
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="Certificate Sharing Site by DeGuild">
      <meta property="og:image" content="${image}">
      <meta property="og:url" content="https://certificate-manager.web.app/">

      <!-- Twitter -->
      <meta name="twitter:title" content="${title}">
      <meta name="twitter:description" content="Certificate Sharing Site by DeGuild">
      <meta name="twitter:image" content="${image}">
      <meta property="twitter:url" content="https://certificate-manager.web.app/">
      <meta name="twitter:card" content="summary_large_image">
    </head>
    <body>
      <script>
      setTimeout(function(){
        window.location.href = 'https://certificate-manager.web.app/sharing/${addressCertificate}/${addressUser}/${tokenType}';}, 1000);
      </script>
    <p>Web page redirects after 1 seconds.</p>
    </body>
  </html>`);
  } catch (error) {
    functions.logger.error("Error while verifying with web3", error);
    res.status(500).json({
      message: "ERROR",
    });
  }
};

app.use((req, res, next) => {
  if (req.url.indexOf(`/${API_PREFIX}/`) === 0) {
    req.url = req.url.substring(API_PREFIX.length + 1);
  }
  next();
});
app.use(cors);

app.get("/readCertificate/:address/:tokenId", readCertificate);
app.get("/readMagicScroll/:address/:tokenId", readMagicScroll);
app.get("/readJob/:address/:tokenId", readJob);
app.get("/readProfile/:address", readProfile);

//old
app.get("/allCertificates/:address/:tokenId/:direction", allCertificates);
app.get("/allCertificates/:address", allCertificates);
app.get("/allCertificates", allGuildCertificates);

//old, but good
app.get("/shareCertificate/:addressC/:addressU/:tokenType", shareCertificate);

//new
app.get("/certificates/:addressU/:page", allCertificatesWeb3);

//Old
app.get("/allMagicScrolls/:address/:tokenId/:direction", allMagicScrolls);
app.get("/allMagicScrolls/:address", allMagicScrolls);

//New
app.get("/magicScrolls/:addressM/:addressU/:page", pageMagicScrollsWeb3);
app.get("/magicScrolls/:addressM", allMagicScrollsWeb3);
app.get(
  "/magicScrolls/inventory/:addressM/:addressU/:page",
  pageMagicScrollsWeb3Inventory
);
app.get("/manager/:addressM", getAllCM);
app.get("/courses", allCourses);

//old
app.get("/allJobs/:address/:tokenId/:direction", allJobs);
app.get("/allJobs/:address/", allJobs);

app.get("/guildCertificates/:skillName", allGuildCertificatesQueryWeb3);
app.get("/guildCertificates", allGuildCertificatesQueryWeb3);

// TODO: Work on these
app.get(
  "/postedJobs/:addressD/:addressU/:pageIdx/:sortWith/:order/:jobName",
  postedJob
);
app.get("/postedJobs/:address/:addressU/:pageIdx/:sortWith/:sorted", postedJob);
// app.get("/jobs/:address/:addressU", allJobsWeb3);

// app.get("/jobs/:address/:addressU", allJobsWeb3);
// app.get("/jobs/:address/:addressU/:title", allJobsWeb3);

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
      "Cache-Control": "public,max-age=3600",
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
      .firestore()
      .collection(`images/`)
      .doc(fileUrl)
      .set({ thumbnail: thumbFileUrl });

    return functions.logger.log("Thumbnail URLs saved to database.");
  });

exports.removeDownloadToken = functions.storage
  .object()
  .onFinalize(async (object) => {
    const bucket = admin.storage().bucket(object.bucket);
    const contentType = object.contentType; // This is the image MIME type

    if (!contentType.startsWith("application/")) {
      return functions.logger.log("This is a zipfile.");
    }
    await bucket.file(object.name).setMetadata({
      // Metadata is merged, so this won't delete other existing metadata
      metadata: {
        // Delete the download token
        firebaseStorageDownloadTokens: null,
      },
    });

    return functions.logger.log("Metadata removed.", object.name);
  });
