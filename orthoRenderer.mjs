import * as THREE from './three.module.js';
let Ortho = {
	RENDER_ORDER:{
		BG:-503,//absolute values of these are not too important as long as they are on-screen
		WALL:-502,//the relative values are used to sort 3d images by depth (z is not used for culling)
		FG:-501,
		MOVEMENT:-400,
		CURSOR:-300,
		SPRITE:-200,//not used, sprites sorted by y instead
		UI:-100
	},
	varZ:{
		bg:-132,
		sprite:-116,
		fg:-115,
		fgSprite:-96
	}
};

Ortho.Render = function(){
	if(!Ortho.scene){
		let container = document.createElement( 'div' );
		document.body.appendChild( container );
		Ortho.scene = new THREE.Scene();
		Ortho.cameraOrtho = new THREE.OrthographicCamera(
				R.RENDER_DIMENSIONS().width/-2,     //left
				R.RENDER_DIMENSIONS().width/2,      //right 
				(R.RENDER_DIMENSIONS().height +R.RENDER_DIMENSIONS().y)/2,   //top
				(R.RENDER_DIMENSIONS().height +R.RENDER_DIMENSIONS().y)/-2,  //bottom
				0, 1000 );                           //near,far
		Ortho.cameraOrtho.position.x=R.RENDER_DIMENSIONS().width/2;
		Ortho.cameraOrtho.position.y=R.RENDER_DIMENSIONS().width/2 +R.RENDER_DIMENSIONS().y/2;
		Ortho.worldGroup = new THREE.Group();
		Ortho.scene.add(Ortho.worldGroup);
		Ortho.renderer = new THREE.WebGLRenderer( { antialias: true } );
		Ortho.renderer.autoClear = false; // to allow UI overlay
		Ortho.renderer.setPixelRatio( window.devicePixelRatio );
		Ortho.renderer.setSize( R.RENDER_DIMENSIONS().width, R.RENDER_DIMENSIONS().height +R.RENDER_DIMENSIONS().y);//TODO: scale to window
		Ortho.renderer.domElement.id="canvas3d";
		Ortho.renderer.domElement.addEventListener("contextmenu", function(e) {
                e.preventDefault();
                return false;
            });
		container.appendChild( Ortho.renderer.domElement );
		if (Tch) {
			Tch.init();
		}
		Ortho.doneInit = false;
		Ortho.cameraOrtho.defaultZoom = 2.2;
	}
	
	Ortho.renderMap();
	Ortho.renderUnits();
	Ortho.renderDrops();
	Ortho.renderCursor();
	Ortho.renderMovement();
	Ortho.renderInfoHeader();
	Ortho.renderDisplayTurn();//uses UI layer, so comes after info header
	Ortho.camerTracking();
	Ortho.renderFadeIn();//renders the initial load of a map
	Ortho.renderer.clear();
	Ortho.renderer.render(Ortho.scene,Ortho.cameraOrtho);
	//render UI on top
	Ortho.renderer.clearDepth();
	Ortho.renderer.render(Ortho.sceneUI,Ortho.cameraOrthoUI);
	
};

Ortho.renderFadeIn = function(){
    if (Sy.CurrentState === Sy.STATE_DISPLAY_TURN &&
		Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationBegin &&
		Sy.varTurnCount == 1 && !Ortho.doneInit) {
		//very first turn, show the map load up (held in "display turn" state to prevent main game actions)
		//resetting a level can be done by changing varPlayerCharacters, varEnemyCharacters, resetting the terrain??? and setting varTrunCount=1
		//then set state = Sy.STATE_DISPLAY_TURN, and Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationBegin
		//and finally, reset Ortho.doneInit = false;
		//also requires the Ortho caches to be invalidated (mapneedsrender, units, etc)
		Ortho.renderer.clear();
		Ortho.renderer.render(Ortho.scene,Ortho.cameraOrtho);
	}
	if(Ortho.doneInit){
		return;
	}
	if(!Ortho.hasOwnProperty("initGroup")){
		Sy.varTurnCount = 1;
		Ortho.initGroup = new THREE.Group();
		Ortho.worldGroup.add(Ortho.initGroup);
		for(let x=0;x<Sy.map.width;x+=1){
			for (let y=0;y<Sy.map.height;y+=1){
				let imgUrl = R.getImageForMap(true);
				let terr = Sy.map.terrain_fg[x][y];
				if(terr == Tr.none){
					imgUrl = R.getImageForMap(false);
					terr = Sy.map.terrain[x][y];
				}
				let canvas = document.createElement('canvas');
				canvas.width = R.SOURCE_TILE_SIZE;
				canvas.height = R.SOURCE_TILE_SIZE;
				//this is based on AutoTile, but only draws 1 tile, not the whole map
				let tileCacheName = Sy.map.name+"_init_"+x+"_"+y;
				R.drawCanvasAsync(canvas, tileCacheName, imgUrl,
					x*R.SOURCE_TILE_SIZE,y*R.SOURCE_TILE_SIZE,R.SOURCE_TILE_SIZE,R.SOURCE_TILE_SIZE,
					0,0,R.TILE_WIDTH,R.TILE_HEIGHT,
					function() {});
				let plane = Ortho.createPlaneFromCanvas(canvas,tileCacheName);
				//plane.visible = false;
				plane.position.x = R.TILE_WIDTH * (x);
				plane.position.y = R.RENDER_DIMENSIONS().height - R.TILE_HEIGHT * (y) - R.TILE_HEIGHT;
				plane.position.z = Ortho.varZ.bg;
		
				plane.targetPosition = plane.position.clone();
				plane.position.y -= ((x+50+y)*(x+y));//quadratic formula, offset the tiles by an increasing amount
				plane.renderOrder = Ortho.RENDER_ORDER.BG;
				Ortho.initGroup.add(plane);
				
				//if there's a player on it, create a temporary sprite
				let ch = Sy.getCharacterAtPosition(x,y);
				if(ch.player_state!=Sy.NO_PLAYER_STATE){
					//add initial instance of the THREE JS sprite
					let cCanvs = document.createElement('canvas');
					cCanvs.width = R.CHARACTER_WIDTH;
					cCanvs.height = R.CHARACTER_HEIGHT;
					R.setImage(cCanvs, ch.cl, "idle", ch.player_state);
					let mat = Ortho.setCanvasMaterial(cCanvs,x+"_"+y+"_"+"ccanvas");

					let chSprite = new THREE.Sprite( mat );
					plane.add( chSprite );
					chSprite.scale.x = cCanvs.width;
					chSprite.scale.y = cCanvs.height;
					//not exactly the right position, but since it's zoomed out, should be hidden enough
					chSprite.position.y += R.CHARACTER_HEIGHT+(R.CHARACTER_HEIGHT/2-R.TILE_HEIGHT);
					chSprite.renderOrder = Ortho.RENDER_ORDER.SPRITE;
					chSprite.rotation.x=0.5;//30 deg in rad, roughly the rotation of the sprites in the camera init setup
					chSprite.rotation.z=0.5;
				}
				
			}
		}
		Ortho.cameraOrtho.defaultZoom = 0.75;
	}
    //hide everything that's part of the normal renderer
	for(let i=0;i<Ortho.worldGroup.children.length;i+=1){
		Ortho.worldGroup.children[i].visible = false;
	}
	Ortho.initGroup.visible = true;
	let Lerp = function(start,end,factor){
        return start * factor + (1.0 - factor) * end;
    };
	let factor = 0.92;
	let allDone = true;
	for(let i=0;i<Ortho.initGroup.children.length;i+=1){
		let child = Ortho.initGroup.children[i];
		child.position.y = Lerp(child.position.y,child.targetPosition.y,factor);
		if(Math.abs(child.position.y - child.targetPosition.y)>3){//threshold for lerp
			allDone = false;
		}
	}
	if(allDone){
		Ortho.doneInit = true;
		Ortho.worldGroup.remove(Ortho.initGroup);
		Ortho.initGroup.clear();
		//show everything that's part of the normal renderer
		for(let i=0;i<Ortho.worldGroup.children.length;i+=1){
			Ortho.worldGroup.children[i].visible = true;
		}
		Ortho.cameraOrtho.defaultZoom = 1.5;
	}
};

