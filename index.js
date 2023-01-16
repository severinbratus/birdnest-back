const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const xmljs = require('xml-js');
const axios = require('axios');
const _ = require('lodash');
const { distanceFromNest, isViolating, isStale, getPilot, mergeCustomizer } = require('./util')

const PORT = 8080;

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// The main reported state of the system is persisted in the main memory.
// (This could potentially be done with a database, e.g. a relational one)
// The state is indexed by the drone serial number.
// On each interval iteration, we query the drone API for the drone locations,
// then filter for drones within the 100-meter-radius no-fly zone (NDZ).
// We then update the current state by:
// 1. adding the drones currently in the NDZ to the state
//    (if a drone is already in the state, update the timestamp of the last violation *);
// 2. removing the drones with the timestamp older than 10 minutes.
//
// * in this case, we may also update the closest confirmed distance to the nest,
//   which is also stored in the state.
//
// There is a slight caveat: pilots may have multiple drones operated by them.
// I have decided to use track violations on drone serial number basis, not by pilot info,
// since this is the more extensible approach. For example, if we would like to visualize
// drone movement, then we would want to display *all* drones, regardless of whether or
// not multiple of them are operated by the same pilot.
//
// (Plus, sometimes the pilot info is inaccessible. In this case, we still better keep
// track of the violating drones)
//
// Why not a database:
// A reasonable estimate from observing the data is that at a point in time only about
// two drones violate the NDZ. If we assume these two drones are different every
// time, then by there will be at most 10 * 30 = 300 drones stored in the state.
// This amount of data should easily fit into the main memory of a web-server,
// so memory is not an issue.
// Of course, if the web-server execution may be interrupted, in which case 10 minutes
// of data would be lost. If the server is restarted right away, then for the first 10
// minutes the data will not be accurate.
// The assignment description says: "Develop the application as if it was always operational."
// so for the use-case using the main memory instead of a database should be OK.
//
// NOTE: I assume a pilot for a drone does not change.

let state = {};

const main = async () => {
  // Retrieve the XML from the drone API, convert it to JS, and clean the data a bit.
  const response = await axios.get('http://assignments.reaktor.com/birdnest/drones');
  const xmlData = response.data;
  const jsData = xmljs.xml2js(xmlData, { compact: true, nativeType: true });
  const currentDronesBySerial = _.keyBy(jsData.report.capture.drone.map(droneEntry => _.mapValues(droneEntry, '_text')),
                                'serialNumber');
  const timestamp = jsData.report.capture._attributes.snapshotTimestamp;

  // Filter for the drones currently violating the NDZ
  const violatingDronesBySerial = _.pickBy(currentDronesBySerial, isViolating);

  // Retrieve pilot contact info for the violating drones
  const violatingPilots = await Promise.all(_.chain(Object.keys(violatingDronesBySerial))
                                                    .map(key => getPilot(key))
                                                    .value())
  const currentViolatingPilotsBySerial = _.zipObject(Object.keys(violatingDronesBySerial), violatingPilots);

  // Add pilot info to drone data.
  _.merge(violatingDronesBySerial, currentViolatingPilotsBySerial);

  // Add distance to nest, and a timestamp
  _.merge(violatingDronesBySerial,
          _.mapValues(violatingDronesBySerial,
                      droneEntry => ({'minDistance': distanceFromNest(droneEntry),
                                      'timestamp': timestamp})));

  // Introduce current violations to the state.
  _.mergeWith(state, violatingDronesBySerial, mergeCustomizer);

  // Remove stale entries.
  state = _.omitBy(state, isStale);

  // Broadcast state to all sockets listening.
  io.emit('data', state)
}

setInterval(async () => {
  try {
    await main();
  } catch {
    return;
  }
}, 2000);

server.listen(PORT, () => {
  console.log('listening on *:5000');
});
