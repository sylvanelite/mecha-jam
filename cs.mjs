
import * as THREE from './three.module.js';

let Cs = {
    PLAYER: 0,
    ENEMY: 1,
    POSITION_LEFT: 38,
    POSITION_LEFT_Y: 40,//below
    POSITION_RIGHT: 154,
    POSITION_RIGHT_Y: 40,//below
    POSITION_FAR_RIGHT: 154,
    POSITION_FAR_RIGHT_Y: 152,//above
    POSITION_FAR_LEFT: 38,
    POSITION_FAR_LEFT_Y: 152,//above
    POSITION_OFFSCREEN_LEFT: -100,
    POSITION_OFFSCREEN_LEFT_Y: -100,
    POSITION_OFFSCREEN_RIGHT: 500,
    POSITION_OFFSCREEN_RIGHT_Y: -100,
	CHARACTER_WIDTH: 8,
    TEXT_BOX: {},
    SCRIPT_INDEX: 0,
    SCRIPT: [],
    varWaitForA: false,
    varCallbackA: function () {},
    varTemporaryCharacters: [],
	varChElems: {},
    varIsRunning: false,
    varTimer:0
};

Cs.initial = [
    ['TEXT_BOX', {}],
    ['SCRIPT_INDEX', 0],
    ['varWaitForA', false],
    ['varCallbackA', function () {}],
    ['varTemporaryCharacters', []],
    ['varChElems', {}],
    ['varIsRunning',false],
    ['varTimer',0]
];