Ortho.renderMap = function (){
	if(!Ortho.hasOwnProperty("bgPlane")){
		let bgCanvas = document.createElement('canvas');
		bgCanvas.width = R.RENDER_DIMENSIONS().width;
		bgCanvas.height = R.RENDER_DIMENSIONS().height;
		let fgCanvas = document.createElement('canvas');
		fgCanvas.width = R.RENDER_DIMENSIONS().width;
		fgCanvas.height = R.RENDER_DIMENSIONS().height;
		for (let i = 0; i < R.MAP_HEIGHT(); i += 1) {
			for (let j = 0; j < R.MAP_WIDTH(); j += 1) {
				R.autoTile(bgCanvas,Sy.map.terrain[j][i],j,i,false);
				R.autoTile(fgCanvas,Sy.map.terrain_fg[j][i],j,i,true);
			}
		}
		Ortho.mapGroup = new THREE.Group();
		Ortho.worldGroup.add(Ortho.mapGroup);
		const bgPlane = Ortho.createPlaneFromCanvas(bgCanvas,"bgCanvas");
		Ortho.mapGroup.add(bgPlane );
		Ortho.bgPlane = bgPlane;
		Ortho.bgPlane.position.z = Ortho.varZ.bg;
		bgPlane.renderOrder = Ortho.RENDER_ORDER.BG;
		const fgPlane = Ortho.createPlaneFromCanvas(fgCanvas,"fgCanvas");
		Ortho.mapGroup.add(fgPlane );
		Ortho.fgPlane = fgPlane;
		Ortho.fgPlane.position.z = Ortho.varZ.fg;
		fgPlane.renderOrder = Ortho.RENDER_ORDER.FG;
		//build walls
		
		//generate textures, each texture is referenced by name_frame (mov/atk/upp _ 0-15)
		let imgUrl = "./i/ah/house_wall.png";
		let canvas = document.createElement('canvas');
		canvas.width = R.TILE_WIDTH;
		canvas.height = R.TILE_HEIGHT;
		R.drawCanvasAsync(canvas,
			R.escapeURL(imgUrl), imgUrl,
			17, 2,//NOTE: these coordinates are based on the sprite, if using different wall textures paramterise these
			R.SOURCE_TILE_SIZE, R.SOURCE_TILE_SIZE ,
			0, 0, R.TILE_WIDTH, R.TILE_HEIGHT,
			function(){});
		const planeLeft = Ortho.createPlaneFromCanvas(canvas,"wall");
		const planeRight = Ortho.createPlaneFromCanvas(canvas,"wall");
		const planeBottom = Ortho.createPlaneFromCanvas(canvas,"wall");
		planeLeft.position.z = Ortho.varZ.bg;
		planeRight.position.z = Ortho.varZ.bg;
		planeBottom.position.z = Ortho.varZ.bg;
		planeLeft.renderOrder = Ortho.RENDER_ORDER.WALL;
		planeRight.renderOrder = Ortho.RENDER_ORDER.WALL;
		planeBottom.renderOrder = Ortho.RENDER_ORDER.WALL;
		//stand the plane upright
		let deg90 = 90*Math.PI/180;
		planeLeft.rotateX(deg90).rotateY(deg90);
		planeRight.rotateX(deg90).rotateY(deg90);
		planeBottom.rotateX(deg90);
		for (let i = 0; i < R.MAP_WIDTH(); i += 1) {
			for (let j = 0; j < R.MAP_HEIGHT(); j += 1) {
				let tr = Sy.map.terrain_fg[i][j];
				if(tr!==Tr.none){
					//at a non-blank terrain, look for edges
					//no need to do top.
					//if it's at the edge of the map, or is bordering a 'none' tile
					if(i==0 || Sy.map.terrain_fg[i-1][j]===Tr.none){
						//left wall
						let left = planeLeft.clone();
						left.position.x = R.TILE_WIDTH * (i);
						left.position.y = R.RENDER_DIMENSIONS().height - R.TILE_HEIGHT * (j) - R.TILE_HEIGHT;
						Ortho.mapGroup.add(left);
					}
					if(i+1==R.MAP_WIDTH() || Sy.map.terrain_fg[i+1][j]===Tr.none){
						//right wall
						let right = planeRight.clone();
						right.position.x = R.TILE_WIDTH * (i)+R.TILE_WIDTH;
						right.position.y = R.RENDER_DIMENSIONS().height - R.TILE_HEIGHT * (j) - R.TILE_HEIGHT;
						Ortho.mapGroup.add(right);
					}
					if(j+1==R.MAP_HEIGHT() || Sy.map.terrain_fg[i][j+1]===Tr.none){
						//bottom wall
						let bottom = planeBottom.clone();
						bottom.position.x = R.TILE_WIDTH * (i);
						bottom.position.y = R.RENDER_DIMENSIONS().height - R.TILE_HEIGHT * (j) - R.TILE_HEIGHT;
						Ortho.mapGroup.add(bottom);
					}					
				}
			}
		}
	}
};
Ortho.renderUnits = function(){
	if(!Ortho.hasOwnProperty("spriteGroup")){
		Ortho.spriteGroup = new THREE.Group();
		Ortho.worldGroup.add(Ortho.spriteGroup);
	}
    let characters = Sy.varPlayerCharacters.concat(Sy.varEnemyCharacters);
    for (let i = 0; i < characters.length; i += 1) {
        let ch = characters[i];
		if(!ch.hasOwnProperty("sprite3d")){
			ch.sprite3d = {};
		}
        //don't render the active character if in a battle, the battle anim will do that
        if (Sy.CurrentState === Sy.STATE_BATTLE&&
            !Sy.internalStateVar[Sy.STATE_BATTLE].animationIsOver) {
            let battleFrames = Sy.internalStateVar[Sy.STATE_BATTLE].battleCalculation;
			if(battleFrames.length<=0){
				Sy.internalStateVar[Sy.STATE_BATTLE].animationIsOver=true;
			}
            if(battleFrames.length && ch === battleFrames[0].ch){
				let currentFrame = battleFrames[0];
				let easing = [0.1,0.2,0.3,0.4,0.5,0.5,
							  0.5,0.5,0.4,0.3,0.2,0.1];
				let mapFrames = easing.length;
				//initialise the animation
				if(!currentFrame.hasOwnProperty("frames")){
					currentFrame.frames = mapFrames;
				}
				//check if it's complete
				if(currentFrame.frames<=0){
					//if animation is done, progress to the next one
					battleFrames.shift();
					return;
				}
				//render the animation
				currentFrame.frames-=1;
				//lerp ch based on frame count
				let tgtCh = currentFrame.em;
				let imgMode = "right";
				let tgtX = 0.5;
				let tgtY = 0;
				if(tgtCh.x<currentFrame.ch.x){
					imgMode = "left";
					tgtX = -0.5;
					tgtY = 0;
				}
				if(tgtCh.x==currentFrame.ch.x){
					if(tgtCh.y<currentFrame.ch.y){
						 imgMode = "up";
						tgtX = 0;
						tgtY = -0.5;
					}else{
						 imgMode = "down";
						tgtX = 0;
						tgtY = 0.5;
					}
				}
				//could replace this with a formula
				let percentage = easing[currentFrame.frames];
				tgtX=currentFrame.ch.x+tgtX*percentage;
				tgtY=currentFrame.ch.y+tgtY*percentage;
				ch.sprite3d.sprite.position.x = tgtX*R.TILE_WIDTH + R.CHARACTER_WIDTH/2;//divide by 2 is because 3d coordiantes are centred on the spite
				ch.sprite3d.sprite.position.y = R.RENDER_DIMENSIONS().height - tgtY*R.TILE_HEIGHT + (R.CHARACTER_HEIGHT/2-R.TILE_HEIGHT);
				if(percentage>0.3){
					imgMode = "hit";
				}
				let imgName = currentFrame.ch.cl+"_"+imgMode+"_"+currentFrame.ch.player_state+"_"+R.getImageFrameIdx(imgMode);
				let mat = Ortho.getCanvasMaterial(imgName);
				//cache the image
				if(!mat){
					let canvas = document.createElement('canvas');
					R.setImage(canvas, currentFrame.ch.cl, imgMode, currentFrame.ch.player_state);
					mat = Ortho.setCanvasMaterial(canvas,imgName);
				}
				if(ch.sprite3d.sprite.material !== mat){
					ch.sprite3d.sprite.material = mat;
				}
				continue;
			}
		}
        let status = "idle";
        if (ch.hasMoved) {
            status = "wait";
        }
        if (Sy.CurrentState === Sy.STATE_DISPLAY_MOVE) {
            //a character that's selected in display move should become animated
            let highlightChX = Sy.internalStateVar[Sy.STATE_IDLE].cursorX;
            let highlightChY = Sy.internalStateVar[Sy.STATE_IDLE].cursorY;
            if (ch.x === highlightChX && ch.y === highlightChY) {
                status = "left";
            }
        }
        if (ch.player_state !== Sy.NO_PLAYER_STATE) {
            if (!R.unitIsMoving(ch)) {
					//update the sprite to a new image
					let imgName = ch.cl+"_"+status+"_"+ch.player_state+"_"+R.getImageFrameIdx(status);
					let mat = Ortho.getCanvasMaterial(imgName);
					//cache the image
					if(!mat){
						let canvas = document.createElement('canvas');
						R.setImage(canvas, ch.cl, status, ch.player_state);
						mat = Ortho.setCanvasMaterial(canvas,imgName);
					}
					if(!ch.sprite3d.hasOwnProperty("sprite")){
						//add initial instance of the THREE JS sprite
						ch.sprite3d.sprite = new THREE.Sprite( mat );
						Ortho.spriteGroup.add( ch.sprite3d.sprite );
						ch.sprite3d.sprite.scale.x = R.CHARACTER_WIDTH;
						ch.sprite3d.sprite.scale.y = R.CHARACTER_HEIGHT;
					}
					if(ch.sprite3d.sprite.material !== mat){
						ch.sprite3d.sprite.material = mat;
					}
					ch.sprite3d.sprite.renderOrder = ch.y;//render sprites based on z so they don't clip with FG terrain's 
					ch.sprite3d.sprite.position.x = ch.x*R.TILE_WIDTH + R.CHARACTER_WIDTH/2;//divide by 2 is because 3d coordiantes are centred on the spite
					ch.sprite3d.sprite.position.y = R.RENDER_DIMENSIONS().height - ch.y*R.TILE_HEIGHT + (R.CHARACTER_HEIGHT/2-R.TILE_HEIGHT);
					ch.sprite3d.sprite.position.z = Ortho.varZ.sprite;
					if(Sy.map.terrain_fg[ch.x][ch.y]!=Tr.none){
						ch.sprite3d.sprite.position.z = Ortho.varZ.fgSprite;
					}
				}
        }else{
			if(ch.sprite3d.hasOwnProperty("sprite")){
				ch.sprite3d.sprite.visible=false;
			}
		}
    }
	
	let Lerp = function(start,end,factor){
		return start * factor + (1.0 - factor) * end;
	};
    let paths = R.updateMovementPaths();
	for(let i=0;i<paths.length;i+=1){
		let path = paths[i];
		let sprite = path.ch.sprite3d.sprite;
		sprite.position.x = path.x+ R.CHARACTER_WIDTH/2;
		sprite.position.y = R.RENDER_DIMENSIONS().height -path.y+ (R.CHARACTER_HEIGHT/2-R.TILE_HEIGHT);
		//lerp Z
        let terrainTo_fg = Sy.map.terrain[path.tgtX][path.tgtY];
		let tgtZ = Ortho.varZ.sprite;
		if(terrainTo_fg!=Tr.none){
			tgtZ = Ortho.varZ.fgSprite;
		}
		Lerp(path.ch.sprite3d.sprite.position.z,tgtZ,0.2);
		//update with movement images
		let status = path.image;
		//update the sprite to a new image
		let imgName = path.ch.cl+"_"+status+"_"+path.ch.player_state+"_"+R.getImageFrameIdx(status);
		let mat = Ortho.getCanvasMaterial(imgName);
		//cache the image
		if(!mat){
			let canvas = document.createElement('canvas');
			R.setImage(canvas, path.ch.cl, status, path.ch.player_state);
			mat = Ortho.setCanvasMaterial(canvas,imgName);
		}
		if(path.ch.sprite3d.sprite.material !== mat){
			path.ch.sprite3d.sprite.material = mat;
		}
	}
    if (Sy.CurrentState === Sy.STATE_MOVE_ANIMATION) {
        let selectedChX = Sy.internalStateVar[Sy.STATE_IDLE].cursorX;
        let selectedChY = Sy.internalStateVar[Sy.STATE_IDLE].cursorY;
        if (R.varMovementPaths.length === 0) {
            if (Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].path.length > 0) {
                let path = Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].path;
                let selectedCh = Sy.getCharacterAtPosition(selectedChX, selectedChY);
                R.addMovementPath(selectedCh, path);
            }
        } else {
            if (R.movementPathsComplete()) {
                Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].path = [];
            }
        }
    }
    if (R.movementPathsComplete()) {
        R.varMovementPaths = [];
    }
	
	//render drop icons for enemies
    for (let i = 0; i < Sy.varEnemyCharacters.length; i += 1) {
		let ch = Sy.varEnemyCharacters[i];
		if(ch.player_state !== Sy.NO_PLAYER_STATE){
			if(ch.drops.length>0){
				if(!ch.sprite3d.hasOwnProperty("dropSprite")){
					let drop = ch.drops[0];//just render the first drop.
					let name = "heart";
					if(drop === Drops.Diamond){
						name="diamond";
					}
					if(drop === Drops.Club){
						name="club";
					}
					if(drop === Drops.Spade){
						name="spade";
					}
					let mat = Ortho.getCanvasMaterial(name);
					if(mat){
						ch.sprite3d.dropSprite = new THREE.Sprite(mat);
						ch.sprite3d.dropSprite.scale.x = 0.3;//relative to ch sprite
						ch.sprite3d.dropSprite.scale.y = 0.3;
						ch.sprite3d.dropSprite.position.x = -0.5;//multiples of ch sprite
						ch.sprite3d.dropSprite.position.y = -0.5;
						ch.sprite3d.dropSprite.renderOrder = 10;
						ch.sprite3d.sprite.add(ch.sprite3d.dropSprite);
					}
				}
			}
		}
	}
	for(let i=0;i<Ortho.spriteGroup.children.length;i+=1){
		Ortho.spriteGroup.children[i].rotation.x=-Ortho.worldGroup.rotation.x;
		Ortho.spriteGroup.children[i].rotation.z=-Ortho.worldGroup.rotation.z;
	}
	
	
};
Ortho.renderDrops = function(){
	if(!Ortho.hasOwnProperty("dropGroup")){
		Ortho.dropGroup = new THREE.Group();
		Ortho.worldGroup.add(Ortho.dropGroup);
		let suites = ["Heart","Diamond","Club","Spade"];
		for(let i=0;i<suites.length;i+=1){
			let suite = suites[i];
			let drop = Drops[suite];
			let canvas = document.createElement('canvas');
			canvas.width = 16; canvas.height = 16;
			let x = 0;
			let y = 0;
			let name = "heart";
			if(drop === Drops.Diamond){
				x=16;y=0;name="diamond";
			}
			if(drop === Drops.Club){
				x=0;y=16;name="club";
			}
			if(drop === Drops.Spade){
				x=16;y=16;name="spade";
			}
			R.drawCanvasAsync(canvas, name, "./i/suite.png",
					x, y, canvas.width, canvas.height,
					0, 0, canvas.width, canvas.height,
					function() {});
			Ortho.setCanvasMaterial(canvas,name);
		}
	}
	for (let i = 0; i <  Sy.map.drops.length; i += 1) {
		let drop = Sy.map.drops[i];
		if(!drop.hasOwnProperty("sprite3d")){
			if(drop.drop == Drops.Heart){
				drop.sprite3d = new THREE.Sprite(Ortho.getCanvasMaterial("heart"));
			}
			if(drop.drop == Drops.Club){
				drop.sprite3d = new THREE.Sprite(Ortho.getCanvasMaterial("diamond"));
			}
			if(drop.drop == Drops.Spade){
				drop.sprite3d = new THREE.Sprite(Ortho.getCanvasMaterial("club"));
			}
			if(drop.drop == Drops.Diamond){
				drop.sprite3d = new THREE.Sprite(Ortho.getCanvasMaterial("spade"));
			}
			drop.sprite3d.scale.x = R.TILE_WIDTH/2;//smaller than tile size
			drop.sprite3d.scale.y = R.TILE_HEIGHT/2;
			Ortho.dropGroup.add(drop.sprite3d);
		}
		drop.sprite3d.visible = !drop.isCollected;
		drop.sprite3d.position.x = drop.x*R.TILE_WIDTH + R.TILE_WIDTH/2;
		drop.sprite3d.position.y = R.RENDER_DIMENSIONS().height - drop.y*R.TILE_HEIGHT-R.TILE_HEIGHT;
		drop.sprite3d.position.z = Ortho.varZ.sprite;
		drop.sprite3d.rotation.x=-Ortho.worldGroup.rotation.x;
		drop.sprite3d.rotation.z=-Ortho.worldGroup.rotation.z;
		drop.sprite3d.renderOrder = Ortho.RENDER_ORDER.SPRITE;
		//TODO: if FG, change sprite z?
		/*
		Sy.map.drops = [
			{
				drop:Drops.Club,
				isCollected:false,
				x:0,
				y:0
			},
			{
				drop:Drops.Heart,
				isCollected:false,
				x:10,
				y:5
			},
			{
				drop:Drops.Diamond,
				isCollected:false,
				x:5,
				y:11
			},
			{
				drop:Drops.Spade,
				isCollected:false,
				x:12,
				y:12
			}
		]
		*/
		

	}
};
Ortho.renderCursor = function(){
	let cursorSizePx = 19;
	if(!Ortho.hasOwnProperty("cursor")){
		Ortho.cursor = new THREE.Group();
		Ortho.worldGroup.add(Ortho.cursor);
		let canvas = document.createElement('canvas');
		canvas.width = cursorSizePx;
		canvas.height = cursorSizePx;
		let canvas1 = canvas.cloneNode();
		let imgUrl = "./i/c.png";
		R.drawCanvasAsync(canvas,
			R.escapeURL(imgUrl) + "0",
			imgUrl, 0, 0,
			cursorSizePx, cursorSizePx, 0, 0, R.TILE_WIDTH, R.TILE_HEIGHT,
			function() {});
		const cursorPlane = Ortho.createPlaneFromCanvas(canvas,"cursor0");
		Ortho.cursor.add(cursorPlane);
		//2nd frame
		R.drawCanvasAsync(canvas1,
			R.escapeURL(imgUrl) + "1",
			imgUrl, cursorSizePx, 0,
			cursorSizePx, cursorSizePx, 0, 0, R.TILE_WIDTH, R.TILE_HEIGHT,
			function() {});
		const cursorPlane2 = Ortho.createPlaneFromCanvas(canvas1,"cursor1");
		Ortho.cursor.add(cursorPlane2);
		cursorPlane.renderOrder = Ortho.RENDER_ORDER.CURSOR;
		cursorPlane2.renderOrder = Ortho.RENDER_ORDER.CURSOR;
	}
	let frameToShow = (Math.floor(R.varCurrentFrame / (1000 * 0.2))) % 2;
	Ortho.cursor.children[0].visible = false;
	Ortho.cursor.children[1].visible = false;
	Ortho.cursor.children[frameToShow].visible = true;
	Ortho.cursor.position.x = R.TILE_WIDTH * (Sy.map.cursorX);
    Ortho.cursor.position.y = R.RENDER_DIMENSIONS().height - R.TILE_HEIGHT * (Sy.map.cursorY) - cursorSizePx;
	Ortho.cursor.position.z = Ortho.varZ.bg+1;//why: Ortho.cursor.position.z = Ortho.varZ.bg+29
	if(Sy.map.terrain_fg[Sy.map.cursorX][Sy.map.cursorY]!=Tr.none){
		Ortho.cursor.position.z = Ortho.varZ.fg+1;
	}
	
};
Ortho.renderMovement = function () {
	if(!Ortho.hasOwnProperty("movement")){
		//generate tiles for each square
		Ortho.movement = {};
		Ortho.movement.movementGroup = new THREE.Group();
		Ortho.worldGroup.add(Ortho.movement.movementGroup);
		let applyAplha = function(data) {
			for (let i = 0; i < data.length; i += 4) {
				data[i + 3] = 191;
			}
		};
		let shiftToRed = function(data) {
			for (let i = 0; i < data.length; i += 4) {
				let hsv = R.rgb2hsv(data[i], data[i + 1], data[i + 2]);
				hsv.h = R.hueShift(hsv.h, 160.0); //shift to red
				let rgb = R.hsv2rgb(hsv);
				data[i] = rgb.r;
				data[i + 1] = rgb.g;
				data[i + 2] = rgb.b;
			}
			applyAplha(data);
		};
		let shiftToU = function(data) {
			for (let i = 0; i < data.length; i += 4) {
				let hsv = R.rgb2hsv(data[i], data[i + 1], data[i + 2]);
				hsv.h = R.hueShift(hsv.h, 90.0); //shift to purple
				let rgb = R.hsv2rgb(hsv);
				data[i] = rgb.r;
				data[i + 1] = rgb.g;
				data[i + 2] = rgb.b;
			}
			applyAplha(data);
		};
		//generate textures, each texture is referenced by name_frame (mov/atk/upp _ 0-15)
		let imgUrl = "./i/b.png";
		for(let i=0;i<16;i+=1){
			let canvas = document.createElement('canvas');
			canvas.width = R.SOURCE_TILE_SIZE - 1;
			canvas.height = R.SOURCE_TILE_SIZE - 1;
			let canvasA = canvas.cloneNode();
			let canvasU = canvas.cloneNode();
			let xOff = (i) * (R.SOURCE_TILE_SIZE - 1);
			R.drawCanvasAsync(canvas,
				R.escapeURL(imgUrl) + String(xOff), imgUrl,
				xOff, 0, R.SOURCE_TILE_SIZE - 1, R.SOURCE_TILE_SIZE - 1, 0, 0, R.SOURCE_TILE_SIZE, R.SOURCE_TILE_SIZE,
				applyAplha);
			R.drawCanvasAsync(canvasA,
				R.escapeURL(imgUrl+"R") + String(xOff), imgUrl,
				xOff, 0, R.SOURCE_TILE_SIZE - 1, R.SOURCE_TILE_SIZE - 1, 0, 0, R.SOURCE_TILE_SIZE, R.SOURCE_TILE_SIZE,
				shiftToRed);
			R.drawCanvasAsync(canvasU,
				R.escapeURL(imgUrl+"U") + String(xOff), imgUrl,
				xOff, 0, R.SOURCE_TILE_SIZE - 1, R.SOURCE_TILE_SIZE - 1, 0, 0, R.SOURCE_TILE_SIZE, R.SOURCE_TILE_SIZE,
				shiftToU);
			Ortho.setCanvasMaterial(canvas,"mov_"+i);
			Ortho.setCanvasMaterial(canvasA,"atk_"+i);
			Ortho.setCanvasMaterial(canvasU,"upp_"+i);
		}
		//generate tiles, each is indexed by x_y
		for (let i = 0; i < R.MAP_WIDTH(); i += 1) {
			for (let j = 0; j < R.MAP_HEIGHT(); j += 1) {
				const plane = Ortho.createCubeFromMaterial(R.TILE_WIDTH,R.TILE_HEIGHT,R.SOURCE_TILE_SIZE,"mov_0");
				plane.visible = false;
				plane.position.x = R.TILE_WIDTH * (i);
				plane.position.y = R.RENDER_DIMENSIONS().height - R.TILE_HEIGHT * (j) - R.TILE_HEIGHT;
				plane.position.z = Ortho.varZ.bg+1;
				plane.scale.z=1/R.SOURCE_TILE_SIZE;//scale down terrain depth that's on the ground
				if(Sy.map.terrain_fg[i][j]!== Tr.none){
					plane.position.z = Ortho.varZ.fg-R.SOURCE_TILE_SIZE;
					plane.scale.z=1;
				}
				Ortho.movement.movementGroup.add(plane);
				Ortho.movement[i+"_"+j]=plane;
				plane.renderOrder = Ortho.RENDER_ORDER.MOVEMENT;
			}
		}
	}
    let frame = (Math.floor(R.varCurrentFrame / (1000 * 0.07))) % 16;
    for (let i = 0; i < R.MAP_WIDTH(); i += 1) {
        for (let j = 0; j < R.MAP_HEIGHT(); j += 1) {
			Ortho.movement[i+"_"+j].visible=false;
			let mat = Ortho.movement[i+"_"+j].material;
            if (Sy.map.move[i][j] !== 0) {
				mat = Ortho.getCanvasMaterial("mov_"+frame);
				Ortho.movement[i+"_"+j].visible=true;
            } else if (Sy.map.attack[i][j] !== 0) {
				mat = Ortho.getCanvasMaterial("atk_"+frame);
				Ortho.movement[i+"_"+j].visible=true;
            }
            if (Sy.map.move_fg[i][j] !== 0) {
				mat = Ortho.getCanvasMaterial("upp_"+frame);
				Ortho.movement[i+"_"+j].visible=true;
            }
			if(Ortho.movement[i+"_"+j].material!=mat){
				Ortho.movement[i+"_"+j].material = mat;
			}
        }
    }
};
Ortho.renderDisplayTurn = function () {
	if(!Ortho.doneInit){
		return;//don't display turn until the pre-game animation has finished
	}
	if(!Ortho.hasOwnProperty("displayTurn")){
		Ortho.displayTurn = {};
		Ortho.displayTurn.group = new THREE.Group();
		Ortho.sceneUI.add(Ortho.displayTurn.group);

		let pCanvas = document.createElement('canvas');
		pCanvas.width = 128; pCanvas.height = 64;
		let eCanvas = document.createElement('canvas');
		eCanvas.width = 128; eCanvas.height = 64;
		R.drawCanvasAsync(pCanvas, "pturn", "./i/pturn.png",
				0, 0, pCanvas.width, pCanvas.height,
				0, 0, pCanvas.width, pCanvas.height,
				function() {});
		R.drawCanvasAsync(eCanvas, "eturn", "./i/eturn.png",
				0, 0, eCanvas.width, eCanvas.height,
				0, 0, eCanvas.width, eCanvas.height,
				function() {});
		let pmat = Ortho.setCanvasMaterial(pCanvas,"pturn");
		let emat = Ortho.setCanvasMaterial(eCanvas,"eturn");
		let psprite = new THREE.Sprite( pmat );
		let esprite = new THREE.Sprite( emat );
		psprite.scale.x = pCanvas.width*2;
		psprite.scale.y = pCanvas.height*2;
		psprite.visible = false;
		psprite.position.y = R.RENDER_DIMENSIONS().height / 2;
		esprite.scale.x = eCanvas.width*2;
		esprite.scale.y = eCanvas.height*2;
		esprite.visible = false;
		esprite.position.y = R.RENDER_DIMENSIONS().height / 2;
		Ortho.displayTurn.group.add(psprite);
		Ortho.displayTurn.group.add(esprite);
		Ortho.displayTurn.psprite = psprite;
		Ortho.displayTurn.esprite = esprite;
	}
	let psprite = Ortho.displayTurn.psprite;
	let esprite = Ortho.displayTurn.esprite;
	psprite.visible = false;
	esprite.visible = false;
	if (R.varDisplayTurnFrames < 0 && Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationDone) {
		R.varDisplayTurnFrames = R.DISPLAY_TURN_INITIAL_FRAMES;
	}
    if (Sy.CurrentState === Sy.STATE_DISPLAY_TURN && Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationBegin) {
		if (R.varDisplayTurnFrames >= 0 && !Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationDone) {
			let screenWidth = R.RENDER_DIMENSIONS().width;
			let percentage = R.varDisplayTurnFrames / R.DISPLAY_TURN_INITIAL_FRAMES;
			let easeOut = function(t) { //decelerating to zero 
				return t * (2 - t);
			};
			let easeIn = function(t) { //accelerate from zero
				return t * t;
			};
			let ease = function(t) {
				let res = t;
				if (t < 0.5) { //first half
					res = easeOut(t / 0.5) / 2;
				} else {
					res = 0.5 + easeIn((t - 0.5) / 0.5) / 2;
				}
				return res;
			};
			let slidingX = (screenWidth + 178) * ease(1 - percentage) - (178);
			if (Sy.PLAYER_STATE === Sy.PLAYER) {
				psprite.visible = true;
				psprite.position.x = slidingX;
			} else {
				esprite.visible = true;
				esprite.position.x = slidingX;
			}
			R.varDisplayTurnFrames -= 1;
		} else {
			Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationDone = true;
		}
    }
	
};
Ortho.renderInfoHeader = function(){
	if(!Ortho.hasOwnProperty("infoHeader")){
		Ortho.infoHeader = {
			 headerLHS : {
				width:130, height:24,
				x:0,y:0
			},
			 headerRHS : {
				width:134, height:24,
				x:0,y:25
			},
			 hpGreen : {
				width:3, height:23,
				x:140,y:0
			},
			 hpRed : {
				width:3, height:23,
				x:144,y:0
			},
			 hpYellowPlayer : {
				width:3, height:23,
				x:148,y:0
			},
			 hpYellowEnemy : {
				width:3, height:23,
				x:148,y:0
			},
			 endButton : {
				width:23, height:22,
				x:160, y:0
			},
			 infoButton : {
				width:23, height:22,
				x:184, y:0
			},
			 exitButton : {
				width:23, height:22,
				x:208, y:0
			},
			 endButtonHover : {
				width:23, height:22,
				x:160, y:23
			},
			 infoButtonHover : {
				width:23, height:22,
				x:184, y:23
			},
			 exitButtonHover : {
				width:23, height:22,
				x:208, y:23
			},
			portraitSquare : {
				width:24, height:24,
				x:0, y:0
			}
		};
		let sceneUI = new THREE.Scene();
		Ortho.cameraOrthoUI = new THREE.OrthographicCamera(
				0,								//left
				R.RENDER_DIMENSIONS().width,    //right 
				R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y,   //top
				0,                              //bottom
				0, 1000 );                      //near,far
		Ortho.sceneUI = sceneUI;
		let spriteKeys = Object.keys(Ortho.infoHeader);
		for(let i=0;i<spriteKeys.length;i+=1){
			let spriteValue = Ortho.infoHeader[spriteKeys[i]];
			let canvas = document.createElement('canvas');
			canvas.width = spriteValue.width;
			canvas.height = spriteValue.height;
			R.drawCanvasAsync(canvas, spriteKeys[i], "./i/header.png",
					spriteValue.x, spriteValue.y, spriteValue.width, spriteValue.height,
					0, 0, spriteValue.width, spriteValue.height,
					function() {});
			let mat = Ortho.setCanvasMaterial(canvas,spriteKeys[i]);
			let sprite = new THREE.Sprite( mat );
			sprite.renderOrder = Ortho.RENDER_ORDER.UI;
			spriteValue.sprite = sprite;
			sprite.scale.x = spriteValue.width;
			sprite.scale.y = spriteValue.height;
			Ortho.sceneUI.add(sprite);
		}
		let textLayer = new THREE.Group();
		textLayer.cacheKey = "";//use this to flag whatever text has been rendered to avoid re-rendering the same text
		Ortho.textLayer = textLayer;
		Ortho.sceneUI.add(textLayer);
		let csLayer = new THREE.Group();
		Ortho.sceneUI.add(csLayer);
		Ortho.csLayer = csLayer;
	}
	//clear UI
	let spriteKeys = Object.keys(Ortho.infoHeader);
	for(let i=0;i<spriteKeys.length;i+=1){
		let spriteValue = Ortho.infoHeader[spriteKeys[i]];
		if(spriteValue.hasOwnProperty("sprite")){
			spriteValue.sprite.visible = false;
		}
	}
	//draw BG
    //If not player turn, bail after drawing BG
    let inputSource = Sy.INPUT_SOURCE_KEYBOARD;
    if (Sy.PLAYER_STATE === Sy.PLAYER) {
        inputSource = Sy.varInputSourcePlayer;
    } else {
        inputSource = Sy.varInputSourceEnemy;
    }
    if (inputSource !== Sy.INPUT_SOURCE_KEYBOARD) {
        return; //TODO: should this render during the opponent turn?
    }
    if (Sy.CurrentState === Sy.STATE_DISPLAY_TURN ||
        Sy.CurrentState === Sy.STATE_GAME_OVER ||
        Sy.CurrentState === Sy.STATE_BATTLE) {
        return; //nothing to do here
    }
    //if unit selected, draw unit
    //if idle, check if unt at cursor is player or opponent & render at top
    let leftCh = Sy.createEmptyCharacter();
    let rightCh = Sy.createEmptyCharacter();
    //cached unit selection, so that the state can be shown without the mouse being restriected to 1 square
    if(Ortho.infoHeader.hasOwnProperty("selectedCh")){
        let selCh = Ortho.infoHeader.selectedCh;
        if(selCh.player_state === Sy.PLAYER_STATE){
            leftCh = selCh;
        }
        if(selCh.player_state !== Sy.PLAYER_STATE && selCh.player_state !== Sy.NO_PLAYER_STATE){
            rightCh = selCh;
        }
    }
    if (Sy.CurrentState === Sy.STATE_IDLE) {
        let ch = Sy.getCharacterAtCursor();
        if (ch.player_state === Sy.PLAYER_STATE) {
            leftCh = ch; //hovering over player unit, set to left
        }
    }
    //if not idle, render idle unit on left
    if (Sy.CurrentState === Sy.STATE_DISPLAY_MOVE ||
        Sy.CurrentState === Sy.STATE_MOVE_ANIMATION) {
        let selectedChX = Sy.internalStateVar[Sy.STATE_IDLE].cursorX;
        let selectedChY = Sy.internalStateVar[Sy.STATE_IDLE].cursorY;
        let ch = Sy.getCharacterAtPosition(selectedChX, selectedChY);
        leftCh = ch;
    }
    if (Sy.CurrentState === Sy.STATE_MOVE_ANIMATION) {
        let ch = Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].attackTarget;
        if (ch.player_state !== Sy.PLAYER_STATE) {
            rightCh = ch; //moving towards red square (not blue square)
        }
    }
    if (Sy.CurrentState === Sy.STATE_SELECT_WEAPON_TARGET) {
        leftCh = Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].character;
    }
    //in any state, if cursor is not on a player unit, show it on the right
    let rCh = Sy.getCharacterAtCursor();
    if (rCh.player_state !== Sy.NO_PLAYER_STATE &&
        rCh.player_state !== Sy.PLAYER_STATE) {
        rightCh = rCh; //hovering over enemy unit, set to right
    }
    //TODO: if targeting,? draw preview?
    //basic stat rendering TODO: specify an alternate vertical rendering
    //0->32 hp (TODO: replace with unit's portrait)
    //32->50% max hp (dark)
    //32->[0->50%] current hp (light)
    //if battle: cur hp <- 0 damage (yellow)
    //then mirror for right hand side, but flip colours
    let pDmg = 0;
    let eDmg = 0;
    //preview
    //show preview when moving if clicking on red square,
	if (Sy.CurrentState === Sy.STATE_DISPLAY_MOVE &&
        leftCh.player_state !== Sy.NO_PLAYER_STATE &&
        rightCh.player_state !== Sy.NO_PLAYER_STATE) {
        let p = leftCh;
        let e = rightCh;
        //since the player hasn't moved yet, need to predict the attack cell
        let moveCell = Sy.getMoveCellFromAttack(e.x, e.y, p);
        let pOrig = {
            x: p.x,
            y: p.y
        }; //back up the original location
        //move the player to the attack cell
        p.x = moveCell.x;
        p.y = moveCell.y;
        //compute the range based on the attack cell
        let eWpn = Sy.getFirstUseableWeapon(e, p);
        let pWpn = p.item;
        //restore the original location
        p.x = pOrig.x;
        p.y = pOrig.y;
        let preview = Sy.battlePreview(p, pWpn, e, eWpn);
        eDmg = preview.player.damage * preview.player.rounds;
        pDmg = preview.enemy.damage * preview.enemy.rounds;
    }
    //show preview for targeting
    if (Sy.CurrentState === Sy.STATE_SELECT_WEAPON_TARGET &&
        leftCh.player_state !== Sy.NO_PLAYER_STATE &&
        rightCh.player_state !== Sy.NO_PLAYER_STATE) {
        let p = leftCh;
        let e = rightCh;
        let eWpn = Sy.getFirstUseableWeapon(e, p);
        let pWpn = Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].weapon;
        let preview = Sy.battlePreview(p, pWpn, e, eWpn);
        //--(assumes preview = consistent damage between rounds)
        //compute damage that would be taken from the preview's damage dealt
        eDmg = preview.player.damage * preview.player.rounds;
        pDmg = preview.enemy.damage * preview.enemy.rounds;
    }
    Ortho.infoHeader.portraitSquare.sprite.visible = false;
	//LHS
    if (leftCh.player_state !== Sy.NO_PLAYER_STATE) {
		let buffs = Sy.getBuffsForCharacter(leftCh);
        let hpPercent = leftCh.currentHp / (leftCh.hp+buffs.hp);
        let hpX = 24;
        let hpWidth = Ortho.infoHeader.headerLHS.width - hpX-24;//extra 24 is with of tab
		Ortho.infoHeader.hpGreen.sprite.scale.x = hpWidth * hpPercent;
		Ortho.infoHeader.hpGreen.sprite.visible = true;
		Ortho.infoHeader.hpGreen.sprite.position.x = hpX + Ortho.infoHeader.hpGreen.sprite.scale.x/2;
		Ortho.infoHeader.hpGreen.sprite.position.y = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y - Ortho.infoHeader.hpGreen.height/2;
        //if preview, fill damage
        if (pDmg > 0) {
            let dmgPercent = pDmg / (leftCh.hp+buffs.hp);
            //work from curHp backwards based on dmgPercent (TODO: cap dmg to curHp?)
            //TODO: if rounds>1? render the 2nd half differently?			
			Ortho.infoHeader.hpYellowPlayer.sprite.scale.x = hpWidth * dmgPercent;
			Ortho.infoHeader.hpYellowPlayer.sprite.visible = true;
			Ortho.infoHeader.hpYellowPlayer.sprite.position.x = Ortho.infoHeader.hpGreen.sprite.position.x + Ortho.infoHeader.hpGreen.sprite.scale.x/2 - Ortho.infoHeader.hpYellowPlayer.sprite.scale.x/2;
        	Ortho.infoHeader.hpYellowPlayer.sprite.position.y = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y - Ortho.infoHeader.hpYellowPlayer.height/2;
		}
		Ortho.infoHeader.headerLHS.sprite.visible = true;
		Ortho.infoHeader.headerLHS.sprite.position.x = Ortho.infoHeader.headerLHS.width/2;
		Ortho.infoHeader.headerLHS.sprite.position.y = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y - Ortho.infoHeader.headerLHS.height/2;
    
		//portrait
		if(leftCh.name=="ch0"||
			leftCh.name=="ch1"||
			leftCh.name=="ch2"||
			leftCh.name=="ch3"){
			Ortho.infoHeader.portraitSquare.sprite.position.x=Ortho.infoHeader.portraitSquare.width/2;
			Ortho.infoHeader.portraitSquare.sprite.position.y=R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y-Ortho.infoHeader.portraitSquare.height/2;
			Ortho.infoHeader.portraitSquare.sprite.visible = true;
			let src = "ch_unknown";
			switch(leftCh.name){
				case "ch0":
				src="ch_aqua";
				break;
				case "ch1":
				src="ch_brown";
				break;
				case "ch2":
				src="ch_pink";
				break;
				case "ch3":
				src="ch_purple";
				break;
				default:
				src = "ch_unknown";
				break;
			}
			let mat = Ortho.getCanvasMaterial(src);
			//cache the image
			if(!mat){
				let canvas = document.createElement('canvas');
				let portraitWidth = 64;
				let portraitHeight = 64;
				canvas.width = portraitWidth;
				canvas.height = portraitHeight;
				R.drawCanvasAsync(canvas, src, "./i/face/"+src+".png",
						0, 0, portraitWidth, portraitWidth,
						0, 0, portraitWidth, portraitWidth,
						function() {});
				mat = Ortho.setCanvasMaterial(canvas,src);
			}
			if(Ortho.infoHeader.portraitSquare.sprite.material !== mat){
				Ortho.infoHeader.portraitSquare.sprite.material = mat;
			}
		}
		
	
	}
    //RHS
    //If state == idle, then only 1/2 of the display will be used up with character
    //use the other half for buttons
    //RHS can then be moved into LHS
    Tch.hoverButton = Sy.BUTTON_NONE; //clear out the hover button
    if (Sy.CurrentState === Sy.STATE_IDLE) {
        let RHS_offsetX = R.RENDER_DIMENSIONS().width / 2;
		let button = Ortho.infoHeader.endButton;
		let buttonHover = Ortho.infoHeader.endButtonHover;
		button.sprite.position.x = RHS_offsetX + button.width/2+16;
		buttonHover.sprite.position.x = button.sprite.position.x;
		button.sprite.position.y = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y - button.height/2;
		buttonHover.sprite.position.y = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y - buttonHover.height/2;
		button.sprite.visible = true;
		buttonHover.sprite.visible = false;
        //TODO: render other buttons
        //button #1 - end of turn 
        //if mouse hover
		if (Tch.rawX > button.sprite.position.x - button.width/2 &&
			Tch.rawY > button.sprite.position.y - button.height/2 &&
			Tch.rawX < button.sprite.position.x + button.width/2 &&
			Tch.rawY < button.sprite.position.y + button.height/2) {
			Tch.hoverButton = Sy.BUTTON_GLOBAL_EOT; 
			buttonHover.sprite.visible = true;
			button.sprite.visible = false;
		}else{
			buttonHover.sprite.visible = false;
			button.sprite.visible = true;
		}
        //button #2 - info
        button = Ortho.infoHeader.infoButton;
        buttonHover = Ortho.infoHeader.infoButtonHover;
		button.sprite.position.x = RHS_offsetX+button.width+4 + button.width/2+16;
		buttonHover.sprite.position.x = button.sprite.position.x;
		button.sprite.position.y = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y - button.height/2;
		buttonHover.sprite.position.y = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y - buttonHover.height/2;
		button.sprite.visible = true;
		buttonHover.sprite.visible = false;
		if (Tch.rawX > button.sprite.position.x - button.width/2 &&
			Tch.rawY > button.sprite.position.y - button.height/2 &&
			Tch.rawX < button.sprite.position.x + button.width/2 &&
			Tch.rawY < button.sprite.position.y + button.height/2) {
			Tch.hoverButton = Sy.BUTTON_GLOBAL_INFO;
			buttonHover.sprite.visible = true;
			button.sprite.visible = false;
		}else{
			buttonHover.sprite.visible = false;
			button.sprite.visible = true;
		}
        //button #3 - surrender
        button = Ortho.infoHeader.exitButton;
        buttonHover = Ortho.infoHeader.exitButtonHover;
		button.sprite.position.x = RHS_offsetX+button.width*2+8 + button.width/2+16;
		buttonHover.sprite.position.x = button.sprite.position.x;
		button.sprite.position.y = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y - button.height/2;
		buttonHover.sprite.position.y = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y - buttonHover.height/2;
		button.sprite.visible = true;
		buttonHover.sprite.visible = false;
		if (Tch.rawX > button.sprite.position.x - button.width/2 &&
			Tch.rawY > button.sprite.position.y - button.height/2 &&
			Tch.rawX < button.sprite.position.x + button.width/2 &&
			Tch.rawY < button.sprite.position.y + button.height/2) {
			Tch.hoverButton = Sy.BUTTON_GLOBAL_EXIT;
			buttonHover.sprite.visible = true;
			button.sprite.visible = false;
		}else{
			buttonHover.sprite.visible = false;
			button.sprite.visible = true;
		}
    }
	if (rightCh.player_state !== Sy.NO_PLAYER_STATE) {
		let buffs = Sy.getBuffsForCharacter(rightCh);
		let left = R.RENDER_DIMENSIONS().width/2;
		if(Sy.CurrentState === Sy.STATE_IDLE){
			left = 0;
		}
		let hpX = 24;
		let hpPercent = rightCh.currentHp / (rightCh.hp+buffs.hp);
        let hpWidth = Ortho.infoHeader.headerRHS.width - hpX-24;//extra 24 is with of tab
		Ortho.infoHeader.hpRed.sprite.scale.x = hpWidth * hpPercent;
		Ortho.infoHeader.hpRed.sprite.visible = true;
		Ortho.infoHeader.hpRed.sprite.position.x = left + hpX + Ortho.infoHeader.hpRed.sprite.scale.x/2;
		Ortho.infoHeader.hpRed.sprite.position.y = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y - Ortho.infoHeader.hpRed.height/2;
		//if preview, fill damage
		if (eDmg > 0) {
			let dmgPercent = eDmg / (rightCh.hp+buffs.hp);
            //work from curHp backwards based on dmgPercent (TODO: cap dmg to curHp?)
            //TODO: if rounds>1? render the 2nd half differently?			
			Ortho.infoHeader.hpYellowEnemy.sprite.scale.x = hpWidth * dmgPercent;
			Ortho.infoHeader.hpYellowEnemy.sprite.visible = true;
			Ortho.infoHeader.hpYellowEnemy.sprite.position.x = Ortho.infoHeader.hpRed.sprite.position.x - Ortho.infoHeader.hpRed.sprite.scale.x/2 + Ortho.infoHeader.hpYellowEnemy.sprite.scale.x/2;
        	Ortho.infoHeader.hpYellowEnemy.sprite.position.y = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y - Ortho.infoHeader.hpYellowEnemy.height/2;
		}
		Ortho.infoHeader.headerRHS.sprite.visible = true;
		Ortho.infoHeader.headerRHS.sprite.position.x = left + Ortho.infoHeader.headerRHS.width/2;
		Ortho.infoHeader.headerRHS.sprite.position.y = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y - Ortho.infoHeader.headerRHS.height/2;
	}
	
    //whenever hovering over a unit, cache them
     if(Sy.CurrentState === Sy.STATE_IDLE){
        let ch = Sy.getCharacterAtCursor();
        if(ch.player_state!==Sy.NO_PLAYER_STATE){//don't change the unit if in the popup
            Ortho.infoHeader.selectedCh = ch;
        }
    }
    let cachedCh = Ortho.infoHeader.selectedCh;
	//show details
    if(cachedCh&&
       cachedCh.player_state!=Sy.NO_PLAYER_STATE &&
	   Ortho.infoHeader.showDetails){
		//flag the cac
		if(Ortho.textLayer.cacheKey!="infobox"){
			Ortho.textLayer.cacheKey = "infobox";
			//clear out whatever was rendered previously
			for (let i=Ortho.textLayer.children.length-1;i>=0;i-=1){
				Ortho.textLayer.children[i].clear();
				Ortho.textLayer.remove(Ortho.textLayer.children[i]);
			}
			let buffs = Sy.getBuffsForCharacter(cachedCh);
			//render the stats
			let canvas = document.createElement("canvas");
			let text = "";
			text+="HP : "+cachedCh.currentHp+"/"+(cachedCh.hp+(buffs.hp>0?"+"+buffs.hp:""))+"\n";
			text+="Atk: "+cachedCh.str+(buffs.str>0?"+"+buffs.str:"")+"\n";
			text+="Def: "+cachedCh.def+(buffs.def>0?"+"+buffs.def:"")+"\n";
			text+="Spd: "+cachedCh.spd+(buffs.spd>0?"+"+buffs.spd:"")+"\n";
			text+="Mov: "+cachedCh.mov;
			R.renderText(canvas, text);
			//draw the text onto a sprite
			//because the text can change, don't cache the material
			const tex = new THREE.CanvasTexture(canvas);
			tex.magFilter = THREE.NearestFilter;
			tex.minFilter = THREE.NearestFilter;
			const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true});
			mat.depthTest = false;
			let sprite = new THREE.Sprite( mat );
			sprite.renderOrder = Ortho.RENDER_ORDER.UI;
			sprite.scale.x = canvas.width;
			sprite.scale.y = canvas.height;
			sprite.position.x=R.RENDER_DIMENSIONS().width/2;
			sprite.position.y=R.RENDER_DIMENSIONS().height/2;
			//draw backing image
			
			let bgCanv = document.createElement('canvas');
			bgCanv.width = 128;
			bgCanv.height = 88;
			R.drawCanvasAsync(bgCanv, "statbg", "./i/statbg.png",
					0, 0, bgCanv.width , bgCanv.height,
					0, 0,bgCanv.width , bgCanv.height,
					function() {});
			let bgMat = Ortho.setCanvasMaterial(bgCanv,"statbg");
			let bgSprite = new THREE.Sprite( bgMat );
			bgSprite.renderOrder = Ortho.RENDER_ORDER.UI;
			bgSprite.scale.x = bgCanv.width;
			bgSprite.scale.y = bgCanv.height;
			bgSprite.position.x=R.RENDER_DIMENSIONS().width/2;
			bgSprite.position.y=R.RENDER_DIMENSIONS().height/2;
			bgSprite.position.z = -1;
			Ortho.textLayer.add(bgSprite);
			Ortho.textLayer.add(sprite);
		}
	}else{
		//invalidate the cache layer if it was previously an infobox.
		if(Ortho.textLayer.cacheKey == "infobox"){
			//clear out whatever was rendered previously
			for (let i=Ortho.textLayer.children.length-1;i>=0;i-=1){
				Ortho.textLayer.children[i].clear();
				Ortho.textLayer.remove(Ortho.textLayer.children[i]);
			}
			Ortho.textLayer.cacheKey = "idle";
		}
	}
	
};
Ortho.camerTracking = function () {
	if(!Ortho.cameraOrtho.hasOwnProperty("lerpTarget")){
		Ortho.cameraOrtho.lerpTarget = {
			x:Ortho.cameraOrtho.position.x,
			y:Ortho.cameraOrtho.position.y,
			z:Ortho.cameraOrtho.position.z,
			rotX:Ortho.cameraOrtho.rotation.x,
			rotY:Ortho.cameraOrtho.rotation.y,
			rotZ:Ortho.cameraOrtho.rotation.z,
			zoom:Ortho.cameraOrtho.zoom
		};
		Ortho.cameraOrtho.changeRotation = function (rotationDeg) {
			let rotationRad = rotationDeg*0.0174533;
			let resultY = 0;
			//if 0 degress on camera, y=0;
			//if 45 degress on camera, y=height/2;
			//if 90 degress on camera, y=height;
			let yOff = Math.sin(rotationRad);
			resultY = R.RENDER_DIMENSIONS().height*yOff;
			Ortho.worldGroup.position.y= resultY;
			Ortho.worldGroup.rotation.x=-rotationRad;
			Ortho.worldGroup.rotation.z=-rotationRad;
		};
		Ortho.cameraOrtho.changeRotation(30);
		Ortho.cameraOrtho.lerpTarget.x = R.RENDER_DIMENSIONS().width/2;
		Ortho.cameraOrtho.lerpTarget.y = R.RENDER_DIMENSIONS().height/2;
	}
	let offset = new THREE.Vector3(  R.TILE_WIDTH/2, R.TILE_HEIGHT/2, 0 );//middle of cursor relative to itself
	
	let boundrySize = 32;
	let zoomBoundry = {
		left:boundrySize,
		right:R.RENDER_DIMENSIONS().width-boundrySize,
		top:R.RENDER_DIMENSIONS().y+boundrySize,
		bottom:R.RENDER_DIMENSIONS().height-boundrySize
	};
	let isMouseAtSide = false;
	if(Tch.rawX<zoomBoundry.left||
	   Tch.rawX>zoomBoundry.right||
	   Tch.rawY<zoomBoundry.top||
	   Tch.rawY>zoomBoundry.bottom){
		isMouseAtSide = true;
	}
	
	let cc = Ortho.cursor.localToWorld(offset);//cursor position in world space
	let x = cc.x;
	let y = cc.y;
	if(isMouseAtSide){
		Ortho.cameraOrtho.lerpTarget.x = x;
		Ortho.cameraOrtho.lerpTarget.y = y;
	}else{
		Ortho.cameraOrtho.lerpTarget.x = Ortho.cameraOrtho.position.x;
		Ortho.cameraOrtho.lerpTarget.y = Ortho.cameraOrtho.position.y;
	}
	Ortho.cameraOrtho.lerpTarget.rotX = 0;
	Ortho.cameraOrtho.lerpTarget.rotY = 0;
	Ortho.cameraOrtho.lerpTarget.rotZ = 0;
	Ortho.cameraOrtho.lerpTarget.zoom = Ortho.cameraOrtho.defaultZoom*1.5;
	if(Sy.CurrentState==Sy.STATE_DISPLAY_MOVE ||
	   Sy.CurrentState==Sy.STATE_SELECT_WEAPON_TARGET ||
	   Sy.CurrentState==Sy.STATE_MOVE_ANIMATION){
		if(Sy.internalStateVar[Sy.STATE_IDLE].cursorX<Sy.map.width/2){
			Ortho.cameraOrtho.lerpTarget.rotY=5*0.0174533;
		}else{
			Ortho.cameraOrtho.lerpTarget.rotY=-5*0.0174533;
		}
		Ortho.cameraOrtho.lerpTarget.zoom = Ortho.cameraOrtho.defaultZoom+0.5;
		//Ortho.cameraOrtho.lerpTarget.rotX=20*0.0174533;
	}
    let Lerp = function(start,end,factor){
        return start * factor + (1.0 - factor) * end;
    };
	let factor = 0.9;
	Ortho.cameraOrtho.position.x = Lerp(Ortho.cameraOrtho.position.x,Ortho.cameraOrtho.lerpTarget.x,factor);
	Ortho.cameraOrtho.position.y = Lerp(Ortho.cameraOrtho.position.y,Ortho.cameraOrtho.lerpTarget.y,factor);
	Ortho.cameraOrtho.position.z = Lerp(Ortho.cameraOrtho.position.z,Ortho.cameraOrtho.lerpTarget.z,factor);
	Ortho.cameraOrtho.rotation.x = Lerp(Ortho.cameraOrtho.rotation.x,Ortho.cameraOrtho.lerpTarget.rotX,factor);
	Ortho.cameraOrtho.rotation.y = Lerp(Ortho.cameraOrtho.rotation.y,Ortho.cameraOrtho.lerpTarget.rotY,factor);
	Ortho.cameraOrtho.rotation.z = Lerp(Ortho.cameraOrtho.rotation.z,Ortho.cameraOrtho.lerpTarget.rotZ,factor);
	Ortho.cameraOrtho.zoom = Lerp(Ortho.cameraOrtho.zoom,Ortho.cameraOrtho.lerpTarget.zoom,factor);
	Ortho.cameraOrtho.updateProjectionMatrix();
};

