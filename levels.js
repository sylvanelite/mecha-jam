var LevelData = {
	getBasePlayerUnits:function(){
		let characterArray = [];
		for (let i = 0; i < 4; i += 1) {
			let character = BS.createCharacter();
			//cl is to avoid using the word "class"
			character.cl = 'Girl';
			//copy all base values
			character = BS.applyStatsToCharacter(character, character.cl);
			//make player units have stronger bases
			character.spd+=2;
			character.def+=3;
			character.str+=5;
			character.hp+=10;
			character.currentHp = character.hp;
			characterArray.push(character);
			character.x = i;
			character.y = 0;
			character.item = Im.tworange;//space
			character.name="ch"+i;
			character.player_state = Sy.NO_PLAYER_STATE;//start them as nulled out and set them as "PLAYER" in a load method
			character.hasMoved = false;
		}
		//TODO: character names?
		return characterArray;
	},
	getBaseEnemyUnit: function(){
		let character = BS.createCharacter();
		character.cl = 'Girl';
		//copy all base values
		character = BS.applyStatsToCharacter(character, character.cl);
		character.currentHp = character.hp;
		character.x = 0;
		character.y = 0;
		character.item = Im.tworange;//space
		character.player_state = Sy.ENEMY;
		character.hasMoved = false;
		return character;
		
	},
	getBaseMap:function(){
		let map = {
			cursorX: 0,
			cursorY: 0,
			width: 16,
			height: 16,
			terrain: [],
			terrain_fg:[],
			drops:[],
			move_fg:[],
			move: [],
			attack: [],
			selectedLayer:0,
			layers:[],
			name:"level0"
		};
		let p = Tr.plain;
		let vertTerrain = [];
		for (let i = 0; i < map.height; i += 1) {
			let row = [];
			for (let j = 0; j < map.width; j += 1) {
				row.push(p);
			}
			vertTerrain.push(row);
		}
		for (let i = 1; i < map.height - 1; i += 1) {
			for (let j = 1; j < map.width - 1; j += 1) {
				vertTerrain[i][j] = Tr.grass;            
			}
		}
		for (let o = 0; o < vertTerrain[0].length; o += 1) {
			map.terrain.push([]);
			map.terrain_fg.push([]);
			for (let r = 0; r < vertTerrain.length; r += 1) {
				map.terrain[o].push(vertTerrain[r][o]);
				map.terrain_fg[o].push(Tr.none);
			}
		}
		map.layers.push(map.terrain);
		map.layers.push(map.terrain_fg);
		return map;
		
	}
};