Cs.remove = function(obj){
	delete Cs.varChElems[obj.id];
	Ortho.csLayer.remove(obj.sprite);//TODO: also remove the reference?
};
Cs.setAlpha = function(obj,amount){
	if(obj.hasOwnProperty("sprite")){
		obj.sprite.material.transparent = true;
		obj.sprite.material.opacity = amount; 
		obj.sprite.visible = true; 
	}
};
Cs.text = function(obj,text){
	if(text!==undefined){
		obj.text = text;
        Cs.renderText(text);
	}
	if(!obj.hasOwnProperty("text")){
		obj.text="";
	}
	//(text is optional, return the existing value if not supplied)
	return obj.text;
};
Cs.renderText = function (text){
    if(Ortho.textLayer.cacheKey!="cutscene"){
        Ortho.textLayer.cacheKey = "cutscene";
    }
    //clear out whatever was rendered previously
    for (let i=Ortho.textLayer.children.length-1;i>=0;i-=1){
        Ortho.textLayer.children[i].clear();
        Ortho.textLayer.remove(Ortho.textLayer.children[i]);
    }
    //render the stats
    let canvas = document.createElement("canvas");
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
    sprite.position.x=32+canvas.width/2;
    sprite.position.y=R.RENDER_DIMENSIONS().height/2;
    //draw backing image
    
    let bgCanv = document.createElement('canvas');
    bgCanv.width = 180;
    bgCanv.height = 48;
    R.drawCanvasAsync(bgCanv, "textbox", "./i/textbox.png",
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
};

//fades out the whole screen, does not wait for input
Cs.fadeScreenOut = function () {
    //always the last step, destroy the scene
    for (let i=Ortho.csLayer.children.length-1;i>=0;i-=1){
        Ortho.csLayer.children[i].clear();
        Ortho.csLayer.remove(Ortho.csLayer.children[i]);
    }
    //clear out whatever text was rendered previously
    for (let i=Ortho.textLayer.children.length-1;i>=0;i-=1){
        Ortho.textLayer.children[i].clear();
        Ortho.textLayer.remove(Ortho.textLayer.children[i]);
    }
    Cs.waitForNothing();
};

//makes a character say text. No other actions can happen while text is scrolling
Cs.talk = function (name, text) {
    Cs.text(Cs.TEXT_BOX,"");
    let allCh = Object.keys(Cs.varChElems);
	for(let i=0;i<allCh.length;i+=1){
		let chId = allCh[i];
		let ch = Cs.varChElems[chId];
        if (chId != "ch_" + name) {
            Cs.setAlpha(ch, 0.4);
        }
	}
    Cs.setAlpha(Cs.varChElems["ch_" + name], 1);
    let words = text.split(" ");
    let nextWord = words.shift();
    let charactersOnLine = 0;
    const lineWidth = 23;
    let timeDuration = 50;
    let place_characters = function () {
        //skip character-by-character text
        Cs.waitForA(function () {
            timeDuration = 1;
        });
        let exsitingText = Cs.text(Cs.TEXT_BOX);
        if (nextWord.length < 1) {//if we're done with the current word
            if (words.length > 0) {//and there's still words remaining
                nextWord = words.shift();
                Cs.text(Cs.TEXT_BOX,exsitingText + " ");
                charactersOnLine += 1;
            }
        } else {//we're not done with the current word, show a single character
            //if it won't fit on the current line, go to the next line instead
            if (charactersOnLine + nextWord.length >= lineWidth) {
                exsitingText = Cs.text(Cs.TEXT_BOX);
				Cs.text(Cs.TEXT_BOX,exsitingText + "\n");
                charactersOnLine = 0;
            } else {
                Cs.text(Cs.TEXT_BOX,exsitingText + nextWord.charAt(0));
                nextWord = nextWord.substr(1);
                charactersOnLine += 1;
            }
        }
        //if there's no more characters in nextWord, and there's no more words, wait for A
        if (nextWord.length < 1 && words.length < 1) {
            Cs.waitForA(function () {
                Cs.waitForNothing();
            });
        } else {
            //otherwise, keep pushing characters onto the screen
            Cs.varTimer = setTimeout(place_characters, timeDuration);
        }
    };
    clearTimeout(Cs.varTimer);
    place_characters();
};

//prepares a character to talk or be displayed. 
Cs.createCharacter = function (name, portraitPosition) {
	//TODO: this function needs a rendering method (not just img elem)
    let chElem = Cs.getImgElem("ch_" + name);
    Cs.applyPortraitPositionToCharacter(chElem, portraitPosition);
    Cs.waitForNothing();
};

//takes an array of characters and an arry of position, moves characters to those positions
Cs.moveCharacters = function (characters, portraitPositions) {
    characters = characters.split(",");
    portraitPositions = portraitPositions.split(",");
    for (let i = 0; i < characters.length; i += 1) {
        let name = characters[i];
        let chElem = Cs.varChElems["ch_" + name];
        Cs.applyPortraitPositionToCharacter(chElem, portraitPositions[i]);
    }
    Cs.waitForNothing();
};

//moves a pre-existing character to the given position
Cs.applyPortraitPositionToCharacter = function (chElem, portraitPosition) {	
	let portraitWidth = 64;//note: same as in get Img dimensions
	let portraitHeight = 64;
    portraitPosition = "POSITION_" + portraitPosition.toUpperCase();
    chElem.sprite.position.y= Cs[portraitPosition+"_Y"]+portraitHeight/2;
    chElem.sprite.position.x= Cs[portraitPosition]+portraitWidth/2;
};

//takes an array of characters and an arry of position, fades them all in
Cs.fadeCharactersIn = function (characters, portraitPositions) {
    characters = characters.split(",");
    portraitPositions = portraitPositions.split(",");
    for (let i = 0; i < characters.length; i += 1) {
        let name = characters[i];
        let chElem = Cs.varChElems["ch_" + name];
        //fade in
        if(chElem.hasOwnProperty("sprite")){
            chElem.sprite.material.transparent = true;
            chElem.sprite.material.opacity = 1; 
            chElem.sprite.visible = true; 
        }
        Cs.applyPortraitPositionToCharacter(chElem, portraitPositions[i]);
    }
	Cs.waitForNothing();
};

//takes an array of characters and an arry of position, fades them all out
Cs.fadeCharactersOut = function (characters) {
    characters = characters.split(",");
    for (let i = 0; i < characters.length; i += 1) {
        let name = characters[i];
        let chElem = Cs.varChElems["ch_" + name];
        //fade out
        if(chElem.hasOwnProperty("sprite")){
            chElem.sprite.material.transparent = true;
            chElem.sprite.material.opacity = 0; 
            chElem.sprite.visible = false; 
        }
    }
	Cs.waitForNothing();
};

//safely creates an element and assigns the correct values
Cs.getImgElem = function (elemId) {
	let res = {
		id:elemId
	};
	Cs.varChElems[elemId] = res;	
	let portraitWidth = 64;
	let portraitHeight = 64;
	let canvas = document.createElement('canvas');
	canvas.width = portraitWidth;
	canvas.height = portraitHeight;
	let src = "ch_unknown";
	if(elemId=="ch_aqua"||
		elemId=="ch_brown"||
		elemId=="ch_pink"||
		elemId=="ch_purple"){
		src = elemId;
	}
	R.drawCanvasAsync(canvas, elemId, "./i/face/"+src+".png",
			0, 0, portraitWidth, portraitWidth,
			0, 0, portraitWidth, portraitWidth,
			function() {});
	let mat = Ortho.setCanvasMaterial(canvas,elemId);//NOTE: a new material is needed even for portraits of the same image
	let sprite = new THREE.Sprite( mat );
	sprite.renderOrder = Ortho.RENDER_ORDER.UI;
	sprite.scale.x = portraitWidth;
	sprite.scale.y = portraitHeight;
	Ortho.csLayer.add(sprite);
	res.sprite = sprite;
	return res;
};

//ends a cutscene skipping anything that may have been left
Cs.endCutScene = function () {
    for (let i = 0; Cs.SCRIPT_INDEX < Cs.SCRIPT.length; Cs.SCRIPT_INDEX += 1) {
        Cs.cutSceneLoop();
    }
	let chNames = Object.keys(Cs.varChElems);
    for(let i=0;i<chNames;i+=1){
		let ch = Cs.varChElems[chNames[i]];
		Cs.remove(ch);
	}
    for (let i = 0; i < Cs.varTemporaryCharacters.length; i += 1) {
        let ch = Cs.varTemporaryCharacters[i];
        if(ch.hasOwnProperty("sprite3d")){
            ch.sprite3d.sprite.clear();
            Ortho.spriteGroup.remove(ch.sprite3d.sprite);
        }
        if (ch.player_state == Sy.PLAYER) {
            for (let j = 0; j < Sy.varPlayerCharacters.length; j += 1) {
                if (ch === Sy.varPlayerCharacters[j]) {
                    Sy.varPlayerCharacters.splice(j, 1);
                    break;
                }
            }
        }
        if (ch.player_state == Sy.ENEMY) {
            for (let j = 0; j < Sy.varEnemyCharacters.length; j += 1) {
                if (ch === Sy.varEnemyCharacters[j]) {
                    Sy.varEnemyCharacters.splice(j, 1);
                    break;
                }
            }
        }
    }
    clearTimeout(Cs.varTimer);
    Cs.SCRIPT = [];
};

//waits for the user to press 'a' before calling the function
Cs.waitForA = function (callback) {
    Cs.varWaitForA = true;
    Cs.varCallbackA = callback;
};

//completes the current scripted task and moves onto the next
Cs.waitForNothing = function () {
    Cs.SCRIPT_INDEX += 1;
    Cs.cutSceneLoop();
};

Cs.cutSceneLoop = function () {
    if (Cs.SCRIPT_INDEX < Cs.SCRIPT.length) {
        let instruction = Cs.SCRIPT[Cs.SCRIPT_INDEX];
        let functionPart = instruction.split(": ", 2)[0];
        let functionArray = functionPart.split(" ");
        functionPart = functionArray[0];
        for (let i = 1; i < functionArray.length; i += 1) {
            functionArray[i] = functionArray[i].substr(0, 1).toUpperCase() + functionArray[i].substr(1);
            functionPart += functionArray[i];
        }
        let parametersPart = instruction.split(": ", 2)[1];
        if (instruction.split(": ", 2).length > 1) {
            let parameters = parametersPart.split("|");
            Cs[functionPart].apply(null, parameters);
        } else {
            Cs[functionPart]();
        }
    } else {
        Cs.endCutScene();
    }
};

Cs.reset = function () {
	//TODO: here
    //clean up if this has run previously
	let chNames = Object.keys(Cs.varChElems);
    for(let i=0;i<chNames;i+=1){
		let ch = Cs.varChElems[chNames[i]];
		Cs.remove(ch);
	}
	
    for (let i = 0; i < Cs.initial.length; i += 1) {
        let key = Cs.initial[i][0];
        let val = Cs.initial[i][1];
        Cs[key] = val;
    }
    //start the cut scene
    Cs.cutSceneLoop();
};

//returns true if there is a cutscene to play, or if one is playing
Cs.checkAndUpdate = function (input) {
    let result =false;
    if (Cs.varWaitForA && input == Sy.BUTTON_A) {
        Cs.varWaitForA = false;
        Cs.varCallbackA();
        Cs.varCallbackA = function () {};
    }
    if (input == Sy.BUTTON_B) {
        let skipb = (Cs.SCRIPT.length > 0);
        Cs.endCutScene();
        if (skipb) {
            result= true;
        }
    }
    if(!result){
        result = Cs.checkEvents();
    }
    Cs.varIsRunning = result;
    return result;
};

//checks for anything that triggers a cutscene, and returns true if there is one
Cs.checkEvents = function () {
    if (Cs.SCRIPT.length > 0) { //keep current event going
        return true;
    }
    //scan for next event
    for (let i = 0; i < CsData.events.length; i += 1) {
        let event = CsData.events[i];
        let script = [];
        let conditionDynamic = event.condition.split(" ");
        let conditionStatic = conditionDynamic.shift();
        if (conditionStatic == "turn") { //if the turn matches
            let turnRequest = parseInt(conditionDynamic[0], 10);
            if (Sy.varTurnCount == turnRequest) {
                script = event.script;
            }
        }

        if (conditionStatic == "epilogue") {
            if (Sy.STATE_DISPLAY_TURN == Sy.CurrentState &&
                Sy.checkForWin().gameFinished &&
                Sy.checkForWin().youWin) {
                script = event.script;
            }
        }

        if (conditionStatic == "talk") {
            let characters = Sy.varPlayerCharacters;
            for (let j = 0; j < characters.length; j += 1) {
                let ch1 = characters[j];
                for (let k = j + 1; k < characters.length; k += 1) {
                    let ch2 = characters[k];
                    if (ch1.player_state!=Sy.NO_PLAYER_STATE&&ch2.player_state!=Sy.NO_PLAYER_STATE&&
                        ((ch1.x == ch2.x && (ch1.y == ch2.y + 1 || ch1.y == ch2.y - 1)) ||
                            (ch1.y == ch2.y && (ch1.x == ch2.x + 1 || ch1.x == ch2.x - 1))) &&
                        ((ch1.name == conditionDynamic[0] && ch2.name == conditionDynamic[1]) ||
                            (ch2.name == conditionDynamic[0] && ch1.name == conditionDynamic[1]) ||
                            (conditionDynamic[0] == "anyone" && ch1.name == conditionDynamic[1]) ||
                            (conditionDynamic[0] == "anyone" && ch2.name == conditionDynamic[1]) ||
                            (conditionDynamic[1] == "anyone" && ch1.name == conditionDynamic[0]) ||
                            (conditionDynamic[1] == "anyone" && ch2.name == conditionDynamic[0]) ||
                            (conditionDynamic[0] == "anyone" && conditionDynamic[1] == "anyone")) &&
                        (ch1.hasMoved && ch2.hasMoved)) {
                        script = event.script;
                    }
                }
            }
        }

        if (script.length > 0) {
            CsData.events[i].script = []; //null out script so it only plays once
            Cs.SCRIPT = script;
            Cs.reset();
            return true;
        }
    }
    return false;
};

//places a basic(lvl 1) unit on the map at coordinate x,y with a given class
Cs.mapCreateCharacter = function (cl, x, y, name, side, tempString) {
    cl = cl.charAt(0).toUpperCase() + cl.slice(1);
    let temp = (tempString == "true");
    let character = BS.createCharacter();
    //perform some lookup, an array of up to 5 objects with:
    character.name = name;
    character.cl = cl;
    //copy all base values
    character = BS.applyStatsToCharacter(character, character.cl, 1);
    character.currentHp = character.hp;
    character.x = parseInt(x, 10);
    character.y = parseInt(y, 10);
    character.hasMoved = false;
    if (side == "enemy") {
        character.player_state = Sy.ENEMY;
        Sy.varEnemyCharacters.push(character);
    }
    if (side == "player") {
        character.player_state = Sy.PLAYER;
        Sy.varPlayerCharacters.push(character);
    }
    if (temp) {
        Cs.varTemporaryCharacters.push(character);
    }
    Cs.waitForNothing();
};

//moves the cursor to a given coordinate
Cs.mapSetCursor = function (x, y) {
    Sy.map.cursorX = parseInt(x, 10);
    Sy.map.cursorY = parseInt(y, 10);
    Sy.handleLocalInput({
        keyCode: Sy.BUTTON_HOVER,
        x: Sy.map.cursorX,
        y: Sy.map.cursorY
    });
    Cs.waitForNothing();
};

window.Cs = Cs;

