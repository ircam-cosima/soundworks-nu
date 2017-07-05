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
export { default as Probe } from './NuProbe';
export { default as Synth } from './NuSynth';
export { default as Stream } from './NuStream';
export { default as Main } from './NuMain';
export { default as Score } from './NuScore';

/** 
* the NuDisplay is a bit specific, not exposed as other modules
* but rather invoked directly in PlayerExperience
**/
// export { default as Display } from './NuDisplay';`


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

// couterpart of copyToChannel, without overwrite
AudioBuffer.prototype.addToChannel = function( source, channelNumber, startInChannel ){
  let chData = this.getChannelData( channelNumber );
  let l = source.length;

  for (let i = 0; i < l; i++){
    chData[startInChannel + i] += source[i];
  }
  return this;
}