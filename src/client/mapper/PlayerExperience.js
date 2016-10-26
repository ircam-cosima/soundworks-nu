import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';

const client = soundworks.client;
const SpaceView = soundworks.SpaceView;
const ButtonView = soundworks.ButtonView;
const View = soundworks.View;

const viewTemplate = `
  <div class="background fit-container">
    
    <div class="backgroundMap section-top fit-container-half-top">
    </div>

    <div class="section-top fit-container-half-top">
      <div class="backgroundBtn section-top fit-container-half-top"> 
      </div>
    </div>

  </div>

  <div class="foreground background-mapper">
    <div class="backgroundMap fit-container-half-top">
      <div class="section-top flex-middle"> 
        <p class="big"> Woodland Map </p> 
        <br> 
      </div>
  
      <div class="section-middle flex-middle">
        <p class="small"> Room Dimension: &ensp; <%= roomWidth %> x <%= roomHeight %> m<sup>2</sup> </p>
      </div>



    </div>
  </div>
`;

const defaultTemplate = `
<% definitions.forEach(function(def, index) { %>
   <button class="btn <%= def.state %>"
           data-index="<%= index %>"
           <%= def.state === 'disabled' ? 'disabled' : '' %>
   >
     <%= convertName(def.label) %>
   </button>
 <% }); %>
`;

// Room viewer of the Woodland experience
export default class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain, audioFiles) {
    super();

    // services 
    // this.platform = this.require('platform', { features: ['web-audio'] });
    this.sharedConfig = this.require('shared-config');
    this.params = this.require('shared-params');

    // local attributes
    this.pointsMap = new Map();
    this.audioFiles = audioFiles;
    this.currentAudioFileId = 0;

    // binding
    this.updateRoom = this.updateRoom.bind(this);
    this.setEmitterPosition = this.setEmitterPosition.bind(this);
  }

  init() {
    
    this.area = this.sharedConfig.get('setup.area');

    // initialize the view
    this.viewTemplate = viewTemplate;
    this.viewContent = { roomWidth: this.area.width, roomHeight: this.area.height };
    this.viewCtor = View;
    this.viewOptions = { preservePixelRatio: true };
    this.view = this.createView();

    // create a background `SpaceView` to display players positions and add it to view
    // this.playersSpace = new SpaceView();
    // this.playersSpace.setArea(this.area);
    // this.view.setViewComponent('.backgroundMap', this.playersSpace);

    // create options select button
    let buttonList = []
    this.audioFiles.forEach((item, index) => { buttonList.push({ label: item.split('sounds/').pop() }) });
    // const buttonList = [{label:'Sound 1'}, {label:'Sound 2'}, {label:'Sound 3'}];
    this.playerButton = new ButtonView( buttonList, (index, def) => {this.currentAudioFileId = index;}, null, {template: defaultTemplate, defaultState: 'unselected'} );
    console.log(this.playerButton.$el.style.height);
    this.view.setViewComponent('.backgroundBtn', this.playerButton);
    console.log(this.playerButton.$el.style.height);
    console.log(this.view);
  }

  start() {
    super.start();

    if (!this.hasStarted)
      this.init();

    this.show();

    // param listeners
    this.params.addParamListener('roomWidth', (value) => { this.area.width = value;  this.updateRoom(); });
    this.params.addParamListener('roomHeight', (value) => { this.area.height = value;  this.updateRoom(); });

    // create touch surface
    let point = { id: 999, x: 0, y: 0, radius:5, color:'#b8a03a'};
    this.playersSpace.addPoint(point);
    // const surface = new soundworks.TouchSurface(this.view.$el);
    const surface = new soundworks.TouchSurface(this.playersSpace.$svgContainer); //   to get normalized normX and normY in surce listener methods
    surface.addListener('touchstart', (id, normX, normY) => { this.setEmitterPosition(normX,normY); });
    surface.addListener('touchmove' , (id, normX, normY) => { this.setEmitterPosition(normX,normY); });
    
    surface.addListener('touchend'  , (id, normX, normY) => { 

      // get closest beacon to define as emitter
      let dist = Infinity; let emitterId = -1;
      this.pointsMap.forEach((item, key) => {
        let distTmp = Math.sqrt( Math.pow(item.x - normX * this.area.width, 2) + Math.pow(item.y - normY * this.area.height, 2) );
        if( distTmp < dist ){
          emitterId = key;
          dist = distTmp;
        } 
      });
      console.log('emitterId:', emitterId, 'dist', dist);
      if( emitterId > -1 ) this.send('playUp', emitterId, this.currentAudioFileId);

    });

    // msg callback: receive player positions
    this.receive('mapper:playerCoordinates', (data) => {
      
        let point = { id: data.index, x: data.xy[0], y: data.xy[1], radius:5 };
        // point here already, just need update
        if( this.pointsMap.has(data.index) )
            this.playersSpace.updatePoint(point);
        else // need to create point
          this.playersSpace.addPoint(point);
        // update / add point in local map
        this.pointsMap.set( point.id, point );        
    });

    // msg callback: receive player exit
    this.receive('mapper:playerRemoved', (index) => {
      this.pointsMap.delete( index );
      this.playersSpace.deletePoint( index );
    });
    
    // --------------------------------------------------------------------------------

  }

  updateRoom(){
    // TODO: viewn.render clean the spaceView, no more points after that
    // just have to reload the page for it to update though...
    console.log('update room', this.area);
    // update room dimensions
    this.playersSpace.setArea(this.area);
    this.view.content.roomWidth = this.area.width;
    this.view.content.roomHeight = this.area.height;
    this.view.render();
    
    // update players representation
    this.pointsMap.forEach( (item, key) => {
      this.playersSpace.updatePoint(item);
    });
  }

  setEmitterPosition(normX,normY){
    // console.log(this.view.viewportHeight, this.view.viewportWidth);
    let point = { id: 999, x: normX * this.area.width, y: normY * this.area.height };
    this.playersSpace.updatePoint(point);    
  }

}