LevelData.loadLvlFromCanvas = function(lvlNumber){
	//colour lookups
	let playerColour = {r:0,g:74,b:127};
	let enemyColour = {r:127,g:0,b:0};
	//let bgPlain = {r:255,g:255,b:255};//will default to plain, not needed
	let fgPlain = {r:0,g:0,b:0};
	
	let map = LevelData.getBaseMap();
	let units = {
		player:LevelData.getBasePlayerUnits(),
		enemy:[]
	};
	let playerUnitIdx=0;
	let canvas = document.createElement('canvas');
	canvas.width = 16; canvas.height = 16;
	R.drawCanvasAsync(canvas, "level"+lvlNumber, "./lvl/level"+lvlNumber+".png",
			0, 0, canvas.width, canvas.height,
			0, 0, canvas.width, canvas.height,
	function() {});
	let ctx = canvas.getContext('2d');
	let data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
	
	for(let i=0;i<data.length;i+=4){
		let r = data[i];
		let g = data[i+1];
		let b = data[i+2];
		//let a = data[i+3];
		let idx = i/4;
		let x = idx % canvas.width;
		let y = Math.floor(idx / canvas.width);
		//TODO: check this works with premultiplied alpha... should be 255 for all cells, so should be ok?
		if(r==fgPlain.r&&g==fgPlain.g&&b==fgPlain.b){
			map.terrain_fg[x][y] = Tr.plain;
			map.terrain[x][y] = Tr.none;
		}
		if(r==playerColour.r&&g==playerColour.g&&b==playerColour.b){
			if(playerUnitIdx<units.player.length){
				units.player[playerUnitIdx].x = x;
				units.player[playerUnitIdx].y = y;
				units.player[playerUnitIdx].player_state = Sy.PLAYER;
				playerUnitIdx+=1;
			}else{
				console.log("more starting positions than there are players...");
			}
		}
		if(r==enemyColour.r&&g==enemyColour.g&&b==enemyColour.b){
			let e = LevelData.getBaseEnemyUnit();
			e.x = x;
			e.y = y;
			units.enemy.push(e);
		}
	}
	return {map:map,units:units};
};
LevelData.applyDrops = function (units,drops){
	let idx = 0;
	for(let i=0;i<drops.length;i+=1){
		units[idx].drops.push(drops[i]);
		idx+=1;
		if(idx==units.length){
			idx=0;
		}
	}
};
LevelData.getNextLevel = function(name){
	switch(name){
			case "level0":
				return "level1";
			case "level1":
				return "level2";
			case "level2":
				return "level3";
			case "level3":
				return "level4";
			case "level4":
				return "level5";
			case "level5":
				return "level6";
			case "level6":
				return "level7";
			case "level7":
				return "level8";
		default:
			return "";
	}
};
LevelData.level0 = {id:1};
LevelData.level0.getMap = function(){
	let data = LevelData.loadLvlFromCanvas(LevelData.level0.id);
	return data.map;
};
LevelData.level0.getUnits = function(state){
	let data = LevelData.loadLvlFromCanvas(LevelData.level0.id);
	if(state == Sy.PLAYER){
		return data.units.player;
	}
	if(state == Sy.ENEMY){
		return data.units.enemy;
	}
};
LevelData.level1 = {id:2};
LevelData.level1.getMap = function(){
	let data = LevelData.loadLvlFromCanvas(LevelData.level1.id);
	return data.map;
};
LevelData.level1.getUnits = function(state){
	let data = LevelData.loadLvlFromCanvas(LevelData.level1.id);
	if(state == Sy.PLAYER){
		return data.units.player;
	}
	if(state == Sy.ENEMY){
		let drops = [
			Drops.Spade,
			Drops.Club,
			Drops.Diamond,
			Drops.Heart,
		];
		LevelData.applyDrops(data.units.enemy,drops);
		return data.units.enemy;
	}
};
LevelData.level2 = {id:3};
LevelData.level2.getMap = function(){
	let data = LevelData.loadLvlFromCanvas(LevelData.level2.id);
	return data.map;
};
LevelData.level2.getUnits = function(state){
	let data = LevelData.loadLvlFromCanvas(LevelData.level2.id);
	if(state == Sy.PLAYER){
		return data.units.player;
	}
	if(state == Sy.ENEMY){
		let drops = [
			Drops.Spade,
			Drops.Club,
			Drops.Diamond,
			Drops.Heart,
		];
		LevelData.applyDrops(data.units.enemy,drops);
		return data.units.enemy;
	}
};
LevelData.level3 = {id:4};
LevelData.level3.getMap = function(){
	let data = LevelData.loadLvlFromCanvas(LevelData.level3.id);
	return data.map;
};
LevelData.level3.getUnits = function(state){
	let data = LevelData.loadLvlFromCanvas(LevelData.level3.id);
	if(state == Sy.PLAYER){
		return data.units.player;
	}
	if(state == Sy.ENEMY){
		let drops = [
			Drops.Spade,
			Drops.Club,
			Drops.Diamond,
			Drops.Heart,
			Drops.Spade,
			Drops.Club,
			Drops.Diamond,
			Drops.Heart,
		];
		LevelData.applyDrops(data.units.enemy,drops);
		return data.units.enemy;
	}
};
LevelData.level4 = {id:5};
LevelData.level4.getMap = function(){
	let data = LevelData.loadLvlFromCanvas(LevelData.level4.id);
	return data.map;
};
LevelData.level4.getUnits = function(state){
	let data = LevelData.loadLvlFromCanvas(LevelData.level4.id);
	if(state == Sy.PLAYER){
		return data.units.player;
	}
	if(state == Sy.ENEMY){
		let drops = [
			Drops.Spade,
			Drops.Club,
			Drops.Club,
			Drops.Diamond,
			Drops.Diamond,
			Drops.Heart,
		];
		LevelData.applyDrops(data.units.enemy,drops);
		return data.units.enemy;
	}
};
LevelData.level5 = {id:6};
LevelData.level5.getMap = function(){
	let data = LevelData.loadLvlFromCanvas(LevelData.level5.id);
	return data.map;
};
LevelData.level5.getUnits = function(state){
	let data = LevelData.loadLvlFromCanvas(LevelData.level5.id);
	if(state == Sy.PLAYER){
		return data.units.player;
	}
	if(state == Sy.ENEMY){
		let drops = [
			Drops.Spade,
			Drops.Spade,
			Drops.Club,
			Drops.Diamond,
			Drops.Heart,
			Drops.Heart,
		];
		LevelData.applyDrops(data.units.enemy,drops);
		return data.units.enemy;
	}
};
LevelData.level6 = {id:7};
LevelData.level6.getMap = function(){
	let data = LevelData.loadLvlFromCanvas(LevelData.level6.id);
	return data.map;
};
LevelData.level6.getUnits = function(state){
	let data = LevelData.loadLvlFromCanvas(LevelData.level6.id);
	if(state == Sy.PLAYER){
		return data.units.player;
	}
	if(state == Sy.ENEMY){
		let drops = [
			Drops.Spade,
			Drops.Club,
			Drops.Diamond,
			Drops.Heart,
		];
		LevelData.applyDrops(data.units.enemy,drops);
		return data.units.enemy;
	}
};
LevelData.level7 = {id:8};
LevelData.level7.getMap = function(){
	let data = LevelData.loadLvlFromCanvas(LevelData.level7.id);
	return data.map;
};
LevelData.level7.getUnits = function(state){
	let data = LevelData.loadLvlFromCanvas(LevelData.level7.id);
	if(state == Sy.PLAYER){
		return data.units.player;
	}
	if(state == Sy.ENEMY){
		let drops = [
			Drops.Spade,
			Drops.Club,
			Drops.Diamond,
			Drops.Heart,
			Drops.Spade,
			Drops.Club,
			Drops.Diamond,
			Drops.Heart,
			Drops.Spade,
			Drops.Club,
			Drops.Diamond,
			Drops.Heart,
		];
		LevelData.applyDrops(data.units.enemy,drops);
		return data.units.enemy;
	}
};
LevelData.level8 = {id:9};
LevelData.level8.getMap = function(){
	let data = LevelData.loadLvlFromCanvas(LevelData.level8.id);
	return data.map;
};
LevelData.level8.getUnits = function(state){
	let data = LevelData.loadLvlFromCanvas(LevelData.level8.id);
	if(state == Sy.PLAYER){
		return data.units.player;
	}
	if(state == Sy.ENEMY){
		return data.units.enemy;
	}
};






