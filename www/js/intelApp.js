document.addEventListener("intel.xdk.device.ready",function(){
		//lock the application in portrait orientation
		intel.xdk.device.setRotateOrientation("portrait");
    intel.xdk.device.setAutoRotate(false);

    //hide splash screen
    intel.xdk.device.hideSplashScreen();
},false);  