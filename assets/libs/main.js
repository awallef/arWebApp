(function(scope, $){

  // vars
  var settings= [
    {video:"assets/videos/eca1.mp4",pat:"markers/patt.hiro"},
    {video:"assets/videos/eca2.mp4",pat:"markers/marker-rocket.pat"}
  ];

  // array of functions for the rendering loop
  var onRenderFcts= [];

  // loop
  var lastTimeMsec= null;
  var launchRendering = function ()
  {
    requestAnimationFrame(function animate(nowMsec){
      // measure time
      lastTimeMsec	= lastTimeMsec || nowMsec-1000/60
      var deltaMsec	= Math.min(200, nowMsec - lastTimeMsec)
      lastTimeMsec	= nowMsec
      // call each update function
      onRenderFcts.forEach(function(onRenderFct){
        onRenderFct(deltaMsec/1000, nowMsec/1000)
      })
      // keep looping
      requestAnimationFrame( animate );
    });
  }

  //init renderer
  var renderer	= new THREE.WebGLRenderer({
    // antialias	: true,
    alpha: true
  });
  var initRenderer = function()
  {
    renderer.setClearColor(new THREE.Color('lightgrey'), 0)
    // renderer.setPixelRatio( 1/2 );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0px';
    renderer.domElement.style.left = '0px';
    document.getElementById('render-zone').appendChild( renderer.domElement );
  }


  // init scene and camera
  var scene	= new THREE.Scene();
  var camera = new THREE.Camera();

  //declare arToolkitSource (webcam,image,video)
  var arToolkitSource = new THREEx.ArToolkitSource({
    sourceType : 'webcam',
  })

  // create atToolkitContext
  var arToolkitContext = new THREEx.ArToolkitContext({
    cameraParametersUrl: THREEx.ArToolkitContext.baseURL + 'data/camera_para.dat',
    detectionMode: 'mono',
    maxDetectionRate: 30,
    canvasWidth: 80*3,
    canvasHeight: 60*3,
  })

  //handle resize
  function onResize(){
    arToolkitSource.onResize()
    arToolkitSource.copySizeTo(renderer.domElement)
    if( arToolkitContext.arController !== null ){
      arToolkitSource.copySizeTo(arToolkitContext.arController.canvas)
    }
  }

  //init ArToolkitSource
  var initSource = function()
  {
    arToolkitSource.init(function onReady(){
      onResize()
    })

    // handle resize
    window.addEventListener('resize', function(){
      onResize()
    })
  }

  //init ArToolkitContext
  var initContext = function()
  {
    // initialize it
    arToolkitContext.init(function onCompleted(){
      // copy projection matrix to camera
      camera.projectionMatrix.copy( arToolkitContext.getProjectionMatrix() );
    })

    // update artoolkit on every frame
    onRenderFcts.push(function(){
      if( arToolkitSource.ready === false )	return

      arToolkitContext.update( arToolkitSource.domElement )
    })
  }

  //add markers and videos on them
  var addObjects = function()
  {
    for (var i in settings)
    {
      var markerRoot = new THREE.Group;
      scene.add(markerRoot);
      var artoolkitMarker = new THREEx.ArMarkerControls(arToolkitContext, markerRoot, {
        type : 'pattern',
        patternUrl : THREEx.ArToolkitContext.baseURL + settings[i].pat
      })

      settings[i].mr = markerRoot;

      // build a smoothedControls
      var smoothedRoot = new THREE.Group()
      scene.add(smoothedRoot)
      settings[i].sc = new THREEx.ArSmoothedControls(smoothedRoot, {
        lerpPosition: 0.4,
        lerpQuaternion: 0.3,
        lerpScale: 1,
      })

      var image = document.createElement( 'canvas' );
      image.width = 1024;
      image.height = 512;

      var imageContext = image.getContext( '2d' );
      imageContext.fillStyle = '#000000';
      imageContext.fillRect( 1, 1, 1, 1 );

      settings[i].ica = imageContext;

      var texture = new THREE.Texture( image );

      settings[i].ta = texture;

      var material = new THREE.MeshBasicMaterial( { map: texture, overdraw: 0.5 } );

      var plane = new THREE.PlaneGeometry( 1, 1 );

      var mesh = new THREE.Mesh( plane, material );
      mesh.scale.x = 2;
      mesh.scale.y = 2;
      mesh.position.x	+= plane.parameters.width/2.5;
      mesh.position.z	+= plane.parameters.height/4;
      mesh.rotation.x = Math.PI / 2;
      mesh.rotation.y = Math.PI;
      mesh.rotation.z = Math.PI;
      smoothedRoot.add(mesh);
    }


    onRenderFcts.push(function(delta){
      for (i in settings)
      {
        settings[i].sc.update(settings[i].mr);
      }
    })

    onRenderFcts.push(function(){

      for (i in settings)
      {
        if(settings[i].sc._visibleStartedAt) {
          if ( document.getElementById("video_"+i).readyState === document.getElementById("video_"+i).HAVE_ENOUGH_DATA ) {
            settings[i].ica.drawImage( document.getElementById("video_"+i), 0, 0 );
            if ( settings[i].ta ) settings[i].ta.needsUpdate = true;
          };
        };
      };
      renderer.render( scene, camera );
    })

  }


  // add html-
  var addVideos = function()
  {
    var $videoContainer = $('#video-container');
    $videoContainer.css({position: 'absolute', zIndex: -10,overflow: 'hidden'});
    for(var i in settings)
    {
      var $videoElem = $('<video id="video_'+i+'" ></video>');
      $videoElem
      .attr('autoplay','')
      .attr('muted','')
      .attr('loop','');

      $videoElem.append('<source src = "'+settings[i].video+'" type="video/mp4;">');
      $videoContainer.append($videoElem);
    }
  }

  // boostrap fct
  var init = function(evt)
  {
    // construct html
    addVideos();

    // init renderer
    initRenderer();

    //////////////////////////////////////////////////////////////////////////////////
    //		Initialize a basic camera
    //////////////////////////////////////////////////////////////////////////////////

    scene.add(camera);

    ////////////////////////////////////////////////////////////////////////////////
    //          handle arToolkitSource
    ////////////////////////////////////////////////////////////////////////////////

    initSource();

    ////////////////////////////////////////////////////////////////////////////////
    //          initialize arToolkitContext
    ////////////////////////////////////////////////////////////////////////////////

    initContext();

    ////////////////////////////////////////////////////////////////////////////////
    //          Create a ArMarkerControls
    ////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////
    //		      add videos in the scene
    //////////////////////////////////////////////////////////////////////////////////

    addObjects();

  //////////////////////////////////////////////////////////////////////////////////
  //		render the whole thing on the page
  //////////////////////////////////////////////////////////////////////////////////

  launchRendering();

}

// boostrap trigger
$(document).ready(init);

})(window, jQuery);



function toggleFullScreen() {
  if ((document.fullScreenElement && document.fullScreenElement !== null) ||
   (!document.mozFullScreen && !document.webkitIsFullScreen)) {
    if (document.documentElement.requestFullScreen) {
      document.documentElement.requestFullScreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullScreen) {
      document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    }
  }
}
