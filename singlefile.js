//namespace
var Sy = {
    PLAYER: 0,
    ENEMY: 1,
    NO_PLAYER_STATE: -1,
    BUTTON_GLOBAL_EOT: 89,
    BUTTON_GLOBAL_INFO: 88,
    BUTTON_GLOBAL_EXIT: 87,
    BUTTON_A: 90,
    BUTTON_B: 91,
    BUTTON_UP: 92,
    BUTTON_DOWN: 93,
    BUTTON_LEFT: 94,
    BUTTON_RIGHT: 95,
    BUTTON_NONE: 96,
    BUTTON_HOVER: 97,
    BUTTON_LEFT_CLICK: 98,
    BUTTON_RIGHT_CLICK: 99,
    INPUT_SOURCE_KEYBOARD: 0, //locally from the keyboard
    INPUT_SOURCE_AI: 2, //locally from the AI
    //game state constants
    STATE_DISPLAY_TURN: 0,
    STATE_IDLE: 1,
    STATE_DISPLAY_MOVE: 2,
    STATE_SELECT_WEAPON_TARGET: 3,
    STATE_BATTLE: 4,
    STATE_MOVE_ANIMATION: 5,
    STATE_GAME_OVER: 6,
    varSfxEnabled:true,
    varBgmEnabled:true
};
var Im = {
    none: {
        name: 'none',
        might: 0,
        min_range: 0,
        max_range: 0,
    },
    tworange: {
        name: 'TwoRange',
        might: 12,
        min_range: 1,
        max_range: 2,
    },
    onerange: {
        name: 'OneRange',
        might: 12,
        min_range: 1,
        max_range: 1,
    },
    space: {
        name: 'Space',
        might: 12,
        min_range: 2,
        max_range: 2,
    }
};
var Drops = {
	Spade:{
		stat:"def",
		value:1
	},
	Club:{
		stat:"str",
		value:1
	},
	Diamond:{
		stat:"spd",
		value:1
	},
	Heart:{
		stat:"hp",
		value:3
	}
};
BS = {};
BS.u = {
    Girl: {
        hp: 18,
        str: 6,
        spd: 0,
        def: 11,
        mov: 3
    }
};
BS.applyStatsToCharacter = function(ch, characterClass) {
    ch.cl = characterClass;
    let stat_array = Object.keys(BS.u.Girl);
    for (let i = 0; i < stat_array.length; i += 1) {
        ch[stat_array[i]] = BS.u[characterClass][stat_array[i]];
    }
    ch.currentHp = ch.hp;
    return ch;
};
BS.createCharacter = function() {
    let ch = BS.applyStatsToCharacter({}, Object.keys(BS.u)[0]);
    ch.item = Im.none;
    ch.hasMoved = false;
    ch.x = 0;
    ch.y = 0;
    ch.player_state = 0;
    ch.name = '';
    ch.layer = 0;
	ch.drops = [];//enemies hold 1 drop, players pick up any number of drops
    return ch;
};
var Tr = {
    none:{
        name:"None",
        cost: 999//max terrain cost should be at least map.width*map.height, since that's used by AI to pathfind.
    },
    stair:{
        name: "Stair",
        cost: 1
    },
    plain: {
        name: "Plain",
        cost: 1
    },
    //auto tile terrain
    dirt: {
        name: "Dirt",
        cost: 1
    },
    grass: {
        name: "Grass",
        cost: 1
    },
    house_roof: {
        name: "House_roof",
        cost: 1
    },
    house_wall: {
        name: "House_wall",
        cost: 1
    }
};
//returns a new empty character that cannot be used
Sy.createEmptyCharacter = function() {
    let e = BS.createCharacter();
    e.player_state = Sy.NO_PLAYER_STATE;
    return e;
};
//prepare browser for HTML elements
Sy.init = function() {
    document.addEventListener("keydown", Sy.handleLocalInput);
    //load data synchronously
    Sy.setGameData("level0");
	if(Sy.varBgmEnabled){
		Sound.Bgm.track1.stop();
		Sound.Bgm.track1.play();
	}
    //begin loops
    Sy.loopId = setTimeout(Sy.gameLoop, 15);
    Sy.animationId = window.requestAnimationFrame(Sy.renderLoop);
};
Sy.setGameData = function(levelName) {
    CsData.loadLevel(levelName);
    Sy.map = Sy.getMapData(levelName);
    Sy.map.name = levelName;
    Sy.varPlayerCharacters = Sy.getUnitData(Sy.PLAYER,levelName);
    Sy.varEnemyCharacters = Sy.getUnitData(Sy.ENEMY,levelName);
    Sy.varInputSourcePlayer = Sy.INPUT_SOURCE_KEYBOARD;
    Sy.varInputSourceEnemy = Sy.INPUT_SOURCE_AI;
    //player or enemy
    Sy.PLAYER_STATE = Sy.PLAYER;
    Sy.map.cursorX = Sy.varPlayerCharacters[0].x;
    Sy.map.cursorY = Sy.varPlayerCharacters[0].y;
    Sy.varTurnCount = 0;//start at turn 0 (pregame) the renderer will set this to 1 when it's ready
    //internal state variables
    Sy.internalStateVar = [];
    for (let i = 0; i <= Sy.STATE_GAME_OVER; i += 1) {
        Sy.internalStateVar[i] = {};
    }
    //keep track of the current game state by using the constants
    Sy.CurrentState = Sy.STATE_DISPLAY_TURN;
    Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationDone = false;
    Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationBegin = false;
    //input buffer (queue)
    //push() and shift() are used to access elements
    //can be written to by AI, network or keyboard input
    Sy.varInputBuffer = [];
    //where the buffer should be populated from
    Sy.varCurrentInput = Sy.BUTTON_NONE;
    Sy.varCurrentInputData = {};
    Sy.AIdata = {};
};
Sy.gameLoop = function() {
    Sy.AI();
    Sy.gameLogic();
    Sy.loopId = setTimeout(Sy.gameLoop, 15);
};
Sy.renderLoop = function() {
    if(R){
        R.render();
    }
    Sy.animationId = window.requestAnimationFrame(Sy.renderLoop);
};
Sy.gameLogic = function() {
    Sy.varCurrentInput = Sy.BUTTON_NONE;
    let inputLen = Sy.varInputBuffer.length;
    if (inputLen > 0) {
        let input = Sy.varInputBuffer[0];
        if (input[0] === Sy.CurrentState) {
            Sy.varInputBuffer.shift();
            Sy.varCurrentInput = input[1];
            Sy.varCurrentInputData = {};
            if (Sy.varCurrentInput == Sy.BUTTON_HOVER) {
                Sy.varCurrentInputData.x = input[2];
                Sy.varCurrentInputData.y = input[3];
            }
            //treat left click the same as 'a' but with addtional (optional) x,y
            if (Sy.varCurrentInput == Sy.BUTTON_LEFT_CLICK) {
                Sy.varCurrentInput = Sy.BUTTON_A;
                Sy.varCurrentInputData.x = input[2];
                Sy.varCurrentInputData.y = input[3];
            }
            //no need to handle right click here, since it's auto translated into 'b' already
        }
    }
    let state = Sy.CurrentState;
	
	
	if (!Cs.checkAndUpdate(Sy.varCurrentInput)) {
		Sy.checkForStateChangeAndChange();
		if (state==Sy.CurrentState &&
			Sy.varCurrentInput !== Sy.BUTTON_NONE) {
			Sy.performStateLogic();
		}
	} else {
		Sy.varCurrentInput = Sy.BUTTON_NONE;
	}

	
};
Sy.checkForStateChangeAndChange = function() {
    switch (Sy.CurrentState) {
        case Sy.STATE_DISPLAY_TURN:
            Sy.check_STATE_DISPLAY_TURN();
            break;
        case Sy.STATE_IDLE:
            Sy.check_STATE_IDLE();
            break;
        case Sy.STATE_DISPLAY_MOVE:
            Sy.check_STATE_DISPLAY_MOVE();
            break;
        case Sy.STATE_MOVE_ANIMATION:
            Sy.check_STATE_MOVE_ANIMATION();
            break;
        case Sy.STATE_SELECT_WEAPON_TARGET:
            Sy.check_STATE_SELECT_WEAPON_TARGET();
            break;
        case Sy.STATE_BATTLE:
            Sy.check_STATE_BATTLE();
            break;
        case Sy.STATE_GAME_OVER:
            break;
        default:
            break;
    }
};
//handles game logic for arrow keys which cannot alter the states
//also handles cases where a/b do not change state
Sy.performStateLogic = function() {
    switch (Sy.CurrentState) {
        case Sy.STATE_IDLE:
            Sy.logic_STATE_IDLE();
            break;
        case Sy.STATE_SELECT_WEAPON_TARGET:
            Sy.logic_STATE_SELECT_WEAPON_TARGET();
            break;
        case Sy.STATE_DISPLAY_MOVE:
            Sy.mapScroll();
            break;
        case Sy.STATE_BATTLE:
            Sy.logic_STATE_BATTLE();
            break;
        case Sy.STATE_DISPLAY_TURN:
        case Sy.STATE_GAME_OVER:
            break;
        default:
            break;
    }
};
Sy.check_STATE_DISPLAY_TURN = function() {
    if (!Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationDone) {
        Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationBegin = true;
    } else { //animation is over
        //check for win
        if (Sy.checkForWin().gameFinished) {
            Sy.gameOver();
            return;
        }
        //reset the cursor to an alive unit
        let unitsToSelect = Sy.varEnemyCharacters;
        if (Sy.PLAYER_STATE === Sy.PLAYER) {
            unitsToSelect = Sy.varPlayerCharacters;
        }
        for (let c = 0; c < unitsToSelect.length; c += 1) {
            let curCh = unitsToSelect[c];
            if (curCh.player_state != Sy.NO_PLAYER_STATE) {
                Sy.map.cursorX = curCh.x;
                Sy.map.cursorY = curCh.y;
                break;
            }
        }
        Sy.CurrentState = Sy.STATE_IDLE;
        Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationBegin = false;
        return;
    }
};
Sy.check_STATE_IDLE = function() {
    Sy.handleA_XY();
    let ch = Sy.getCharacterAtCursor();
    //check the info window popup first, so that it can soak up all inputs and act as the top layer
    if(Ortho && Ortho.infoHeader){
        //if pressing on button, show it
        if (Sy.varCurrentInput === Sy.BUTTON_GLOBAL_INFO) {
            Ortho.infoHeader.showDetails = true;
            return;
        }
        //if window is open, close it
        if(Ortho.infoHeader.showDetails){
            if (Sy.varCurrentInput === Sy.BUTTON_A||Sy.varCurrentInput === Sy.BUTTON_B) {
                Ortho.infoHeader.showDetails = false;
                return;
            }
        }
    }
    //directly recieved a global EOT button
    if (Sy.varCurrentInput === Sy.BUTTON_GLOBAL_EOT) {
        Sy.endTurn();
        return;
    }
    if(Sy.varCurrentInput === Sy.BUTTON_GLOBAL_EXIT) {
        let text = "Surrender the current mission?";
        if(MM){
            text = "Save and exit the current mission?";
        }
        if(confirm(text)){
            if(MM){//save before changing player data
                MM.save();
            }
            //game over, make all units have 0 hp
            for(let i=0;i<Sy.varPlayerCharacters.length;i+=1){
                let pCh = Sy.varPlayerCharacters[i];
                pCh.currentHp = 0;
                pCh.player_state = Sy.NO_PLAYER_STATE;
            }
            Sy.gameOver();
        }
        return;
    }
    //'a' on useable character
    if (Sy.varCurrentInput === Sy.BUTTON_A && ch.player_state === Sy.PLAYER_STATE && ch.hasMoved === false) {
        Sy.internalStateVar[Sy.STATE_IDLE].chLayer = ch.layer;
        //once you've picked a character, all subsequent states will be locked to that character's initial layer
        Sy.map.selectedLayer = ch.layer;
        Sy.fillMoveAndAttackForCharacter(ch);
        Sy.internalStateVar[Sy.STATE_IDLE].cursorX = Sy.map.cursorX;
        Sy.internalStateVar[Sy.STATE_IDLE].cursorY = Sy.map.cursorY;
        Sy.CurrentState = Sy.STATE_DISPLAY_MOVE;
		if(Sy.varSfxEnabled && Sy.PLAYER_STATE == Sy.PLAYER){Sound.Fx.confirm.play();}
        return;
    }
    //if all have moved, end turn
    let endOfTurn = true;
    let characters = Sy.varPlayerCharacters; //varEnemyCharacters
    //toggle the player
    if (Sy.PLAYER_STATE !== Sy.PLAYER) {
        characters = Sy.varEnemyCharacters;
    }
    for (let i = 0; i < characters.length; i += 1) {
        let ch = characters[i];
        if (!ch.hasMoved && ch.player_state!=Sy.NO_PLAYER_STATE) {
            endOfTurn = false;
            break;
        }
    }
    if (endOfTurn) {
        Sy.endTurn();
    }
};
Sy.check_STATE_DISPLAY_MOVE = function() {
    Sy.handleA_XY();
    let ch = Sy.getCharacterAtCursor();
    let prevCh = Sy.getCharacterAtPosition(Sy.internalStateVar[Sy.STATE_IDLE].cursorX, Sy.internalStateVar[Sy.STATE_IDLE].cursorY);
    if (Sy.varCurrentInput === Sy.BUTTON_A && (ch.player_state === Sy.NO_PLAYER_STATE ||
            (Sy.map.cursorX === prevCh.x && Sy.map.cursorY === prevCh.y)) &&
        (Sy.map.getMoveForCell(Sy.map.cursorX,Sy.map.cursorY) !== 0)) { //'a' on a blue square
        Sy.internalStateVar[Sy.STATE_DISPLAY_MOVE].cursorX = Sy.map.cursorX;
        Sy.internalStateVar[Sy.STATE_DISPLAY_MOVE].cursorY = Sy.map.cursorY;
        Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].path = Sy.getMovementPath(prevCh.x, prevCh.y, Sy.map.cursorX, Sy.map.cursorY);
        Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].attackTarget = {
            player_state: Sy.NO_PLAYER_STATE
        };
        Sy.CurrentState = Sy.STATE_MOVE_ANIMATION;
		if(Sy.varSfxEnabled&& Sy.PLAYER_STATE == Sy.PLAYER){Sound.Fx.confirm.play();}
        return;
    }
    //'b' or 'a' on space with no movement/attack target
    if (Sy.varCurrentInput === Sy.BUTTON_B ||
        (Sy.varCurrentInput === Sy.BUTTON_A &&
            (Sy.map.getMoveForCell(Sy.map.cursorX,Sy.map.cursorY) === 0 &&
                Sy.map.attack[Sy.map.cursorX][Sy.map.cursorY] === 0))) {
        Sy.map.cursorX = Sy.internalStateVar[Sy.STATE_IDLE].cursorX;
        Sy.map.cursorY = Sy.internalStateVar[Sy.STATE_IDLE].cursorY;
        Sy.map.resetMove();
        Sy.map.resetAttack();
        Sy.CurrentState = Sy.STATE_IDLE;
		if(Sy.varSfxEnabled&& Sy.PLAYER_STATE == Sy.PLAYER){Sound.Fx.cancel.play();}
        return;
    }
    //'a' on an enemy, move to a position that the unit can attack from
    if (Sy.varCurrentInput === Sy.BUTTON_A && (
            (ch.player_state !== Sy.PLAYER_STATE && ch.player_state !== Sy.NO_PLAYER_STATE) ||
            (Sy.map.cursorX === prevCh.x && Sy.map.cursorY === prevCh.y)) &&
        (Sy.map.attack[Sy.map.cursorX][Sy.map.cursorY] !== 0)) {
        let attackPosition = Sy.getMoveCellFromAttack(ch.x, ch.y, prevCh);
        Sy.map.cursorX = attackPosition.x;
        Sy.map.cursorY = attackPosition.y;
        Sy.internalStateVar[Sy.STATE_DISPLAY_MOVE].cursorX = Sy.map.cursorX;
        Sy.internalStateVar[Sy.STATE_DISPLAY_MOVE].cursorY = Sy.map.cursorY;
        Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].path = Sy.getMovementPath(prevCh.x, prevCh.y, Sy.map.cursorX, Sy.map.cursorY);
        Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].attackTarget = ch;
        Sy.CurrentState = Sy.STATE_MOVE_ANIMATION;
        return;
    }
};
Sy.check_STATE_MOVE_ANIMATION = function() {
    if (Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].path.length < 1) {
        //update character location to the final spot
        Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].cursorX = Sy.map.cursorX;
        Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].cursorY = Sy.map.cursorY;
        let selectedChX = Sy.internalStateVar[Sy.STATE_IDLE].cursorX;
        let selectedChY = Sy.internalStateVar[Sy.STATE_IDLE].cursorY;
        let ch = Sy.getCharacterAtPosition(selectedChX, selectedChY);
        ch.x = Sy.map.cursorX;
        ch.y = Sy.map.cursorY;
        //update character's layer
        ch.layer = Sy.map.getLayerAtCoord(ch.x,ch.y);
        Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].ch = ch;
        let item = Im.none;
        let inRange = [];
        Sy.map.resetAttack();
        Sy.map.resetMove();
        Sy.fillAttack(ch.x, ch.y, ch.item.min_range, ch.item.max_range);
        //find enemies that are in range of the current ch/item
        let enemy = Sy.ENEMY;
        if (Sy.PLAYER_STATE === enemy) {
            enemy = Sy.PLAYER;
        }
        inRange = Sy.getUnitsInWeaponRange(enemy);
        if (inRange.length) {
            item = ch.item;
        }
        Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].character = ch;
        Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].weapon = item;
        Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].enemyIndex = 0;
        Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].inRange = inRange;
        Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].cursorX = Sy.map.cursorX;
        Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].cursorY = Sy.map.cursorY;
        //if you picked at target to move to, select that instead of the 1st choice
        let attackTarget = Sy.internalStateVar[Sy.STATE_MOVE_ANIMATION].attackTarget;
        let tgtIdx = inRange.indexOf(attackTarget);
        if (tgtIdx < 0) { //no target (either didn't select one, or none in range)
            tgtIdx = 0; //select the 1st in range
        }
        if (inRange.length) {
            Sy.map.cursorX = inRange[tgtIdx].x;
            Sy.map.cursorY = inRange[tgtIdx].y;
            Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].cursorX = inRange[tgtIdx].x;
            Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].cursorY = inRange[tgtIdx].y;
        }
        Sy.CurrentState = Sy.STATE_SELECT_WEAPON_TARGET;
    }
};
Sy.check_STATE_SELECT_WEAPON_TARGET = function() {
    Sy.handleA_XY();
    let ch = Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].character;
    //'a' on empty space or 'b'
    let slectedTgt = Sy.getCharacterAtCursor();
    if (Sy.varCurrentInput === Sy.BUTTON_A && slectedTgt.x === ch.x && slectedTgt.y === ch.y) { //press 'a' on the current player, set to wait
        Sy.setUnitToWait(ch);
        Sy.map.resetMove();
        Sy.CurrentState = Sy.STATE_IDLE;
		if(Sy.varSfxEnabled&& Sy.PLAYER_STATE == Sy.PLAYER){Sound.Fx.cancel.play();}
        return;
    }
    let inRange = Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].inRange;
    let found = false;
    for(let i=0;i<inRange.length;i+=1){
        if(slectedTgt === inRange[i]){
            found=true;
            break;
        }
    }
    if (Sy.varCurrentInput === Sy.BUTTON_B || //pressed 'b'
        (Sy.varCurrentInput === Sy.BUTTON_A &&  !found)) { //or 'a' not on a valid target 
        //Note change: revert to: STATE_IDLE. 
        Sy.map.cursorX = Sy.internalStateVar[Sy.STATE_IDLE].cursorX;
        Sy.map.cursorY = Sy.internalStateVar[Sy.STATE_IDLE].cursorY;
        ch.x = Sy.internalStateVar[Sy.STATE_IDLE].cursorX;
        ch.y = Sy.internalStateVar[Sy.STATE_IDLE].cursorY;
        Sy.map.resetMove();
        Sy.map.resetAttack();
        Sy.CurrentState = Sy.STATE_IDLE;
        Sy.map.selectedLayer = ch.layer;
        ch.layer=Sy.internalStateVar[Sy.STATE_IDLE].chLayer;
        Sy.fillMoveAndAttackForCharacter(ch);
        Sy.CurrentState = Sy.STATE_DISPLAY_MOVE;
		if(Sy.varSfxEnabled&& Sy.PLAYER_STATE == Sy.PLAYER){Sound.Fx.cancel.play();}
        return;
    }
    if (Sy.varCurrentInput === Sy.BUTTON_A && found) { //'a' on target
        let item = Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].weapon;
        if (item == Im.none) {
            //item was not usable, or nothing in range.
            //set the character to 'wait'
            Sy.setUnitToWait(ch);
            Sy.map.resetMove();
            Sy.CurrentState = Sy.STATE_IDLE;
            return;
        }
        let enemy = Sy.getCharacterAtCursor();
        Sy.map.resetAttack();
        let enemyWeapon = Sy.getFirstUseableWeapon(enemy, ch);
		//only units that are enemy characters can drop buffs (not player units on enemy turn) 
		let isDroppableUnit = enemy.player_state == Sy.ENEMY;
        let battle = Sy.performBattleCalculation(ch, item, enemy, enemyWeapon);
		//check for drops, if they have been defeated
		if(isDroppableUnit && enemy.drops.length && enemy.player_state == Sy.NO_PLAYER_STATE){
			for(let i=enemy.drops.length-1;i>=0;i-=1){
				let drop = enemy.drops.pop();
				Sy.map.drops.push({
					drop:drop,
					isCollected:false,
					x:enemy.x,
					y:enemy.y
				});
			}
		}
        Sy.internalStateVar[Sy.STATE_BATTLE].battleCalculation = battle;
        Sy.internalStateVar[Sy.STATE_BATTLE].character = ch;
        Sy.internalStateVar[Sy.STATE_BATTLE].animationIsOver = false;
        Sy.CurrentState = Sy.STATE_BATTLE;
		if(Sy.varSfxEnabled&& Sy.PLAYER_STATE == Sy.PLAYER){Sound.Fx.confirm.play();}
        return;
    }
};
Sy.check_STATE_BATTLE = function() {
    if(Sy.internalStateVar[Sy.STATE_BATTLE].animationIsOver){
        let ch = Sy.internalStateVar[Sy.STATE_BATTLE].character;
        Sy.map.cursorX = ch.x;
        Sy.map.cursorY = ch.y;
		Sy.setUnitToWait(ch);
        Sy.CurrentState = Sy.STATE_IDLE;
    }
};
Sy.logic_STATE_IDLE = function() {
    if(Ortho&&Ortho.infoHeader&&Ortho.infoHeader.showDetails){//don't handle input if in the info popup
        return;
    }
    Sy.mapScroll();
    let ch = Sy.getCharacterAtCursor();
    if (ch.player_state !== Sy.NO_PLAYER_STATE && ch.player_state !== Sy.PLAYER_STATE) {
        Sy.map.resetMove();
        Sy.map.resetAttack();
        Sy.fillMoveAndAttackForCharacter(ch);
    } else {
        Sy.map.resetMove();
        Sy.map.resetAttack();
    }
};
Sy.logic_STATE_SELECT_WEAPON_TARGET = function() {
    //scroll through valid targets if using keyboard
    let inRange = Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].inRange;
    if (!inRange.length) {
        return; //no enemies in range
    }
    if (Sy.varCurrentInput === Sy.BUTTON_UP || Sy.varCurrentInput === Sy.BUTTON_RIGHT) {
        if (Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].enemyIndex > 0) {
            Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].enemyIndex -= 1;
        } else {
            Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].enemyIndex = Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].inRange.length - 1;
        }
    }
    if (Sy.varCurrentInput === Sy.BUTTON_DOWN || Sy.varCurrentInput === Sy.BUTTON_LEFT) {
        if (Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].enemyIndex < Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].inRange.length - 1) {
            Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].enemyIndex += 1;
        } else {
            Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].enemyIndex = 0;
        }
    }
    //if hovering, check that the hover unit is in range, and select them
    if (Sy.varCurrentInput === Sy.BUTTON_HOVER) {
        let hoverCh = Sy.getCharacterAtPosition(Sy.varCurrentInputData.x, Sy.varCurrentInputData.y);
        let hoverIdx = inRange.indexOf(hoverCh);
        if (hoverIdx > -1) {
            Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].enemyIndex = hoverIdx;
        }
    }
    Sy.map.cursorX = inRange[Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].enemyIndex].x;
    Sy.map.cursorY = inRange[Sy.internalStateVar[Sy.STATE_SELECT_WEAPON_TARGET].enemyIndex].y;
};
Sy.logic_STATE_BATTLE = function (){
    //pressed 'b' or 'a', skip
    if (Sy.varCurrentInput === Sy.BUTTON_B ||  Sy.varCurrentInput === Sy.BUTTON_A) {
        Sy.internalStateVar[Sy.STATE_BATTLE].animationIsOver = true;
    }
};
//this is called to check if there is x/y data given alongside an 'a' press
//this data will be set on left-clicks. 
//This method will update the cursor position depending on that data.
//states that act on 'a' but don't want the cursor updated, can skip calling this method
//'a' events from the mouse will still happen if this isn't called.
Sy.handleA_XY = function() {
    if (Sy.varCurrentInput === Sy.BUTTON_A) {
        if (Sy.varCurrentInputData.hasOwnProperty("x") &&
            Sy.varCurrentInputData.hasOwnProperty("x")) {
            Sy.map.cursorX = Sy.varCurrentInputData.x;
            Sy.map.cursorY = Sy.varCurrentInputData.y;
        }
    }
};
//returns the index in the player or enemy array that a given character has
Sy.getCharacterIndex = function(ch) {
    if (ch.player_state === Sy.PLAYER) {
        for (let i = 0; i < Sy.varPlayerCharacters.length; i += 1) {
            if (Sy.varPlayerCharacters[i] === ch) {
                return i;
            }
        }
    } else {
        for (let i = 0; i < Sy.varEnemyCharacters.length; i += 1) {
            if (Sy.varEnemyCharacters[i] === ch) {
                return i;
            }
        }
    }
    return -1;
};
//returns an object with information on if the game is over, and who won.
Sy.checkForWin = function() {
    let retVar = {
        gameFinished: false,
        youWin: true
    };
    let noPlayerUnitsLeft = true;
    let noEnemyUnitsLeft = true;
    for (let i = 0; i < Sy.varPlayerCharacters.length; i += 1) {
		let ch = Sy.varPlayerCharacters[i];
        if (ch.player_state!=Sy.NO_PLAYER_STATE&&ch.currentHp > 0) {
            noPlayerUnitsLeft = false;
        }
    }
    for (let i = 0; i < Sy.varEnemyCharacters.length; i += 1) {
		let ch = Sy.varEnemyCharacters[i];
        if (ch.player_state!=Sy.NO_PLAYER_STATE&&ch.currentHp > 0) {
            noEnemyUnitsLeft = false;
        }
    }
    if (noPlayerUnitsLeft === true || noEnemyUnitsLeft === true) {
        retVar.gameFinished = true;
    }
    if (noPlayerUnitsLeft) {
        retVar.youWin = false; //default local player lost
    }
    if (noEnemyUnitsLeft) {
        retVar.youWin = true; //default local player lost
    }
    return retVar;
};
//handle win/loss
Sy.gameOver = function() {
    console.log("end of game reached...");
    if(!Sy.checkForWin().youWin){
        //you lost, 
        MM.showMenu();
		Sy.CurrentState = Sy.STATE_GAME_OVER;     
    }else{
        //next level
        let nextLevel = LevelData.getNextLevel(Sy.map.name);
        if(nextLevel){
            Sy.changeLevel(nextLevel);
        }else{
            //truely at the end of the game
            alert("Congratulations! you have cleared the game. Thank you for playing.");
            MM.showMenu();
            Sy.CurrentState = Sy.STATE_GAME_OVER;
        }
    }
};
//handle map scrolling
Sy.mapScroll = function() {
    if (Sy.varCurrentInput === Sy.BUTTON_LEFT) {
        if (Sy.map.cursorX > 0) {
            Sy.map.cursorX -= 1;
        }
    }
    if (Sy.varCurrentInput === Sy.BUTTON_UP) {
        if (Sy.map.cursorY > 0) {
            Sy.map.cursorY -= 1;
        }
    }
    if (Sy.varCurrentInput === Sy.BUTTON_RIGHT) {
        if (Sy.map.cursorX < Sy.map.width - 1) {
            Sy.map.cursorX += 1;
        }
    }
    if (Sy.varCurrentInput === Sy.BUTTON_DOWN) {
        if (Sy.map.cursorY < Sy.map.height - 1) {
            Sy.map.cursorY += 1;
        }
    }
    if (Sy.varCurrentInput === Sy.BUTTON_HOVER ||
        Sy.varCurrentInput === Sy.BUTTON_LEFT_CLICK) {
        Sy.map.cursorX = Sy.varCurrentInputData.x;
        Sy.map.cursorY = Sy.varCurrentInputData.y;
    }
};
//returns a character at the given cursor location
Sy.getCharacterAtCursor = function() {
    return Sy.getCharacterAtPosition(Sy.map.cursorX, Sy.map.cursorY);
};
//returns a character at an arbitrary location
Sy.getCharacterAtPosition = function(x, y) {
    for (let i = 0; i < Sy.varPlayerCharacters.length; i += 1) {
        let ch = Sy.varPlayerCharacters[i];
        if (ch.x === x && ch.y === y && ch.player_state !== Sy.NO_PLAYER_STATE) {
            return Sy.varPlayerCharacters[i];
        }
    }
    for (let i = 0; i < Sy.varEnemyCharacters.length; i += 1) {
        let ch = Sy.varEnemyCharacters[i];
        if (ch.x === x && ch.y === y && ch.player_state !== Sy.NO_PLAYER_STATE) {
            return Sy.varEnemyCharacters[i];
        }
    }
    //null character
    return Sy.createEmptyCharacter();
};
//fills Sy.map.move with the movement grid of a character
Sy.fillMove = function(x, y, move, classname, player_state, layer) {
    let t = Sy.map.layers[layer];
    let m = Sy.map.move;
    let m_alternate = Sy.map.move_fg;
    if(layer==1){//TODO: should be a way to work this out programatically
        m = Sy.map.move_fg;
        m_alternate = Sy.map.move;
    }
    m[x][y] = move;
    let queue = [];
    queue.push({
        x: x,
        y: y,
        move: move
    });
    while (queue.length) {
        let node = queue.shift();
        //if terrain is stairs, fill the map above it
        if(t[node.x][node.y].name.toLowerCase()=="stair"){
            if(layer+1<Sy.map.layers.length&&m_alternate[node.x][node.y]==0) {
                Sy.fillMove(node.x,node.y,node.move,classname,player_state,layer+1);
            }
            if(layer-1>=0&&m_alternate[node.x][node.y]==0) {
                Sy.fillMove(node.x,node.y,node.move,classname,player_state,layer-1);
            }
        }
        //regular move fill
        if (node.y + 1 < Sy.map.height) {
            let ch = Sy.getCharacterAtPosition(node.x, node.y + 1);
            if (ch.player_state === player_state || ch.player_state === Sy.NO_PLAYER_STATE) {
                let cost = t[node.x][node.y + 1].cost;
                if (t[node.x][node.y + 1].hasOwnProperty(classname)) {
                    cost += t[node.x][node.y + 1][classname];
                }
                if (node.move - cost > 0 && m[node.x][node.y + 1] < node.move - cost) {
                    m[node.x][node.y + 1] = node.move - cost;
                    queue.push({
                        'x': node.x,
                        'y': node.y + 1,
                        'move': node.move - cost
                    });
                }
            }
        }
        if (node.y > 0) {
            let ch = Sy.getCharacterAtPosition(node.x, node.y - 1);
            if (ch.player_state === player_state || ch.player_state === Sy.NO_PLAYER_STATE) {
                let cost = t[node.x][node.y - 1].cost;
                if (t[node.x][node.y - 1].hasOwnProperty(classname)) {
                    cost += t[node.x][node.y - 1][classname];
                }
                if (node.move - cost > 0 && m[node.x][node.y - 1] < node.move - cost) {
                    m[node.x][node.y - 1] = node.move - cost;
                    queue.push({
                        'x': node.x,
                        'y': node.y - 1,
                        'move': node.move - cost
                    });
                }
            }
        }
        if (node.x + 1 < Sy.map.width) {
            let ch = Sy.getCharacterAtPosition(node.x + 1, node.y);
            if (ch.player_state === player_state || ch.player_state === Sy.NO_PLAYER_STATE) {
                let cost = t[node.x + 1][node.y].cost;
                if (t[node.x + 1][node.y].hasOwnProperty(classname)) {
                    cost += t[node.x + 1][node.y][classname];
                }
                if (node.move - cost > 0 && m[node.x + 1][node.y] < node.move - cost) {
                    m[node.x + 1][node.y] = node.move - cost;
                    queue.push({
                        'x': node.x + 1,
                        'y': node.y,
                        'move': node.move - cost
                    });
                }
            }
        }
        if (node.x > 0) {
            let ch = Sy.getCharacterAtPosition(node.x - 1, node.y);
            if (ch.player_state === player_state || ch.player_state === Sy.NO_PLAYER_STATE) {
                let cost = t[node.x - 1][node.y].cost;
                if (t[node.x - 1][node.y].hasOwnProperty(classname)) {
                    cost += t[node.x - 1][node.y][classname];
                }
                if (node.move - cost > 0 && m[node.x - 1][node.y] < node.move - cost) {
                    m[node.x - 1][node.y] = node.move - cost;
                    queue.push({
                        'x': node.x - 1,
                        'y': node.y,
                        'move': node.move - cost
                    });
                }
            }
        }
    }
};
//fills Sy.map.attack with the attackable squares of a grid
Sy.fillAttack = function(x, y, min_range, max_range) {
    for (let i = 0; i < max_range + 1; i += 1) {
        for (let j = 0; j + i < max_range + 1; j += 1) {
            if (i + j >= min_range) {
                if (x + i >= 0 && x + i < Sy.map.width && y + j >= 0 && y + j < Sy.map.height) {
                    Sy.map.attack[x + i][y + j] = 1;
                }
                if (x - i >= 0 && x - i < Sy.map.width && y + j >= 0 && y + j < Sy.map.height) {
                    Sy.map.attack[x - i][y + j] = 1;
                }
                if (x - i >= 0 && x - i < Sy.map.width && y - j >= 0 && y - j < Sy.map.height) {
                    Sy.map.attack[x - i][y - j] = 1;
                }
                if (x + i >= 0 && x + i < Sy.map.width && y - j >= 0 && y - j < Sy.map.height) {
                    Sy.map.attack[x + i][y - j] = 1;
                }
            }
        }
    }
};
//given a character, fills the map and attack grids with that character's info
Sy.fillMoveAndAttackForCharacter = function(ch) {
    Sy.fillMove(ch.x, ch.y, ch.mov + 1, ch.cl, ch.player_state,ch.layer);
    let item = ch.item;
    for (let i = 0; i < Sy.map.width; i += 1) {
        for (let j = 0; j < Sy.map.height; j += 1) {
            let possibleCh = Sy.getCharacterAtPosition(i, j);
            if ((possibleCh.player_state === Sy.NO_PLAYER_STATE ||
                 (possibleCh.x === ch.x && possibleCh.y === ch.y)) &&
                Sy.map.getMoveForCell(i,j) !== 0) {
                Sy.fillAttack(i, j, item.min_range, item.max_range);
            }
        }
    }
};
//returns a stack of intermittent steps to a destination on the move map
Sy.getMovementPath = function(fromX, fromY, toX, toY) {
    //NOTE: the transitions for movement animations will lerp regardless of the actual values returned here
    //      to smooth out animations (or make it run faster), can just shorten the result array
    //      can also just truncate the move path if it gets too long
    let movement_path = [
        [toX, toY]
    ];
    // toLayer = if only 1 of FG/BG grids have movement, then choose that layer
	//	  otherwise, use the global layer toggle
    //fromLayer = ch.layer
    let cellDist = function(x1, x2, y1, y2) {
        return (Math.abs(x1 - x2) + Math.abs(y1 - y2));
    };
    let m = Sy.map.move;
    let m_alternate = Sy.map.move_fg;
    let layer = Sy.map.getLayerAtCoord(toX,toY);
    if(layer === 1){
        m = Sy.map.move_fg;
        m_alternate = Sy.map.move;
    }
    let cost = m[toX][toY];
    
    //if move ==0 then cellDist will override, non-move cells are 0 by default
    //(i.e. if the target is outside the grid, it will form a straight line into the grid first)
    if(cost==0){
        console.log("unreachable target");
    }
    
    let getTerrainForTile = function(x,y){
        if(x<0||x>=Sy.map.width||
           y<0||y>=Sy.map.height){
            return Tr.none;//unreachable
        }
        return Sy.map.terrain[x][y];
    };
    let getCostForTile = function(x,y,map){
        if(x<0||x>=Sy.map.width||
           y<0||y>=Sy.map.height){
            return -1;//unreachable
        }
        return map[x][y];
    };
    while (toX !== fromX || toY !== fromY) {
        //set the flags to true if a layer change is the most cost-effective option
        let flagLeft = false;
        let flagRight = false;
        let flagUp = false;
        let flagDown = false;
        //find increasing cost from destination to source
        //since cost is the unit's move flood-filled from the unit's location
        //it will be highest at the unit's location, and lowest further away
        //the more steps between the unit and the location, the lower cost will be
        let costLeft = getCostForTile(toX-1,toY,m);
        let costRight = getCostForTile(toX+1,toY,m);
        let costUp = getCostForTile(toX,toY-1,m);
        let costDown = getCostForTile(toX,toY+1,m);
        //layers: if the terrain is a stair, check the cost on the LRUD for the other layer as well
        if(getTerrainForTile(toX,toY).name.toLowerCase()=='stair'){
            //if you're on a stair, can consider both the upper and lower grid
            if(getCostForTile(toX-1,toY,m_alternate)>costLeft){
                flagLeft = true;
                costLeft=getCostForTile(toX-1,toY,m_alternate);
            }
            if(getCostForTile(toX+1,toY,m_alternate)>costRight){
                flagRight = true;
                costRight=getCostForTile(toX+1,toY,m_alternate);
            }
            if(getCostForTile(toX,toY-1,m_alternate)>costUp){
                flagUp = true;
                costUp=getCostForTile(toX,toY-1,m_alternate);
            }
            if(getCostForTile(toX,toY+1,m_alternate)>costDown){
                flagDown = true;
                costDown=getCostForTile(toX,toY+1,m_alternate);
            }
        }
        let maxCost = Math.max(costLeft, costRight, costUp, costDown);
        cost = maxCost;
        //if multiple cells are tied for cost, use the one closest to the source
        //add distance to tied costs
        if (costLeft === maxCost) {
            costLeft += cellDist(toX - 1, fromX, toY, fromY);
        } else {
            costLeft = 99999999999;
        }
        if (costRight === maxCost) {
            costRight += cellDist(toX + 1, fromX, toY, fromY);
        } else {
            costRight = 99999999999;
        }
        if (costUp === maxCost) {
            costUp += cellDist(toX, fromX, toY - 1, fromY);
        } else {
            costUp = 99999999999;
        }
        if (costDown === maxCost) {
            costDown += cellDist(toX, fromX, toY + 1, fromY);
        } else {
            costDown = 99999999999;
        }
        //find cell with min cost+distance
        let minDist = Math.min(costLeft, costRight, costUp, costDown);
        switch (minDist) {
            case costLeft:
                if(flagLeft){
                    if(layer === 1){
                        layer = 0;
                        m = Sy.map.move;
                        m_alternate = Sy.map.move_fg;
                    }else{
                        layer = 1;
                        m = Sy.map.move_fg;
                        m_alternate = Sy.map.move;
                    }
                }
                toX -= 1;
                movement_path.push([toX, toY]);
                break;
            case costRight:
                if(flagRight){
                    if(layer === 1){
                        layer = 0;
                        m = Sy.map.move;
                        m_alternate = Sy.map.move_fg;
                    }else{
                        layer = 1;
                        m = Sy.map.move_fg;
                        m_alternate = Sy.map.move;
                    }
                }
                toX += 1;
                movement_path.push([toX, toY]);
                break;
            case costUp:
                if(flagUp){
                    if(layer === 1){
                        layer = 0;
                        m = Sy.map.move;
                        m_alternate = Sy.map.move_fg;
                    }else{
                        layer = 1;
                        m = Sy.map.move_fg;
                        m_alternate = Sy.map.move;
                    }
                }
                toY -= 1;
                movement_path.push([toX, toY]);
                break;
            case costDown:
                if(flagDown){
                    if(layer === 1){
                        layer = 0;
                        m = Sy.map.move;
                        m_alternate = Sy.map.move_fg;
                    }else{
                        layer = 1;
                        m = Sy.map.move_fg;
                        m_alternate = Sy.map.move;
                    }
                }
                toY += 1;
                movement_path.push([toX, toY]);
                break;
            default:
                //??should not get here
        }
    }
    //smooth out the movement path by truncating corners
    for(let i=movement_path.length-2;i>=1;i-=1){
        let prev = movement_path[i+1];
        let next = movement_path[i-1];
        if(prev[0]!=next[0] && prev[1]!=next[1]){//if both x&y differ, then this square is a corner
            movement_path.splice(i,1);
        }
    }
    return movement_path;
};
//toggles the turn, should only be called from Idle state
Sy.endTurn = function() {
    //end turn
    //reset moved units
    for (let i = 0; i < Sy.varPlayerCharacters.length; i += 1) {
        if (Sy.varPlayerCharacters[i].hasMoved) {
            Sy.varPlayerCharacters[i].hasMoved = false;
        }
    }
    for (let i = 0; i < Sy.varEnemyCharacters.length; i += 1) {
        if (Sy.varEnemyCharacters[i].hasMoved) {
            Sy.varEnemyCharacters[i].hasMoved = false;
        }
    }
    //toggle the player
    if (Sy.PLAYER_STATE === Sy.PLAYER) {
        Sy.PLAYER_STATE = Sy.ENEMY;
    } else {
        Sy.PLAYER_STATE = Sy.PLAYER;
        Sy.varTurnCount += 1; //turn count only goes up on end of enemy turn
    }
	Sy.map.resetMove();
	Sy.map.resetAttack();
    //show transition
    Sy.CurrentState = Sy.STATE_DISPLAY_TURN;
    Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationDone = false;
    Sy.internalStateVar[Sy.STATE_DISPLAY_TURN].animationBegin = false;
    
    //if hovering over a button, null it out
    if (Tch) {
        Tch.rawX=-1;
        Tch.rawY=-1;
        Tch.hoverButton = Sy.BUTTON_NONE; //clear out the hover button
    }
    return;
};
//returns an array of units that are currently overlapping the attack grid
Sy.getUnitsInWeaponRange = function(state) {
    let result = [];
    for (let i = 0; i < Sy.varPlayerCharacters.length; i += 1) {
        if (Sy.varPlayerCharacters[i].player_state === state) {
            if (Sy.map.attack[Sy.varPlayerCharacters[i].x][Sy.varPlayerCharacters[i].y] !== 0) {
                result.push(Sy.varPlayerCharacters[i]);
            }
        }
    }
    for (let i = 0; i < Sy.varEnemyCharacters.length; i += 1) {
        if (Sy.varEnemyCharacters[i].player_state === state) {
            if (Sy.map.attack[Sy.varEnemyCharacters[i].x][Sy.varEnemyCharacters[i].y] !== 0) {
                result.push(Sy.varEnemyCharacters[i]);
            }
        }
    }
    return result;
};
//deals damage to each character based on their weapons, returns battle outcome
Sy.performBattleCalculation = function(character1, weapon1, character2, weapon2) {
    let preview = Sy.battlePreview(character1, weapon1, character2, weapon2);
    let ret = [];//array of objects with : ch,kind,damage 
    if (preview.player.rounds > 0) {
        preview.player.rounds -= 1;
        character2.currentHp -= preview.player.damage;
        ret.push({ch:character1,kind:"attack",damage:preview.player.damage,em:character2});
    }
    if (preview.enemy.rounds > 0 && character2.currentHp > 0 && character1.currentHp > 0) {
        preview.enemy.rounds -= 1;
        character1.currentHp -= preview.enemy.damage;
        ret.push({ch:character2,kind:"attack",damage:preview.enemy.damage,em:character1});
    }
    if (preview.player.rounds > 0 && character2.currentHp > 0 && character1.currentHp > 0) {
        preview.player.rounds -= 1;
        character2.currentHp -= preview.player.damage;
        ret.push({ch:character1,kind:"attack",damage:preview.player.damage,em:character2});
    }
    if (preview.enemy.rounds > 0 && character2.currentHp > 0 && character1.currentHp > 0) {
        preview.enemy.rounds -= 1;
        character1.currentHp -= preview.enemy.damage;
        ret.push({ch:character2,kind:"attack",damage:preview.enemy.damage,em:character1});
    }
    if (character2.currentHp < 1) {
        character2.player_state = Sy.NO_PLAYER_STATE;
    }
    if (character1.currentHp < 1) {
        character1.player_state = Sy.NO_PLAYER_STATE;
    }
    return ret;
};
//returns an object with damage, hit, rounds, crit rates and weapon name for both caracters
Sy.battlePreview = function(character1, weapon1, character2, weapon2) {
	//calculate drop buffs for each character
	
	let buffs1 = Sy.getBuffsForCharacter(character1);
	let buffs2 = Sy.getBuffsForCharacter(character2);
	
    let ret = {
        player: {},
        enemy: {}
    };
    ret.player.ch = character1;
    ret.enemy.ch = character2;
    //perform calculations here
    let playerDmg = (character1.str);
    playerDmg += weapon1.might + buffs1.str;
    let enemyDef = (character2.def + buffs2.def);
    playerDmg -= enemyDef;
    if (playerDmg < 1) {
        playerDmg = 0;
    }
    //--//
    let enemyDmg = (character2.str + buffs2.str);
    enemyDmg += weapon2.might;
    let playerDef = (character1.def + buffs1.def);
    enemyDmg -= playerDef;
    if (enemyDmg < 1) {
        enemyDmg = 0;
    }
    if (weapon1.name !== "none") {
        ret.player.damage = playerDmg;
    } else {
        ret.player.damage = 0;
    }
    if (weapon2.name !== "none") {
        ret.enemy.damage = enemyDmg;
    } else {
        ret.enemy.damage = 0;
    }
    let playerSpeed = (character1.spd + buffs1.spd);
    let enemySpeed = (character2.spd + buffs2.spd);
    ret.player.rounds = 1;
    ret.enemy.rounds = 1;
    if (playerSpeed - enemySpeed >= 4) {
        ret.player.rounds = 2;
    }
    if (enemySpeed - playerSpeed >= 4) {
        ret.enemy.rounds = 2;
    }
    if (weapon1.name === "none") {
        ret.player.damage = 0;
        ret.player.rounds = 0;
    }
    if (weapon2.name === "none") {
        ret.enemy.damage = 0;
        ret.enemy.rounds = 0;
    }
    return ret;
};
//returns the enemy's equipped weapon
Sy.getFirstUseableWeapon = function(enemy, character) {//here
    //since inventory has been replaced with 1 item, can compute this with just a distance check.
    let distanceX = Math.abs(character.x-enemy.x);
    let distanceY = Math.abs(character.y-enemy.y);
    let distance = distanceX+distanceY;
    if(distance>=enemy.item.min_range&&distance<=enemy.item.max_range){
        return enemy.item;
    }
    return Im.none;
};
//Given a character and a valid attack location, returns (x,y} of a move cell that can attack it
Sy.getMoveCellFromAttack = function(attackX, attackY, ch) {
    let opponentState = Sy.PLAYER;
    if (ch.player_state === opponentState) {
        opponentState = Sy.ENEMY;
    }
    let ret = {
        x: 0,
        y: 0
    };
    //backup the attack grid
    let attackBackup = Sy.map.backupAttack();
    Sy.map.resetAttack();
    //build up a list of viable attack positions
    let moveCells = [];
    let getDistanceToCell = function(cellX, cellY, chX, chY) {
        //rank each map grid in terms of its distance to the character
        //want to priortise cells closer to the character
        //this doesn't take into account terrain, but should be good enough
        return Math.abs(cellX - chX) + Math.abs(cellY - chY);
    };
    for (let i = 0; i < Sy.map.width; i += 1) {
        for (let j = 0; j < Sy.map.height; j += 1) {
            //can move here
            if (Sy.map.getMoveForCell(i,j) !== 0 &&
                (Sy.getCharacterAtPosition(i, j).player_state === Sy.NO_PLAYER_STATE ||
                    (Sy.getCharacterAtPosition(i, j).x === ch.x && Sy.getCharacterAtPosition(i, j).y === ch.y))) {
                moveCells.push({
                    x: i,
                    y: j,
                    cost: getDistanceToCell(i, j, ch.x, ch.y)
                });
            }
        }
    }
    moveCells.sort(function(a, b) {
        return a.cost - b.cost;
    });
    //try each weapon
    let item = ch.item;
    //find map locations the unit can move to
    for (let i = 0; i < moveCells.length; i += 1) {
        let found = false;
        //fill the attack grid and check that it overlaps with the target
        let x = moveCells[i].x;
        let y = moveCells[i].y;
        Sy.fillAttack(x, y, item.min_range, item.max_range);
        //see if there are any units in range
        let inRange = Sy.getUnitsInWeaponRange(opponentState);
        for (let k = 0; k < inRange.length; k += 1) {
            //check to see if they are the target
            if (inRange[k].x === attackX && inRange[k].y === attackY) {
                //found it
                found = true;
                ret.x = x;
                ret.y = y;
                break;
            }
        }
        if (found) {
            break;
        }
        Sy.map.resetAttack();
    }
    //restore original grid
    Sy.map.restoreAttack(attackBackup);
    return ret;
};
//keyboard input
Sy.handleLocalInput = function(e) {
    let inputSource = Sy.INPUT_SOURCE_KEYBOARD;
    if (Sy.PLAYER_STATE === Sy.PLAYER) {
        inputSource = Sy.varInputSourcePlayer;
    } else {
        inputSource = Sy.varInputSourceEnemy;
    }
    if (Sy.checkForWin().gameFinished) {
        inputSource = Sy.INPUT_SOURCE_KEYBOARD;
    }
    if (inputSource === Sy.INPUT_SOURCE_AI && Sy.CurrentState === Sy.STATE_BATTLE) {
        if (Sy.varInputBuffer.length === 0) {
            if (e.keyCode === 90) { //b
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_B]);
            }
        }
    }
    if (inputSource === Sy.INPUT_SOURCE_KEYBOARD) {
        if (Sy.varInputBuffer.length === 0) {
            if (e.keyCode === 13) {
                let m = "Switch control to ";
                if (Sy.varInputSourceEnemy === Sy.INPUT_SOURCE_AI) {
                    Sy.varInputSourceEnemy = Sy.INPUT_SOURCE_KEYBOARD;
                    alert(m + "player");
                } else {
                    Sy.varInputSourceEnemy = Sy.INPUT_SOURCE_AI;
                    alert(m + "AI");
                }
            }
            if (e.keyCode === 90) { //b 
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_B]);
            }
            if (e.keyCode === 65) { //a
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_A]);
            }
            if (e.keyCode === 37) { //left
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_LEFT]);
                return false;
            }
            if (e.keyCode === 38) { //up
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_UP]);
                return false;
            }
            if (e.keyCode === 39) { //right
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_RIGHT]);
                return false;
            }
            if (e.keyCode === 40) { //down
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_DOWN]);
                return false;
            }
            //custom events
            if (e.keyCode === Sy.BUTTON_HOVER) { //hover, x,y will also be provided
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_HOVER, e.x, e.y]);
                return false;
            }
            if (e.keyCode === Sy.BUTTON_LEFT_CLICK) { //left click, treat as 'a' with x,y 
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_LEFT_CLICK, e.x, e.y]);
                return false;
            }
            if (e.keyCode === Sy.BUTTON_RIGHT_CLICK) { //right click, treat it the same as 'b'
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_B]);
                return false;
            }
            if (e.keyCode === Sy.BUTTON_GLOBAL_EOT) { //hover, x,y will also be provided
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_GLOBAL_EOT]); //should only happen on state==idle 
                return false;
            }
            if (e.keyCode === Sy.BUTTON_GLOBAL_INFO) { //hover, x,y will also be provided
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_GLOBAL_INFO]); //should only happen on state==idle 
                return false;
            }
            if(e.keyCode == Sy.BUTTON_GLOBAL_EXIT) {//hover, x,y will also be provided
                Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_GLOBAL_EXIT]); //should only happen on state==idle 
                return false;
            }
        }
    }
    return false;
};
//AI
Sy.AIlogic_STATE_IDLE = function() {
    let nextUnit = -1;
    for (let i = 0; i < Sy.varEnemyCharacters.length; i += 1) {
        if (!(Sy.varEnemyCharacters[i].hasMoved) &&
            Sy.varEnemyCharacters[i].player_state === Sy.PLAYER_STATE &&
            Sy.varEnemyCharacters[i].currentHp > 0) {
            nextUnit = i;
            break;
        }
    }
    if (nextUnit >= 0) { //if there's a unit left
        if (Sy.map.cursorX === Sy.varEnemyCharacters[nextUnit].x && Sy.map.cursorY === Sy.varEnemyCharacters[nextUnit].y) {
            //select that character
            Sy.AIdata.targetX = -1;
            Sy.AIdata.targetY = -1;
            Sy.AIdata.ch = Sy.varEnemyCharacters[nextUnit];
            Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_A]);
            nextUnit = -1;
            return;
        } else {
            //move cursor towards that character
            //can use the hover input to jump the cursor to a point
            Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_HOVER,
                Sy.varEnemyCharacters[nextUnit].x, Sy.varEnemyCharacters[nextUnit].y
            ]);
            return;
        }
    } else {
        //push EOT since the check for EOT only happens on input,
        //if there is no input the EOT might not be detected (e.g. last ch didn't move)
        Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_GLOBAL_EOT]);
    }
};
Sy.AIlogic_STATE_DISPLAY_MOVE = function() {
    if (Sy.AIdata.targetX === -1 && Sy.AIdata.targetY === -1) {
        Sy.AIdata.unitsInRange = [];
        for (let i = 0; i < Sy.map.width; i += 1) {
            for (let j = 0; j < Sy.map.height; j += 1) {
                if (Sy.map.attack[i][j] === 1) {
                    let ch = Sy.getCharacterAtPosition(i, j);
                    if (ch.player_state !== Sy.NO_PLAYER_STATE && ch.player_state !== Sy.PLAYER_STATE) {
                        Sy.AIdata.unitsInRange.push(Sy.getCharacterAtPosition(i, j));
                    }
                }
            }
        }
        if (Sy.AIdata.unitsInRange.length < 1) {
            //no units in range, move toward them
            //back up the move and attack maps
            let attackBackup = Sy.map.backupAttack();
            let moveBackup = Sy.map.backupMove();
            Sy.map.resetAttack();
            Sy.map.resetMove();
            let movementBackup = Sy.AIdata.ch.mov;
            //increase movement and fill the map
            if (movementBackup > 1) { //if they have 1 move, don't flood fill since they can't follow the path.
                Sy.AIdata.ch.mov = Sy.map.width + Sy.map.height;
            }
            Sy.fillMoveAndAttackForCharacter(Sy.AIdata.ch);
            Sy.AIdata.ch.mov = movementBackup;
            //scan through characters and try to find a target in range
            let tempUnitsInRange = [];
            for (let i = 0; i < Sy.map.width; i += 1) {
                for (let j = 0; j < Sy.map.height; j += 1) {
                    if (Sy.map.attack[i][j] === 1) {
                        let ch = Sy.getCharacterAtPosition(i, j);
                        if (ch.player_state !== Sy.NO_PLAYER_STATE && ch.player_state !== Sy.PLAYER_STATE) {
                            tempUnitsInRange.push(Sy.getCharacterAtPosition(i, j));
                        }
                    }
                }
            }
            let tempPathList = [];
            if (tempUnitsInRange.length === 0) {
                //can't attack anything, e.g. units alive are over water, set to wait
                Sy.AIdata.targetX = Sy.AIdata.ch.x;
                Sy.AIdata.targetY = Sy.AIdata.ch.y;
            } else {
                //compute the destination cell (a cell that an attack can be launched from)
                let attackPosition = Sy.getMoveCellFromAttack(tempUnitsInRange[0].x, tempUnitsInRange[0].y, Sy.AIdata.ch);
                //get the movement path to this cell
                tempPathList = Sy.getMovementPath(Sy.AIdata.ch.x, Sy.AIdata.ch.y, attackPosition.x, attackPosition.y);
            }
            //restore original grid
            Sy.map.restoreAttack(attackBackup);
            Sy.map.restoreMove(moveBackup);
            //work back from target, until it hits a cell that the AI can move to
            let lastMove = Sy.AIdata.ch.mov;
            if (tempPathList.length > 0) {
                for (let i = tempPathList.length - 1; i >= 0; i -= 1) {
                    let tempX = tempPathList[i][0];
                    let tempY = tempPathList[i][1];
                    if (Sy.map.getMoveForCell(tempX,tempY) !== 0) {
                        if (Sy.getCharacterAtPosition(tempX, tempY).player_state === Sy.NO_PLAYER_STATE) {
                            Sy.AIdata.targetX = tempX;
                            Sy.AIdata.targetY = tempY;
                            lastMove = Sy.map.getMoveForCell(tempX,tempY);
                        } else { //a unit is sitting on the deisred path, try deviate around it
                            for (let xdeviation = -1; xdeviation < 2; xdeviation += 1) {
                                for (let ydeviation = -1; ydeviation < 2; ydeviation += 1) {
                                    if (tempX + xdeviation >= 0 && tempY + ydeviation >= 0 && tempX + xdeviation < Sy.map.width && tempY + ydeviation < Sy.map.height) {
                                        if (Sy.map.getMoveForCell(tempX + xdeviation,tempY + ydeviation) !== 0 &&
                                            Sy.map.getMoveForCell(tempX + xdeviation,tempY + ydeviation) < lastMove &&
                                            Sy.getCharacterAtPosition(tempX + xdeviation, tempY + ydeviation).player_state === Sy.NO_PLAYER_STATE) {
                                            Sy.AIdata.targetX = tempX + xdeviation;
                                            Sy.AIdata.targetY = tempY + ydeviation;
                                            lastMove = Sy.map.getMoveForCell(tempX + xdeviation,tempY + ydeviation);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else {
            //attack first unit to avoid random seed being progressed by non-keyboard AI.
            let unitToAttack = 0; //Math.floor(Sy.PRNG.random() * Sy.AIdata.unitsInRange.length);
            unitToAttack = Sy.AIdata.unitsInRange[unitToAttack];
            //back up the move and attack maps
            let attackBackup = Sy.map.backupAttack();
            Sy.map.resetAttack();
            let attackPosition = Sy.getMoveCellFromAttack(unitToAttack.x, unitToAttack.y, Sy.AIdata.ch);
            Sy.AIdata.targetX = attackPosition.x;
            Sy.AIdata.targetY = attackPosition.y;
            //restore original grid
            Sy.map.restoreAttack(attackBackup);
        }
    } else {
        if (Sy.map.cursorX === Sy.AIdata.targetX && Sy.map.cursorY === Sy.AIdata.targetY) {
            //select that character
            Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_A]);
            Sy.AIdata.pressA = true;
            return;
        } else {
            //move to attack location
            //can use the hover input to jump the cursor to a point
            Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_HOVER,
                Sy.AIdata.targetX, Sy.AIdata.targetY
            ]);
        }
    }
};
Sy.AIlogic_STATE_SELECT_WEAPON_TARGET = function() {
    Sy.varInputBuffer.push([Sy.CurrentState, Sy.BUTTON_A]);
};
Sy.AI = function() {
    let inputSource = Sy.varInputSourceEnemy;
    if (Sy.PLAYER_STATE === Sy.PLAYER) {
        return;
    }
    if (inputSource === Sy.INPUT_SOURCE_AI) {
        //ensure that AI only generates one input per frame
        if (Sy.varInputBuffer.length === 0) {
            /*
            while(AI units left){
              move cursor to AI unit
              -display move
              if nothing in range
              -pretend that the unit can traverse the whole map
              -find a unit in range
              -overlap the real movement and the pretend movement
              -move toward the overlap point
              else
              -choose random target and attack
            }
            */
            switch (Sy.CurrentState) {
                case Sy.STATE_IDLE:
                    Sy.AIlogic_STATE_IDLE();
                    break;
                case Sy.STATE_DISPLAY_MOVE:
                    Sy.AIlogic_STATE_DISPLAY_MOVE();
                    break;
                case Sy.STATE_SELECT_WEAPON_TARGET:
                    Sy.AIlogic_STATE_SELECT_WEAPON_TARGET();
                    break;
                default:
                    break;
            }
        }
    }
};
//populate the map data at the start of a level
Sy.getMapData = function(levelName) {
    return Sy.generateMapFunctions(LevelData[levelName].getMap());
};
//attaches utility functions to a map
Sy.generateMapFunctions = function(map){
    //simple way to clear the map
    map.resetMove = function() {
        map.move = [];
        map.move_fg = [];
        for (let x = 0; x < map.width; x += 1) {
            map.move.push([]);
            map.move_fg.push([]);
            for (let y = 0; y < map.height; y += 1) {
                map.move[x].push(0);
                map.move_fg[x].push(0);
            }
        }
    };
    //simple way to clear the map
    map.resetAttack = function() {
        map.attack = [];
        for (let x = 0; x < map.width; x += 1) {
            map.attack.push([]);
            for (let y = 0; y < map.height; y += 1) {
                map.attack[x].push(0);
            }
        }
    };
    //backup for when doing temporary modifications to map grids
    map.backupMove = function(){
        let moveBackup = {bg:[],fg:[]};
        for (let i = 0; i < Sy.map.width; i += 1) {
            moveBackup.bg.push([]);
            moveBackup.fg.push([]);
            for (let j = 0; j < Sy.map.height; j += 1) {
                moveBackup.bg[i].push(Sy.map.move[i][j]);
                moveBackup.fg[i].push(Sy.map.move_fg[i][j]);
            }
        }
        return moveBackup;
    };
    map.backupAttack = function(){
        let attackBackup = [];
        for (let i = 0; i < Sy.map.width; i += 1) {
            attackBackup.push([]);
            for (let j = 0; j < Sy.map.height; j += 1) {
                attackBackup[i].push(Sy.map.attack[i][j]);
            }
        }
        return attackBackup;
    };
    map.restoreAttack = function(attackBackup){
        for (let i = 0; i < Sy.map.width; i += 1) {
            for (let j = 0; j < Sy.map.height; j += 1) {
                Sy.map.attack[i][j] = attackBackup[i][j];
            }
        }
    };
    map.restoreMove = function(moveBackup){
        for (let i = 0; i < Sy.map.width; i += 1) {
            for (let j = 0; j < Sy.map.height; j += 1) {
                Sy.map.move[i][j] = moveBackup.bg[i][j];
                Sy.map.move_fg[i][j] = moveBackup.fg[i][j];
            }
        }
    };
    map.getMoveForCell = function(x,y){
        return Math.max(Sy.map.move[x][y],Sy.map.move_fg[x][y]);
    };
    map.getLayerAtCoord = function(x,y){
        //NOTE: as a prerequisite, needs the move map filed for the ch beforehand
        //by default, use the chosen layer
        let layer = Sy.map.selectedLayer;
        //if there's no ambiguity between layers, pick the one with data
        if(Sy.map.move[x][y]!==0&& Sy.map.move_fg[x][y]===0){
            layer = 0;
        }
        if(Sy.map.move[x][y]===0&& Sy.map.move_fg[x][y]!==0){
            layer = 1;
        }
        return layer;
    };
    map.resetMove();
    map.resetAttack();
	return map;
};
//populate the units for a given side (state) at the start of a level
Sy.getUnitData = function(state, levelName) {
    return LevelData[levelName].getUnits(state);
};
//ends the turn for a unit, marking them as moved and doing any cleanup (pick up drops)
Sy.setUnitToWait = function(ch){
	//do the work of setting the unit to wait
	ch.hasMoved = true;
	if(ch.player_state == Sy.PLAYER){//only player units can pick up drops
		//then check for any drops that can be collected, and give them to the player unit
		for (let i = 0; i <  Sy.map.drops.length; i += 1) {
			let drop = Sy.map.drops[i];
			if(drop.x == ch.x && drop.y==ch.y){
				if(!drop.isCollected){
					drop.isCollected = true;
					ch.drops.push(drop.drop);
					//one-off increase to currentHp if the buff is to hp
					//this can put it above the character's initial max hp, 
					//but that's ok since the max hp can be computed using the buffs
					if(drop.drop.stat == "hp"){
						ch.currentHp += drop.drop.value;
					}
				}
			}
		}
	}
};
//returns an object with str,def,spd,hp relating to the total buffs fo a character
Sy.getBuffsForCharacter = function(ch){
	let buffs = {
		str:0,def:0,hp:0,spd:0
	};
	for(let i=0;i<ch.drops.length;i+=1){
		let drop = ch.drops[i];
		let stat = drop.stat;
		let amount = drop.value;
		buffs[stat]+=amount;
	}
	return buffs;
};

//initalise the document
//window.addEventListener("load", Sy.init);//added to menu JS instead

//--change the level data, note the has deep dependancies on the renderer, since it has to flush all the relevant caches too
Sy.changeLevel = function(name){
    Sy.setGameData(name);
    if(Ortho.worldGroup){
        for (let i=Ortho.worldGroup.children.length-1;i>=0;i-=1){
            Ortho.worldGroup.children[i].clear();
            Ortho.worldGroup.remove(Ortho.worldGroup.children[i]);
        }
    }
    delete Ortho.initGroup;
    delete Ortho.bgPlane;
    delete Ortho.mapGroup;
    delete Ortho.fgPlane;
    delete Ortho.spriteGroup;
    delete Ortho.dropGroup;
    delete Ortho.cursor;
    delete Ortho.movement;
    //purge specific material cache entries for the bg/fg layer since they change
    if(Ortho.varMaterialCache){
        delete Ortho.varMaterialCache.bgCanvas;
        delete Ortho.varMaterialCache.fgCanvas;
    }
    if(Ortho.infoHeader){
        delete Ortho.infoHeader.selectedCh;//only need to remove the cache entry
        Ortho.infoHeader.showDetails = false;
    }
    Ortho.doneInit = false;
};




















