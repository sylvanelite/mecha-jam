var CsData = {events:[]};

//ch names: aqua,pink,purple,brown,unkonwn
CsData.level0={
	events: [{
	condition:"turn 1",
	script:[
    "create character: aqua|far_left",
    "map set cursor: 0|2",
    "talk: aqua|Let's see... the base should be nearby.",
    "map set cursor: 8|10",
    "talk: aqua|What's over there? Some army mechs!",
    "talk: aqua|They look old. I might be able to defeat them solo.",
    "talk: aqua|They'll attack if I approach, or if it reaches night.",
    "map set cursor: 0|2",
    "talk: aqua|If I can get past them, I can meet up with my ally base.",
    "fade screen out"]},
    {
	condition:"turn 2",
	script:[
    "create character: aqua|far_left",
    "talk: aqua|I can do this!",
    "talk: aqua|The base I'm assigned to is just past these walls",
    "fade screen out"]},
    {
	condition:"epilogue",
	script:[
    "create character: aqua|far_left",
    "create character: brown|far_right",
    "talk: aqua|Yeah! I won!",
    "talk: aqua|Oh, an incoming transmission!",
    "talk: brown|Hello... hello...",
    "map create character: Girl|7|7|unkonwn|player|true",
    "map set cursor: 7|7",
    "talk: brown|Can you read me?",
    "talk: aqua|Yes, I can hear you.",
    "talk: brown|I'm an advance patrol from our remote base.",
    "talk: brown|Good job mopping up these remnants. Let's head on to the next area.",
    "talk: aqua|Awesome, let's go.",
    "fade screen out"]},
    ]
};
CsData.level1={
	events: [{
	condition:"turn 1",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "map set cursor: 0|2",
    "talk: brown|We will encounter mechs on the way to the base.",
    "talk: brown|As you know, our station is quite far from the font lines.",
    "talk: aqua|Yes, While the two main armies fight, small groups patrol the outlans.",
    "talk: brown|Our station is set to hold 4 people.",
    "talk: brown|In addition to me, there are two more, you're the newest.",
    "talk: brown|If you need help come talk to me.",
    "talk: aqua|Ok, sure. Let's head out",
    "fade screen out"]},
    {
	condition:"turn 2",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "talk: brown|If you can defeat enemies that have gear, they will drop it",
    "talk: aqua|That's useful, I can use those to become stronger",
    "talk: brown|Yes, and there's no limit to how much gear you can hold.",
    "fade screen out"]},
    {
	condition:"epilogue",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "talk: aqua|Ok, great. They've been defeated.",
    "talk: aqua|We can move on now.",
    "talk: brown|Before we go, a word of advice.",
    "talk: brown|Any gear the mechs drops quickly becomes useless.",
    "talk: brown|If the last mech nearby is destroyed, all the gear shuts down.",
    "talk: brown|So pick up as much gear as you can before defeating the last mech.",
    "talk: aqua|Ok, sounds good.",
    "talk: brown|But don't get carried away and get defeated either.",
    "fade screen out"]},
    {
	condition:"talk ch1 ch0",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "talk: brown|you can attack over walls, but cannot move through them",
    "talk: brown|keep this in mind when fighting.",
    "talk: aqua|Good to know. If I see stairs, we can move onto the walls?",
    "talk: brown|In theory, yes, but those are rare.",
    "fade screen out"]}
    ]
};