Ortho.setCanvasMaterial = function(canvas,imageName){
	if(!Ortho.hasOwnProperty("varMaterialCache")){
		Ortho.varMaterialCache = {};
	}
	//create and cache the canvas material
	const tex = new THREE.CanvasTexture(canvas);
	tex.magFilter = THREE.NearestFilter;
	tex.minFilter = THREE.NearestFilter;
	const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true});
	mat.depthTest = false;
	Ortho.varMaterialCache[imageName] = mat;
	return mat;
};
Ortho.getCanvasMaterial = function(imageName){
	if(!Ortho.hasOwnProperty("varMaterialCache")){
		Ortho.varMaterialCache = {};
	}
	return Ortho.varMaterialCache[imageName];
};
Ortho.createCubeFromMaterial = function (width,height,depth,imageName) {
	const geom = new THREE.BoxGeometry(width,height,-depth);
	geom.translate(width/2,height/2,depth/2);//move plane so that 0,0 is top-left, not middle
	let mat = Ortho.getCanvasMaterial(imageName);
	return new THREE.Mesh(geom, mat);
};
Ortho.createPlaneFromCanvas = function (canvas,imageName) {
	const geom = new THREE.PlaneGeometry(canvas.width,canvas.height);
	geom.translate(canvas.width/2,canvas.height/2,0);//move plane so that 0,0 is top-left, not middle
	let mat = Ortho.getCanvasMaterial(imageName);
	if(!mat){
		mat = Ortho.setCanvasMaterial(canvas,imageName);
	}
	return new THREE.Mesh(geom, mat);
};


