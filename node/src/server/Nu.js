/**
 * Nu: Simple wrapper to export all Nu modules
 **/

export { default as Display } from './NuDisplay';
export { default as Output } from './NuOutput';
export { default as Groups } from './NuGroups';
export { default as RoomReverb } from './NuRoomReverb';
export { default as Path } from './NuPath';
export { default as Loop } from './NuLoop';
export { default as Template } from './NuTemplate';
export { default as Grain } from './NuGrain';
export { default as Probe } from './NuProbe';
export { default as Synth } from './NuSynth';
export { default as Stream } from './NuStream';
export { default as Main } from './NuMain';
export { default as Score } from './NuScore';

// ------------------------------------------------------------
// UTILS
// ------------------------------------------------------------

// convert "stringified numbers" (e.g. '10.100') element of arayIn to Numbers
Array.prototype.numberify = function() {
	this.forEach( (elmt, index) => {
	if( !isNaN(elmt) ) 
    	this[index] = Number(this[index]);
    });
    return this;
};