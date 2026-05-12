export let barracks_currentCollectionId = null;
export let barracks_currentBarracksId = null;
export let barracks_currentLocationId = null;
export let barracks_allBarracks = [];
export let barracks_locations = [];
export let barracks_unassignedSchools = [];
export let barracks_assignedSchools = [];

export function setCurrentCollectionId(id) { barracks_currentCollectionId = id; }
export function setCurrentBarracksId(id) { barracks_currentBarracksId = id; }
export function setCurrentLocationId(id) { barracks_currentLocationId = id; }
export function setAllBarracks(list) { barracks_allBarracks = list; }
export function setLocations(list) { barracks_locations = list; }
export function setUnassignedSchools(list) { barracks_unassignedSchools = list; }
export function setAssignedSchools(list) { barracks_assignedSchools = list; }