let R = {
    varCurrentFrame: 0,
    varDisplayTurnFrames: 32,
    DISPLAY_TURN_INITIAL_FRAMES: 32,
    MAP_WIDTH: function() {
        return Sy.map.width;
    },
    MAP_HEIGHT: function() {
        return Sy.map.height;
    },
    RENDER_DIMENSIONS: function() {
        return { //rectangle in mainCanvas that should be used for the main view
            x: 0, //one of:x or y should be changed to pin the outer info window to the side
            y: 64,
            width: R.MAP_WIDTH() * R.TILE_WIDTH,
            height: R.MAP_HEIGHT() * R.TILE_HEIGHT,
        };
    },
    TILE_WIDTH: 16, //zoids:32
    TILE_HEIGHT: 16, //zoids:26
    CHARACTER_HEIGHT: 24,//oga:18,
    CHARACTER_WIDTH: 16,//
    SOURCE_TILE_SIZE: 16,
    FRAME_RATE: 16, //16,//1000/60 (60 fps)
    MOVE_SPEED: 3,
    varRenderImageCache: {}, //stores the final images (individual frames + processing)
    varMovementPaths: [],
	varLastFrame: new Date()
};


R.render = function() {
	let timeNow = new Date();
	let delta = timeNow - R.varLastFrame;
	//dodgy limit on the max frame rate of the game.
	if(delta<16){
		return;
	}
	R.varLastFrame = timeNow;
	R.varCurrentFrame += R.FRAME_RATE;
	R.varCurrentFrame = R.varCurrentFrame % 9007199254740000; //pedantic prevent overflow  - 9007199254740993
	Ortho.Render();
};
//draws an image onto the canvas. options are [x,y], [x,y,width,height]
//[sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight]
//processing - function that takes image data and manipulates it
//imageName is the key that will be stored in the cache (post processing)
R.drawCanvasAsync = function(canvasTo, imageName, imgUrl,
    sourceOffsetX,
    sourceOffsetY,
    sourceWidth,
    sourceHeight,
    desitnationOffsetX,
    desitnationOffsetY,
    destinationWidth,
    destinationHeight,
    processing) {
    let canvasContextTo = canvasTo.getContext('2d');
    let inCache = R.varRenderImageCache.hasOwnProperty(imageName);
    if (inCache) {
        canvasContextTo.drawImage(R.varRenderImageCache[imageName], desitnationOffsetX, desitnationOffsetY);
    } else {
        let processImageIntoCanvas = function(imageObj) {
            if (!R.varRenderImageCache.hasOwnProperty(imageName)) {
				//source canvas is cropped and has processing applied
                let sourceCanvas = document.createElement('canvas');
                sourceCanvas.width = sourceWidth;
                sourceCanvas.height = sourceHeight;
                sourceCanvas.getContext('2d').drawImage(imageObj,
                    sourceOffsetX,
                    sourceOffsetY,
                    sourceWidth,
                    sourceHeight,
                    0,
                    0,
                    sourceWidth,
                    sourceHeight);
                //processing is done on source image
                let imageData = sourceCanvas.getContext('2d').getImageData(0, 0, sourceWidth, sourceHeight);
                let data = imageData.data;
                processing(data);
                sourceCanvas.getContext('2d').putImageData(imageData, 0, 0);
				//final target canvas, after processing is done
                let newCanvas = document.createElement('canvas');
                newCanvas.width = destinationWidth;
                newCanvas.height = destinationHeight;
                newCanvas.getContext('2d').drawImage(sourceCanvas,
                    0,
                    0,
                    sourceWidth,
                    sourceHeight,
                    0,
                    0,
                    destinationWidth,
                    destinationHeight);
                R.varRenderImageCache[imageName] = newCanvas; //cache final image
            }
            canvasContextTo.drawImage(R.varRenderImageCache[imageName], desitnationOffsetX, desitnationOffsetY);
        };
        //finds the image from the existing HTML and pushes it into the cache
        let slasIdx = imgUrl.lastIndexOf("/");
        let dotIdx = imgUrl.lastIndexOf(".");
        let lookingForName = imgUrl.substring(slasIdx + 1, dotIdx);
        let embedded = document.getElementsByTagName("img");
        for (let e = 0; e < embedded.length; e += 1) {
            let eName = embedded[e].name;
            if (eName === lookingForName) {
                processImageIntoCanvas(embedded[e]);
                return true;
            }
        }
        //did not find the image pre-loaded. this version of the code does not load the image dynamically
        console.log("Image not found, element name: ",lookingForName," url: ",imgUrl);
    }
    return inCache;
};

