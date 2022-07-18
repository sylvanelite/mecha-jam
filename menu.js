
//--SFX
//load sounds in menu, because they need to be triggered from user input
var Sound = {
	isLoaded:false,
	Fx:{},
	Bgm:{}
};
Sound.load = function(){
	if(Sound.isLoaded){
		return;
	}
	Sound.Fx.confirm = new Howl({
		src:['./Audio/confirmation_003.ogg']
	});
	Sound.Fx.cancel = new Howl({
		src:['./Audio/error_006.ogg']
	});
	Sound.Bgm.track1 = new Howl({
		src:['./Audio/_robo_battlefield.ogg'],
		loop: true
	});
	Sound.isLoaded=true;
};



//--main menu, shows loading and begins the game when ready
var MM = {
    
};

MM.startGame = function(){
    let rippleClick = document.getElementById("dvRipple");
    rippleClick.classList.remove("hidden");
    rippleClick.classList.add("lds-ripple");
	Sound.load();
    
    setTimeout(function(){
        let menu = document.getElementById("menu");
        menu.classList.add("hidden");
        Sy.init();
    },300);
};

MM.doneLoading = function (){
    let dvLoading = document.getElementById("dvLoading");
    dvLoading.classList.add("hidden");
    
    let dvNewGame = document.getElementById("dvNewGame");
    dvNewGame.classList.remove("hidden");
    dvNewGame.onclick = MM.startGame;
    
    let dvOptions = document.getElementById("dvOptions");
    dvOptions.classList.remove("hidden");
    
    let dvBGM = document.getElementById("dvBGM");
    dvBGM.onclick = MM.toggleBGM;
    let dvSFX = document.getElementById("dvSFX");
    dvSFX.onclick = MM.toggleSFX;
	
    let rippleClick = document.getElementById("dvRipple");
    rippleClick.classList.add("hidden");
    
    let savedData = localStorage.getItem("level");
    if(savedData){
        let dvLoadGame = document.getElementById("dvLoadGame");
        dvLoadGame.classList.remove("hidden");
        dvLoadGame.onclick = MM.load;
    }
};
MM.toggleBGM = function(){
    Sy.varBgmEnabled = !Sy.varBgmEnabled;
    let yes = document.getElementById("spnBgmYes");
    let no = document.getElementById("spnBgmNo");
    if(Sy.varBgmEnabled){
        no.classList.add("hidden");
        yes.classList.remove("hidden");
    }else{
        yes.classList.add("hidden");
        no.classList.remove("hidden");
    }
};
MM.toggleSFX = function(){
    Sy.varSfxEnabled = !Sy.varSfxEnabled;
    let yes = document.getElementById("spnSfxYes");
    let no = document.getElementById("spnSfxNo");
    if(Sy.varSfxEnabled){
        no.classList.add("hidden");
        yes.classList.remove("hidden");
    }else{
        yes.classList.add("hidden");
        no.classList.remove("hidden");
    }
};

MM.save = function(){
    //save takes in: level name, ch1,2,3,4 drops
    //call this during a level to save (not from main menu)
    let data = {
        characters:[],
        enemies:[]
    };
    let level = Sy.map.name;
	let getDropNameArray = function(drops){
		let res = [];
		for(let i=0;i<drops.length;i+=1){
			let drop = drops[i];
			let name = "Heart";
			if(drop === Drops.Diamond){
				name="Diamond";
			}
			if(drop === Drops.Club){
				name="Club";
			}
			if(drop === Drops.Spade){
				name="Spade";
			}
			res.push(name);
		}
		return res;
	};
    for(let i=0;i<Sy.varPlayerCharacters.length;i+=1){
        let ch = Sy.varPlayerCharacters[i];
        let importantStats = {
            hasMoved: ch.hasMoved,
            x:ch.x,y:ch.y,
            player_state:ch.player_state,
            name:ch.name,
            layer:ch.layer,
            drops:getDropNameArray(ch.drops)
        };
        data.characters.push(importantStats);
    }
    for(let i=0;i<Sy.varEnemyCharacters.length;i+=1){
        let ch = Sy.varEnemyCharacters[i];
        let importantStats = {
            hasMoved: ch.hasMoved,
            x:ch.x,y:ch.y,
            player_state:ch.player_state,
            name:ch.name,
            layer:ch.layer,
            drops:getDropNameArray(ch.drops)
        };
        data.enemies.push(importantStats);
    }
    localStorage.setItem("data", JSON.stringify(data));//stores a string
    localStorage.setItem("level", level);
    localStorage.setItem("turn", Sy.varTurnCount);
    localStorage.setItem("csdata", JSON.stringify(CsData.events));
    
};
MM.load = function(){
    let menu = document.getElementById("menu");
    menu.classList.add("hidden");
	Sound.load();
    Sy.init();//note: init should only be called once.
    Sy.changeLevel(localStorage.getItem("level"));
    //apply stats
    let dataStr = localStorage.getItem("data");
    let data = JSON.parse(dataStr);
	//because drops are compared to references of the drops object, reserialisation will cause this to be false
	//need to save names and translate these into references
	let getDropsFromNames = function(dropNames){
		let res = [];
		for(let i=0;i<dropNames.length;i+=1){
			let name = dropNames[i];
			res.push(Drops[name]);
		}
		return res;
	};
    for(let i=0;i<data.characters.length;i+=1){
        let save = data.characters[i];
        let ch = Sy.varPlayerCharacters[i];//should match up
        ch.hasMoved = save.hasMoved;
        ch.x = save.x;
        ch.y = save.y;
        ch.player_state = save.player_state;
        ch.name = save.name;
        ch.layer = save.layer;
        ch.drops = getDropsFromNames(save.drops);
    }
    for(let i=0;i<data.enemies.length;i+=1){
        let save = data.enemies[i];
        let ch = Sy.varEnemyCharacters[i];//should match up
        ch.hasMoved = save.hasMoved;
        ch.x = save.x;
        ch.y = save.y;
        ch.player_state = save.player_state;
        ch.name = save.name;
        ch.layer = save.layer;
        ch.drops = getDropsFromNames(save.drops);
    }
	//restore the saved CS script
    let turnStr = localStorage.getItem("turn");
	Sy.varTurnCount = parseInt(turnStr,10);
	let csData = localStorage.getItem("csdata");
    CsData.events = JSON.parse(csData);
	var element = document.getElementsByTagName("canvas");
	for (let i=0; i < element.length ;i+=1) {
		element[i].classList.remove("hidden");
	}
};

MM.showMenu = function(){
	var element = document.getElementsByTagName("canvas");
	for (let i=0; i < element.length ;i+=1) {
		element[i].classList.add("hidden");
	}
    let menu = document.getElementById("menu");
    menu.classList.remove("hidden");
	MM.doneLoading();
};

window.addEventListener("load", MM.doneLoading);