CsData.level2={
	events: [{
	condition:"turn 1",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "map set cursor: 1|0",
    "talk: brown|This is the last set of fortifications between us and the base.",
    "talk: brown|Unfortunately, it seems there's a lot of mechs now.",
    "talk: aqua|At least the walls are sturdy, it should thin their numbers.",
    "talk: brown|Yes, indeed. If we watch their range, we should be able to fight them",
    "talk: brown|Take turns attacking and we can spread the damage across our mechs.",
    "talk: aqua|It'll be tough, but we can do this",
    "fade screen out"]},
    {
	condition:"turn 2",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "talk: brown|Don't worry if one of our mechs goes down.",
    "talk: aqua|As long as one still works, right?",
    "talk: brown|Exactly, the remaining mech can transport whoever's left.",
    "talk: brown|And then we can repair our downed gear after the opponent is gone.",
    "fade screen out"]},
    {
	condition:"epilogue",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "talk: aqua|So what are the enemy mechs anyway?",
    "talk: aqua|They only move at night, are they solar driven like us?",
    "talk: brown|Yes. Fundamentally both sides in this war use the same technology.",
    "talk: brown|We move during the day, and only have counterattack reserves at night.",
    "talk: brown|Meanwhile, the enemy charge during the day, and expend it at night.",
    "talk: brown|Neither side on the war has the tech to fight 24/7.",
    "talk: aqua|Our enemny uses a lot more remote AI than we do",
    "talk: aqua|I haven't seen another piloted mech out here yet.",
    "talk: brown|Don't expect to, all their pilots are directed to the front lines.",
    "talk: brown|Different tactics. Our forces use small sums of pilots to protect these areas.",
    "talk: brown|The enemy uses large numbers of weaker AI.",
    "talk: aqua|I guess neither side has an advantage.",
    "talk: brown|Indeed...",
    "fade screen out"]},
    {
	condition:"talk ch1 ch0",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "talk: aqua|Fighting in close quarters is tough.",
    "talk: brown|You're doing better than I can.",
    "talk: brown|When I came to meet you, I passed through without fighting.",
    "talk: aqua|On your own, these numbers are impossible to beat.",
    "talk: brown|Yeah. We're a small group, choosing how to fight is important.",
    "fade screen out"]}
    ]
};

