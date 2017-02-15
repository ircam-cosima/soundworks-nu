/**
 * Nu: Simple wrapper to export all Nu modules
 **/

export { default as Output } from './NuOutput';
export { default as Groups } from './NuGroups';
export { default as RoomReverb } from './NuRoomReverb';
export { default as Path } from './NuPath';
export { default as Loop } from './NuLoop';
export { default as Template } from './NuTemplate';
export { default as Grain } from './NuGrain';
export { default as Spy } from './NuSpy';
export { default as Synth } from './NuSynth';
export { default as Stream } from './NuStream';

/** 
* the NuRenderer is a bit specific, not exposed as other modules
* but rather invoked directly in PlayerExperience
**/
// export { default as Renderer } from './NuRenderer';`


// ------------------------------------------------------------
// UTILS
// ------------------------------------------------------------

// fix for Safari that doesn't implement Float32Array.slice yet
if (!Float32Array.prototype.slice) {
  Float32Array.prototype.slice = function(begin, end) {
    var target = new Float32Array(end - begin);

    for (var i = 0; i < begin + end; ++i) {
      target[i] = this[begin + i];
    }
    return target;
  };
}