//makes a URL into text-only. performs "dumb" escaping only on dot and slash
R.escapeURL = function(url) {
    let escapeURL = url.replace(/\./g, "dot");
    escapeURL = escapeURL.replace(/\//g, "slash");
    escapeURL = escapeURL.replace(/\\/g, "slash");
    return escapeURL;
};
//sets a given img tag to the correct displayed image
//stores the status against the element
R.getImageFrameIdx = function(status){
    let frames = 3;
    if (status == "idle") {
        frames = 2;
    }
    if (status == "wait") {
        frames = 1;
    }
    let frame = (Math.floor(R.varCurrentFrame / (1000 * 0.2))) % frames;
	return frame;
};
R.setImage = function(imgElement, cl, status, player_state) {
	imgElement.width = R.CHARACTER_WIDTH;
	imgElement.height = R.CHARACTER_HEIGHT;
    let baseUrl = "./i/u/";
    cl = cl.toLowerCase().replace(" ", ""); //ch.cl;
    let url = baseUrl + cl + ".png";
    let colour = "red";
    if (player_state === Sy.PLAYER) {
        colour = "blue";
    }
    let ctx = imgElement;
    let xOff = 0;
    let yOff = R.CHARACTER_HEIGHT*2;
    if (status == "left") {
        yOff = R.CHARACTER_HEIGHT*3;
    }
    if (status == "right") {
        yOff = R.CHARACTER_HEIGHT;
    }
    if (status == "up") {
        yOff = 0;
    }
    if (status == "idle") {
        xOff += R.CHARACTER_WIDTH;
    }
    if (status == "wait") {
        xOff += R.CHARACTER_WIDTH;
    }
    let frame = R.getImageFrameIdx(status);
    xOff += frame * 16;
    R.drawCanvasAsync(ctx, cl + colour + status + frame,
					  url,
					  xOff, yOff, R.CHARACTER_WIDTH, R.CHARACTER_HEIGHT, 0, 0,
					  R.CHARACTER_WIDTH, R.CHARACTER_HEIGHT, function(data) {
        for (let i = 0; i < data.length; i += 4) {
            //red green blue alpha
            //apply transparency
            //128 160 128
            //110 144 109
            if (data[i] === 128 && data[i + 1] === 160 && data[i + 2] === 128 ||
                data[i] === 110 && data[i + 1] === 144 && data[i + 2] === 109 ||
                data[i] === data[0] && data[i + 1] === data[1] && data[i + 2] === data[2]) {
                data[i + 3] = 0;
                continue;
            }
            //red and blue adjustments
            if (status !== "wait"&& status !== "hit") {
                if (colour === "red") {
                    let hsv = R.rgb2hsv(data[i], data[i + 1], data[i + 2]);
                    let col = R.classify(hsv);
                    if (col === "Blues") { //find blue pixels
                        hsv.h = R.hueShift(hsv.h, 120.0); //shift to red
                        let rgb = R.hsv2rgb(hsv);
                        data[i] = rgb.r;
                        data[i + 1] = rgb.g;
                        data[i + 2] = rgb.b;
                    }
                }
            }
            if (status === "wait") {
                //grey for waiting
                let average = (data[i + 2] + data[i + 1] + data[i]) / 3;
                data[i] = average * 0.8;
                data[i + 1] = average * 0.8;
                data[i + 2] = average * 0.8;
            }
            //hit effect, flash non-clear pixels white
            if (status === "hit" && data[i + 3]>128) {
                //grey for waiting
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
            }
            
        }
    });
};
//adjusts a hue by the given amount
R.hueShift = function(h, s) {
    h += s;
    while (h >= 360.0) {
        h -= 360.0;
    }
    while (h < 0.0) {
        h += 360.0;
    }
    return h;
};
//converts hsv to rgb colour (object with .r,.b,.g values)
R.hsv2rgb = function(hsv) {
    let rgb = {};
    if (hsv.s === 0) {
        rgb.r = rgb.g = rgb.b = Math.round(hsv.v * 2.55);
    } else {
        hsv.h /= 60;
        hsv.s /= 100;
        hsv.v /= 100;
        let i = Math.floor(hsv.h);
        let f = hsv.h - i;
        let p = hsv.v * (1 - hsv.s);
        let q = hsv.v * (1 - hsv.s * f);
        let t = hsv.v * (1 - hsv.s * (1 - f));
        switch (i) {
            case 0:
                rgb.r = hsv.v;
                rgb.g = t;
                rgb.b = p;
                break;
            case 1:
                rgb.r = q;
                rgb.g = hsv.v;
                rgb.b = p;
                break;
            case 2:
                rgb.r = p;
                rgb.g = hsv.v;
                rgb.b = t;
                break;
            case 3:
                rgb.r = p;
                rgb.g = q;
                rgb.b = hsv.v;
                break;
            case 4:
                rgb.r = t;
                rgb.g = p;
                rgb.b = hsv.v;
                break;
            default:
                rgb.r = hsv.v;
                rgb.g = p;
                rgb.b = q;
                break;
        }
        rgb.r = Math.round(rgb.r * 255);
        rgb.g = Math.round(rgb.g * 255);
        rgb.b = Math.round(rgb.b * 255);
    }
    return rgb;
};
//converts rgb to hsv (object with .h,.s,.v values)
R.rgb2hsv = function(r, g, b) {
    r = r / 255;
    g = g / 255;
    b = b / 255;
    let rr, gg, bb, h, s;
    let v = Math.max(r, g, b);
    let diff = v - Math.min(r, g, b);
    let diffc = function(c) {
        return (v - c) / 6 / diff + 1 / 2;
    };
    if (diff === 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(r);
        gg = diffc(g);
        bb = diffc(b);
        if (r === v) {
            h = bb - gg;
        } else if (g === v) {
            h = (1 / 3) + rr - bb;
        } else if (b === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        } else if (h > 1) {
            h -= 1;
        }
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        v: Math.round(v * 100)
    };
};
//takes in a hsv colour and returns the english word of that colour
R.classify = function(c) {
    let hue = c.h;
    /*
    let sat = c.s;
    let lgt = c.v;
    if (lgt < 0.2)  return "Blacks";
    if (lgt > 0.8)  return "Whites";
    if (sat < 0.25) return "Grays";*/
    if (hue < 30) {
        return "Reds";
    }
    if (hue < 90) {
        return "Yellows";
    }
    if (hue < 150) {
        return "Greens";
    }
    if (hue < 210) {
        return "Blues"; //"Cyans";
    }
    if (hue < 270) {
        return "Blues";
    }
    if (hue < 330) {
        return "Magentas";
    }
    return "Reds";
};
//updates the movement paths currently in the queue, returns array of rendering elements to update
//returns array of ch,image,x,y to render
R.updateMovementPaths = function() {
	let res = [];
    for (let i = 0; i < R.varMovementPaths.length; i += 1) {
        let pathData = R.varMovementPaths[i];
        let path = pathData.path;
        let selectedCh = pathData.character;
        if (path.length > 0) {
            let pathX = path[path.length - 1][0];
            let pathY = path[path.length - 1][1];
            if (pathData.varMoveToCoordinateX !== pathX || pathData.varMoveToCoordinateY !== pathY) {
                pathData.varMoveFromCoordinateX = pathData.varMoveToCoordinateX;
                pathData.varMoveFromCoordinateY = pathData.varMoveToCoordinateY;
                pathData.varMoveFromX = (pathData.varMoveFromCoordinateX) * R.TILE_WIDTH;
                pathData.varMoveFromY = (pathData.varMoveFromCoordinateY) * R.TILE_HEIGHT;
            }
            pathData.varMoveToCoordinateX = pathX;
            pathData.varMoveToCoordinateY = pathY;
            pathData.varMoveToX = pathData.varMoveToCoordinateX * R.TILE_WIDTH;
            pathData.varMoveToY = pathData.varMoveToCoordinateY * R.TILE_HEIGHT;
            if (pathData.varMoveFromX < pathData.varMoveToX) {
                if (pathData.varMoveToX - pathData.varMoveFromX > R.MOVE_SPEED) {
                    pathData.varMoveFromX += (R.MOVE_SPEED - 1);
                } else {
                    pathData.varMoveFromX = pathData.varMoveToX;
                }
				res.push({
					ch:selectedCh,
					image:"right",
					x:pathData.varMoveFromX,
					y:pathData.varMoveFromY,
					tgtX:pathData.varMoveToCoordinateX,
					tgtY:pathData.varMoveToCoordinateY
				});
            }
            if (pathData.varMoveFromX > pathData.varMoveToX) {
                if (pathData.varMoveFromX - pathData.varMoveToX > R.MOVE_SPEED) {
                    pathData.varMoveFromX -= (R.MOVE_SPEED - 1);
                } else {
                    pathData.varMoveFromX = pathData.varMoveToX;
                }
                res.push({
					ch:selectedCh,
					image:"left",
					x:pathData.varMoveFromX,
					y:pathData.varMoveFromY,
					tgtX:pathData.varMoveToCoordinateX,
					tgtY:pathData.varMoveToCoordinateY
				});
			}
            if (pathData.varMoveFromY < pathData.varMoveToY) {
                if (pathData.varMoveToY - pathData.varMoveFromY > R.MOVE_SPEED) {
                    pathData.varMoveFromY += (R.MOVE_SPEED - 1);
                } else {
                    pathData.varMoveFromY = pathData.varMoveToY;
                }
                res.push({
					ch:selectedCh,
					image:"down",
					x:pathData.varMoveFromX,
					y:pathData.varMoveFromY,
					tgtX:pathData.varMoveToCoordinateX,
					tgtY:pathData.varMoveToCoordinateY
				});
			}
            if (pathData.varMoveFromY > pathData.varMoveToY) {
                if (pathData.varMoveFromY - pathData.varMoveToY > R.MOVE_SPEED) {
                    pathData.varMoveFromY -= (R.MOVE_SPEED - 1);
                } else {
                    pathData.varMoveFromY = pathData.varMoveToY;
                }
                res.push({
					ch:selectedCh,
					image:"up",
					x:pathData.varMoveFromX,
					y:pathData.varMoveFromY,
					tgtX:pathData.varMoveToCoordinateX,
					tgtY:pathData.varMoveToCoordinateY
				});
			}
            if (pathData.varMoveFromX === pathData.varMoveToX && pathData.varMoveFromY === pathData.varMoveToY) {
                path.pop();
            }
        } else {
			res.push({
				ch:selectedCh,
				image:"idle",
				x:pathData.varMoveToX,
				y:pathData.varMoveToY,
					tgtX:pathData.varMoveToCoordinateX,
					tgtY:pathData.varMoveToCoordinateY
			});
        }
    }
	return res;
};
//adds a movement path to the queue
R.addMovementPath = function(ch, path) {
    let pathData = {
        path: path,
        character: ch,
        varMoveToX: -1,
        varMoveToY: -1,
        varMoveFromX: -1,
        varMoveFromY: -1,
        varMoveToCoordinateX: -1,
        varMoveToCoordinateY: -1,
        varMoveFromCoordinateX: ch.x,
        varMoveFromCoordinateY: ch.y
    };
    R.varMovementPaths.push(pathData); //push the initial object so the view can be updated
    //now that the view is updated, compute relative positions
    pathData.varMoveFromX = (pathData.varMoveFromCoordinateX) * R.TILE_WIDTH;
    pathData.varMoveFromY = (pathData.varMoveFromCoordinateY) * R.TILE_HEIGHT;
    let pathX = path[path.length - 1][0];
    let pathY = path[path.length - 1][1];
    pathData.varMoveToCoordinateX = pathX;
    pathData.varMoveToCoordinateY = pathY;
    pathData.varMoveToX = (pathData.varMoveToCoordinateX) * R.TILE_WIDTH;
    pathData.varMoveToY = (pathData.varMoveToCoordinateY) * R.TILE_HEIGHT;
};
//returns true if there are no more movement paths being animated
R.movementPathsComplete = function() {
    for (let i = 0; i < R.varMovementPaths.length; i += 1) {
        let pathData = R.varMovementPaths[i];
        if (pathData.path.length > 0) {
            return false;
        }
    }
    return true;
};
//returns true if the unit has a moement path on the current queue
R.unitIsMoving = function(ch) {
    for (let i = 0; i < R.varMovementPaths.length; i += 1) {
        let pathData = R.varMovementPaths[i];
        if (pathData.character === ch) {
            return true;
        }
    }
    return false;
};



var Tch = {
    tileX: -1, //tile x,y of map if inside the map
    tileY: -1,
	rawX:-1,
	rawY:-1,
    hoverButton: Sy.BUTTON_NONE, //populated by the renderer if there is a hover over a button
};
Tch.init = function() {
    document.getElementById("canvas3d").addEventListener("pointermove", Tch.handleHover);
    document.getElementById("canvas3d").addEventListener("pointerup", Tch.handleRelease);
    document.getElementById("canvas3d").addEventListener("wheel", Tch.handleWheel,{passive:true});
};
Tch.handleWheel = function(e) {
	//can use deltaY, but seems inconsistent..console.log(Ortho.cameraOrtho.defaultZoom,e.deltaY );
	if(Ortho.hasOwnProperty("cameraOrtho") &&Ortho.cameraOrtho.hasOwnProperty("defaultZoom")){
		if(e.deltaY > 0){
			Ortho.cameraOrtho.defaultZoom *= 0.9;	
		}else{
			Ortho.cameraOrtho.defaultZoom *= 1.1;
		}
	}
	if(Ortho.cameraOrtho.defaultZoom<0.1){
		Ortho.cameraOrtho.defaultZoom=0.1;
	}
	if(Ortho.cameraOrtho.defaultZoom>10){
		Ortho.cameraOrtho.defaultZoom=10;
	}
};
Tch.handleHover = function(e) {
	if(Cs.varIsRunning){
		return;
	}
	let rect = e.target.getBoundingClientRect();//rect of the canvas elem (clientX is relative to screen)
	let x = e.clientX - rect.left; //x position within the element.
	let y = e.clientY - rect.top;  //y position within the element.
    Tch.updateMouseCoords(x,y);
    if (Tch.tileX < 0 || Tch.tileY < 0) {
        return;
    }
    Sy.handleLocalInput({
        keyCode: Sy.BUTTON_HOVER,
        x: Tch.tileX,
        y: Tch.tileY
    });
};
Tch.handleRelease = function(e) {
	let rect = e.target.getBoundingClientRect();//rect of the canvas elem (clientX is relative to screen)
	let x = e.clientX - rect.left; //x position within the element.
	let y = e.clientY - rect.top;  //y position within the element.
    Tch.updateMouseCoords(x, y);
    if (Tch.hoverButton != Sy.BUTTON_NONE) {
        Sy.handleLocalInput({
            keyCode: Tch.hoverButton
        });
    }
    //e.which = 1,2,3 (left, middle, right)
	//can handle "b" regardless of click location
    if (e.which === 3) {
        Sy.handleLocalInput({
            keyCode: Sy.BUTTON_RIGHT_CLICK, //b
            x: Tch.tileX,
            y: Tch.tileY
        });
    }
	//only handly "a" if it's within the grid
    if (Tch.tileX < 0 || Tch.tileY < 0) {
		//there was a left click, but it's outside the grid, treat it as a right-click
		if (e.which === 1) {
			if(Cs&&Cs.varIsRunning){
				Sy.handleLocalInput({
					keyCode: Sy.BUTTON_LEFT_CLICK, //a
					x: Tch.tileX,
					y: Tch.tileY
				});
				return;//don't check the grid if a Cs is running, keep it as left click
			}
			Sy.handleLocalInput({
				keyCode: Sy.BUTTON_RIGHT_CLICK, //b
				x: Tch.tileX,
				y: Tch.tileY
			});
		}
        return;
    }
    if (e.which === 1) {
        Sy.handleLocalInput({
            keyCode: Sy.BUTTON_LEFT_CLICK, //a
            x: Tch.tileX,
            y: Tch.tileY
        });
    }
};
Tch.updateMouseCoords = function(x, y) {
    if (!Ortho.hasOwnProperty("scene")) {
        Tch.tileX = -1;
        Tch.tileY = -1;
        return;
    }
	Tch.rawX = x;
	Tch.rawY = R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y-y;
	if(!Ortho.hasOwnProperty("Tch")){
		Ortho.Tch = {};
		Ortho.Tch.pointer = new THREE.Vector2();
		Ortho.Tch.size = {x:R.RENDER_DIMENSIONS().width ,y:R.RENDER_DIMENSIONS().height+R.RENDER_DIMENSIONS().y };
		Ortho.Tch.raycaster = new THREE.Raycaster();
	}
	//(-1 to +1) for both components
	Ortho.Tch.pointer .set( ( x / Ortho.Tch.size.x )*2-1 ,  -( y / Ortho.Tch.size.y)*2+1  );	
	Ortho.Tch.raycaster.setFromCamera( Ortho.Tch.pointer, Ortho.cameraOrtho );
	const intersects = Ortho.Tch.raycaster.intersectObject( Ortho.bgPlane );
	if(intersects.length){
		const point = intersects[0].point;
		const localPoint = Ortho.bgPlane.worldToLocal(point);
		localPoint.y=R.RENDER_DIMENSIONS().height-localPoint.y;//flip since it goes from max->0 not 0->max
		let canvW = R.RENDER_DIMENSIONS().width;
		let canvH = R.RENDER_DIMENSIONS().height;
		let percentX = localPoint.x / canvW;
		let percentY = localPoint.y / canvH;
		Tch.tileX = Math.floor(R.MAP_WIDTH() * percentX);
		Tch.tileY = Math.floor(R.MAP_HEIGHT() * percentY);
	}else{
        Tch.tileX = -1;
        Tch.tileY = -1;
	}
};

R.getImageForMap = function(isFg){
	let name = "bottom";
	switch(Sy.map.name){
			case "level0":
				name = "1";
				break;
			case "level1":
				name = "2";
				break;
			case "level2":
				name = "3";
				break;
			case "level3":
				name = "4";
				break;
			case "level4":
				name = "5";
				break;
			case "level5":
				name = "6";
				break;
			case "level6":
				name = "7";
				break;
			case "level7":
				name = "8";
				break;
			case "level8":
				name = "9";
				break;
			case "level9":
				name = "10";
				break;
		default:
			return "11";
	}
	if(isFg){
		name += "_top";
	}
	return  "./eb/"+name+".png";
};
R.autoTile = function(canv, terrain, tileX, tileY, isFg) {
	let imgUrl = R.getImageForMap(isFg);
	let tileCacheName = Sy.map.name+"_"+R.escapeURL(imgUrl)+"_"+tileX+"_"+tileY;
	R.drawCanvasAsync(canv,
		tileCacheName,
		imgUrl,
		tileX*R.SOURCE_TILE_SIZE,
		tileY*R.SOURCE_TILE_SIZE,
		R.SOURCE_TILE_SIZE,
		R.SOURCE_TILE_SIZE,
		R.TILE_WIDTH * tileX,
		R.TILE_HEIGHT * tileY,
		R.TILE_WIDTH,
		R.TILE_HEIGHT,
		function() {});	
};

//renders text onto a canvas. canvas will be resized to contain the text
R.renderText = function(canvas,text){
	const startCharacter = " ";
	//let endCharacter = "~";
	const imgWidth = 120;
	//let imgHeight = 64;
	const imgSrc = "./eb/font.png";
	const characterWidth = 8;
	const characterHeight = 8;
	//figure out the dimensions
	let runningWidth = characterWidth;
	let runningHeight = characterHeight;
	let maxWidth = runningWidth;
	for(let i=0;i<text.length;i+=1){
		let ch = text[i];
		if(ch!="\n"){
			runningWidth+=characterWidth;
		}
		if(runningWidth>maxWidth){
			maxWidth = runningWidth;
		}
		if(ch=="\n"){
			runningHeight+=characterHeight;
			runningWidth = characterWidth;
			continue;
		}
	}
	canvas.width = maxWidth;
	canvas.height = runningHeight;
	//draw the text
	let x=0;
	let y=0;
	let getDimForCharacter = function(character){
		let columns = imgWidth/characterWidth;//15
		let ascii = character.charCodeAt(0);
		let startAscii =startCharacter.charCodeAt(0);//32
		let idx = ascii-startAscii;
		let res = {x:0,y:0};
		res.y = Math.floor(idx / columns);
		res.x = idx % columns;
		res.x*=characterWidth;
		res.y*=characterHeight;
		return res;
	};
	for(let i=0;i<text.length;i+=1){
		let ch = text[i];
		if(ch=="\n"){
			x=0;
			y+=characterHeight;
			continue;
		}
		x+=characterWidth;
		let dim = getDimForCharacter(ch);
		let offX = dim.x;
		let offY = dim.y;
		R.drawCanvasAsync(canvas,"font_"+ch,imgSrc,
							offX,offY,characterWidth,characterHeight,
							x,y,characterWidth,characterHeight,function(){});
	}
	
	
	
};

window.Ortho = Ortho;
window.R = R;
window.Tch = Tch;


