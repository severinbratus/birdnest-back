const axios = require('axios');
const _ = require('lodash');

const NDZ_CENTER_X = 250000;
const NDZ_CENTER_Y = 250000;

/**
 * Distance from the birdnest in meters, altitude not considered.
 */
const distanceFromNest = (droneEntry) => (
  Math.sqrt((droneEntry.positionX - NDZ_CENTER_X) ** 2 + (droneEntry.positionY - NDZ_CENTER_Y) ** 2) / 1000
)

const isViolating = (droneEntry) => (
  distanceFromNest(droneEntry) < 100
)

/**
 * Return true iff the drone entry timestamp is older than 10 minutes.
 */
const isStale = (droneEntry) => (
  new Date().getTime() - new Date(droneEntry.timestamp).getTime() > 10 * 60 * 1000
)

/**
 * Retrieve pilot details from the /pilots endpoint.
 */
const getPilot = async (serialNumber) => {
  const response = await axios.get(`http://assignments.reaktor.com/birdnest/pilots/${serialNumber}`);
  if (response.status === 200)
    return response.data;
  else
    return {};
}

/**
 * Take the minimal `minDistance` when merging drone entries.
 */
const mergeCustomizer = (objVal, srcVal, key) => {
  if (key === 'minDistance') {
    // Take the minimum
    if (objVal === undefined || objVal === null) return srcVal;
    return Math.min(objVal, srcVal);
  }
  // Default behaviour otherwise
  return undefined;
}

module.exports = { distanceFromNest, isViolating, isStale, getPilot, mergeCustomizer };
