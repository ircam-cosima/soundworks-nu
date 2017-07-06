/**
 * NuGroup: Nu module to assign audio tracks to groups of players. 
 * the term "group" hereafter is to be intepreted as "track" more often than not
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/client';

const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuGroups extends NuBaseModule {
  constructor(playerExperience) {
    super(playerExperience, 'nuGroups');

    // local attributes
    this.groupMap = new Map();
    this.localGain = audioContext.createGain();
    this.localGain.gain.value = 1.0;
    this.localGain.connect( this.e.nuOutput.in );

    // binding
    this.onOff = this.onOff.bind(this);
    this.volume = this.volume.bind(this);
    this.localVolume = this.localVolume.bind(this);
    this.linkPlayerToGroup = this.linkPlayerToGroup.bind(this);
    this.loop = this.loop.bind(this);
    this.getGroup = this.getGroup.bind(this);
  }

  paramCallback(name, args){
    // either route to internal function
    if( this[name] !== undefined )
      if( args.length == 2 ) this[name](args[0], args[1]);
      else this[name](args);
    // or to this.params value
    else
      this.params[name] = args;
  }

  onOff(groupId, value) {

    // get group
    let group = this.getGroup( groupId );

    // stop group (src)
    if( value === 0 ){
        // stop source 
        group.src.stop(0);
        // notify renderer we don't need it anymore
        this.e.renderer.disable();
      }

    // start group (src)
    else{
      // get time delay since order to start has been given
      let timeOffset = this.e.scheduler.syncTime - value;
      // modulo buffer length for slow / late connected players 
      timeOffset %= group.src.buffer.duration;
      // make sure timeOffset is positive (if e.g. player not yet perfectly sync.)
      timeOffset = Math.max(timeOffset, 0.0);
      // start source at group time
      group.src.start(audioContext.currentTime, timeOffset);
      // remember start time
      group.startTime = value;
      // enable render
      this.e.renderer.enable();
    }      
  }

  // TODO: a player not in a group shouldn't play its sound as happends now with above on/off
  // function. Rather, only when both on/off and linked are ok should player start to play.
  // this would require a sync. mechanism with groups already started when linked to player.

  // set player to group (track) volume
  linkPlayerToGroup(groupId, value){
    // get group
    let group = this.getGroup( groupId );
    // apply value
    group.linkGain.gain.value = value;
  }

  // set group volume
  volume(groupId, value){
    // get group
    let group = this.getGroup( groupId );
    // set group value
    group.gain.gain.value = value;
  }

  // set player volume (for all its tracks) groupId is dummy here, for uniform inputs wrt other methods
  localVolume(groupId, value){
    // set local value
    this.localGain.gain.value = value;
  }

  // stop all currently playing groups
  clear(){
    // loop over groups
    this.groupMap.forEach( (group) => {
      // stop source 
      group.src.stop(0);
      // notify renderer we don't need it anymore
      this.e.renderer.disable();
    });
    // reset local map
    this.groupMap = new Map();
  }

  // set group time
  time(groupId, value){
    console.log('time function not implemented yet (in NuGroup.js)');
  }

  // enable / disable group loop
  loop(groupId, value){
    // get group
    let group = this.getGroup( groupId );
    // set group value
    group.src.loop = value;
  }

  // get group based on id, create if need be
  getGroup(groupId) {
    // get already existing group
    if( this.groupMap.has(groupId) )
      return this.groupMap.get(groupId);

    // check if audio buffer associated to group exists
    let buffer = this.e.loader.data[groupId];
    if (buffer === undefined) {
      console.warn('required audio file id', groupId, 'not in client index, actual content:', this.e.loader.options.files, '-> initializing empty audio source..');
      buffer = audioContext.createBuffer(1, 22050, 44100);
    }

    // create new group
    let group = { time: 0, startTime: 0 };

    // create new audio source 
    group.src = new AudioSourceNode(buffer);

    // create group gain
    group.gain = audioContext.createGain();
    group.gain.gain.value = 1.0;

    // create group-player link gain
    group.linkGain = audioContext.createGain();
    group.linkGain.gain.value = 1.0;    

    // connect graph
    group.src.out.connect(group.gain);
    group.gain.connect(group.linkGain);
    group.linkGain.connect(this.localGain);

    // store new group in local map
    this.groupMap.set(groupId, group);

    // return created group
    return group;
  }

  // ramp gain node to "targetValue" in fadeTime secs
  fadeGainTo(gainNode, targetValue, fadeTime){
    // reset eventual planned changes
    gainNode.gain.cancelScheduledValues(audioContext.currentTime);
    if( fadeTime > 0 ){
      // let currentValue = gainNode.gain.value;
      gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(targetValue, audioContext.currentTime + fadeTime);
      // console.log('fade in / out from', gainNode.gain.value, 'to', targetValue, 'in', fadeTime, 'sec');
    }
    else{
      gainNode.gain.setValueAtTime(targetValue, audioContext.currentTime);
    }
  }

}

// "surcharged" audio source node class
class AudioSourceNode {
  constructor(buffer){
    // local gain
    this.out = audioContext.createGain();
    this.out.gain.value = 1.0;
    // locals
    this.buffer = buffer;
    this.src = this.getNewSource();
    this._loop = 0;

  }
  // start audio source at time, with time offset
  start(time = 0, offset = 0){
    // stop eventual old source
    this.stop(0);
    // create new source
    this.src = this.getNewSource();
    // start source
    this.src.start(time, offset);
  }

  // stop source (doesn't crash if source already stopped)
  stop(time = 0){
    try{
      this.src.stop(time);
    }
    catch(e){
      if( e.name !== 'InvalidStateError'){ console.error(e); }
    }
  }

  // set source loop
  set loop(value){
    this._loop = value;
    this.src.loop = value;
  }

  // ...
  get loop(){
    return this._loop;
  }

  // create new audio source node
  getNewSource(){
    // create source
    let src = audioContext.createBufferSource();
    // fill in buffer
    src.buffer = this.buffer;
    // set src attributes
    src.loop = this._loop;
    // connect graph
    src.connect(this.out);
    return src;
  }
}