CsData.level3={
	events: [{
	condition:"turn 1",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "map set cursor: 6|8",
	"talk: pink|Hello! Welcome to the base.",
	"talk: pink|As you can see, we're in a tight spot.",
    "talk: brown|The enemy mechs have converged here.",
	"talk: pink|It looks like by trying to expand our forces, the enemy is counteracting to match.",
    "talk: aqua|And we're not even at full strength, aren't we supposed to have 4?",
    "talk: brown|Yes, that's right. But our last member is out gathering supplies",
    "talk: brown|We'll need to defeat the forces here before they return.",
    "talk: pink|It was looking bad before you all arrived. Now we have a chance.",
    "fade screen out"]},
    {
	condition:"turn 2",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "talk: pink|There's only one entrance, if we bunch up we can hold it.",
    "talk: aqua|But we don't want to just take hits forever.",
    "talk: brown|Correct. If we only stick to counterattacks, we'll take a lot of damage.",
    "talk: pink|We'll just have to pick our fights carefully.",
    "fade screen out"]},
    {
	condition:"epilogue",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "talk: pink|That's the last of them.",
    "map create character: Girl|14|14|unkonwn|player|true",
    "create character: purple|right",
    "map set cursor: 14|14",
    "talk: purple|I'm back with the supplies!",
    "talk: purple|Wow, it looks like you had a rought time here.",
    "talk: brown|Yes. But now we're all together, we can move out",
    "talk: aqua|It's good to finally meet everyone.",
    "talk: purple|Nice to meet you.",
    "talk: pink|Next up, we need to move in on some suspicious AI movements.",
    "talk: brown|No rest for us?",
    "talk: aqua|I guess not.",
    "talk: pink|The base is safe, so it's the perfect time to strike.",
    "fade screen out"]},
    {
	condition:"talk ch1 ch2",
	script:[
    "create character: brown|far_left",
    "create character: pink|far_right",
    "talk: pink|Good to see you back.",
    "talk: brown|Likewise. It seems you're in a tough spot.",
    "talk: pink|I'll be honest, if you didn't arrive in the next few days,",
    "talk: pink|The base would have been abandoned",
    "fade screen out"]},
    {
	condition:"talk ch0 ch2",
	script:[
    "create character: aqua|far_left",
    "create character: pink|far_right",
    "talk: pink|Nice to meet you!",
    "talk: aqua|Likewise. Wish it was under better circumstances.",
    "talk: pink|Sure, but at least I know you can fight",
    "talk: aqua|Yep, leave it to me",
    "fade screen out"]}
    ]
};
CsData.level4={
	events: [{
	condition:"turn 1",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "create character: purple|right",
    "map set cursor: 1|1",
	"talk: pink|We've split up.",
	"talk: brown|The enemy is surrounded.",
    "talk: aqua|Our pincer formation should give us an advantage.",
	"talk: purple|But they still have the edge in numbers.",
    "talk: aqua|I guess we'll find out.",
    "fade screen out"]},
    {
	condition:"turn 2",
	script:[
    "create character: pink|left",
    "create character: purple|right",
	"talk: pink|This is strange, the enemy is clustered.",
	"talk: purple|What do you think it means?",
    "talk: pink|I'm not sure, but we will have to press the assault.",
	"talk: purple|Ok, let's see how far we can go.",
    "fade screen out"]},
    {
	condition:"epilogue",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "create character: purple|right",
    "talk: aqua|We did a good job with that formation.",
    "talk: pink|If we regroup, we can push the offensive.",
    "talk: purple|While on my supply run, I found where the enemy is from.",
    "talk: brown|Take us there, we might be able to get the upper hand.",
    "fade screen out"]},
    {
	condition:"talk ch0 ch1",
	script:[
    "create character: aqua|far_left",
    "create character: brown|far_right",
    "talk: aqua|Me and you paired up again.",
    "talk: brown|It's good. We fight well together.",
    "talk: aqua|It'll be better if we can catch up to the others first.",
    "fade screen out"]},
    {
	condition:"talk ch3 ch2",
	script:[
    "create character: pink|far_left",
    "create character: purple|far_right",
    "talk: pink|Good scouting for this chance.",
    "talk: purple|Hopefully we can regoup and win here.",
    "talk: pink|I'm sure we can push through.",
    "fade screen out"]}
    ]
};
CsData.level5={
	events: [{
	condition:"turn 1",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "create character: purple|right",
    "map set cursor: 7|11",
	"talk: purple|This is it, the entrance to their stronghold.",
	"talk: brown|You say that, but it's really just a small base.",
    "talk: pink|Like us, the enemy can't afford to spend resources out here.",
	"talk: aqua|Their outposts are just an early warning relay, right?",
    "talk: purple|Yes. Really, these remote bases are just to act as a deterrence.",
    "talk: purple|Neither faction can put a large force through here without being seen.",
    "talk: purple|And if they are found, their opponent can push through the front.",
	"talk: aqua|It's all about numbers. Take forces from the front, and you risk the war.",
    "fade screen out"]},
    {
	condition:"turn 2",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "create character: purple|right",
	"talk: pink|Even for a remote base, this is poorly defended.",
	"talk: purple|They must have more forces elsewhere.",
    "talk: brown|Should we go team up with another outpost?",
	"talk: purple|No, we can't act without intel. We'll need to win here and move on first.",
    "fade screen out"]},
    {
	condition:"epilogue",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "create character: purple|right",
    "talk: aqua|I think I've found something.",
    "talk: aqua|The base leads off out the back.",
    "talk: purple|This is bad, they could have pulled all their resources.",
    "talk: brown|If they abandon their other remote bases, they could have a large force.",
    "talk: pink|We need to find them fast.",
    "fade screen out"]},
    {
	condition:"talk ch0 ch3",
	script:[
    "create character: aqua|far_left",
    "create character: purple|far_right",
    "talk: aqua|It feels like we are attacking one of our own bases.",
    "talk: purple|I can feel like that, both sides in the war have similar bases.",
    "talk: aqua|Is that just because we're remote?",
    "talk: purple|Yes. Here the paradime is to cover as much land as possible.",
    "talk: purple|You don't need a large force to do it.",
    "talk: aqua|Let's hope not...",
    "fade screen out"]},
    {
	condition:"talk ch2 ch1",
	script:[
    "create character: pink|far_left",
    "create character: brown|far_right",
    "talk: brown|What's the chances the enemy route their main force here?",
    "talk: pink|Low. Although it would let them bypass the front, it's not smart.",
    "talk: pink|They would need to be sure they aren't caught moving forces.",
    "talk: brown|And that's our job to spot them.",
    "talk: pink|Yep, they know we're here.",
    "fade screen out"]}
    ]
};
CsData.level6={
	events: [{
	condition:"turn 1",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "create character: purple|right",
    "map set cursor: 2|2",
	"talk: aqua|Is this?",
	"talk: brown|You bet. They've massed forces.",
    "talk: pink|But it's not their front line.",
	"talk: aqua|It's the same kind we've been fighting before",
    "talk: purple|They've mustered their scouts into one spot.",
    "talk: purple|Not sure why, though. But it'll be hard to win this one.",
	"talk: aqua|We can't lose here, we need to report this intel back.",
    "fade screen out"]},
    {
	condition:"turn 2",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
	"talk: brown|There's a wedge in the enemy forces.",
	"talk: brown|We can choose to focus on the right, or left.",
    "talk: aqua|Or fight both",
	"talk: brown|I guess so, but there's no advantage in that.",
    "fade screen out"]},
    {
	condition:"epilogue",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "create character: purple|right",
    "talk: aqua|We'll be in trouble if this keeps up.",
    "talk: aqua|What's our next plan?",
    "talk: purple|In theory, we can get the other bases to help us.",
    "talk: brown|Right, if the enemy mustered here, they are depleted elsewhere.",
    "talk: pink|No need. We've routed them here",
    "talk: pink|It's catch-22. If we retreat and ask for aid, the enemy get time to move",
    "talk: pink|If they run through a gap we open in aid, we lose",
    "talk: aqua|So we push on ourselves? If we find their muster point, we win?",
    "talk: purple|Sounds good. We just have to make it to there.",
    "fade screen out"]},
    {
	condition:"talk ch0 ch3",
	script:[
    "create character: aqua|far_left",
    "create character: purple|far_right",
    "talk: aqua|Have you me our other bases?",
    "talk: purple|I have, we keep in touch routinely.",
    "talk: aqua|Each has 4 member?",
    "talk: purple|That's correct. 4 is enough to act as a force, without consuming too many resources",
    "talk: aqua|If they are as dependable as this group, we'll be in good hands",
    "fade screen out"]},
    ]
};
CsData.level7={
	events: [{
	condition:"turn 1",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "create character: purple|right",
    "map set cursor: 2|2",
	"talk: aqua|We've found it",
	"talk: brown|Big time.",
    "talk: pink|This terrain must have hidden their forces.",
	"talk: aqua|It's now or nothing.",
	"talk: purple|Push through until we reach their base.",
    "fade screen out"]},
    {
	condition:"epilogue",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "create character: purple|right",
    "talk: aqua|Just one more battle.",
    "talk: purple|It'll be our hardest yet.",
    "talk: brown|Everyone, check your gear is working.",
    "talk: pink|I've sent for reinforcements",
    "talk: pink|Let's clear the next area before they arrive",
    "fade screen out"]},
    ]
};
CsData.level8={
	events: [{
	condition:"turn 1",
	script:[
    "create character: brown|far_left",
    "create character: aqua|far_right",
    "create character: pink|left",
    "create character: purple|right",
    "map set cursor: 0|8",
	"talk: aqua|This is it guys.",
	"talk: brown|Our last battle.",
    "talk: pink|Let's win here.",
	"talk: purple|Nothing left but to fight.",
    "fade screen out"]},
    {
	condition:"epilogue",
	script:[
    "create character: aqua|far_right",
    "create character: purple|far_left",
    "talk: aqua|We did it! we've cleared their army.",
    "fade screen out"]},
    ]
};



CsData.loadLevel = function(level){
	CsData.events = [];//clear out whatever script was currently running
	if(CsData.hasOwnProperty(level)){
		CsData.events = JSON.parse(JSON.stringify(CsData[level].events));
	}
};
