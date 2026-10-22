// GENERATED FILE. Edit scripts/transpile-game.py, not this file.
// Source: reference/simplified/scripts/main.as
// SHA-256: bcfb5a048718b4f7ccea8001950643d29fda8fd4fee2cfd0aca3fd59bd2ea3c6
// All gameplay classes/functions mechanically ported; Flash APIs supplied by runtime.js.
"use strict";
function __as3_int(value) { return value | 0; }
function __as3_uint(value) { return value >>> 0; }
function __as3_nullableString(value) { return value === null || value === undefined ? null : String(value); }
function __as3_storeString(object, key, value) {
  object[key] = __as3_nullableString(value);
  return value;
}
function __as3_updateSlot(object, key, delta, postfix, unsigned) {
  const previous = object[key];
  const incremented = previous + delta;
  const next = unsigned ? __as3_uint(incremented) : __as3_int(incremented);
  object[key] = next;
  return postfix ? previous : incremented;
}
function __as3_as(value, type) { return value != null && __as3_is(value, type) ? value : null; }
function __as3_is(value, type) {
  if (type === Array) return Array.isArray(value);
  if (type === Number) return typeof value === "number";
  if (type === String) return typeof value === "string";
  if (type === Boolean) return typeof value === "boolean";
  return value instanceof type;
}

var bb_mojo_graphics_context = null;
var bb_mojo_input_device = null;
var bb_mojo_audio_device = null;
var bb_mojo_app_device = null;
var bb_Game = null;
var bb_Audio = null;
var bb_data_Hoedown = null;
var bb_data_Hoedownfat = null;
var bb_data_goose = null;
var bb_data_goosefat = null;
var bb_data_shovelsprites = null;
var bb_data_preachersprites = null;
var bb_data_shotgunsprites = null;
var bb_data_trucksprites = null;
var bb_data_bombersprites = null;
var bb_data_zombiesprites = null;
var bb_data_ghoulsprites = null;
var bb_data_fastzombiesprites = null;
var bb_data_fatzombiesprites = null;
var bb_data_catapultsprites = null;
var bb_data_flingsprites = null;
var bb_data_zombieparts = null;
var bb_data_ghoulparts = null;
var bb_data_fastzombieparts = null;
var bb_data_fatzombieparts = null;
var bb_data_jetsprites = null;
var bb_data_harvestsprites = null;
var bb_data_clocksprites = null;
var bb_data_basesprites = null;
var bb_data_bitsprites = null;
var bb_data_bloodsprites = null;
var bb_data_bigbloodsprites = null;
var bb_data_explosionsprites = null;
var bb_data_ignitionsprites = null;
var bb_data_shoveldeath = null;
var bb_data_shotgundeath = null;
var bb_data_bomberhead = null;
var bb_data_preacherdeath = null;
var bb_data_extrablood = null;
var bb_data_harvestblood = null;
var bb_data_unitname = null;
var bb_data_unitdata = null;
var bb_data_zombiename = null;
var bb_data_zombiedata = null;
var bb_data_buildingname = null;
var bb_data_buildingdata = null;
var bb_data_wmdxp = null;
var bb_data_wmdcooldown = null;
var bb_std_random_Seed = __as3_int(0);
var bb_leveldata_level1 = null;
var bb_leveldata_level2 = null;
var bb_leveldata_level3 = null;
var bb_leveldata_level4 = null;
var bb_data_difficultyname = null;
var bb_data_difficultytitle = null;
var bb_data_junkpos = null;
var bb_data_trailerpos = null;
var bb_data_unitabout = null;
var bb_data_buildingabout = null;
var bb_data_wmdabout = null;
var bb_data_wmdname = null;
var bb_data_WinMessage = __as3_nullableString(null);
var bb_data_LoseMessage = __as3_nullableString(null);

class bb_mojo_app_App {
  constructor() {
  }
  bbApp_new() {
    (bb_mojo_app_device = new bb_mojo_app_AppDevice().bbAppDevice_new(this));
    return this;
  }
  bbOnCreate() {
    return __as3_int(0);
  }
  bbOnUpdate() {
    return __as3_int(0);
  }
  bbOnRender() {
    return __as3_int(0);
  }
  bbOnLoading() {
    return __as3_int(0);
  }
}

class bb_NativeApp extends bb_mojo_app_App {
  constructor() {
    super();
  }
  bbNativeApp_new() {
    super.bbApp_new();
    return this;
  }
}

class bb_Zomba extends bb_NativeApp {
  bblogo = null;
  bbalpharect = null;
  bbbackground = null;
  bbarrow = null;
  bbselecta = null;
  bbready = null;
  bbdisabled = null;
  bbtick = null;
  bblock = null;
  bbhover = null;
  bbspeed = null;
  bbsoundoff = null;
  bbsoundicon = null;
  bbdude = null;
  bbyeehaw = null;
  bbtitles = null;
  bbgameui = null;
  bbtip1box = null;
  bbtip2box = null;
  bbprogress1 = null;
  bbprogress2 = null;
  bbwinscreen = null;
  bblosescreen = null;
  bbsubmit = null;
  bbisky = new_object_array(4);
  bbitrailer = new_object_array(6);
  bbzbase = null;
  bbwheel1 = null;
  bbwheel2 = null;
  bbbottle = null;
  bbgametime = __as3_int(0);
  bbmusicoutput = null;
  bbfont = null;
  bbfont1 = null;
  bbfont2 = null;
  bbfont3 = null;
  bbfont4 = null;
  bbshovelman = null;
  bbpreachersheet = null;
  bbshotgunman = null;
  bbtrucksheet = null;
  bbbombersheet = null;
  bbzombiesheet = null;
  bbghoulsheet = null;
  bbfastzombiesheet = null;
  bbfatzombiesheet = null;
  bbcatapultsheet = null;
  bbflingsheet = null;
  bbzombiepartsheet = null;
  bbghoulpartsheet = null;
  bbfastzombiepartsheet = null;
  bbfatzombiepartsheet = null;
  bbjetsheet = null;
  bbharvestsheet = null;
  bbtimer = null;
  bbbasesheet = null;
  bbbitsheet = null;
  bbbloodgore = null;
  bbbigbloodgore = null;
  bbexplosionsheet = null;
  bbignitionsheet = null;
  bbshoveldeathsheet = null;
  bbshotgundeathsheet = null;
  bbbomberheadsheet = null;
  bbpreacherdeathsheet = null;
  bbextrabloodsheet = null;
  bbharvestbloodsheet = null;
  bbunits = new_object_array(6);
  bbzunits = new_object_array(6);
  bbbuildings = new_object_array(6);
  bbpowers = new_object_array(3);
  bbblood = new bb_Blood().bbBlood_new();
  bbrecords = new_number_array(4);
  bbcell1 = __as3_int(0);
  bbcell1x = Number(20);
  bbcell2 = __as3_int(0);
  bbcell2x = Number(20);
  bbcell3 = __as3_int(0);
  bbcell3x = Number(20);
  bbcell4 = __as3_int(0);
  bbcell4x = Number(20);
  bbcell5 = __as3_int(0);
  bbcell5x = Number(20);
  bbcell7throw = __as3_int(0);
  bbcell9 = __as3_int(0);
  bbcell9x = Number(20);
  bbcell10 = __as3_int(0);
  bbcell10x = Number(20);
  bbcell11 = __as3_int(0);
  bbcell11x = Number((- 1400));
  bbcell12 = __as3_int(0);
  bbcell12x = Number((- 200));
  bbcell12throw = __as3_int(0);
  bbcell13 = __as3_int(0);
  bbcell13x = Number(0);
  bbmainState = __as3_int(0);
  bbmousehit = __as3_int(0);
  bbstarttime = __as3_int(0);
  bbupdates = __as3_int(0);
  bbcellspeed = __as3_int(5);
  bbcellwalkspeed = Number(0.5);
  bbcell2walkspeed = Number(0.359375);
  bbcell3walkspeed = Number(0.25);
  bbcell4walkspeed = Number(0.25);
  bbcell5walkspeed = Number(0.5);
  bbcell6 = __as3_int(0);
  bbcell6walkspeed = Number(1.5);
  bbcell6x = Number(20);
  bbcell7 = __as3_int(0);
  bbcell7walkspeed = Number(0.5);
  bbcell7x = Number(20);
  bbcell8 = __as3_int(0);
  bbcell9walkspeed = Number(0.5);
  bbcell10walkspeed = Number(0.45);
  bbflinglist = new bb_std_list_List().bbList_new();
  bbcell11walkspeed = Number(0.25);
  bbcell12walkspeed = Number(5);
  bbcell13walkspeed = Number(1);
  bbbottles = new bb_std_list_List().bbList_new();
  bbexplosions = new bb_std_list_List().bbList_new();
  bbzombies = new bb_std_list_List().bbList_new();
  bbbodyparts = new bb_std_list_List().bbList_new();
  bbmenucount = __as3_int(0);
  bbmenuitem = __as3_int(0);
  bbztp = null;
  bbloggedin = __as3_int(0);
  bbgameticks = __as3_int(0);
  bbsixtyiths = __as3_int(0);
  bbcoins = __as3_int(0);
  bbpeople = new bb_std_list_List().bbList_new();
  bbpombies = new bb_std_list_List().bbList_new();
  bbpowerups = new bb_std_list_List().bbList_new();
  bbpeoplebase = null;
  bbZombieHealthMultiplier = Number(0);
  bbzombiebase = null;
  bbsmokelist = new bb_std_list_List().bbList_new();
  bbdeathlist = new bb_std_list_List().bbList_new();
  bbzombieclock = __as3_int(0);
  bbzombierate = __as3_int(0);
  bbzombiehealth = __as3_int(0);
  bbzombiegroan = __as3_int(0);
  bbgamespeed = __as3_int(2);
  bbzombieskilled = __as3_int(0);
  bbkinlost = __as3_int(0);
  bbdifficulty = __as3_int(0);
  bbZombieDamageMultiplier = Number(0);
  bbcreditmillis = __as3_int(0);
  bbzoom = Number(0);
  bbplaywidth = __as3_int(0);
  bbplayheight = __as3_int(0);
  bbframecount = __as3_int(0);
  bbibutton = new_object_array(5);
  constructor() {
    super();
  }
  bbZomba_new() {
    super.bbNativeApp_new();
    return this;
  }
  bbReadScores() {
    (this.bbrecords[0] = ReadInt("ZTPBestScores", "0"));
    (this.bbrecords[1] = ReadInt("ZTPBestScores", "1"));
    (this.bbrecords[2] = ReadInt("ZTPBestScores", "2"));
    (this.bbrecords[3] = ReadInt("ZTPBestScores", "3"));
    return __as3_int(0);
  }
  bbResetAttract() {
    (this.bbcell1 = __as3_int(0));
    (this.bbcell1x = Number(20));
    (this.bbcell2 = __as3_int(0));
    (this.bbcell2x = Number(20));
    (this.bbcell3 = __as3_int(0));
    (this.bbcell3x = Number(20));
    (this.bbcell4 = __as3_int(0));
    (this.bbcell4x = Number(20));
    (this.bbcell5 = __as3_int(0));
    (this.bbcell5x = Number(20));
    (this.bbcell7throw = __as3_int(0));
    (this.bbcell9 = __as3_int(0));
    (this.bbcell9x = Number(20));
    (this.bbcell10 = __as3_int(0));
    (this.bbcell10x = Number(20));
    (this.bbcell11 = __as3_int(0));
    (this.bbcell11x = Number((- 1200)));
    (this.bbcell12 = __as3_int(0));
    (this.bbcell12x = Number((- 200)));
    (this.bbcell12throw = __as3_int(0));
    (this.bbcell13 = __as3_int(0));
    (this.bbcell13x = Number((- 200)));
    return __as3_int(0);
  }
  bbOnCreate() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = __as3_int(0);
    var _loc3_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    (bb_Audio = new bb_Sounds().bbSounds_new());
    (this.bblogo = bb_mojo_graphics_LoadImage("logo.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbalpharect = bb_mojo_graphics_LoadImage("bg_alpha.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbbackground = bb_mojo_graphics_LoadImage("BG.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbarrow = bb_mojo_graphics_LoadImage("arrow.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbselecta = bb_mojo_graphics_LoadImage("selecta.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbready = bb_mojo_graphics_LoadImage("ready.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbdisabled = bb_mojo_graphics_LoadImage("disabled.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbtick = bb_mojo_graphics_LoadImage("tick.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bblock = bb_mojo_graphics_LoadImage("lock.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbhover = bb_mojo_graphics_LoadImage("hover_blood.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbspeed = bb_mojo_graphics_LoadImage("speed_triangle.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbsoundoff = bb_mojo_graphics_LoadImage("sound_off.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbsoundicon = bb_mojo_graphics_LoadImage("sound_icon.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbdude = bb_mojo_graphics_LoadImage("dude.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbyeehaw = bb_mojo_graphics_LoadImage("yeehaw.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbtitles = bb_mojo_graphics_LoadImage("title.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbgameui = bb_mojo_graphics_LoadImage("Game_UI.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbtip1box = bb_mojo_graphics_LoadImage("green_box.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbtip2box = bb_mojo_graphics_LoadImage("red_box.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbprogress1 = bb_mojo_graphics_LoadImage("progress1.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbprogress2 = bb_mojo_graphics_LoadImage("progress2.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbwinscreen = bb_mojo_graphics_LoadImage("winscreen.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bblosescreen = bb_mojo_graphics_LoadImage("losescreen.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbsubmit = bb_mojo_graphics_LoadImage("submit_icons.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    ShowMochi("ee52ab6a89d60ca6", 2, 566);
    (this.bbisky[0] = bb_mojo_graphics_LoadImage("sky1.jpg", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbisky[1] = bb_mojo_graphics_LoadImage("sky2.jpg", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbisky[2] = bb_mojo_graphics_LoadImage("sky3.jpg", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbisky[3] = bb_mojo_graphics_LoadImage("sky4.jpg", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbitrailer[0] = bb_mojo_graphics_LoadImage("trailer.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbitrailer[1] = bb_mojo_graphics_LoadImage("junkyard.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbitrailer[2] = bb_mojo_graphics_LoadImage("farm_house.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbitrailer[3] = bb_mojo_graphics_LoadImage("Garage.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbitrailer[4] = bb_mojo_graphics_LoadImage("Still.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbitrailer[5] = bb_mojo_graphics_LoadImage("chapel.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbzbase = bb_mojo_graphics_LoadImage("zombie_base.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbwheel1 = bb_mojo_graphics_LoadImage("wheel1.png", 1, 1));
    (this.bbwheel2 = bb_mojo_graphics_LoadImage("wheel2.png", 1, 1));
    (this.bbbottle = bb_mojo_graphics_LoadImage("moonshinebottle.png", 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (this.bbmusicoutput = bb_Audio.bbPlayAudio(bb_Audio.bbmusic, 10000));
    (_loc1_ = __as3_int(20));
    (_loc1_ = __as3_int((_loc1_ + 1)));
    (this.bbfont = new bb_imagefont_ImageFont().bbImageFont_new("Hoedown", 60, bb_data_Hoedown));
    (this.bbfont1 = new bb_imagefont_ImageFont().bbImageFont_new("Hoedownfatorange", 60, bb_data_Hoedownfat));
    (this.bbfont2 = new bb_imagefont_ImageFont().bbImageFont_new("Hoedownfatblack", 60, bb_data_Hoedownfat));
    (this.bbfont3 = new bb_imagefont_ImageFont().bbImageFont_new("goose", 46, bb_data_goose));
    (this.bbfont4 = new bb_imagefont_ImageFont().bbImageFont_new("goosefat", 46, bb_data_goosefat));
    (this.bbshovelman = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("shovelsprites", bb_data_shovelsprites, 0, 0, 0));
    (this.bbpreachersheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("preachersprites", bb_data_preachersprites, 0, 0, 0));
    (this.bbshotgunman = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("shotgunsprites", bb_data_shotgunsprites, 0, 0, 0));
    (this.bbtrucksheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("trucksprites", bb_data_trucksprites, 0, 0, 0));
    (this.bbbombersheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("bombersprites", bb_data_bombersprites, 0, 0, 0));
    (this.bbzombiesheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("zombiesprites", bb_data_zombiesprites, 0, 24, 0));
    (this.bbghoulsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("ghoulsprites", bb_data_ghoulsprites, 0, 0, 0));
    (this.bbfastzombiesheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("fastzombiesprites", bb_data_fastzombiesprites, 0, (- 16), 0));
    (this.bbfatzombiesheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("fatzombiesprites", bb_data_fatzombiesprites, 0, 16, 0));
    (this.bbcatapultsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("catapultsprites", bb_data_catapultsprites, 0, 0, 0));
    (this.bbflingsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("catapultzombie", bb_data_flingsprites, 0, 0, 0));
    (this.bbzombiepartsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("zombieparts", bb_data_zombieparts, 0, 0, 0));
    (this.bbghoulpartsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("ghoulparts", bb_data_ghoulparts, 0, 0, 0));
    (this.bbfastzombiepartsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("fastzombieparts", bb_data_fastzombieparts, 0, 0, 0));
    (this.bbfatzombiepartsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("fatzombieparts", bb_data_fatzombieparts, 0, 0, 0));
    (this.bbjetsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("jetsprites", bb_data_jetsprites, 0, 0, 0));
    (this.bbharvestsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("harvestersprites", bb_data_harvestsprites, 0, 0, 0));
    (this.bbtimer = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("clocksprites", bb_data_clocksprites, 0, 0, 0));
    (this.bbbasesheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("basesprites", bb_data_basesprites, 0, 0, 0));
    (this.bbbitsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("bitsprites", bb_data_bitsprites, 0, 0, 0));
    (this.bbbloodgore = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("bloodsprites", bb_data_bloodsprites, 0, 0, 0));
    (this.bbbigbloodgore = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("bigbloodsprites", bb_data_bigbloodsprites, 0, 0, 0));
    (this.bbexplosionsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("explosionsprites", bb_data_explosionsprites, 0, 0, 0));
    (this.bbignitionsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("ignitionsprites", bb_data_ignitionsprites, 0, 0, 0));
    (this.bbshoveldeathsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("shoveldeath", bb_data_shoveldeath, 0, 0, 0));
    (this.bbshotgundeathsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("shotgundeath", bb_data_shotgundeath, 0, 0, 0));
    (this.bbbomberheadsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("bomberhead", bb_data_bomberhead, 0, 0, 0));
    (this.bbpreacherdeathsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("preacherdeath", bb_data_preacherdeath, 0, 0, 0));
    (this.bbextrabloodsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("extrablood", bb_data_extrablood, 0, 0, 0));
    (this.bbharvestbloodsheet = new bb_spritesheet_SpriteSheet().bbSpriteSheet_new("harvestblood", bb_data_harvestblood, 0, 0, 0));
    (_loc2_ = __as3_int(0));
    while ((_loc2_ < bb_data_unitname.length))
    {
      (this.bbunits[_loc2_] = new bb_Unit().bbUnit_new(_loc2_, bb_data_unitname[_loc2_], bb_data_unitdata, (_loc2_ * 10)));
      (_loc2_ = __as3_int((_loc2_ + 1)));
    }
    (_loc3_ = __as3_int(0));
    while ((_loc3_ < bb_data_zombiename.length))
    {
      (this.bbzunits[_loc3_] = new bb_Unit().bbUnit_new((32 + _loc3_), bb_data_zombiename[_loc3_], bb_data_zombiedata, (_loc3_ * 10)));
      (_loc3_ = __as3_int((_loc3_ + 1)));
    }
    (_loc4_ = __as3_int(0));
    while ((_loc4_ < bb_data_buildingname.length))
    {
      (this.bbbuildings[_loc4_] = new bb_Building().bbBuilding_new(_loc4_, bb_data_buildingname[_loc4_], bb_data_buildingdata, (_loc4_ * 4)));
      (_loc4_ = __as3_int((_loc4_ + 1)));
    }
    (this.bbpowers[0] = new bb_Power().bbPower_new(0, 150, bb_data_wmdxp[0], bb_data_wmdcooldown[0]));
    (this.bbpowers[1] = new bb_Power().bbPower_new(1, 150, bb_data_wmdxp[1], bb_data_wmdcooldown[1]));
    (this.bbpowers[2] = new bb_Power().bbPower_new(2, 150, bb_data_wmdxp[2], bb_data_wmdcooldown[2]));
    bb_Gore.bbReset(this.bbbloodgore, this.bbbigbloodgore, this.bbextrabloodsheet);
    this.bbblood.bbReset();
    bb_mojo_app_SetUpdateRate(30);
    this.bbReadScores();
    this.bbResetAttract();
    PlayMovie("splash");
    (this.bbmainState = __as3_int(0));
    return __as3_int(0);
  }
  bbAddFling(param1, param2, param3) {
    param1 = __as3_int(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    this.bbflinglist.bbAddLast(new bb_Fling().bbFling_new(param1, bb_Cell.bbcells(this.bbflingsheet), param2, param3));
    return __as3_int(0);
  }
  bbDamageBase(param1, param2) {
    param1 = __as3_int(param1);
    param2 = Number(param2);
    var _loc3_ = Number(NaN);
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    var _loc6_ = __as3_int(0);
    var _loc7_ = __as3_int(0);
    while ((param1 > 0))
    {
      (_loc3_ = Number((bb_std_random_Rnd2(4) - 2)));
      (_loc4_ = __as3_int((((- 4) - bb_std_random_Rnd2(4)) | 0)));
      (_loc5_ = __as3_int(__as3_int(bb_Rand(8))));
      (_loc6_ = __as3_int((1 + bb_Rand(4))));
      (param2 = Number((param2 + bb_std_random_Rnd2(80))));
      (_loc7_ = __as3_int((- 20)));
      this.bbbodyparts.bbAddLast(new bb_BodyPart().bbBodyPart_new(_loc5_, this.bbbitsheet, _loc6_, param2, _loc7_, _loc3_, _loc4_));
      (param1 = __as3_int((param1 - ((4 + bb_std_random_Rnd2(6)) | 0))));
    }
    return __as3_int(0);
  }
  bbExplodeBottle(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = __as3_int(param4);
    var _loc5_ = null;
    var _loc6_ = null;
    var _loc7_ = __as3_int(0);
    if ((bb_std_random_Rnd() <= 0.5))
    {
      bb_Audio.bbPlay(bb_Audio.bbexplosion2);
    }
    else
    {
      bb_Audio.bbPlay(bb_Audio.bbexplosion1);
    }
    this.bbexplosions.bbAddLast(new bb_Explosion().bbExplosion_new(param1, bb_Cell.bbcells(this.bbexplosionsheet), param2, param3, 1));
    (_loc5_ = this.bbzombies.bbObjectEnumerator());
    while (_loc5_.bbHasNext())
    {
      (_loc6_ = __as3_as(_loc5_.bbNextObject(), bb_Zombie));
      (_loc7_ = __as3_int((bb_std_math_Abs2((_loc6_.bbxpos - param2)) | 0)));
      if ((! (((_loc6_.bbunit.bbtype == 37) && (param4 == 500)))))
      {
        if ((_loc7_ < 100))
        {
          (param4 = __as3_int(_loc6_.bbSmack(param4, 3)));
          if ((param4 <= 0))
          {
            break;
          }
        }
      }
    }
    return __as3_int(0);
  }
  bbUpdateAttract(param1) {
    param1 = __as3_int(param1);
    var _loc2_ = null;
    var _loc3_ = null;
    var _loc4_ = null;
    var _loc5_ = null;
    var _loc6_ = __as3_int(0);
    var _loc7_ = Number(NaN);
    var _loc8_ = Number(NaN);
    var _loc9_ = null;
    var _loc10_ = null;
    var _loc11_ = null;
    var _loc12_ = null;
    while ((param1 != 0))
    {
      (this.bbcell1 = __as3_int((this.bbcell1 + 1)));
      if ((this.bbcell1 >= (this.bbshovelman.bblastframe * this.bbcellspeed)))
      {
        (this.bbcell1 = __as3_int(0));
      }
      if ((this.bbcell1 < 92))
      {
        (this.bbcell1x = Number((this.bbcell1x + this.bbcellwalkspeed)));
      }
      (this.bbcell2 = __as3_int((this.bbcell2 + 1)));
      if ((this.bbcell2 >= (this.bbshotgunman.bblastframe * this.bbcellspeed)))
      {
        (this.bbcell2 = __as3_int(0));
      }
      if ((this.bbcell2 < 128))
      {
        (this.bbcell2x = Number((this.bbcell2x + this.bbcell2walkspeed)));
      }
      (this.bbcell3 = __as3_int((this.bbcell3 + 1)));
      if ((this.bbcell3 >= (this.bbzombiesheet.bblastframe * this.bbcellspeed)))
      {
        (this.bbcell3 = __as3_int(0));
        (this.bbcell3x = Number((this.bbcell3x + (this.bbcell3walkspeed * 48))));
      }
      if ((this.bbcell3 < 172))
      {
        (this.bbcell3x = Number((this.bbcell3x + this.bbcell3walkspeed)));
      }
      (this.bbcell4 = __as3_int((this.bbcell4 + 1)));
      if ((this.bbcell4 >= (this.bbtrucksheet.bblastframe * this.bbcellspeed)))
      {
        (this.bbcell4 = __as3_int(0));
      }
      (this.bbcell4x = Number((this.bbcell4x + this.bbcell4walkspeed)));
      (this.bbcell5 = __as3_int((this.bbcell5 + 1)));
      if ((this.bbcell5 >= (this.bbghoulsheet.bblastframe * this.bbcellspeed)))
      {
        (this.bbcell5 = __as3_int(0));
        (this.bbcell5x = Number((this.bbcell5x + (240 * this.bbcell5walkspeed))));
      }
      if ((this.bbcell5 < 92))
      {
        (this.bbcell5x = Number((this.bbcell5x + this.bbcell5walkspeed)));
      }
      (this.bbcell6 = __as3_int((this.bbcell6 + 1)));
      if ((this.bbcell6 >= (this.bbfastzombiesheet.bblastframe * this.bbcellspeed)))
      {
        (this.bbcell6 = __as3_int(0));
      }
      if ((this.bbcell6 < 56))
      {
        (this.bbcell6x = Number((this.bbcell6x + this.bbcell6walkspeed)));
      }
      (this.bbcell7 = __as3_int((this.bbcell7 + 1)));
      if ((this.bbcell7 >= (this.bbbombersheet.bblastframe * this.bbcellspeed)))
      {
        (this.bbcell7 = __as3_int(0));
      }
      if ((((this.bbcell7 - 1) < (40 * this.bbcellspeed)) && (this.bbcell7 >= (40 * this.bbcellspeed))))
      {
        (this.bbcell7throw = __as3_int(1));
      }
      if ((this.bbcell7 < 116))
      {
        (this.bbcell7x = Number((this.bbcell7x + this.bbcell7walkspeed)));
      }
      (this.bbcell8 = __as3_int((this.bbcell8 + 1)));
      if ((this.bbcell8 >= (this.bbexplosionsheet.bblastframe * this.bbcellspeed)))
      {
        (this.bbcell8 = __as3_int(0));
      }
      (this.bbcell9 = __as3_int((this.bbcell9 + 1)));
      if ((this.bbcell9 >= (this.bbpreachersheet.bblastframe * this.bbcellspeed)))
      {
        (this.bbcell9 = __as3_int(0));
        (this.bbcell9x = Number((this.bbcell9x + (60 * this.bbcell9walkspeed))));
      }
      if ((this.bbcell9 < (26 * this.bbcellspeed)))
      {
        (this.bbcell9x = Number((this.bbcell9x + this.bbcell9walkspeed)));
      }
      (this.bbcell10 = __as3_int((this.bbcell10 + 1)));
      if ((this.bbcell10 >= (this.bbfatzombiesheet.bblastframe * this.bbcellspeed)))
      {
        (this.bbcell10 = __as3_int(0));
      }
      if ((this.bbcell10 < (39 * this.bbcellspeed)))
      {
        (this.bbcell10x = Number((this.bbcell10x + this.bbcell10walkspeed)));
      }
      (this.bbcell11 = __as3_int((this.bbcell11 + 1)));
      if ((this.bbcell11 >= (this.bbcatapultsheet.bblastframe * this.bbcellspeed)))
      {
        (this.bbcell11 = __as3_int(0));
      }
      if ((this.bbcell11 == (82 * this.bbcellspeed)))
      {
        (_loc6_ = __as3_int(1));
        while ((_loc6_ <= 1))
        {
          (_loc7_ = Number(((_loc6_ * 320) + this.bbcell11x)));
          (_loc8_ = Number(1180));
          (_loc7_ = Number((1600 - _loc7_)));
          this.bbAddFling(0, _loc7_, 0);
          (_loc6_ = __as3_int((_loc6_ + 1)));
        }
      }
      if ((this.bbcell11 < (42 * this.bbcellspeed)))
      {
        (this.bbcell11x = Number((this.bbcell11x + this.bbcell11walkspeed)));
        if ((this.bbcell11x > 1600))
        {
          (this.bbcell11x = Number((this.bbcell11x - 1600)));
        }
      }
      (this.bbcell12 = __as3_int((this.bbcell12 + 1)));
      if ((this.bbcell12 >= (36 * this.bbcellspeed)))
      {
        (this.bbcell12 = __as3_int(0));
      }
      (this.bbcell12x = Number((this.bbcell12x + this.bbcell12walkspeed)));
      if ((this.bbcell12x > 1400))
      {
        (this.bbcell12x = Number((this.bbcell12x - 1600)));
      }
      (this.bbcell12throw = __as3_int((this.bbcell12throw + 1)));
      (this.bbcell13 = __as3_int((this.bbcell13 + 1)));
      if ((this.bbcell13 >= (4 * this.bbcellspeed)))
      {
        (this.bbcell13 = __as3_int(0));
      }
      (this.bbcell13x = Number((this.bbcell13x + this.bbcell13walkspeed)));
      bb_Gore.bbUpdateAll();
      (_loc2_ = this.bbbottles.bbObjectEnumerator());
      while (_loc2_.bbHasNext())
      {
        (_loc9_ = __as3_as(_loc2_.bbNextObject(), bb_Bottle));
        _loc9_.bbUpdate();
        if ((_loc9_.bbexplode != 0))
        {
          this.bbExplodeBottle(0, _loc9_.bbxpos, _loc9_.bbypos, _loc9_.bbdamage);
          this.bbbottles.bbRemove(_loc9_);
        }
      }
      (_loc3_ = this.bbexplosions.bbObjectEnumerator());
      while (_loc3_.bbHasNext())
      {
        (_loc10_ = __as3_as(_loc3_.bbNextObject(), bb_Explosion));
        _loc10_.bbUpdate();
        if ((_loc10_.bbrecycle != 0))
        {
          this.bbexplosions.bbRemove(_loc10_);
        }
      }
      (_loc4_ = this.bbflinglist.bbObjectEnumerator());
      while (_loc4_.bbHasNext())
      {
        (_loc11_ = __as3_as(_loc4_.bbNextObject(), bb_Fling));
        _loc11_.bbUpdate();
        if ((_loc11_.bbrecycle != 0))
        {
          this.bbflinglist.bbRemove(_loc11_);
        }
      }
      (_loc5_ = this.bbbodyparts.bbObjectEnumerator());
      while (_loc5_.bbHasNext())
      {
        (_loc12_ = __as3_as(_loc5_.bbNextObject(), bb_BodyPart));
        _loc12_.bbUpdate();
        if ((_loc12_.bbrecycle != 0))
        {
          this.bbbodyparts.bbRemove(_loc12_);
        }
      }
      ((__as3_previous) => (param1 = __as3_int(__as3_previous + -1), __as3_previous))(param1);
    }
    return __as3_int(0);
  }
  bbResetGame(param1) {
    param1 = __as3_int(param1);
    var _loc2_ = null;
    var _loc3_ = __as3_int(0);
    var _loc4_ = null;
    var _loc5_ = __as3_int(0);
    var _loc6_ = null;
    var _loc7_ = __as3_int(0);
    var _loc8_ = __as3_int(0);
    var _loc9_ = null;
    var _loc10_ = __as3_int(0);
    var _loc11_ = null;
    var _loc12_ = __as3_int(0);
    var _loc13_ = null;
    var _loc14_ = __as3_int(0);
    var _loc15_ = null;
    var _loc16_ = null;
    var _loc17_ = null;
    var _loc18_ = null;
    var _loc19_ = null;
    var _loc20_ = null;
    if ((this.bbloggedin != 0))
    {
    }
    (this.bbstarttime = __as3_int(bb_mojo_app_Millisecs()));
    (this.bbgametime = __as3_int(this.bbstarttime));
    (this.bbupdates = __as3_int(0));
    (this.bbgameticks = __as3_int(0));
    (this.bbsixtyiths = __as3_int(0));
    (this.bbcoins = __as3_int(0));
    (this.bbztp.bbcash = __as3_int(100));
    (this.bbztp.bbforce = __as3_int(0));
    (this.bbztp.bbmaxforce = __as3_int(5));
    (this.bbztp.bbxp = __as3_int(0));
    (this.bbztp.bbbuildingcount[0] = 1);
    (this.bbztp.bbbuildingcount[1] = 1);
    (this.bbztp.bbbuildingcount[2] = 0);
    (this.bbztp.bbbuildingcount[3] = 0);
    (this.bbztp.bbbuildingcount[4] = 0);
    (this.bbztp.bbbuildingcount[5] = 0);
    if (false)
    {
      (this.bbztp.bbbuildingcount[1] = 1);
      (this.bbztp.bbbuildingcount[2] = 1);
      (this.bbztp.bbbuildingcount[3] = 1);
      (this.bbztp.bbbuildingcount[4] = 1);
      (this.bbztp.bbbuildingcount[5] = 1);
      (this.bbztp.bbcash = __as3_int(10000));
      (this.bbztp.bbxp = __as3_int(100000));
    }
    (_loc2_ = this.bbunits);
    (_loc3_ = __as3_int(0));
    while ((_loc3_ < _loc2_.length))
    {
      (_loc15_ = _loc2_[_loc3_]);
      (_loc3_ = __as3_int((_loc3_ + 1)));
      _loc15_.bbReset();
    }
    (_loc4_ = this.bbbuildings);
    (_loc5_ = __as3_int(0));
    while ((_loc5_ < _loc4_.length))
    {
      (_loc16_ = _loc4_[_loc5_]);
      (_loc5_ = __as3_int((_loc5_ + 1)));
      _loc16_.bbReset();
    }
    (_loc6_ = this.bbpowers);
    (_loc7_ = __as3_int(0));
    while ((_loc7_ < _loc6_.length))
    {
      (_loc17_ = _loc6_[_loc7_]);
      (_loc7_ = __as3_int((_loc7_ + 1)));
      _loc17_.bbReset();
    }
    this.bbpeople.bbClear();
    this.bbzombies.bbClear();
    this.bbpombies.bbClear();
    this.bbpowerups.bbClear();
    (this.bbpeoplebase = new bb_Person().bbPerson_new(7, this.bbunits[5], bb_Cell.bbcells(this.bbbasesheet)));
    (this.bbpeoplebase.bbxpos = Number(120));
    (this.bbzombiebase = new bb_Zombie().bbZombie_new(0, this.bbzunits[5], null));
    (this.bbzombiebase.bbxpos = Number(1500));
    this.bbpeople.bbAddLast(this.bbpeoplebase);
    this.bbzombies.bbAddLast(this.bbzombiebase);
    this.bbbottles.bbClear();
    this.bbexplosions.bbClear();
    this.bbsmokelist.bbClear();
    this.bbflinglist.bbClear();
    this.bbbodyparts.bbClear();
    this.bbdeathlist.bbClear();
    bb_Gore.bbReset(this.bbbloodgore, this.bbbigbloodgore, this.bbextrabloodsheet);
    (this.bbzombieclock = __as3_int(0));
    (this.bbzombierate = __as3_int((1000 - (200 * param1))));
    (this.bbzombiehealth = __as3_int(0));
    (this.bbzombiegroan = __as3_int((250 + bb_Rand(250))));
    (this.bbgamespeed = __as3_int(2));
    (this.bbzombieskilled = __as3_int(0));
    (this.bbkinlost = __as3_int(0));
    if ((param1 != 0))
    {
      (this.bbdifficulty = __as3_int((param1 - 1)));
    }
    (_loc8_ = __as3_int(__as3_int(this.bbdifficulty)));
    if ((_loc8_ != 0))
    {
      if ((_loc8_ == 1))
      {
        bb_ZombieMob.bbInit(bb_leveldata_level2);
        (this.bbZombieDamageMultiplier = Number(1.25));
        (this.bbZombieHealthMultiplier = Number(1.25));
      }
      else
      if ((_loc8_ == 2))
      {
        bb_ZombieMob.bbInit(bb_leveldata_level3);
        (this.bbZombieDamageMultiplier = Number(1.5));
        (this.bbZombieHealthMultiplier = Number(1.5));
      }
      else
      if ((_loc8_ == 3))
      {
        bb_ZombieMob.bbInit(bb_leveldata_level4);
        (this.bbZombieDamageMultiplier = Number(1.75));
        (this.bbZombieHealthMultiplier = Number(1.75));
      }
    }
    else
    {
      bb_ZombieMob.bbInit(bb_leveldata_level1);
      (this.bbZombieDamageMultiplier = Number(1));
      (this.bbZombieHealthMultiplier = Number(1));
    }
    (this.bbpowers[0].bblocked = 0);
    (this.bbpowers[1].bblocked = ((this.bbrecords[0] != 0) ? 0 : 1));
    (this.bbpowers[2].bblocked = ((this.bbrecords[1] == 0) ? 1 : 0));
    (_loc9_ = this.bbunits);
    (_loc10_ = __as3_int(0));
    while ((_loc10_ < _loc9_.length))
    {
      (_loc18_ = _loc9_[_loc10_]);
      (_loc10_ = __as3_int((_loc10_ + 1)));
      _loc18_.bbReset();
    }
    (_loc11_ = this.bbzunits);
    (_loc12_ = __as3_int(0));
    while ((_loc12_ < _loc11_.length))
    {
      (_loc19_ = _loc11_[_loc12_]);
      (_loc12_ = __as3_int((_loc12_ + 1)));
      _loc19_.bbReset();
    }
    (_loc13_ = this.bbpowers);
    (_loc14_ = __as3_int(0));
    while ((_loc14_ < _loc13_.length))
    {
      (_loc20_ = _loc13_[_loc14_]);
      (_loc14_ = __as3_int((_loc14_ + 1)));
      _loc20_.bbReset();
    }
    return __as3_int(0);
  }
  bbPlayGame(param1) {
    param1 = __as3_int(param1);
    (this.bbztp = new bb_ZTPGame().bbZTPGame_new());
    (this.bbmainState = __as3_int(2));
    this.bbResetGame(param1);
    return __as3_int(0);
  }
  bbUpdateMenu() {
    var _loc1_ = __as3_int(0);
    if ((this.bbmenucount != 0))
    {
      (this.bbmenucount = __as3_int((this.bbmenucount + 2)));
      if ((this.bbmenucount > 199))
      {
        (this.bbmenucount = __as3_int(0));
        (_loc1_ = __as3_int(__as3_int(this.bbmenuitem)));
        if (((((_loc1_ == 1) || (_loc1_ == 2)) || (_loc1_ == 3)) || (_loc1_ == 4)))
        {
          this.bbPlayGame(this.bbmenuitem);
        }
      }
    }
    return __as3_int(0);
  }
  bbAddWealth(param1) {
    param1 = __as3_int(param1);
    (this.bbcoins = __as3_int((this.bbcoins + param1)));
    while ((this.bbcoins >= 600))
    {
      (this.bbcoins = __as3_int((this.bbcoins - 600)));
      (this.bbztp.bbcash = __as3_int((this.bbztp.bbcash + 50)));
    }
    return __as3_int(0);
  }
  bbAddZombie(param1) {
    var _loc2_ = __as3_int(0);
    var _loc3_ = null;
    var _loc4_ = __as3_int(0);
    var _loc5_ = null;
    if ((this.bbmainState != 3))
    {
      (_loc2_ = __as3_int(__as3_int(bb_Rand(8))));
      (_loc3_ = null);
      (_loc4_ = __as3_int(param1.bbtype));
      if ((_loc4_ == 32))
      {
        (_loc3_ = this.bbzombiesheet);
      }
      else
      if ((_loc4_ != 33))
      {
        if ((_loc4_ == 34))
        {
          (_loc3_ = this.bbfastzombiesheet);
        }
        else
        if ((_loc4_ == 35))
        {
          (_loc3_ = this.bbfatzombiesheet);
        }
        else
        {
          if ((_loc4_ != 36))
          {
            return null;
          }
          (_loc3_ = this.bbcatapultsheet);
        }
      }
      else
      {
        (_loc3_ = this.bbghoulsheet);
      }
      (_loc5_ = new bb_Zombie().bbZombie_new(_loc2_, param1, _loc3_));
      this.bbzombies.bbAddLast(_loc5_);
      return _loc5_;
    }
    return null;
  }
  bbWriteScores() {
    WriteInt("ZTPBestScores", "0", this.bbrecords[0]);
    WriteInt("ZTPBestScores", "1", this.bbrecords[1]);
    WriteInt("ZTPBestScores", "2", this.bbrecords[2]);
    WriteInt("ZTPBestScores", "3", this.bbrecords[3]);
    FlushInts("ZTPBestScores");
    return __as3_int(0);
  }
  bbGameOver(param1) {
    param1 = __as3_int(param1);
    (this.bbcreditmillis = __as3_int(bb_mojo_app_Millisecs()));
    if ((param1 != 0))
    {
      if (((this.bbrecords[this.bbdifficulty] == 0) || (this.bbgameticks < this.bbrecords[this.bbdifficulty])))
      {
        (this.bbrecords[this.bbdifficulty] = this.bbgameticks);
        this.bbWriteScores();
      }
      (this.bbmainState = __as3_int(3));
    }
    else
    {
      (this.bbmainState = __as3_int(4));
    }
    this.bbpeople.bbRemove(this.bbpeoplebase);
    this.bbzombies.bbRemove(this.bbzombiebase);
    return __as3_int(0);
  }
  bbUpdateGroan() {
    var _loc1_ = __as3_int(0);
    __as3_updateSlot(this, "bbzombiegroan", -1, false, false);
    if ((this.bbzombiegroan <= 0))
    {
      (this.bbzombiegroan = __as3_int((2500 + bb_Rand(2500))));
      (_loc1_ = __as3_int(__as3_int(bb_Rand(4))));
      if ((_loc1_ == 0))
      {
        bb_Audio.bbPlay(bb_Audio.bbgroan1);
      }
      else
      if ((_loc1_ != 1))
      {
        if ((_loc1_ == 2))
        {
          bb_Audio.bbPlay(bb_Audio.bbgroan3);
        }
        else
        if ((_loc1_ == 3))
        {
          bb_Audio.bbPlay(bb_Audio.bbgroan4);
        }
      }
      else
      {
        bb_Audio.bbPlay(bb_Audio.bbgroan2);
      }
    }
    return __as3_int(0);
  }
  bbBombPeople(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = __as3_int(param4);
    var _loc5_ = null;
    var _loc6_ = null;
    var _loc7_ = __as3_int(0);
    if ((bb_std_random_Rnd() > 0.5))
    {
      bb_Audio.bbPlay(bb_Audio.bbexplosion1);
    }
    else
    {
      bb_Audio.bbPlay(bb_Audio.bbexplosion2);
    }
    this.bbexplosions.bbAddLast(new bb_Explosion().bbExplosion_new(param1, bb_Cell.bbcells(this.bbignitionsheet), param2, param3, 1));
    (_loc5_ = this.bbpeople.bbObjectEnumerator());
    while (_loc5_.bbHasNext())
    {
      (_loc6_ = __as3_as(_loc5_.bbNextObject(), bb_Person));
      (_loc7_ = __as3_int((bb_std_math_Abs2((_loc6_.bbxpos - param2)) | 0)));
      if ((_loc7_ < 60))
      {
        (param4 = __as3_int(_loc6_.bbInfect(param4)));
        if ((param4 <= 0))
        {
          break;
        }
      }
    }
    return __as3_int(0);
  }
  bbAddPerson(param1) {
    var _loc2_ = null;
    var _loc3_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    var _loc5_ = null;
    (_loc2_ = null);
    (_loc3_ = __as3_int(__as3_int(bb_Rand(8))));
    (_loc4_ = __as3_int(param1.bbtype));
    if ((_loc4_ != 0))
    {
      if ((_loc4_ == 1))
      {
        (_loc2_ = this.bbshotgunman);
      }
      else
      if ((_loc4_ != 2))
      {
        if ((_loc4_ == 3))
        {
          (_loc2_ = this.bbbombersheet);
        }
        else
        if ((_loc4_ == 4))
        {
          (_loc2_ = this.bbpreachersheet);
        }
      }
      else
      {
        (_loc2_ = this.bbtrucksheet);
      }
    }
    else
    {
      (_loc2_ = this.bbshovelman);
    }
    (_loc5_ = param1.bbInstance(_loc3_, bb_Cell.bbcells(_loc2_)));
    this.bbpeople.bbAddLast(_loc5_);
    return _loc5_;
  }
  bbAddPower(param1) {
    var _loc2_ = __as3_int(0);
    var _loc3_ = null;
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    var _loc6_ = __as3_int(0);
    var _loc7_ = __as3_int(0);
    var _loc8_ = __as3_int(0);
    var _loc9_ = null;
    var _loc10_ = __as3_int(0);
    var _loc11_ = __as3_int(0);
    (_loc2_ = __as3_int(param1.bbtype));
    if ((_loc2_ == 0))
    {
      (_loc3_ = null);
      (_loc4_ = __as3_int(1));
      while ((_loc4_ <= 12))
      {
        (_loc6_ = __as3_int(__as3_int(bb_Rand(8))));
        (_loc3_ = this.bbunits[0].bbInstance(_loc6_, bb_Cell.bbcells(this.bbshovelman)));
        (_loc3_.bbxpos = Number((((- _loc4_) * 20) + bb_reversebits(_loc4_, 4))));
        _loc3_.bbAnger();
        this.bbpeople.bbAddLast(_loc3_);
        (_loc4_ = __as3_int((_loc4_ + 1)));
      }
      (_loc5_ = __as3_int(1));
      while ((_loc5_ <= 4))
      {
        (_loc7_ = __as3_int(__as3_int(bb_Rand(8))));
        (_loc3_ = this.bbunits[1].bbInstance(_loc7_, bb_Cell.bbcells(this.bbshotgunman)));
        (_loc3_.bbxpos = Number((((- _loc5_) * 50) + bb_reversebits(_loc5_, 4))));
        _loc3_.bbAnger();
        this.bbpeople.bbAddLast(_loc3_);
        (_loc5_ = __as3_int((_loc5_ + 1)));
      }
      bb_Audio.bbPlay(bb_Audio.bbangrymob);
    }
    else
    if ((_loc2_ != 1))
    {
      if ((_loc2_ == 2))
      {
        (_loc9_ = null);
        (_loc10_ = __as3_int(1));
        while ((_loc10_ <= 3))
        {
          (_loc11_ = __as3_int(__as3_int(bb_Rand(8))));
          (_loc9_ = new bb_PowerUp().bbPowerUp_new(_loc11_, 2, this.bbjetsheet, null));
          (_loc9_.bbxpos = Number((_loc9_.bbxpos - (_loc10_ * 128))));
          (_loc9_.bbypos = Number((_loc9_.bbypos + (bb_reversebits(_loc10_, 4) * 10))));
          this.bbpowerups.bbAddLast(_loc9_);
          (_loc10_ = __as3_int((_loc10_ + 1)));
        }
        bb_Audio.bbPlay(bb_Audio.bbairstrike);
      }
    }
    else
    {
      (_loc8_ = __as3_int(0));
      this.bbpowerups.bbAddLast(new bb_PowerUp().bbPowerUp_new(_loc8_, 1, this.bbharvestsheet, this.bbharvestbloodsheet));
    }
    (param1.bbcooldown = __as3_int(param1.bbcooltime));
    return __as3_int(0);
  }
  bbAddBottle(param1, param2, param3, param4, param5, param6) {
    param1 = __as3_int(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = Number(param4);
    param5 = Number(param5);
    param6 = __as3_int(param6);
    this.bbbottles.bbAddLast(new bb_Bottle().bbBottle_new(param1, this.bbbottle, param2, param3, param4, param5, param6));
    return __as3_int(0);
  }
  bbAddDeath(param1, param2, param3, param4) {
    param2 = __as3_int(param2);
    param3 = Number(param3);
    param4 = Number(param4);
    this.bbdeathlist.bbAddLast(new bb_Death().bbDeath_new(param1, param2, param3, param4));
    return __as3_int(0);
  }
  bbAddExplosion(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = Number(param4);
    if ((bb_std_random_Rnd() > 0.5))
    {
      bb_Audio.bbPlay(bb_Audio.bbexplosion1);
    }
    else
    {
      bb_Audio.bbPlay(bb_Audio.bbexplosion2);
    }
    this.bbexplosions.bbAddLast(new bb_Explosion().bbExplosion_new(param1, bb_Cell.bbcells(this.bbexplosionsheet), param2, param3, param4));
    return __as3_int(0);
  }
  bbAddSmoke(param1, param2, param3) {
    param1 = __as3_int(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    this.bbsmokelist.bbAddLast(new bb_Smoke().bbSmoke_new(param1, bb_Cell.bbcells(this.bbjetsheet), param2, param3));
    return __as3_int(0);
  }
  bbAddGore(param1, param2) {
    param1 = __as3_int(param1);
    if ((param2.bbmode != 16))
    {
      bb_Gore.bbCreate(0, param2.bbxpos, param2.bbypos, param2.bblayer);
    }
    return __as3_int(0);
  }
  bbBlowZombie(param1) {
    var _loc2_ = null;
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    var _loc6_ = Number(NaN);
    var _loc7_ = Number(NaN);
    (_loc2_ = null);
    (_loc4_ = __as3_int(param1.bbunit.bbtype));
    if ((_loc4_ == 32))
    {
      (_loc2_ = this.bbzombiepartsheet);
    }
    else
    if ((_loc4_ == 33))
    {
      (_loc2_ = this.bbghoulpartsheet);
    }
    else
    if ((_loc4_ != 34))
    {
      if ((_loc4_ != 35))
      {
        if ((_loc4_ == 36))
        {
          this.bbAddExplosion(param1.bblayer, param1.bbxpos, param1.bbypos, 4);
          return __as3_int(0);
        }
        return __as3_int(0);
      }
      (_loc2_ = this.bbfatzombiepartsheet);
    }
    else
    {
      (_loc2_ = this.bbfastzombiepartsheet);
    }
    (_loc5_ = __as3_int(1));
    while ((_loc5_ <= _loc2_.bblastframe))
    {
      (_loc6_ = Number((bb_std_random_Rnd2(4) - 2)));
      (_loc7_ = Number(((- 2) - bb_std_random_Rnd2(4))));
      if ((param1.bbsmackstyle == 1))
      {
        (_loc6_ = Number(Number(bb_std_random_Rnd2(4))));
        (_loc7_ = Number(((- 2) - bb_std_random_Rnd2(2))));
      }
      if ((param1.bbsmackstyle == 2))
      {
        (_loc6_ = Number(Number(bb_std_random_Rnd2(5))));
        (_loc7_ = Number(((- 2) - bb_std_random_Rnd2(3))));
      }
      this.bbbodyparts.bbAddLast(new bb_BodyPart().bbBodyPart_new(param1.bblayer, _loc2_, _loc5_, param1.bbxpos, param1.bbypos, _loc6_, _loc7_));
      (_loc5_ = __as3_int((_loc5_ + 1)));
    }
    return __as3_int(0);
  }
  bbGameTick(param1) {
    param1 = __as3_int(param1);
    var _loc2_ = __as3_int(0);
    var _loc3_ = null;
    var _loc4_ = null;
    var _loc5_ = null;
    var _loc6_ = null;
    var _loc7_ = null;
    var _loc8_ = null;
    var _loc9_ = null;
    var _loc10_ = __as3_int(0);
    var _loc11_ = null;
    var _loc12_ = __as3_int(0);
    var _loc13_ = null;
    var _loc14_ = __as3_int(0);
    var _loc15_ = null;
    var _loc16_ = null;
    var _loc17_ = null;
    var _loc18_ = null;
    var _loc19_ = __as3_int(0);
    var _loc20_ = null;
    var _loc21_ = null;
    var _loc22_ = null;
    var _loc23_ = null;
    var _loc24_ = null;
    var _loc25_ = null;
    var _loc26_ = null;
    var _loc27_ = null;
    var _loc28_ = null;
    var _loc29_ = null;
    var _loc30_ = null;
    var _loc31_ = __as3_int(0);
    var _loc32_ = __as3_int(0);
    var _loc33_ = __as3_int(0);
    var _loc34_ = null;
    var _loc35_ = null;
    var _loc36_ = __as3_int(0);
    var _loc37_ = __as3_int(0);
    var _loc38_ = null;
    var _loc39_ = null;
    var _loc40_ = __as3_int(0);
    var _loc41_ = __as3_int(0);
    var _loc42_ = __as3_int(0);
    var _loc43_ = null;
    var _loc44_ = __as3_int(0);
    var _loc45_ = null;
    var _loc46_ = null;
    var _loc47_ = __as3_int(0);
    var _loc48_ = __as3_int(0);
    var _loc49_ = null;
    var _loc50_ = __as3_int(0);
    var _loc51_ = null;
    var _loc52_ = null;
    var _loc53_ = __as3_int(0);
    var _loc54_ = __as3_int(0);
    var _loc55_ = __as3_int(0);
    var _loc56_ = null;
    var _loc57_ = __as3_int(0);
    var _loc58_ = __as3_int(0);
    var _loc59_ = null;
    var _loc60_ = null;
    var _loc61_ = __as3_int(0);
    var _loc62_ = __as3_int(0);
    var _loc63_ = __as3_int(0);
    var _loc64_ = null;
    var _loc65_ = __as3_int(0);
    var _loc66_ = null;
    var _loc67_ = null;
    var _loc68_ = __as3_int(0);
    var _loc69_ = __as3_int(0);
    var _loc70_ = null;
    var _loc71_ = __as3_int(0);
    var _loc72_ = null;
    var _loc73_ = null;
    var _loc74_ = null;
    var _loc75_ = __as3_int(0);
    var _loc76_ = null;
    var _loc77_ = __as3_int(0);
    var _loc78_ = __as3_int(0);
    var _loc79_ = __as3_int(0);
    var _loc80_ = null;
    var _loc81_ = null;
    var _loc82_ = null;
    var _loc83_ = __as3_int(0);
    var _loc84_ = __as3_int(0);
    var _loc85_ = null;
    var _loc86_ = __as3_int(0);
    var _loc87_ = __as3_int(0);
    var _loc88_ = __as3_int(0);
    var _loc89_ = null;
    var _loc90_ = null;
    var _loc91_ = null;
    var _loc92_ = __as3_int(0);
    var _loc93_ = __as3_int(0);
    var _loc94_ = null;
    var _loc95_ = __as3_int(0);
    var _loc96_ = __as3_int(0);
    var _loc97_ = null;
    var _loc98_ = __as3_int(0);
    var _loc99_ = null;
    var _loc100_ = null;
    var _loc101_ = __as3_int(0);
    var _loc102_ = __as3_int(0);
    var _loc103_ = __as3_int(0);
    var _loc104_ = null;
    var _loc105_ = null;
    var _loc106_ = __as3_int(0);
    var _loc107_ = __as3_int(0);
    var _loc108_ = __as3_int(0);
    var _loc109_ = __as3_int(0);
    var _loc110_ = null;
    var _loc111_ = null;
    var _loc112_ = __as3_int(0);
    var _loc113_ = __as3_int(0);
    (_loc2_ = __as3_int(0));
    if ((this.bbmainState == 2))
    {
      (this.bbgameticks = __as3_int((this.bbgameticks + 1)));
      (_loc2_ = __as3_int(__as3_int(this.bbztp.bbbuildingcount[1])));
      this.bbAddWealth(_loc2_);
      if (false)
      {
        if ((bb_mojo_input_KeyHit(112) != 0))
        {
          this.bbAddZombie(this.bbzunits[0]);
        }
        if ((bb_mojo_input_KeyHit(113) != 0))
        {
          this.bbAddZombie(this.bbzunits[1]);
        }
        if ((bb_mojo_input_KeyHit(114) != 0))
        {
          this.bbAddZombie(this.bbzunits[2]);
        }
        if ((bb_mojo_input_KeyHit(115) != 0))
        {
          this.bbAddZombie(this.bbzunits[3]);
        }
        if ((bb_mojo_input_KeyHit(116) != 0))
        {
          this.bbAddZombie(this.bbzunits[4]);
        }
        if ((bb_mojo_input_KeyHit(117) != 0))
        {
          this.bbGameOver(1);
        }
        if ((bb_mojo_input_KeyHit(118) != 0))
        {
          this.bbGameOver(0);
        }
      }
      bb_ZombieMob.bbUpdate();
      (_loc19_ = __as3_int(__as3_int(this.bbdifficulty)));
      if ((_loc19_ != 0))
      {
        if ((_loc19_ != 1))
        {
          if ((_loc19_ != 2))
          {
            if ((_loc19_ == 3))
            {
              if (((this.bbzombiebase.bbhealth <= 13000) && (this.bbzombiehealth > 13000)))
              {
                bb_ZombieMob.bbSpawn(1, 40, 0.3);
                bb_ZombieMob.bbSpawn(2, 10, 1);
              }
              if (((this.bbzombiebase.bbhealth <= 9000) && (this.bbzombiehealth > 9000)))
              {
                bb_ZombieMob.bbSpawn(1, 50, 0.3);
                bb_ZombieMob.bbSpawn(4, 3, 3);
              }
              if (((this.bbzombiebase.bbhealth <= 5000) && (this.bbzombiehealth > 5000)))
              {
                bb_ZombieMob.bbSpawn(1, 60, 0.2);
                bb_ZombieMob.bbSpawn(3, 7, 1);
                bb_ZombieMob.bbSpawn(4, 3, 2);
                bb_ZombieMob.bbSpawn(5, 1, 2);
              }
            }
          }
          else
          {
            if (((this.bbzombiebase.bbhealth <= 13000) && (this.bbzombiehealth > 13000)))
            {
              bb_ZombieMob.bbSpawn(1, 40, 0.3);
            }
            if (((this.bbzombiebase.bbhealth <= 9000) && (this.bbzombiehealth > 9000)))
            {
              bb_ZombieMob.bbSpawn(1, 50, 0.3);
              bb_ZombieMob.bbSpawn(4, 2, 3);
            }
            if (((this.bbzombiebase.bbhealth <= 5000) && (this.bbzombiehealth > 5000)))
            {
              bb_ZombieMob.bbSpawn(1, 60, 0.2);
              bb_ZombieMob.bbSpawn(3, 6, 1);
              bb_ZombieMob.bbSpawn(4, 3, 2);
            }
          }
        }
        else
        {
          if (((this.bbzombiebase.bbhealth <= 13000) && (this.bbzombiehealth > 13000)))
          {
            bb_ZombieMob.bbSpawn(1, 30, 0.3);
          }
          if (((this.bbzombiebase.bbhealth <= 9000) && (this.bbzombiehealth > 9000)))
          {
            bb_ZombieMob.bbSpawn(1, 40, 0.3);
            bb_ZombieMob.bbSpawn(4, 1, 3);
          }
          if (((this.bbzombiebase.bbhealth <= 5000) && (this.bbzombiehealth > 5000)))
          {
            bb_ZombieMob.bbSpawn(1, 50, 0.2);
            bb_ZombieMob.bbSpawn(3, 5, 1);
            bb_ZombieMob.bbSpawn(4, 2, 2);
          }
        }
      }
      else
      {
        if (((this.bbzombiebase.bbhealth <= 13000) && (this.bbzombiehealth > 13000)))
        {
          bb_ZombieMob.bbSpawn(1, 20, 0.3);
        }
        if (((this.bbzombiebase.bbhealth <= 9000) && (this.bbzombiehealth > 9000)))
        {
          bb_ZombieMob.bbSpawn(1, 30, 0.3);
          bb_ZombieMob.bbSpawn(4, 1, 3);
        }
        if (((this.bbzombiebase.bbhealth <= 5000) && (this.bbzombiehealth > 5000)))
        {
          bb_ZombieMob.bbSpawn(1, 40, 0.2);
          bb_ZombieMob.bbSpawn(3, 3, 1);
          bb_ZombieMob.bbSpawn(4, 1, 2);
        }
      }
      (this.bbzombiehealth = __as3_int(this.bbzombiebase.bbhealth));
    }
    this.bbUpdateGroan();
    (_loc3_ = this.bbexplosions.bbObjectEnumerator());
    while (_loc3_.bbHasNext())
    {
      (_loc20_ = __as3_as(_loc3_.bbNextObject(), bb_Explosion));
      _loc20_.bbUpdate();
      if ((_loc20_.bbrecycle != 0))
      {
        this.bbexplosions.bbRemove(_loc20_);
      }
    }
    (_loc4_ = this.bbsmokelist.bbObjectEnumerator());
    while (_loc4_.bbHasNext())
    {
      (_loc21_ = __as3_as(_loc4_.bbNextObject(), bb_Smoke));
      _loc21_.bbUpdate();
      if ((_loc21_.bbrecycle != 0))
      {
        this.bbsmokelist.bbRemove(_loc21_);
      }
    }
    (_loc5_ = this.bbflinglist.bbObjectEnumerator());
    while (_loc5_.bbHasNext())
    {
      (_loc22_ = __as3_as(_loc5_.bbNextObject(), bb_Fling));
      _loc22_.bbUpdate();
      if ((_loc22_.bbrecycle != 0))
      {
        this.bbBombPeople(_loc22_.bblayer, _loc22_.bbxpos, _loc22_.bbypos, _loc22_.bbdamage);
        (_loc23_ = this.bbAddZombie(this.bbzunits[0]));
        (_loc23_.bbxpos = Number(_loc22_.bbxpos));
        (_loc23_.bbypos = Number(_loc22_.bbypos));
        (_loc23_.bblayer = __as3_int(_loc22_.bblayer));
        this.bbflinglist.bbRemove(_loc22_);
      }
    }
    (_loc6_ = this.bbbodyparts.bbObjectEnumerator());
    while (_loc6_.bbHasNext())
    {
      (_loc24_ = __as3_as(_loc6_.bbNextObject(), bb_BodyPart));
      _loc24_.bbUpdate();
      if ((_loc24_.bbrecycle != 0))
      {
        this.bbbodyparts.bbRemove(_loc24_);
      }
    }
    (_loc7_ = this.bbbottles.bbObjectEnumerator());
    while (_loc7_.bbHasNext())
    {
      (_loc25_ = __as3_as(_loc7_.bbNextObject(), bb_Bottle));
      _loc25_.bbUpdate();
      if ((_loc25_.bbexplode != 0))
      {
        this.bbExplodeBottle(0, _loc25_.bbxpos, _loc25_.bbypos, _loc25_.bbdamage);
        this.bbbottles.bbRemove(_loc25_);
      }
    }
    (_loc8_ = this.bbdeathlist.bbObjectEnumerator());
    while (_loc8_.bbHasNext())
    {
      (_loc26_ = __as3_as(_loc8_.bbNextObject(), bb_Death));
      _loc26_.bbUpdate();
      if ((_loc26_.bbrecycle != 0))
      {
        this.bbdeathlist.bbRemove(_loc26_);
      }
    }
    (_loc9_ = this.bbunits);
    (_loc10_ = __as3_int(0));
    while ((_loc10_ < _loc9_.length))
    {
      (_loc27_ = _loc9_[_loc10_]);
      (_loc10_ = __as3_int((_loc10_ + 1)));
      if ((_loc27_.bbbusy != 0))
      {
        __as3_updateSlot(_loc27_, "bbbusy", -1, false, false);
        if ((_loc27_.bbbusy == 0))
        {
          this.bbAddPerson(_loc27_);
          __as3_updateSlot(_loc27_, "bborders", -1, false, false);
          if ((_loc27_.bborders != 0))
          {
            (_loc27_.bbbusy = __as3_int(_loc27_.bbbuildtime));
          }
        }
      }
    }
    (_loc11_ = this.bbbuildings);
    (_loc12_ = __as3_int(0));
    while ((_loc12_ < _loc11_.length))
    {
      (_loc28_ = _loc11_[_loc12_]);
      (_loc12_ = __as3_int((_loc12_ + 1)));
      if ((_loc28_.bbbusy != 0))
      {
        __as3_updateSlot(_loc28_, "bbbusy", -1, false, false);
        if ((_loc28_.bbbusy == 0))
        {
          (this.bbztp.bbbuildingcount[_loc28_.bbtype] = (this.bbztp.bbbuildingcount[_loc28_.bbtype] + 1));
          __as3_updateSlot(_loc28_, "bborders", -1, false, false);
          if ((_loc28_.bborders != 0))
          {
            (_loc28_.bbbusy = __as3_int(_loc28_.bbbuildtime));
          }
        }
      }
    }
    (_loc13_ = this.bbpowers);
    (_loc14_ = __as3_int(0));
    while ((_loc14_ < _loc13_.length))
    {
      (_loc29_ = _loc13_[_loc14_]);
      (_loc14_ = __as3_int((_loc14_ + 1)));
      if ((_loc29_.bbbusy != 0))
      {
        __as3_updateSlot(_loc29_, "bbbusy", -1, false, false);
        if ((_loc29_.bbbusy == 0))
        {
          this.bbAddPower(_loc29_);
        }
      }
      if ((_loc29_.bbcooldown != 0))
      {
        __as3_updateSlot(_loc29_, "bbcooldown", -1, false, false);
      }
    }
    (this.bbztp.bbmaxforce = __as3_int((this.bbztp.bbbuildingcount[0] * 5)));
    (_loc15_ = this.bbpeople.bbObjectEnumerator());
    while (_loc15_.bbHasNext())
    {
      (_loc30_ = __as3_as(_loc15_.bbNextObject(), bb_Person));
      (_loc31_ = __as3_int((((_loc30_.bbxpos + _loc30_.bbunit.bbhitoffset) + _loc30_.bbunit.bbhitradius) | 0)));
      if ((_loc30_.bbmode == 0))
      {
        (_loc33_ = __as3_int(0));
        (_loc34_ = this.bbzombies.bbObjectEnumerator());
        while (_loc34_.bbHasNext())
        {
          (_loc35_ = __as3_as(_loc34_.bbNextObject(), bb_Zombie));
          (_loc36_ = __as3_int((((_loc35_.bbxpos + _loc35_.bbunit.bbhitoffset) - _loc35_.bbunit.bbhitradius) | 0)));
          (_loc37_ = __as3_int((_loc36_ - _loc31_)));
          if ((_loc37_ >= 0))
          {
            if (((_loc37_ < 16) && (_loc30_.bbunit.bbtype == 0)))
            {
              (_loc30_.bbmode = __as3_int(1));
              (_loc30_.bbswing = __as3_int(0));
            }
            if (((_loc37_ < 240) && (_loc30_.bbunit.bbtype == 1)))
            {
              (_loc30_.bbmode = __as3_int(3));
              (_loc30_.bbshoot = __as3_int(0));
            }
            if ((((_loc37_ > 300) && (_loc37_ < 400)) && (_loc30_.bbunit.bbtype == 3)))
            {
              (_loc30_.bbmode = __as3_int(4));
              (_loc30_.bbthrow = __as3_int(0));
            }
            if (((_loc37_ < 320) && (_loc30_.bbunit.bbtype == 4)))
            {
              if ((_loc35_.bbunit.bbtype < 36))
              {
                (_loc30_.bbmode = __as3_int(6));
                (_loc30_.bbspell = __as3_int(0));
              }
              (_loc33_ = __as3_int(1));
            }
            if (((_loc37_ < 140) && (_loc30_.bbunit.bbtype == 2)))
            {
              (_loc30_.bbmode = __as3_int(5));
              (_loc30_.bbshoot = __as3_int(0));
            }
            if ((_loc30_.bbmode != 0))
            {
              break;
            }
          }
        }
        if (((_loc30_.bbmode == 0) && (_loc33_ != 0)))
        {
          (_loc30_.bbwalkspeed = Number(0));
        }
      }
      (_loc32_ = __as3_int(_loc30_.bbunit.bbdamage));
      if (((_loc30_.bbmode == 1) && (_loc30_.bbHitKey() != 0)))
      {
        (_loc38_ = this.bbzombies.bbObjectEnumerator());
        while (_loc38_.bbHasNext())
        {
          (_loc39_ = __as3_as(_loc38_.bbNextObject(), bb_Zombie));
          (_loc40_ = __as3_int((((_loc39_.bbxpos + _loc39_.bbunit.bbhitoffset) - _loc39_.bbunit.bbhitradius) | 0)));
          (_loc41_ = __as3_int(__as3_int(bb_std_math_Abs((_loc40_ - _loc31_)))));
          if ((_loc41_ < 40))
          {
            (_loc42_ = __as3_int(((3 * bb_std_random_Rnd()) | 0)));
            if ((_loc42_ != 0))
            {
              if ((_loc42_ == 1))
              {
                bb_Audio.bbPlay(bb_Audio.bbshovelattack2);
              }
              else
              if ((_loc42_ == 2))
              {
                bb_Audio.bbPlay(bb_Audio.bbshovelattack3);
              }
            }
            else
            {
              bb_Audio.bbPlay(bb_Audio.bbshovelattack1);
            }
            if ((_loc39_.bbmode != 7))
            {
              (_loc32_ = __as3_int(_loc39_.bbSmack(_loc32_, 1)));
            }
            bb_Gore.bbCreate(_loc39_.bbunit.bbtype, _loc39_.bbxpos, _loc39_.bbypos, _loc39_.bblayer);
            if ((_loc32_ <= 0))
            {
              break;
            }
          }
        }
      }
      if (((_loc30_.bbmode == 3) && (_loc30_.bbHitKey() != 0)))
      {
        (_loc43_ = null);
        (_loc44_ = __as3_int(65536));
        bb_Audio.bbPlay(bb_Audio.bbshotgunattack);
        (_loc45_ = this.bbzombies.bbObjectEnumerator());
        while (_loc45_.bbHasNext())
        {
          (_loc46_ = __as3_as(_loc45_.bbNextObject(), bb_Zombie));
          (_loc47_ = __as3_int((((_loc46_.bbxpos + _loc46_.bbunit.bbhitoffset) - _loc46_.bbunit.bbhitradius) | 0)));
          (_loc48_ = __as3_int((_loc47_ - _loc31_)));
          if (((_loc48_ > 0) && (_loc48_ < _loc44_)))
          {
            (_loc44_ = __as3_int(_loc48_));
            (_loc43_ = _loc46_);
          }
        }
        if ((_loc43_ != null))
        {
          _loc43_.bbSmack(_loc32_, 3);
          bb_Gore.bbCreate(_loc43_.bbunit.bbtype, (_loc43_.bbxpos + 10), _loc43_.bbypos, _loc43_.bblayer);
        }
      }
      if (((_loc30_.bbmode == 5) && (_loc30_.bbHitKey() != 0)))
      {
        bb_Audio.bbPlay(bb_Audio.bbtruckattack1);
        (_loc32_ = __as3_int(_loc30_.bbunit.bbdamage));
        while ((_loc32_ > 0))
        {
          (_loc49_ = null);
          (_loc50_ = __as3_int(65536));
          (_loc51_ = this.bbzombies.bbObjectEnumerator());
          while (_loc51_.bbHasNext())
          {
            (_loc52_ = __as3_as(_loc51_.bbNextObject(), bb_Zombie));
            (_loc53_ = __as3_int((((_loc52_.bbxpos + _loc52_.bbunit.bbhitoffset) - _loc52_.bbunit.bbhitradius) | 0)));
            (_loc54_ = __as3_int((_loc53_ - _loc31_)));
            (_loc54_ = __as3_int(__as3_int(bb_std_math_Abs(_loc54_))));
            if ((((_loc54_ < _loc50_) && (_loc52_.bbmode != 14)) && (_loc52_.bbmode != 7)))
            {
              (_loc50_ = __as3_int(_loc54_));
              (_loc49_ = _loc52_);
            }
          }
          if ((_loc49_ != null))
          {
            (_loc32_ = __as3_int(_loc49_.bbSmack(_loc32_, 2)));
            bb_Gore.bbCreate(_loc49_.bbunit.bbtype, (_loc49_.bbxpos + 10), _loc49_.bbypos, _loc49_.bblayer);
          }
          else
          {
            (_loc32_ = __as3_int(0));
          }
        }
      }
      if (((_loc30_.bbmode == 4) && (_loc30_.bbHitKey() != 0)))
      {
        this.bbAddBottle(0, (_loc30_.bbxpos + 12), (_loc30_.bbypos - 64), 4, (- 4), 0);
      }
      if (((_loc30_.bbmode == 6) && (_loc30_.bbHitKey() != 0)))
      {
        (_loc55_ = __as3_int(1000));
        while ((_loc55_ > 0))
        {
          (_loc56_ = null);
          (_loc57_ = __as3_int(65536));
          (_loc58_ = __as3_int(0));
          (_loc59_ = this.bbzombies.bbObjectEnumerator());
          while (_loc59_.bbHasNext())
          {
            (_loc60_ = __as3_as(_loc59_.bbNextObject(), bb_Zombie));
            (_loc61_ = __as3_int((((_loc60_.bbxpos + _loc60_.bbunit.bbhitoffset) - _loc60_.bbunit.bbhitradius) | 0)));
            (_loc62_ = __as3_int((_loc61_ - _loc31_)));
            if ((((((((_loc62_ < 320) && (_loc62_ > 0)) && (_loc60_.bbunit.bbtype >= _loc58_)) && (_loc60_.bbunit.bbtype < 36)) && (_loc60_.bbmode != 15)) && (_loc60_.bbmode != 7)) && (_loc60_.bbdirection > 0)))
            {
              (_loc58_ = __as3_int(_loc60_.bbunit.bbtype));
              (_loc57_ = __as3_int(_loc62_));
              (_loc56_ = _loc60_);
            }
          }
          if ((_loc56_ == null))
          {
            break;
          }
          this.bbzombies.bbRemove(_loc56_);
          this.bbpombies.bbAddLast(_loc56_);
          _loc56_.bbTurn();
          (_loc55_ = __as3_int((_loc55_ - _loc56_.bbunit.bbhealth)));
        }
      }
      if ((_loc30_.bbmode == 14))
      {
        if ((_loc30_.bbunit.bbtype != 5))
        {
          if ((this.bbmainState == 2))
          {
            (this.bbkinlost = __as3_int((this.bbkinlost + 1)));
          }
          (_loc63_ = __as3_int(_loc30_.bbunit.bbtype));
          if ((_loc63_ == 0))
          {
            bb_Audio.bbPlay(bb_Audio.bbshoveldie);
            this.bbAddDeath(this.bbshoveldeathsheet, _loc30_.bblayer, _loc30_.bbxpos, _loc30_.bbypos);
          }
          else
          if ((_loc63_ == 1))
          {
            bb_Audio.bbPlay(bb_Audio.bbshotgundie);
            this.bbAddDeath(this.bbshotgundeathsheet, _loc30_.bblayer, _loc30_.bbxpos, _loc30_.bbypos);
          }
          else
          if ((_loc63_ == 2))
          {
            bb_Audio.bbPlay(bb_Audio.bbtruckdie);
            this.bbAddExplosion(_loc30_.bblayer, _loc30_.bbxpos, _loc30_.bbypos, 3);
          }
          else
          if ((_loc63_ != 3))
          {
            if ((_loc63_ == 4))
            {
              bb_Audio.bbPlay(bb_Audio.bbpriestdie);
              this.bbAddDeath(this.bbpreacherdeathsheet, _loc30_.bblayer, _loc30_.bbxpos, _loc30_.bbypos);
            }
          }
          else
          {
            bb_Audio.bbPlay(bb_Audio.bbbomberdie);
            this.bbAddExplosion(_loc30_.bblayer, (_loc30_.bbxpos - 10), _loc30_.bbypos, 2);
            this.bbAddExplosion(_loc30_.bblayer, (_loc30_.bbxpos - 5), _loc30_.bbypos, 1.5);
          }
          (_loc30_.bbmode = __as3_int(15));
        }
      }
      if ((_loc30_.bbmode == 14))
      {
        if ((_loc30_.bbunit.bbtype != 5))
        {
          (_loc30_.bbmode = __as3_int(15));
        }
      }
      if ((_loc30_.bbmode != 15))
      {
        _loc30_.bbUpdate();
      }
      else
      {
        this.bbpeople.bbRemove(_loc30_);
        if (((_loc30_.bbwaszombie == 0) && (_loc30_.bbisangry == 0)))
        {
          (this.bbztp.bbforce = __as3_int((this.bbztp.bbforce - _loc30_.bbunit.bbpeople)));
        }
      }
    }
    (_loc16_ = this.bbpowerups.bbObjectEnumerator());
    while (_loc16_.bbHasNext())
    {
      (_loc64_ = __as3_as(_loc16_.bbNextObject(), bb_PowerUp));
      _loc64_.bbUpdate();
      if ((_loc64_.bbtype == 1))
      {
        (_loc65_ = __as3_int((_loc64_.bbxpos | 0)));
        (_loc66_ = this.bbzombies.bbObjectEnumerator());
        while (_loc66_.bbHasNext())
        {
          (_loc67_ = __as3_as(_loc66_.bbNextObject(), bb_Zombie));
          if ((_loc67_.bbunit.bbtype != 37))
          {
            (_loc68_ = __as3_int((((_loc67_.bbxpos + _loc67_.bbunit.bbhitoffset) - _loc67_.bbunit.bbhitradius) | 0)));
            (_loc69_ = __as3_int((_loc68_ - _loc65_)));
            if ((_loc69_ >= 0))
            {
              if ((_loc69_ < 220))
              {
                _loc67_.bbSmack(100, 1);
                _loc64_.bbHarvest(_loc67_);
              }
            }
          }
        }
      }
      if ((_loc64_.bbmode == 15))
      {
        this.bbpowerups.bbRemove(_loc64_);
      }
    }
    (_loc17_ = this.bbzombies.bbObjectEnumerator());
    while (_loc17_.bbHasNext())
    {
      (_loc70_ = __as3_as(_loc17_.bbNextObject(), bb_Zombie));
      (_loc71_ = __as3_int((((_loc70_.bbxpos + _loc70_.bbunit.bbhitoffset) - _loc70_.bbunit.bbhitradius) | 0)));
      if ((_loc70_.bbmode == 0))
      {
        (_loc72_ = this.bbpeople.bbObjectEnumerator());
        while (_loc72_.bbHasNext())
        {
          (_loc74_ = __as3_as(_loc72_.bbNextObject(), bb_Person));
          (_loc75_ = __as3_int((((_loc74_.bbxpos + _loc74_.bbunit.bbhitoffset) + _loc74_.bbunit.bbhitradius) | 0)));
          (_loc2_ = __as3_int((_loc71_ - _loc75_)));
          if ((((_loc2_ > 0) && (_loc2_ < 16)) && (_loc70_.bbunit.bbtype == 32)))
          {
            (_loc70_.bbmode = __as3_int(9));
            (_loc70_.bbwail = __as3_int(0));
          }
          if ((((_loc2_ > 0) && (_loc2_ < 16)) && (_loc70_.bbunit.bbtype == 34)))
          {
            (_loc70_.bbmode = __as3_int(12));
            (_loc70_.bbscratch = __as3_int(0));
          }
          if ((((_loc2_ > 0) && (_loc2_ < 20)) && (_loc70_.bbunit.bbtype == 35)))
          {
            (_loc70_.bbmode = __as3_int(10));
            (_loc70_.bbpound = __as3_int(0));
          }
          if (((((_loc2_ > 360) && (_loc2_ < 400)) && (_loc70_.bbmode == 0)) && (_loc70_.bbunit.bbtype == 33)))
          {
            (_loc70_.bbmode = __as3_int(7));
            (_loc70_.bbjump = __as3_int(0));
          }
          if ((((_loc2_ > 0) && (_loc2_ < 16)) && (_loc70_.bbunit.bbtype == 33)))
          {
            (_loc70_.bbmode = __as3_int(8));
            (_loc70_.bbjump = __as3_int(0));
          }
          if ((((_loc2_ > 500) && (_loc2_ < 660)) && (_loc70_.bbunit.bbtype == 36)))
          {
            (_loc70_.bbmode = __as3_int(11));
            (_loc70_.bblaunch = __as3_int(0));
          }
        }
        (_loc73_ = this.bbpombies.bbObjectEnumerator());
        while (_loc73_.bbHasNext())
        {
          (_loc76_ = __as3_as(_loc73_.bbNextObject(), bb_Zombie));
          (_loc77_ = __as3_int((((_loc76_.bbxpos + _loc76_.bbunit.bbhitoffset) + _loc76_.bbunit.bbhitradius) | 0)));
          (_loc2_ = __as3_int((_loc71_ - _loc77_)));
          if ((((_loc2_ > 0) && (_loc2_ < 16)) && (_loc70_.bbunit.bbtype == 32)))
          {
            (_loc70_.bbmode = __as3_int(9));
            (_loc70_.bbwail = __as3_int(0));
          }
          if ((((_loc2_ > 0) && (_loc2_ < 16)) && (_loc70_.bbunit.bbtype == 34)))
          {
            (_loc70_.bbmode = __as3_int(12));
            (_loc70_.bbscratch = __as3_int(0));
          }
          if ((((_loc2_ > 0) && (_loc2_ < 20)) && (_loc70_.bbunit.bbtype == 35)))
          {
            (_loc70_.bbmode = __as3_int(10));
            (_loc70_.bbpound = __as3_int(0));
          }
          if (((((_loc2_ > 360) && (_loc2_ < 400)) && (_loc70_.bbmode == 0)) && (_loc70_.bbunit.bbtype == 33)))
          {
            (_loc70_.bbmode = __as3_int(7));
            (_loc70_.bbjump = __as3_int(0));
          }
          if ((((_loc2_ > 0) && (_loc2_ < 16)) && (_loc70_.bbunit.bbtype == 33)))
          {
            (_loc70_.bbmode = __as3_int(8));
            (_loc70_.bbjump = __as3_int(0));
          }
          if ((((_loc2_ > 500) && (_loc2_ < 660)) && (_loc70_.bbunit.bbtype == 36)))
          {
            (_loc70_.bbmode = __as3_int(11));
            (_loc70_.bblaunch = __as3_int(0));
          }
        }
      }
      if ((((((_loc70_.bbmode == 9) || (_loc70_.bbmode == 8)) || (_loc70_.bbmode == 12))) && (_loc70_.bbHitKey() != 0)))
      {
        (_loc78_ = __as3_int(0));
        (_loc79_ = __as3_int(((_loc70_.bbunit.bbdamage * this.bbZombieDamageMultiplier) | 0)));
        (_loc80_ = this.bbpeople.bbObjectEnumerator());
        while (_loc80_.bbHasNext())
        {
          (_loc82_ = __as3_as(_loc80_.bbNextObject(), bb_Person));
          (_loc83_ = __as3_int((((_loc82_.bbxpos + _loc82_.bbunit.bbhitoffset) + _loc82_.bbunit.bbhitradius) | 0)));
          (_loc84_ = __as3_int(__as3_int(bb_std_math_Abs((_loc71_ - _loc83_)))));
          if ((_loc79_ <= 0))
          {
            break;
          }
          if ((_loc84_ < 40))
          {
            (_loc78_ = __as3_int(1));
            (_loc79_ = __as3_int(_loc82_.bbInfect(_loc79_)));
            this.bbAddGore(_loc70_.bbunit.bbtype, _loc82_);
            break;
          }
        }
        (_loc81_ = this.bbpombies.bbObjectEnumerator());
        while (_loc81_.bbHasNext())
        {
          (_loc85_ = __as3_as(_loc81_.bbNextObject(), bb_Zombie));
          (_loc86_ = __as3_int((((_loc85_.bbxpos + _loc85_.bbunit.bbhitoffset) + _loc85_.bbunit.bbhitradius) | 0)));
          (_loc87_ = __as3_int(__as3_int(bb_std_math_Abs((_loc71_ - _loc86_)))));
          if ((_loc79_ <= 0))
          {
            break;
          }
          if ((_loc87_ < 40))
          {
            (_loc78_ = __as3_int(1));
            (_loc79_ = __as3_int(_loc85_.bbSmack(_loc79_, 1)));
            bb_Gore.bbCreate(_loc85_.bbunit.bbtype, _loc85_.bbxpos, _loc85_.bbypos, _loc85_.bblayer);
            break;
          }
        }
        if ((_loc70_.bbmode != 9))
        {
          bb_Audio.bbPlay(bb_Audio.bbzombieattack1);
        }
        else
        {
          bb_Audio.bbPlay(bb_Audio.bbzombieattack);
        }
      }
      if (((_loc70_.bbmode == 10) && (_loc70_.bbHitKey() != 0)))
      {
        bb_Audio.bbPlay(bb_Audio.bbfatattack);
        (_loc88_ = __as3_int(((_loc70_.bbunit.bbdamage * this.bbZombieDamageMultiplier) | 0)));
        (_loc89_ = this.bbpeople.bbObjectEnumerator());
        while (_loc89_.bbHasNext())
        {
          (_loc91_ = __as3_as(_loc89_.bbNextObject(), bb_Person));
          (_loc92_ = __as3_int((((_loc91_.bbxpos + _loc91_.bbunit.bbhitoffset) + _loc91_.bbunit.bbhitradius) | 0)));
          (_loc93_ = __as3_int(__as3_int(bb_std_math_Abs((_loc71_ - _loc92_)))));
          if ((_loc88_ <= 0))
          {
            break;
          }
          if ((_loc93_ < 80))
          {
            (_loc88_ = __as3_int(_loc91_.bbInfect(_loc88_)));
            this.bbAddGore(_loc70_.bbunit.bbtype, _loc91_);
          }
        }
        (_loc90_ = this.bbpombies.bbObjectEnumerator());
        while (_loc90_.bbHasNext())
        {
          (_loc94_ = __as3_as(_loc90_.bbNextObject(), bb_Zombie));
          (_loc95_ = __as3_int((((_loc94_.bbxpos + _loc94_.bbunit.bbhitoffset) + _loc94_.bbunit.bbhitradius) | 0)));
          (_loc96_ = __as3_int(__as3_int(bb_std_math_Abs((_loc71_ - _loc95_)))));
          if ((_loc88_ <= 0))
          {
            break;
          }
          if ((_loc96_ < 80))
          {
            (_loc88_ = __as3_int(_loc94_.bbSmack(_loc88_, 1)));
            bb_Gore.bbCreate(_loc94_.bbunit.bbtype, _loc94_.bbxpos, _loc94_.bbypos, _loc94_.bblayer);
          }
        }
      }
      if (((_loc70_.bbmode == 11) && (_loc70_.bbHitKey() != 0)))
      {
        this.bbAddFling(_loc70_.bblayer, _loc70_.bbxpos, _loc70_.bbypos);
      }
      if ((_loc70_.bbmode == 14))
      {
        if ((_loc70_.bbunit.bbtype != 37))
        {
          if ((this.bbmainState == 2))
          {
            (this.bbzombieskilled = __as3_int((this.bbzombieskilled + 1)));
          }
          (this.bbztp.bbxp = __as3_int((this.bbztp.bbxp + _loc70_.bbunit.bbhealth)));
          (_loc70_.bbmode = __as3_int(15));
          this.bbBlowZombie(_loc70_);
        }
      }
      if ((_loc70_.bbmode == 15))
      {
        this.bbzombies.bbRemove(_loc70_);
      }
      else
      {
        _loc70_.bbUpdate();
      }
    }
    (_loc18_ = this.bbpombies.bbObjectEnumerator());
    while (_loc18_.bbHasNext())
    {
      (_loc97_ = __as3_as(_loc18_.bbNextObject(), bb_Zombie));
      (_loc98_ = __as3_int((((_loc97_.bbxpos - _loc97_.bbunit.bbhitoffset) + _loc97_.bbunit.bbhitradius) | 0)));
      if ((_loc97_.bbmode == 0))
      {
        (_loc99_ = this.bbzombies.bbObjectEnumerator());
        while (_loc99_.bbHasNext())
        {
          (_loc100_ = __as3_as(_loc99_.bbNextObject(), bb_Zombie));
          (_loc101_ = __as3_int((((_loc100_.bbxpos + _loc100_.bbunit.bbhitoffset) - _loc100_.bbunit.bbhitradius) | 0)));
          (_loc2_ = __as3_int((_loc101_ - _loc98_)));
          if ((((_loc2_ > 0) && (_loc2_ < 16)) && (_loc97_.bbunit.bbtype == 32)))
          {
            (_loc97_.bbmode = __as3_int(9));
            (_loc97_.bbwail = __as3_int(0));
          }
          if ((((_loc2_ > 0) && (_loc2_ < 16)) && (_loc97_.bbunit.bbtype == 34)))
          {
            (_loc97_.bbmode = __as3_int(12));
            (_loc97_.bbscratch = __as3_int(0));
          }
          if ((((_loc2_ > 0) && (_loc2_ < 20)) && (_loc97_.bbunit.bbtype == 35)))
          {
            (_loc97_.bbmode = __as3_int(10));
            (_loc97_.bbpound = __as3_int(0));
          }
          if ((((_loc2_ > 360) && (_loc2_ < 400)) && (_loc97_.bbunit.bbtype == 33)))
          {
            (_loc97_.bbmode = __as3_int(7));
            (_loc97_.bbjump = __as3_int(0));
          }
          if ((((_loc2_ > 0) && (_loc2_ < 16)) && (_loc97_.bbunit.bbtype == 33)))
          {
            (_loc97_.bbmode = __as3_int(8));
            (_loc97_.bbjump = __as3_int(0));
          }
          if ((((_loc2_ > 500) && (_loc2_ < 660)) && (_loc97_.bbunit.bbtype == 36)))
          {
            (_loc97_.bbmode = __as3_int(11));
            (_loc97_.bblaunch = __as3_int(0));
          }
        }
      }
      if ((((((_loc97_.bbmode == 9) || (_loc97_.bbmode == 8)) || (_loc97_.bbmode == 12))) && (_loc97_.bbHitKey() != 0)))
      {
        (_loc102_ = __as3_int(((_loc97_.bbunit.bbdamage * this.bbZombieDamageMultiplier) | 0)));
        (_loc103_ = __as3_int(0));
        (_loc104_ = this.bbzombies.bbObjectEnumerator());
        while (_loc104_.bbHasNext())
        {
          (_loc105_ = __as3_as(_loc104_.bbNextObject(), bb_Zombie));
          (_loc106_ = __as3_int((((_loc105_.bbxpos + _loc105_.bbunit.bbhitoffset) - _loc105_.bbunit.bbhitradius) | 0)));
          (_loc107_ = __as3_int(__as3_int(bb_std_math_Abs((_loc106_ - _loc98_)))));
          if ((_loc107_ < 40))
          {
            (_loc103_ = __as3_int(1));
            (_loc102_ = __as3_int(_loc105_.bbSmack(_loc102_, 1)));
            bb_Gore.bbCreate(_loc97_.bbunit.bbtype, _loc105_.bbxpos, _loc105_.bbypos, _loc105_.bblayer);
            break;
          }
        }
        if ((_loc103_ != 0))
        {
          if ((_loc97_.bbmode == 9))
          {
            bb_Audio.bbPlay(bb_Audio.bbzombieattack);
          }
          else
          {
            bb_Audio.bbPlay(bb_Audio.bbzombieattack1);
          }
        }
      }
      if (((_loc97_.bbmode == 10) && (_loc97_.bbHitKey() != 0)))
      {
        (_loc108_ = __as3_int(((_loc97_.bbunit.bbdamage * this.bbZombieDamageMultiplier) | 0)));
        (_loc109_ = __as3_int(0));
        (_loc110_ = this.bbzombies.bbObjectEnumerator());
        while (_loc110_.bbHasNext())
        {
          (_loc111_ = __as3_as(_loc110_.bbNextObject(), bb_Zombie));
          (_loc112_ = __as3_int((((_loc111_.bbxpos + _loc111_.bbunit.bbhitoffset) - _loc111_.bbunit.bbhitradius) | 0)));
          (_loc113_ = __as3_int(__as3_int(bb_std_math_Abs((_loc112_ - _loc98_)))));
          if ((_loc113_ < 80))
          {
            (_loc109_ = __as3_int(1));
            (_loc108_ = __as3_int(_loc111_.bbSmack(_loc108_, 2)));
            bb_Gore.bbCreate(_loc111_.bbunit.bbtype, _loc111_.bbxpos, _loc111_.bbypos, _loc111_.bblayer);
            if ((_loc108_ <= 0))
            {
              break;
            }
          }
        }
        if ((_loc109_ != 0))
        {
          bb_Audio.bbPlay(bb_Audio.bbfatattack);
        }
      }
      if ((_loc97_.bbmode == 14))
      {
        (_loc97_.bbmode = __as3_int(15));
        this.bbBlowZombie(_loc97_);
      }
      if ((_loc97_.bbmode != 15))
      {
        _loc97_.bbUpdate();
      }
      else
      {
        this.bbpombies.bbRemove(_loc97_);
      }
    }
    return __as3_int(0);
  }
  bbUpdateGame(param1) {
    param1 = __as3_int(param1);
    (param1 = __as3_int((param1 * this.bbgamespeed)));
    while ((param1 != 0))
    {
      ((__as3_previous) => (param1 = __as3_int(__as3_previous + -1), __as3_previous))(param1);
      this.bbGameTick(param1);
      bb_Gore.bbUpdateAll();
      this.bbblood.bbUpdate();
    }
    return __as3_int(0);
  }
  bbUpdateStats(param1) {
    param1 = __as3_int(param1);
    return __as3_int(0);
  }
  bbOnUpdate() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = __as3_int(0);
    var _loc3_ = __as3_int(0);
    (_loc1_ = __as3_int(0));
    if ((this.bbmousehit == 0))
    {
      (this.bbmousehit = __as3_int(bb_mojo_input_KeyHit(1)));
    }
    (this.bbgametime = __as3_int(bb_mojo_app_Millisecs()));
    (_loc2_ = __as3_int((this.bbgametime - this.bbstarttime)));
    (_loc1_ = __as3_int((((((_loc2_ * 60) / 1000) | 0)) - this.bbupdates)));
    (this.bbupdates = __as3_int((this.bbupdates + _loc1_)));
    if ((_loc1_ > 5))
    {
      (_loc1_ = __as3_int(5));
    }
    (_loc3_ = __as3_int(__as3_int(this.bbmainState)));
    if ((_loc3_ != 0))
    {
      if ((_loc3_ == 7))
      {
        this.bbUpdateAttract(_loc1_);
      }
      else
      if ((_loc3_ != 1))
      {
        if ((_loc3_ == 2))
        {
          this.bbUpdateGame(_loc1_);
          if ((this.bbpeoplebase.bbmode == 14))
          {
            this.bbGameOver(0);
          }
          if ((this.bbzombiebase.bbmode == 14))
          {
            this.bbGameOver(1);
          }
        }
        else
        if (((_loc3_ == 3) || (_loc3_ == 4)))
        {
          this.bbUpdateStats(_loc1_);
          this.bbUpdateGame(_loc1_);
        }
        else
        if ((_loc3_ != 5))
        {
          if ((_loc3_ != 6))
          {
          }
        }
      }
      else
      {
        this.bbUpdateMenu();
      }
    }
    else
    if ((MovieFinished() != 0))
    {
      EndMovie();
      (this.bbmainState = __as3_int(1));
      bb_mojo_app_SetUpdateRate(60);
    }
    return __as3_int(0);
  }
  bbDrawCatapult(param1, param2, param3) {
    param1 = __as3_int(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    var _loc4_ = Number(NaN);
    var _loc5_ = Number(NaN);
    var _loc6_ = Number(NaN);
    (param3 = Number((param3 - 4)));
    (_loc4_ = Number(0.6));
    (_loc5_ = Number((param3 - 12)));
    (_loc6_ = Number(((- param2) * 3)));
    bb_mojo_graphics_DrawImage2(this.bbwheel1, ((param2 - 100) - 4), _loc5_, _loc6_, _loc4_, _loc4_, 0);
    bb_mojo_graphics_DrawImage2(this.bbwheel2, (param2 - 100), _loc5_, _loc6_, _loc4_, _loc4_, 0);
    bb_mojo_graphics_DrawImage2(this.bbwheel1, ((param2 + 96) - 4), _loc5_, _loc6_, _loc4_, _loc4_, 0);
    bb_mojo_graphics_DrawImage2(this.bbwheel2, (param2 + 96), _loc5_, _loc6_, _loc4_, _loc4_, 0);
    this.bbcatapultsheet.bbblit(param1, param2, param3, 2.2);
    bb_mojo_graphics_DrawImage2(this.bbwheel1, ((param2 - 80) - 4), _loc5_, _loc6_, _loc4_, _loc4_, 0);
    bb_mojo_graphics_DrawImage2(this.bbwheel2, (param2 - 80), _loc5_, _loc6_, _loc4_, _loc4_, 0);
    bb_mojo_graphics_DrawImage2(this.bbwheel1, ((param2 + 110) - 4), _loc5_, _loc6_, _loc4_, _loc4_, 0);
    bb_mojo_graphics_DrawImage2(this.bbwheel2, (param2 + 110), _loc5_, _loc6_, _loc4_, _loc4_, 0);
    return __as3_int(0);
  }
  bbRenderHorde() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = null;
    var _loc3_ = null;
    var _loc4_ = null;
    var _loc5_ = null;
    var _loc6_ = __as3_int(0);
    var _loc7_ = __as3_int(0);
    var _loc8_ = __as3_int(0);
    var _loc9_ = __as3_int(0);
    var _loc10_ = __as3_int(0);
    var _loc11_ = __as3_int(0);
    var _loc12_ = __as3_int(0);
    var _loc13_ = __as3_int(0);
    var _loc14_ = __as3_int(0);
    var _loc15_ = __as3_int(0);
    var _loc16_ = __as3_int(0);
    var _loc17_ = __as3_int(0);
    var _loc18_ = __as3_int(0);
    var _loc19_ = Number(NaN);
    var _loc20_ = Number(NaN);
    var _loc21_ = __as3_int(0);
    var _loc22_ = __as3_int(0);
    var _loc23_ = Number(NaN);
    var _loc24_ = Number(NaN);
    var _loc25_ = Number(NaN);
    var _loc26_ = __as3_int(0);
    var _loc27_ = Number(NaN);
    var _loc28_ = Number(NaN);
    var _loc29_ = __as3_int(0);
    var _loc30_ = Number(NaN);
    var _loc31_ = Number(NaN);
    var _loc32_ = __as3_int(0);
    var _loc33_ = Number(NaN);
    var _loc34_ = Number(NaN);
    var _loc35_ = __as3_int(0);
    var _loc36_ = Number(NaN);
    var _loc37_ = Number(NaN);
    var _loc38_ = __as3_int(0);
    var _loc39_ = Number(NaN);
    var _loc40_ = Number(NaN);
    var _loc41_ = __as3_int(0);
    var _loc42_ = Number(NaN);
    var _loc43_ = Number(NaN);
    var _loc44_ = __as3_int(0);
    var _loc45_ = Number(NaN);
    var _loc46_ = Number(NaN);
    var _loc47_ = __as3_int(0);
    var _loc48_ = Number(NaN);
    var _loc49_ = Number(NaN);
    var _loc50_ = __as3_int(0);
    var _loc51_ = Number(NaN);
    var _loc52_ = Number(NaN);
    var _loc53_ = __as3_int(0);
    var _loc54_ = Number(NaN);
    var _loc55_ = Number(NaN);
    var _loc56_ = null;
    var _loc57_ = null;
    var _loc58_ = null;
    var _loc59_ = null;
    bb_mojo_graphics_DrawRect(0, 980, 1600, 4);
    (_loc1_ = __as3_int(0));
    while ((_loc1_ <= 0))
    {
      (_loc6_ = __as3_int(1));
      while ((_loc6_ <= 3))
      {
        (_loc18_ = __as3_int(((this.bbcell12 / this.bbcellspeed) | 0)));
        (_loc19_ = Number(((((_loc1_ * 5) + (_loc6_ * 128)) + this.bbcell12x) - 30)));
        (_loc20_ = Number(((80 + (_loc1_ * 10)) + (bb_reversebits(_loc6_, 4) * 10))));
        this.bbjetsheet.bbblit(1, _loc19_, _loc20_, 1);
        this.bbjetsheet.bbblit((2 + (((_loc18_ / 12) | 0))), _loc19_, _loc20_, 1);
        this.bbjetsheet.bbblit((5 + (((_loc18_ / 3) | 0))), (_loc19_ - 32), (_loc20_ - 44), 1);
        (_loc21_ = __as3_int(__as3_int(bb_reversebits(this.bbcell12throw, 4))));
        if ((_loc21_ > 14))
        {
          this.bbAddBottle(0, (_loc19_ + 12), (_loc20_ - 980), 0, 0, 0);
        }
        (_loc6_ = __as3_int((_loc6_ + 1)));
      }
      (_loc7_ = __as3_int(1));
      while ((_loc7_ <= 1))
      {
        (_loc22_ = __as3_int((1 + (((this.bbcell13 / this.bbcellspeed) | 0)))));
        (_loc23_ = Number(((((_loc1_ * 5) + (_loc7_ * 128)) + this.bbcell13x) - 30)));
        (_loc24_ = Number((420 + (_loc1_ * 10))));
        (_loc25_ = Number(((- bb_mojo_app_Millisecs()) * 0.1)));
        this.bbharvestsheet.bbblit(_loc22_, _loc23_, _loc24_, 1);
        this.bbharvestsheet.bbblit2(5, _loc23_, _loc24_, 40, _loc25_);
        this.bbharvestsheet.bbblit2(6, _loc23_, _loc24_, 30, _loc25_);
        (_loc7_ = __as3_int((_loc7_ + 1)));
      }
      (_loc8_ = __as3_int(1));
      while ((_loc8_ <= 2))
      {
        (_loc26_ = __as3_int((1 + (((this.bbcell9 / this.bbcellspeed) | 0)))));
        (_loc27_ = Number(((((_loc1_ * 5) + (_loc8_ * 32)) + this.bbcell9x) - 30)));
        (_loc28_ = Number((180 + (_loc1_ * 10))));
        this.bbpreachersheet.bbblit(_loc26_, _loc27_, _loc28_, 1);
        bb_mojo_graphics_DrawRect(_loc27_, (_loc28_ + 10), 4, 4);
        (_loc8_ = __as3_int((_loc8_ + 1)));
      }
      (_loc9_ = __as3_int(1));
      while ((_loc9_ <= 3))
      {
        (_loc29_ = __as3_int((1 + (((this.bbcell10 / this.bbcellspeed) | 0)))));
        (_loc30_ = Number(((((_loc1_ * 5) + (_loc9_ * 256)) + this.bbcell10x) - 30)));
        (_loc31_ = Number((320 + (_loc1_ * 10))));
        this.bbfatzombiesheet.bbblit(_loc29_, (1600 - _loc30_), _loc31_, 1);
        (_loc9_ = __as3_int((_loc9_ + 1)));
      }
      (_loc10_ = __as3_int(1));
      while ((_loc10_ <= 1))
      {
        (_loc32_ = __as3_int((1 + (((this.bbcell11 / this.bbcellspeed) | 0)))));
        (_loc33_ = Number((((_loc1_ * 5) + (_loc10_ * 320)) + this.bbcell11x)));
        (_loc34_ = Number((1180 + (_loc1_ * 10))));
        (_loc33_ = Number((1600 - _loc33_)));
        this.bbDrawCatapult(_loc32_, _loc33_, _loc34_);
        (_loc10_ = __as3_int((_loc10_ + 1)));
      }
      (_loc11_ = __as3_int(1));
      while ((_loc11_ <= 20))
      {
        (_loc35_ = __as3_int((1 + (((this.bbcell1 / this.bbcellspeed) | 0)))));
        (_loc36_ = Number(((((_loc1_ * 5) + (_loc11_ * 32)) + this.bbcell1x) - 30)));
        (_loc37_ = Number((480 + (_loc1_ * 10))));
        this.bbshovelman.bbblit(_loc35_, _loc36_, _loc37_, 1);
        if ((_loc35_ == 28))
        {
          bb_Gore.bbCreate(0, (_loc36_ + 50), (_loc37_ - 60), 0);
        }
        (_loc11_ = __as3_int((_loc11_ + 1)));
      }
      (_loc12_ = __as3_int(1));
      while ((_loc12_ <= 20))
      {
        (_loc38_ = __as3_int((1 + (((this.bbcell2 / this.bbcellspeed) | 0)))));
        (_loc39_ = Number(((((_loc1_ * 5) + (_loc12_ * 32)) + this.bbcell2x) - 30)));
        (_loc40_ = Number((540 + (_loc1_ * 10))));
        this.bbshotgunman.bbblit(_loc38_, _loc39_, _loc40_, 1);
        bb_mojo_graphics_SetColor(255, 20, 100);
        bb_mojo_graphics_DrawRect((_loc39_ + 36), (_loc40_ - 36), 4, 4);
        (_loc12_ = __as3_int((_loc12_ + 1)));
      }
      (_loc13_ = __as3_int(1));
      while ((_loc13_ <= 20))
      {
        (_loc41_ = __as3_int((1 + (((this.bbcell3 / this.bbcellspeed) | 0)))));
        (_loc42_ = Number(((((_loc1_ * 5) + (_loc13_ * 32)) + this.bbcell3x) - 30)));
        (_loc43_ = Number((640 + (_loc1_ * 10))));
        this.bbzombiesheet.bbblit(_loc41_, (1600 - _loc42_), _loc43_, 1);
        (_loc13_ = __as3_int((_loc13_ + 1)));
      }
      (_loc14_ = __as3_int(1));
      while ((_loc14_ <= 20))
      {
        (_loc44_ = __as3_int((1 + (((this.bbcell5 / this.bbcellspeed) | 0)))));
        (_loc45_ = Number(((((_loc1_ * 5) + (_loc14_ * 32)) + this.bbcell5x) - 30)));
        (_loc46_ = Number((720 + (_loc1_ * 10))));
        this.bbghoulsheet.bbblit(_loc44_, (1600 - _loc45_), _loc46_, 1);
        (_loc14_ = __as3_int((_loc14_ + 1)));
      }
      (_loc15_ = __as3_int(1));
      while ((_loc15_ <= 20))
      {
        (_loc47_ = __as3_int((1 + (((this.bbcell6 / this.bbcellspeed) | 0)))));
        (_loc48_ = Number(((((_loc1_ * 5) + (_loc15_ * 32)) + this.bbcell6x) - 30)));
        (_loc49_ = Number((900 + (_loc1_ * 10))));
        this.bbfastzombiesheet.bbblit(_loc47_, (1600 - _loc48_), _loc49_, 1);
        (_loc15_ = __as3_int((_loc15_ + 1)));
      }
      (_loc16_ = __as3_int(1));
      while ((_loc16_ <= 1))
      {
        (_loc50_ = __as3_int((1 + (((this.bbcell7 / this.bbcellspeed) | 0)))));
        (_loc51_ = Number(((((_loc1_ * 5) + (_loc16_ * 32)) + this.bbcell7x) - 30)));
        (_loc52_ = Number((980 + (_loc1_ * 10))));
        this.bbbombersheet.bbblit(_loc50_, _loc51_, _loc52_, 1);
        if ((this.bbcell7throw != 0))
        {
          this.bbAddBottle(0, (_loc51_ + 12), ((_loc52_ - 64) - 980), 4, (- 4), 0);
        }
        (_loc16_ = __as3_int((_loc16_ + 1)));
      }
      (this.bbcell7throw = __as3_int(0));
      (_loc17_ = __as3_int(1));
      while ((_loc17_ <= 4))
      {
        (_loc53_ = __as3_int((1 + (((this.bbcell4 / this.bbcellspeed) | 0)))));
        (_loc54_ = Number(((((_loc1_ * 5) + (_loc17_ * 256)) + this.bbcell4x) - 30)));
        (_loc55_ = Number((840 + (_loc1_ * 10))));
        this.bbtrucksheet.bbblit(_loc53_, _loc54_, _loc55_, 1);
        bb_mojo_graphics_SetColor(255, 20, 100);
        bb_mojo_graphics_DrawRect((_loc54_ + 140), _loc55_, 4, 4);
        (_loc17_ = __as3_int((_loc17_ + 1)));
      }
      (_loc1_ = __as3_int((_loc1_ + 1)));
    }
    (_loc2_ = this.bbbottles.bbObjectEnumerator());
    while (_loc2_.bbHasNext())
    {
      (_loc56_ = __as3_as(_loc2_.bbNextObject(), bb_Bottle));
      _loc56_.bbDraw(0, 980);
    }
    (_loc3_ = this.bbexplosions.bbObjectEnumerator());
    while (_loc3_.bbHasNext())
    {
      (_loc57_ = __as3_as(_loc3_.bbNextObject(), bb_Explosion));
      _loc57_.bbDraw(0, 980);
    }
    (_loc4_ = this.bbflinglist.bbObjectEnumerator());
    while (_loc4_.bbHasNext())
    {
      (_loc58_ = __as3_as(_loc4_.bbNextObject(), bb_Fling));
      _loc58_.bbDraw(0, 1180);
    }
    (_loc5_ = this.bbbodyparts.bbObjectEnumerator());
    while (_loc5_.bbHasNext())
    {
      (_loc59_ = __as3_as(_loc5_.bbNextObject(), bb_BodyPart));
      _loc59_.bbDraw(0, 1180);
    }
    return __as3_int(0);
  }
  bbRenderAttract() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = Number(NaN);
    bb_mojo_graphics_SetColor(220, 220, 220);
    bb_mojo_graphics_DrawRect(0, 0, 800, 600);
    bb_mojo_graphics_SetColor(180, 200, 200);
    (_loc1_ = __as3_int(0));
    while ((_loc1_ <= 800))
    {
      bb_mojo_graphics_DrawRect(_loc1_, 0, 1, 600);
      bb_mojo_graphics_DrawRect(0, _loc1_, 800, 1);
      (_loc1_ = __as3_int((_loc1_ + 8)));
    }
    bb_mojo_graphics_DrawImage(this.bblogo, 530, 4, 0);
    if ((this.bbmousehit != 0))
    {
      (this.bbmainState = __as3_int(1));
      return __as3_int(0);
    }
    (_loc2_ = Number(0.5));
    bb_mojo_graphics_Scale(_loc2_, _loc2_);
    bb_mojo_graphics_SetColor(60, 60, 60);
    this.bbRenderHorde();
    bb_Gore.bbRenderAll(0, 60, 0);
    return __as3_int(0);
  }
  bbRenderSky() {
    bb_mojo_graphics_Cls(0, 0, 0);
    bb_mojo_graphics_DrawImage(this.bbisky[this.bbdifficulty], 0, 0, 0);
    return __as3_int(0);
  }
  bbDigits(param1) {
    param1 = __as3_int(param1);
    var _loc2_ = __as3_nullableString(null);
    ((__as3_stringValue0) => (_loc2_ = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))((":" + String((100 + param1))));
    return __as3_nullableString(_loc2_.slice(2));
  }
  bbDigit(param1) {
    param1 = __as3_int(param1);
    return __as3_nullableString(String.fromCharCode((48 + param1)));
  }
  bbTime(param1) {
    param1 = __as3_int(param1);
    var _loc2_ = __as3_int(0);
    var _loc3_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    (_loc2_ = __as3_int(0));
    (_loc3_ = __as3_int(0));
    (_loc4_ = __as3_int(0));
    (_loc2_ = __as3_int((((param1 * 10) / 12) | 0)));
    (_loc3_ = __as3_int(((_loc2_ / 6000) | 0)));
    (_loc2_ = __as3_int((_loc2_ - ((_loc3_ * 60) * 100))));
    (_loc4_ = __as3_int(((_loc2_ / 100) | 0)));
    (_loc2_ = __as3_int((_loc2_ - (_loc4_ * 100))));
    (_loc2_ = __as3_int(((_loc2_ / 10) | 0)));
    return __as3_nullableString(((((this.bbDigits(_loc3_) + ":") + this.bbDigits(_loc4_)) + ".") + this.bbDigit(_loc2_)));
  }
  bbmouseover(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    var _loc5_ = __as3_int(0);
    var _loc6_ = __as3_int(0);
    (_loc5_ = __as3_int(0));
    (_loc6_ = __as3_int(0));
    (_loc5_ = __as3_int(((bb_mojo_input_MouseX() / this.bbzoom) | 0)));
    (_loc6_ = __as3_int(((bb_mojo_input_MouseY() / this.bbzoom) | 0)));
    if (((((_loc5_ >= param1) && (_loc6_ >= param2)) && (_loc5_ < (param1 + param3))) && (_loc6_ < (param2 + param4))))
    {
      return __as3_int(1);
    }
    return __as3_int(0);
  }
  bbDrawEmptyButton(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    if ((bb_mojo_input_KeyDown(1) != 0))
    {
      if ((this.bbmouseover(param1, param2, param3, param4) != 0))
      {
        return __as3_int(1);
      }
    }
    return __as3_int(0);
  }
  bbDrawMenuButton(param1, param2, param3, param4, param5, param6, param7) {
    param1 = __as3_nullableString(param1);
    param2 = __as3_nullableString(param2);
    param3 = __as3_nullableString(param3);
    param4 = __as3_int(param4);
    param5 = __as3_int(param5);
    param6 = __as3_int(param6);
    param7 = __as3_int(param7);
    var _loc8_ = __as3_int(0);
    var _loc9_ = null;
    (_loc8_ = __as3_int(0));
    (_loc9_ = null);
    (_loc8_ = __as3_int(__as3_int(this.bbDrawEmptyButton(param4, param5, param6, param7))));
    (_loc9_ = this.bbfont2);
    if ((this.bbmouseover(param4, param5, param6, param7) != 0))
    {
      (_loc9_ = this.bbfont1);
    }
    (param5 = __as3_int((param5 - 20)));
    if ((param2.length == 0))
    {
      _loc9_.bbdrawtext(param1, param4, (param5 + (((param7 / 2) | 0))), 1, 0);
      this.bbfont.bbdrawtext(param1, param4, (param5 + (((param7 / 2) | 0))), 1, 0);
    }
    else
    {
      _loc9_.bbdrawtext(param1, param4, ((param5 + (((param7 / 2) | 0))) - 16), 1, 0);
      this.bbfont.bbdrawtext(param1, param4, ((param5 + (((param7 / 2) | 0))) - 16), 1, 0);
      _loc9_.bbdrawtext(param2, param4, ((param5 + (((param7 / 2) | 0))) + 30), 0.6, 0);
      this.bbfont.bbdrawtext(param2, param4, ((param5 + (((param7 / 2) | 0))) + 30), 0.6, 0);
    }
    if ((param3.length != 0))
    {
      _loc9_.bbdrawtext(param3, (param4 + 130), ((param5 + (((param7 / 2) | 0))) - 6), 0.6, 0);
      this.bbfont.bbdrawtext(param3, (param4 + 130), ((param5 + (((param7 / 2) | 0))) - 6), 0.6, 0);
    }
    return __as3_int(_loc8_);
  }
  bbDrawAudioButton(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    var _loc3_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    (_loc3_ = __as3_int(0));
    (_loc4_ = __as3_int(25));
    (_loc5_ = __as3_int(25));
    (_loc3_ = __as3_int(__as3_int(this.bbDrawEmptyButton(param1, param2, _loc4_, _loc5_))));
    if (bb_Audio.bbdisabled)
    {
      bb_mojo_graphics_DrawImage(this.bbsoundoff, (param1 + 2), (param2 + 1), 0);
    }
    return __as3_int(_loc3_);
  }
  bbToggleAudio() {
    if (bb_Audio.bbdisabled)
    {
      (bb_Audio.bbdisabled = Boolean(false));
      (this.bbmusicoutput = bb_Audio.bbPlayAudio(bb_Audio.bbmusic, 10000));
    }
    else
    {
      (bb_Audio.bbdisabled = Boolean(true));
      if ((this.bbmusicoutput != null))
      {
        bb_mojo_audio_StopChannel(this.bbmusicoutput);
        (this.bbmusicoutput = null);
      }
    }
    return __as3_int(0);
  }
  bbRenderMenu() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = __as3_int(0);
    var _loc3_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    var _loc6_ = __as3_int(0);
    var _loc7_ = __as3_int(0);
    var _loc8_ = __as3_int(0);
    var _loc9_ = __as3_nullableString(null);
    var _loc10_ = __as3_nullableString(null);
    var _loc11_ = __as3_nullableString(null);
    (_loc1_ = __as3_int(500));
    (_loc2_ = __as3_int(16));
    (_loc3_ = __as3_int(92));
    (_loc4_ = __as3_int(240));
    (_loc5_ = __as3_int(_loc3_));
    (_loc6_ = __as3_int(0));
    (_loc7_ = __as3_int(0));
    this.bbRenderSky();
    (_loc6_ = __as3_int(0));
    if ((this.bbmenucount != 0))
    {
      (_loc6_ = __as3_int((this.bbmenucount * 2)));
      if ((_loc6_ > 200))
      {
        (_loc6_ = __as3_int(200));
      }
      (this.bbmousehit = __as3_int(0));
    }
    else
    {
      (this.bbmenuitem = __as3_int(0));
      if (((bb_mojo_input_MouseX() > (_loc1_ - 50)) && (bb_mojo_input_MouseY() >= _loc2_)))
      {
        (_loc7_ = __as3_int(((((bb_mojo_input_MouseY() - _loc2_)) / _loc3_) | 0)));
        if (((_loc7_ >= 0) && (_loc7_ < 6)))
        {
          (this.bbmenuitem = __as3_int((1 + _loc7_)));
        }
        if (((this.bbmenuitem > 0) && (this.bbmenuitem < 5)))
        {
          (this.bbdifficulty = __as3_int((this.bbmenuitem - 1)));
        }
      }
    }
    bb_mojo_graphics_DrawImage(this.bbbackground, ((- 600) + (((200 - _loc6_)) * 4)), (200 - _loc6_), 0);
    bb_mojo_graphics_DrawImage(this.bbtitles, (((- _loc6_) * 4) - 80), (- _loc6_), 0);
    if ((this.bbmenucount == 0))
    {
      if ((this.bbmenuitem != 0))
      {
        if ((this.bbmenuitem < 5))
        {
          bb_mojo_graphics_DrawImage(this.bbarrow, (_loc1_ - 50), ((_loc2_ + (_loc3_ * ((this.bbmenuitem - 1)))) + 12), 0);
        }
        else
        {
          bb_mojo_graphics_DrawImage(this.bbarrow, (_loc1_ - 50), (((_loc2_ + (_loc3_ * ((this.bbmenuitem - 1)))) + 12) + 16), 0);
        }
      }
      (_loc8_ = __as3_int(1));
      while ((_loc8_ <= 4))
      {
        ((__as3_stringValue0) => (_loc9_ = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))(bb_data_difficultyname[(_loc8_ - 1)]);
        ((__as3_stringValue1) => (_loc10_ = __as3_nullableString(__as3_stringValue1), __as3_stringValue1))(bb_data_difficultytitle[(_loc8_ - 1)]);
        ((__as3_stringValue2) => (_loc11_ = __as3_nullableString(__as3_stringValue2), __as3_stringValue2))("");
        if ((this.bbrecords[(_loc8_ - 1)] != 0))
        {
          ((__as3_stringValue3) => (_loc11_ = __as3_nullableString(__as3_stringValue3), __as3_stringValue3))((("  ( " + this.bbTime(this.bbrecords[(_loc8_ - 1)])) + " )"));
        }
        if (((this.bbDrawMenuButton(_loc10_, _loc9_, _loc11_, _loc1_, _loc2_, _loc4_, _loc5_) != 0) && (this.bbmousehit != 0)))
        {
        }
        if (((_loc8_ > 1) && (this.bbrecords[(_loc8_ - 2)] == 0)))
        {
          bb_mojo_graphics_DrawImage2(this.bblock, (_loc1_ + 140), (_loc2_ + 20), (- 20), 1, 1, 0);
          if ((this.bbmenuitem == _loc8_))
          {
            (this.bbmenuitem = __as3_int(0));
          }
        }
        (_loc2_ = __as3_int((_loc2_ + _loc3_)));
        (_loc8_ = __as3_int((_loc8_ + 1)));
      }
      if (((this.bbDrawMenuButton("High Scores", "", "", _loc1_, _loc2_, _loc4_, _loc5_) != 0) && (this.bbmousehit != 0)))
      {
        ShowMochiScores("d163d40199460c98", 1);
        (this.bbmainState = __as3_int(5));
        return __as3_int(0);
      }
      (_loc2_ = __as3_int((_loc2_ + _loc3_)));
      if (((this.bbDrawMenuButton("More Games", "", "", _loc1_, _loc2_, _loc4_, _loc5_) != 0) && (this.bbmousehit != 0)))
      {
        Redirect("http://www.ninjakiwi.com/");
        return __as3_int(0);
      }
      (_loc2_ = __as3_int((_loc2_ + _loc3_)));
      if ((((this.bbmousehit != 0) && (this.bbmenuitem > 0)) && (this.bbmenuitem < 5)))
      {
        (this.bbmenucount = __as3_int(1));
      }
      this.bbfont.bbdrawtext("Zombie Trailer Park 0.33", 4, 4, 0.4, 0);
      (_loc1_ = __as3_int(768));
      (_loc2_ = __as3_int(572));
      bb_mojo_graphics_DrawImage2(this.bbsoundicon, _loc1_, _loc2_, 0, 0.5, 0.5, 0);
      if (((this.bbDrawAudioButton(_loc1_, _loc2_) != 0) && (this.bbmousehit != 0)))
      {
        this.bbToggleAudio();
      }
    }
    return __as3_int(0);
  }
  bbAddBlood(param1, param2, param3, param4) {
    param1 = Number(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = Number(param4);
    this.bbblood.bbAdd(param1, param2, param3, param4);
    return __as3_int(0);
  }
  bbDrawPark() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = __as3_int(0);
    var _loc3_ = Number(NaN);
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    var _loc6_ = __as3_int(0);
    var _loc7_ = __as3_int(0);
    var _loc8_ = null;
    var _loc9_ = null;
    var _loc10_ = null;
    var _loc11_ = null;
    var _loc12_ = null;
    var _loc13_ = null;
    var _loc14_ = null;
    var _loc15_ = null;
    var _loc16_ = null;
    var _loc17_ = null;
    var _loc18_ = null;
    var _loc19_ = null;
    var _loc20_ = null;
    var _loc21_ = null;
    var _loc22_ = null;
    var _loc23_ = null;
    var _loc24_ = null;
    var _loc25_ = null;
    var _loc26_ = null;
    var _loc27_ = null;
    (_loc1_ = __as3_int(0));
    (_loc2_ = __as3_int(0));
    (_loc3_ = Number(0));
    (_loc4_ = __as3_int(0));
    (_loc4_ = __as3_int(__as3_int(this.bbztp.bbbuildingcount[1])));
    (_loc5_ = __as3_int((_loc4_ - 1)));
    while ((_loc5_ >= 0))
    {
      (_loc1_ = __as3_int((bb_data_junkpos[((_loc5_ * 3) + 0)] | 0)));
      (_loc2_ = __as3_int((bb_data_junkpos[((_loc5_ * 3) + 1)] | 0)));
      (_loc3_ = Number(Number(bb_data_junkpos[((_loc5_ * 3) + 2)])));
      bb_mojo_graphics_DrawImage2(this.bbitrailer[1], _loc1_, _loc2_, 0, _loc3_, _loc3_, 0);
      (_loc5_ = __as3_int((_loc5_ + (- 1))));
    }
    (_loc4_ = __as3_int(__as3_int(this.bbztp.bbbuildingcount[0])));
    (_loc6_ = __as3_int((_loc4_ - 2)));
    while ((_loc6_ >= 0))
    {
      (_loc1_ = __as3_int((bb_data_trailerpos[((_loc6_ * 3) + 0)] | 0)));
      (_loc2_ = __as3_int((bb_data_trailerpos[((_loc6_ * 3) + 1)] | 0)));
      (_loc3_ = Number(Number(bb_data_trailerpos[((_loc6_ * 3) + 2)])));
      bb_mojo_graphics_DrawImage2(this.bbitrailer[0], _loc1_, _loc2_, 0, _loc3_, _loc3_, 0);
      (_loc6_ = __as3_int((_loc6_ + (- 1))));
    }
    bb_mojo_graphics_PushMatrix();
    bb_mojo_graphics_Scale(0.5, 0.5);
    (_loc2_ = __as3_int(808));
    this.bbblood.bbDraw(0, _loc2_);
    (_loc7_ = __as3_int(7));
    while ((_loc7_ >= 0))
    {
      (_loc8_ = this.bbzombies.bbObjectEnumerator());
      while (_loc8_.bbHasNext())
      {
        (_loc18_ = __as3_as(_loc8_.bbNextObject(), bb_Zombie));
        if ((_loc18_.bblayer == _loc7_))
        {
          _loc18_.bbDraw(0, _loc2_);
        }
      }
      (_loc9_ = this.bbpombies.bbObjectEnumerator());
      while (_loc9_.bbHasNext())
      {
        (_loc19_ = __as3_as(_loc9_.bbNextObject(), bb_Zombie));
        if ((_loc19_.bblayer == _loc7_))
        {
          _loc19_.bbDraw(0, _loc2_);
        }
      }
      (_loc10_ = this.bbpeople.bbObjectEnumerator());
      while (_loc10_.bbHasNext())
      {
        (_loc20_ = __as3_as(_loc10_.bbNextObject(), bb_Person));
        if ((_loc20_.bblayer == _loc7_))
        {
          _loc20_.bbDraw(0, _loc2_);
        }
      }
      (_loc11_ = this.bbexplosions.bbObjectEnumerator());
      while (_loc11_.bbHasNext())
      {
        (_loc21_ = __as3_as(_loc11_.bbNextObject(), bb_Explosion));
        if ((_loc21_.bblayer == _loc7_))
        {
          _loc21_.bbDraw(0, _loc2_);
        }
      }
      (_loc12_ = this.bbsmokelist.bbObjectEnumerator());
      while (_loc12_.bbHasNext())
      {
        (_loc22_ = __as3_as(_loc12_.bbNextObject(), bb_Smoke));
        if ((_loc22_.bblayer == _loc7_))
        {
          _loc22_.bbDraw(0, _loc2_);
        }
      }
      (_loc13_ = this.bbflinglist.bbObjectEnumerator());
      while (_loc13_.bbHasNext())
      {
        (_loc23_ = __as3_as(_loc13_.bbNextObject(), bb_Fling));
        if ((_loc23_.bblayer == _loc7_))
        {
          _loc23_.bbDraw(0, _loc2_);
        }
      }
      (_loc14_ = this.bbbodyparts.bbObjectEnumerator());
      while (_loc14_.bbHasNext())
      {
        (_loc24_ = __as3_as(_loc14_.bbNextObject(), bb_BodyPart));
        if ((_loc24_.bblayer == _loc7_))
        {
          _loc24_.bbDraw(0, _loc2_);
        }
      }
      (_loc15_ = this.bbbottles.bbObjectEnumerator());
      while (_loc15_.bbHasNext())
      {
        (_loc25_ = __as3_as(_loc15_.bbNextObject(), bb_Bottle));
        if ((_loc25_.bblayer == _loc7_))
        {
          _loc25_.bbDraw(0, _loc2_);
        }
      }
      (_loc16_ = this.bbpowerups.bbObjectEnumerator());
      while (_loc16_.bbHasNext())
      {
        (_loc26_ = __as3_as(_loc16_.bbNextObject(), bb_PowerUp));
        if ((_loc26_.bblayer == _loc7_))
        {
          _loc26_.bbDraw(0, _loc2_);
        }
      }
      (_loc17_ = this.bbdeathlist.bbObjectEnumerator());
      while (_loc17_.bbHasNext())
      {
        (_loc27_ = __as3_as(_loc17_.bbNextObject(), bb_Death));
        if ((_loc27_.bblayer == _loc7_))
        {
          _loc27_.bbDraw(0, _loc2_);
        }
      }
      bb_Gore.bbRenderAll(0, _loc2_, _loc7_);
      (_loc7_ = __as3_int((_loc7_ + (- 1))));
    }
    bb_mojo_graphics_PopMatrix();
    return __as3_int(0);
  }
  bbDrawPark2() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = __as3_int(0);
    var _loc3_ = Number(NaN);
    (_loc1_ = __as3_int(0));
    (_loc2_ = __as3_int(0));
    (_loc3_ = Number(0));
    (_loc1_ = __as3_int(710));
    (_loc2_ = __as3_int(278));
    (_loc3_ = Number(1));
    bb_mojo_graphics_DrawImage2(this.bbzbase, _loc1_, _loc2_, 0, _loc3_, _loc3_, 0);
    if ((this.bbztp.bbbuildingcount[3] != 0))
    {
      (_loc1_ = __as3_int(62));
      (_loc2_ = __as3_int(416));
      (_loc3_ = Number(0.5));
      bb_mojo_graphics_DrawImage2(this.bbitrailer[3], _loc1_, _loc2_, 0, _loc3_, _loc3_, 0);
    }
    if ((this.bbztp.bbbuildingcount[5] != 0))
    {
      (_loc1_ = __as3_int((- 10)));
      (_loc2_ = __as3_int(370));
      (_loc3_ = Number(0.5));
      bb_mojo_graphics_DrawImage2(this.bbitrailer[5], _loc1_, _loc2_, 0, _loc3_, _loc3_, 0);
    }
    if ((this.bbztp.bbbuildingcount[2] != 0))
    {
      (_loc1_ = __as3_int((- 40)));
      (_loc2_ = __as3_int(480));
      (_loc3_ = Number(0.5));
      bb_mojo_graphics_DrawImage2(this.bbitrailer[2], _loc1_, _loc2_, 0, _loc3_, _loc3_, 0);
    }
    if ((this.bbztp.bbbuildingcount[4] != 0))
    {
      (_loc1_ = __as3_int(116));
      (_loc2_ = __as3_int(460));
      (_loc3_ = Number(0.5));
      bb_mojo_graphics_DrawImage2(this.bbitrailer[4], _loc1_, _loc2_, 0, _loc3_, _loc3_, 0);
    }
    return __as3_int(0);
  }
  bbStretchImageRect(param1, param2, param3, param4, param5, param6, param7, param8, param9) {
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = Number(param4);
    param5 = Number(param5);
    param6 = Number(param6);
    param7 = Number(param7);
    param8 = Number(param8);
    param9 = Number(param9);
    var _loc10_ = Number(NaN);
    var _loc11_ = Number(NaN);
    (_loc10_ = Number(0));
    (_loc11_ = Number(0));
    (_loc10_ = Number((param4 / param8)));
    (_loc11_ = Number((param5 / param9)));
    bb_mojo_graphics_DrawImageRect2(param1, param2, param3, (param6 | 0), (param7 | 0), (param8 | 0), (param9 | 0), 0, _loc10_, _loc11_, 0);
    return __as3_int(0);
  }
  bbblitrect4(param1, param2, param3, param4, param5) {
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    param5 = __as3_int(param5);
    var _loc6_ = __as3_int(0);
    if ((param4 < 2))
    {
      return __as3_int(0);
    }
    (_loc6_ = __as3_int(((param4 / 2) | 0)));
    if ((_loc6_ <= 16))
    {
      (param4 = __as3_int((_loc6_ * 2)));
    }
    else
    {
      (_loc6_ = __as3_int(16));
    }
    bb_mojo_graphics_DrawImageRect(param1, param2, param3, 0, 0, _loc6_, 16, 0);
    if ((param4 > 32))
    {
      this.bbStretchImageRect(param1, (param2 + 16), param3, (param4 - 32), 16, 16, 0, 32, 16);
    }
    bb_mojo_graphics_DrawImageRect(param1, ((param2 + param4) - _loc6_), ((param3 + param5) - 16), (64 - _loc6_), 0, _loc6_, 16, 0);
    return __as3_int(0);
  }
  bbDrawHealth() {
    var _loc1_ = __as3_int(0);
    (_loc1_ = __as3_int(0));
    (_loc1_ = __as3_int((200 - ((((this.bbpeoplebase.bbhealth * 200) / 4000) | 0)))));
    this.bbblitrect4(this.bbprogress1, 8, 580, 210, 16);
    if (((_loc1_ < 180) || (((this.bbgameticks & 0x10)) == 16)))
    {
      this.bbblitrect4(this.bbprogress2, 8, 580, (210 - _loc1_), 16);
    }
    this.bbfont4.bbdrawtext("My Base", 10, 560, 0.4, 0);
    this.bbfont3.bbdrawtext("My Base", 10, 560, 0.4, 0);
    (_loc1_ = __as3_int((200 - ((((this.bbzombiebase.bbhealth * 200) / 16000) | 0)))));
    this.bbblitrect4(this.bbprogress1, 586, 580, 210, 16);
    if (((_loc1_ < 180) || (((this.bbgameticks & 0x10)) == 16)))
    {
      this.bbblitrect4(this.bbprogress2, (800 - ((214 - _loc1_))), 580, (210 - _loc1_), 16);
    }
    this.bbfont4.bbdrawtext("Zombie Base", 790, 560, 0.4, 2);
    this.bbfont3.bbdrawtext("Zombie Base", 790, 560, 0.4, 2);
    return __as3_int(0);
  }
  bbuitext(param1, param2, param3) {
    param1 = __as3_nullableString(param1);
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    var _loc4_ = Number(NaN);
    (_loc4_ = Number(0.5));
    this.bbfont4.bbdrawtext(param1, param2, param3, _loc4_, 0);
    this.bbfont3.bbdrawtext(param1, param2, param3, _loc4_, 0);
    return __as3_int(0);
  }
  bbGetTime() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = __as3_int(0);
    var _loc3_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    (_loc1_ = __as3_int(0));
    (_loc2_ = __as3_int(0));
    (_loc3_ = __as3_int(0));
    (_loc4_ = __as3_int(0));
    (_loc1_ = __as3_int((((this.bbgameticks * 1000) / 120) | 0)));
    (_loc1_ = __as3_int(((_loc1_ / 1000) | 0)));
    (_loc2_ = __as3_int(((_loc1_ / 3600) | 0)));
    (_loc1_ = __as3_int((_loc1_ - ((_loc2_ * 60) * 60))));
    (_loc3_ = __as3_int(((_loc1_ / 60) | 0)));
    (_loc1_ = __as3_int((_loc1_ - (_loc3_ * 60))));
    (_loc4_ = __as3_int(_loc1_));
    return __as3_nullableString(((this.bbDigits(_loc3_) + ":") + this.bbDigits(_loc4_)));
  }
  bbRenderGame() {
    var _loc1_ = __as3_int(0);
    bb_mojo_graphics_PushMatrix();
    bb_mojo_graphics_DrawImage(this.bbbackground, (- 600), 0, 0);
    if (((this.bbmainState != 3) && (this.bbmainState != 4)))
    {
      bb_mojo_graphics_DrawImage(this.bbgameui, 0, 0, 0);
    }
    bb_mojo_graphics_PopMatrix();
    this.bbDrawPark();
    this.bbDrawPark2();
    if (((this.bbmainState != 3) && (this.bbmainState != 4)))
    {
      this.bbDrawHealth();
      (_loc1_ = __as3_int(4));
      this.bbuitext(("" + String(this.bbztp.bbcash)), 50, _loc1_);
      this.bbuitext(((("" + String(this.bbztp.bbforce)) + "/") + String(this.bbztp.bbmaxforce)), 260, _loc1_);
      this.bbuitext(("" + String(this.bbztp.bbxp)), 400, _loc1_);
      this.bbuitext(("" + this.bbGetTime()), 530, _loc1_);
    }
    return __as3_int(0);
  }
  bbDrawSpeedButton(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    var _loc3_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    var _loc6_ = __as3_int(0);
    (_loc3_ = __as3_int(0));
    (_loc4_ = __as3_int(60));
    (_loc5_ = __as3_int(25));
    (_loc3_ = __as3_int(__as3_int(this.bbDrawEmptyButton(param1, param2, _loc4_, _loc5_))));
    (_loc6_ = __as3_int(1));
    while ((_loc6_ <= this.bbgamespeed))
    {
      bb_mojo_graphics_DrawImage(this.bbspeed, ((param1 + 4) + (_loc6_ * 12)), (param2 + 1), 0);
      (_loc6_ = __as3_int((_loc6_ + 1)));
    }
    return __as3_int(_loc3_);
  }
  bbDrawUIButton(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    var _loc3_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    (_loc3_ = __as3_int(0));
    (_loc4_ = __as3_int(86));
    (_loc5_ = __as3_int(25));
    return __as3_int(__as3_int(this.bbDrawEmptyButton(param1, param2, _loc4_, _loc5_)));
  }
  bbPauseGame() {
    (this.bbmainState = __as3_int(6));
    return __as3_int(0);
  }
  bbblitrect(param1, param2, param3, param4, param5) {
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    param5 = __as3_int(param5);
    var _loc6_ = __as3_int(0);
    var _loc7_ = __as3_int(0);
    var _loc8_ = __as3_int(0);
    (_loc6_ = __as3_int(0));
    (_loc7_ = __as3_int(0));
    (_loc8_ = __as3_int(0));
    (_loc6_ = __as3_int(8));
    (_loc7_ = __as3_int(16));
    (_loc8_ = __as3_int(24));
    (_loc7_ = __as3_int((12 + ((_loc6_ = __as3_int(12))))));
    (_loc8_ = __as3_int((32 - _loc6_)));
    bb_mojo_graphics_DrawImageRect(param1, param2, param3, 0, 0, _loc6_, _loc6_, 0);
    this.bbStretchImageRect(param1, (param2 + _loc6_), param3, (param4 - _loc7_), _loc6_, _loc6_, 0, (32 - _loc7_), _loc6_);
    bb_mojo_graphics_DrawImageRect(param1, ((param2 + param4) - _loc6_), param3, _loc8_, 0, _loc6_, _loc6_, 0);
    this.bbStretchImageRect(param1, param2, (param3 + _loc6_), _loc6_, (param5 - _loc7_), 0, _loc6_, _loc6_, (32 - _loc7_));
    this.bbStretchImageRect(param1, (param2 + _loc6_), (param3 + _loc6_), (param4 - _loc7_), (param5 - _loc7_), _loc6_, _loc6_, (32 - _loc7_), (32 - _loc7_));
    this.bbStretchImageRect(param1, ((param2 + param4) - _loc6_), (param3 + _loc6_), _loc6_, (param5 - _loc7_), _loc8_, _loc6_, _loc6_, (32 - _loc7_));
    bb_mojo_graphics_DrawImageRect(param1, param2, ((param3 + param5) - _loc6_), 0, _loc8_, _loc6_, _loc6_, 0);
    this.bbStretchImageRect(param1, (param2 + _loc6_), ((param3 + param5) - _loc6_), (param4 - _loc7_), _loc6_, _loc6_, _loc8_, (32 - _loc7_), _loc6_);
    bb_mojo_graphics_DrawImageRect(param1, ((param2 + param4) - _loc6_), ((param3 + param5) - _loc6_), _loc8_, _loc8_, _loc6_, _loc6_, 0);
    return __as3_int(0);
  }
  bbDrawHint(param1, param2, param3, param4, param5, param6) {
    param1 = __as3_nullableString(param1);
    param2 = __as3_nullableString(param2);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    param5 = __as3_int(param5);
    param6 = __as3_int(param6);
    var _loc7_ = __as3_int(0);
    var _loc8_ = __as3_int(0);
    var _loc9_ = __as3_int(0);
    var _loc10_ = __as3_int(0);
    var _loc11_ = __as3_int(0);
    var _loc12_ = __as3_nullableString(null);
    var _loc13_ = __as3_int(0);
    var _loc14_ = __as3_int(0);
    (_loc7_ = __as3_int(0));
    (_loc8_ = __as3_int(0));
    (_loc9_ = __as3_int(0));
    (param4 = __as3_int(132));
    (_loc7_ = __as3_int(290));
    if (((param3 + _loc7_) > 800))
    {
      (param3 = __as3_int((800 - _loc7_)));
    }
    (_loc10_ = __as3_int(param2.indexOf("[", 0)));
    (_loc11_ = __as3_int(param2.indexOf("]", 0)));
    ((__as3_stringValue0) => (_loc12_ = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))("");
    (_loc8_ = __as3_int(40));
    if (((_loc10_ != (- 1)) && (_loc11_ > _loc10_)))
    {
      ((__as3_stringValue1) => (_loc12_ = __as3_nullableString(__as3_stringValue1), __as3_stringValue1))(param2.slice((_loc10_ + 1), _loc11_));
      ((__as3_stringValue2) => (param2 = __as3_nullableString(__as3_stringValue2), __as3_stringValue2))(param2.slice(0, _loc10_));
      (_loc9_ = __as3_int((10 + this.bbfont3.bbtextheight(_loc12_, 240, 0.4))));
    }
    (_loc8_ = __as3_int((60 + this.bbfont3.bbtextheight(param2, 240, 0.4))));
    this.bbblitrect(this.bbtip1box, param3, param4, 280, (_loc8_ + _loc9_));
    this.bbfont3.bbdrawtext(param1, (param3 + 8), param4, 0.6, 0);
    (_loc13_ = __as3_int(1));
    while ((_loc13_ <= param5))
    {
      bb_mojo_graphics_DrawImage(this.bbdude, (((param3 + _loc7_) - (_loc13_ * 10)) - 24), param4, 0);
      (_loc13_ = __as3_int((_loc13_ + 1)));
    }
    if ((param6 != 0))
    {
      bb_mojo_graphics_DrawImage(this.bbyeehaw, (param3 + 12), (param4 + 170), 0);
      this.bbfont3.bbdrawtext(("" + String(param6)), (param3 + 50), (param4 + 170), 0.4, 0);
    }
    (_loc14_ = __as3_int(1));
    while ((_loc14_ <= param5))
    {
      bb_mojo_graphics_DrawImage(this.bbdude, (((param3 + _loc7_) - (_loc14_ * 10)) - 24), param4, 0);
      (_loc14_ = __as3_int((_loc14_ + 1)));
    }
    this.bbfont3.bbdrawtextbox(param2, (param3 + 8), (param4 + 40), 240, 0.4, 0);
    if ((_loc12_.length != 0))
    {
      this.bbblitrect(this.bbtip2box, (param3 + 4), ((param4 + _loc8_) - 4), 272, _loc9_);
      this.bbfont3.bbdrawtextbox(_loc12_, (param3 + 8), (param4 + _loc8_), 240, 0.4, 0);
    }
    return __as3_int(0);
  }
  bbDrawIconButton(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    param5 = __as3_int(param5);
    param6 = __as3_nullableString(param6);
    param7 = __as3_nullableString(param7);
    param8 = __as3_nullableString(param8);
    param9 = __as3_int(param9);
    param10 = __as3_int(param10);
    var _loc12_ = __as3_int(0);
    var _loc11_ = null;
    (_loc12_ = __as3_int(0));
    (_loc12_ = __as3_int(0));
    (_loc11_ = this.bbibutton[3]);
    if ((param5 != 0))
    {
      (_loc11_ = this.bbibutton[0]);
    }
    if ((this.bbmouseover(param1, param2, param3, param4) != 0))
    {
      (_loc11_ = this.bbibutton[4]);
      if ((param5 != 0))
      {
        (_loc11_ = this.bbibutton[1]);
        if ((bb_mojo_input_KeyDown(1) != 0))
        {
          (_loc11_ = this.bbibutton[2]);
        }
        (_loc12_ = __as3_int(1));
      }
    }
    else
    {
      ((__as3_stringValue0) => (param6 = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))("");
    }
    this.bbfont3.bbdrawtext(param7, (param1 + (((param3 / 2) | 0))), (param2 + param4), 0.35, 1);
    if ((param6 != ""))
    {
      this.bbDrawHint(param8, param6, param1, (param2 - 20), param9, param10);
    }
    return __as3_int(_loc12_);
  }
  bbDrawIcon(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13, param14) {
    param1 = __as3_nullableString(param1);
    param2 = __as3_nullableString(param2);
    param3 = __as3_nullableString(param3);
    param4 = __as3_int(param4);
    param6 = __as3_int(param6);
    param7 = __as3_int(param7);
    param8 = __as3_int(param8);
    param9 = __as3_int(param9);
    param10 = Number(param10);
    param11 = __as3_int(param11);
    param12 = __as3_int(param12);
    param13 = __as3_int(param13);
    param14 = __as3_int(param14);
    var _loc15_ = __as3_int(0);
    var _loc16_ = __as3_int(0);
    var _loc17_ = __as3_int(0);
    var _loc18_ = __as3_int(0);
    var _loc19_ = __as3_int(0);
    var _loc20_ = __as3_nullableString(null);
    var _loc21_ = __as3_int(0);
    (_loc15_ = __as3_int(0));
    (_loc15_ = __as3_int(__as3_int(this.bbDrawIconButton(param6, param7, param8, param9, ((param4 == 1) ? 1 : 0), param2, param3, param1, param14, 0))));
    (_loc16_ = __as3_int(param4));
    if ((_loc16_ == 0))
    {
      bb_mojo_graphics_DrawImage(this.bbdisabled, (param6 - 3), (param7 - 5), 0);
    }
    else
    if ((_loc16_ == (- 1)))
    {
      bb_mojo_graphics_DrawImage(this.bbtick, (param6 - 3), (param7 - 5), 0);
    }
    if ((param5 != null))
    {
      bb_mojo_graphics_DrawImage2(param5, param6, (param7 + 10), 0, 0.4, 0.4, 0);
    }
    (param10 = Number((param10 * 0.5)));
    if (((param13 != 0) || (param12 != 0)))
    {
      (_loc18_ = __as3_int((31 - ((((param12 * 32) / 100) | 0)))));
      if ((_loc18_ < 1))
      {
        (_loc18_ = __as3_int(1));
      }
      this.bbtimer.bbblit(_loc18_, (param6 - 8), (param7 - 12), 1.25);
    }
    (_loc17_ = __as3_int(param6));
    while ((param1.length != 0))
    {
      (_loc19_ = __as3_int(param1.indexOf("__DemoStr_0A", 0)));
      ((__as3_stringValue0) => (_loc20_ = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))(param1);
      ((__as3_stringValue1) => (param1 = __as3_nullableString(__as3_stringValue1), __as3_stringValue1))("");
      if ((_loc19_ > 0))
      {
        ((__as3_stringValue2) => (param1 = __as3_nullableString(__as3_stringValue2), __as3_stringValue2))(_loc20_.slice((_loc19_ + 1)));
        ((__as3_stringValue3) => (_loc20_ = __as3_nullableString(__as3_stringValue3), __as3_stringValue3))(_loc20_.slice(0, _loc19_));
      }
      (_loc21_ = __as3_int(param11));
      if ((_loc21_ != 0))
      {
        if ((_loc21_ == 1))
        {
          (param6 = __as3_int(((_loc17_ + (((param8 - (param10 * this.bbfont.bbtextwidth(_loc20_)))) / 2)) | 0)));
        }
        else
        if ((_loc21_ == 2))
        {
          (param6 = __as3_int(((_loc17_ + (((param8 - (param10 * this.bbfont.bbtextwidth(_loc20_))) - 10))) | 0)));
        }
      }
      else
      {
        (param6 = __as3_int(_loc17_));
      }
      (param7 = __as3_int((param7 + 22)));
    }
    return __as3_int(_loc15_);
  }
  bbDrawUnitButton(param1, param2, param3) {
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    (_loc4_ = __as3_int((((param1.bbbusy * 100) / param1.bbbuildtime) | 0)));
    (_loc5_ = __as3_int(__as3_int(this.bbDrawIcon(param1.bbname, param1.bbhint, ("$" + String(param1.bbcost)), param1.bbenabled, null, param2, param3, 40, 40, 0.6, 1, _loc4_, param1.bborders, param1.bbpeople))));
    if (((param1.bbenabled != 0) && (this.bbmouseover(param2, param3, 40, 40) != 0)))
    {
      bb_mojo_graphics_DrawImage(this.bbselecta, (param2 - 3), (param3 - 5), 0);
    }
    return __as3_int(_loc5_);
  }
  bbBuyUnit(param1) {
    if ((param1.bbcost > this.bbztp.bbcash))
    {
      return __as3_int(0);
    }
    if (((this.bbztp.bbforce + param1.bbpeople) <= this.bbztp.bbmaxforce))
    {
      (this.bbztp.bbcash = __as3_int((this.bbztp.bbcash - param1.bbcost)));
      (this.bbztp.bbforce = __as3_int((this.bbztp.bbforce + param1.bbpeople)));
      (param1.bborders = __as3_int((param1.bborders + 1)));
      if ((param1.bbbusy == 0))
      {
        (param1.bbbusy = __as3_int(param1.bbbuildtime));
      }
      return __as3_int(0);
    }
    return __as3_int(0);
  }
  bbDrawTrailerButton(param1, param2, param3) {
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    var _loc4_ = __as3_int(0);
    var _loc5_ = null;
    var _loc6_ = __as3_int(0);
    var _loc7_ = __as3_int(0);
    (_loc4_ = __as3_int((((param1.bbbusy * 100) / param1.bbbuildtime) | 0)));
    (_loc5_ = null);
    (_loc5_ = this.bbitrailer[param1.bbtype]);
    (_loc5_ = null);
    (_loc6_ = __as3_int(0));
    if ((param1.bbenabled != 0))
    {
      (_loc6_ = __as3_int(1));
    }
    if ((param1.bbcapacity != 0))
    {
      (_loc6_ = __as3_int((- 1)));
    }
    (_loc7_ = __as3_int(__as3_int(this.bbDrawIcon(param1.bbname, param1.bbhint, ("$" + String(param1.bbcost)), _loc6_, _loc5_, param2, param3, 40, 40, 0.6, 2, _loc4_, param1.bborders, 0))));
    if (((param1.bbenabled != 0) && (this.bbmouseover(param2, param3, 40, 40) != 0)))
    {
      bb_mojo_graphics_DrawImage(this.bbselecta, (param2 - 3), (param3 - 5), 0);
    }
    return __as3_int(_loc7_);
  }
  bbBuyBuilding(param1) {
    if ((param1.bbcost > this.bbztp.bbcash))
    {
      return __as3_int(0);
    }
    (this.bbztp.bbcash = __as3_int((this.bbztp.bbcash - param1.bbcost)));
    (param1.bborders = __as3_int((param1.bborders + 1)));
    if ((param1.bbbusy == 0))
    {
      (param1.bbbusy = __as3_int(param1.bbbuildtime));
    }
    return __as3_int(0);
  }
  bbDrawPowerButton(param1, param2, param3) {
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    var _loc6_ = __as3_int(0);
    var _loc7_ = __as3_nullableString(null);
    var _loc8_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    (_loc6_ = __as3_int(0));
    (_loc4_ = __as3_int(40));
    (_loc5_ = __as3_int(40));
    if ((param1.bbbusy != 0))
    {
      (_loc6_ = __as3_int((((param1.bbbusy * 100) / param1.bbbuildtime) | 0)));
    }
    if ((param1.bbcooldown != 0))
    {
      (_loc6_ = __as3_int((100 - ((((param1.bbcooldown * 100) / param1.bbcooltime) | 0)))));
    }
    ((__as3_stringValue0) => (_loc7_ = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))(bb_data_wmdname[param1.bbtype]);
    (_loc8_ = __as3_int(__as3_int(this.bbDrawIcon(_loc7_, param1.bbhint, String(bb_data_wmdxp[param1.bbtype]), param1.bbenabled, null, param2, param3, 40, 40, 0.6, 2, _loc6_, 0, 0))));
    if (((param1.bbenabled != 0) && (this.bbmouseover(param2, param3, 40, 40) != 0)))
    {
      bb_mojo_graphics_DrawImage(this.bbselecta, (param2 - 3), (param3 - 4), 0);
    }
    else
    if (((param1.bbenabled != 0) && (((this.bbgameticks & 0x40)) == 64)))
    {
      bb_mojo_graphics_DrawImage(this.bbready, (param2 - 1), (param3 - 2), 0);
    }
    return __as3_int(_loc8_);
  }
  bbBuyPower(param1) {
    if ((this.bbztp.bbxp < param1.bbxp))
    {
      return __as3_int(0);
    }
    if ((param1.bbbusy == 0))
    {
      if ((param1.bbcooldown != 0))
      {
        return __as3_int(0);
      }
      (this.bbztp.bbxp = __as3_int((this.bbztp.bbxp - param1.bbxp)));
      bb_Audio.bbPlay(bb_Audio.bbyeehaw);
      (param1.bbbusy = __as3_int(param1.bbbuildtime));
      return __as3_int(0);
    }
    return __as3_int(0);
  }
  bbRenderGameUI() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = __as3_int(0);
    var _loc3_ = null;
    var _loc4_ = __as3_int(0);
    var _loc5_ = null;
    var _loc6_ = __as3_int(0);
    var _loc7_ = null;
    var _loc8_ = __as3_int(0);
    var _loc9_ = null;
    var _loc10_ = null;
    var _loc11_ = null;
    (_loc1_ = __as3_int(0));
    (_loc2_ = __as3_int(0));
    (_loc1_ = __as3_int(608));
    (_loc2_ = __as3_int(6));
    if (((this.bbDrawSpeedButton(_loc1_, _loc2_) != 0) && (this.bbmousehit != 0)))
    {
      (this.bbgamespeed = __as3_int((1 + ((this.bbgamespeed & 3)))));
    }
    (_loc1_ = __as3_int(678));
    (_loc2_ = __as3_int(6));
    if (((this.bbDrawAudioButton(_loc1_, _loc2_) != 0) && (this.bbmousehit != 0)))
    {
      this.bbToggleAudio();
    }
    (_loc1_ = __as3_int(706));
    (_loc2_ = __as3_int(6));
    if (((this.bbDrawUIButton(_loc1_, _loc2_) != 0) && (this.bbmousehit != 0)))
    {
      this.bbPauseGame();
    }
    (_loc1_ = __as3_int(18));
    (_loc2_ = __as3_int(64));
    (_loc3_ = this.bbunits);
    (_loc4_ = __as3_int(0));
    while ((_loc4_ < _loc3_.length))
    {
      (_loc9_ = _loc3_[_loc4_]);
      (_loc4_ = __as3_int((_loc4_ + 1)));
      _loc9_.bbUpdate(this.bbztp);
      if ((_loc9_.bbtype != 5))
      {
        if (((this.bbDrawUnitButton(_loc9_, _loc1_, _loc2_) != 0) && (this.bbmousehit != 0)))
        {
          this.bbBuyUnit(_loc9_);
        }
        (_loc1_ = __as3_int((_loc1_ + 50)));
      }
    }
    (_loc1_ = __as3_int(305));
    (_loc2_ = __as3_int(64));
    (_loc5_ = this.bbbuildings);
    (_loc6_ = __as3_int(0));
    while ((_loc6_ < _loc5_.length))
    {
      (_loc10_ = _loc5_[_loc6_]);
      (_loc6_ = __as3_int((_loc6_ + 1)));
      _loc10_.bbUpdate(this.bbztp);
      if (((this.bbDrawTrailerButton(_loc10_, _loc1_, _loc2_) != 0) && (this.bbmousehit != 0)))
      {
        this.bbBuyBuilding(_loc10_);
      }
      (_loc1_ = __as3_int((_loc1_ + 50)));
    }
    (_loc1_ = __as3_int(638));
    (_loc2_ = __as3_int(64));
    (_loc7_ = this.bbpowers);
    (_loc8_ = __as3_int(0));
    while ((_loc8_ < _loc7_.length))
    {
      (_loc11_ = _loc7_[_loc8_]);
      (_loc8_ = __as3_int((_loc8_ + 1)));
      _loc11_.bbUpdate(this.bbztp);
      if (((this.bbDrawPowerButton(_loc11_, _loc1_, _loc2_) != 0) && (this.bbmousehit != 0)))
      {
        this.bbBuyPower(_loc11_);
      }
      if ((_loc11_.bblocked != 0))
      {
        bb_mojo_graphics_DrawImage2(this.bblock, (_loc1_ + 8), _loc2_, 0, 0.75, 0.75, 0);
      }
      (_loc1_ = __as3_int((_loc1_ + 49)));
    }
    return __as3_int(0);
  }
  bbDrawMenuItem(param1, param2, param3, param4, param5, param6) {
    param1 = __as3_nullableString(param1);
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    param5 = __as3_int(param5);
    param6 = __as3_int(param6);
    var _loc8_ = __as3_int(0);
    var _loc9_ = null;
    var _loc7_ = null;
    (_loc8_ = __as3_int(0));
    (_loc8_ = __as3_int(0));
    (_loc7_ = this.bbibutton[3]);
    if ((param6 != 0))
    {
      (_loc7_ = this.bbibutton[0]);
    }
    if ((this.bbmouseover(param2, param3, param4, param5) != 0))
    {
      (_loc7_ = this.bbibutton[4]);
      if ((param6 != 0))
      {
        (_loc7_ = this.bbibutton[1]);
        if ((bb_mojo_input_KeyDown(1) != 0))
        {
          (_loc7_ = this.bbibutton[2]);
        }
        (_loc8_ = __as3_int(1));
      }
    }
    (_loc9_ = null);
    (_loc9_ = this.bbfont2);
    if ((this.bbmouseover(param2, param3, param4, param5) != 0))
    {
      (_loc9_ = this.bbfont1);
    }
    _loc9_.bbdrawtext(param1, (param2 + (((param4 / 2) | 0))), ((param3 + param5) - 42), 1, 1);
    this.bbfont.bbdrawtext(param1, (param2 + (((param4 / 2) | 0))), ((param3 + param5) - 42), 1, 1);
    return __as3_int(_loc8_);
  }
  bbSubmitScore(param1) {
    param1 = __as3_int(param1);
    ShowMochiScores("d163d40199461c98", param1);
    (this.bbmainState = __as3_int(5));
    return __as3_int(0);
  }
  bbQuitGame() {
    this.bbResetAttract();
    (this.bbmainState = __as3_int(1));
    return __as3_int(0);
  }
  bbRenderStats() {
    var _loc1_ = null;
    var _loc2_ = __as3_nullableString(null);
    var _loc3_ = __as3_nullableString(null);
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    var _loc6_ = __as3_int(0);
    var _loc7_ = __as3_int(0);
    var _loc8_ = __as3_int(0);
    (_loc1_ = null);
    bb_mojo_graphics_DrawImage2(this.bbalpharect, 0, 0, 0, 1024, 1024, 0);
    ((__as3_stringValue0) => (_loc2_ = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))("");
    ((__as3_stringValue1) => (_loc3_ = __as3_nullableString(__as3_stringValue1), __as3_stringValue1))("");
    (_loc4_ = __as3_int(380));
    (_loc5_ = __as3_int(270));
    (_loc6_ = __as3_int(180));
    (_loc7_ = __as3_int(40));
    (_loc8_ = __as3_int(__as3_int(this.bbmainState)));
    if ((_loc8_ == 3))
    {
      ((__as3_stringValue2) => (_loc2_ = __as3_nullableString(__as3_stringValue2), __as3_stringValue2))(bb_data_WinMessage);
      (_loc1_ = this.bbwinscreen);
    }
    else
    if ((_loc8_ == 4))
    {
      ((__as3_stringValue3) => (_loc2_ = __as3_nullableString(__as3_stringValue3), __as3_stringValue3))(bb_data_LoseMessage);
      (_loc1_ = this.bblosescreen);
      if ((this.bbztp.bbbuildingcount[2] == 0))
      {
        ((__as3_stringValue4) => (_loc3_ = __as3_nullableString(__as3_stringValue4), __as3_stringValue4))("Build a farmhouse to be able to make angry farmers.");
      }
      if ((this.bbztp.bbbuildingcount[0] < 2))
      {
        ((__as3_stringValue5) => (_loc3_ = __as3_nullableString(__as3_stringValue5), __as3_stringValue5))("Build more trailers to increase your population limit.");
      }
      if ((this.bbztp.bbbuildingcount[1] < 3))
      {
        ((__as3_stringValue6) => (_loc3_ = __as3_nullableString(__as3_stringValue6), __as3_stringValue6))("Build more salvage yards sooner to maximize income.");
      }
    }
    bb_mojo_graphics_DrawImage(_loc1_, 0, 0, 0);
    this.bbfont3.bbdrawtextbox(_loc2_, 170, 70, 560, 0.75, 0);
    if ((_loc3_.length != 0))
    {
      this.bbfont3.bbdrawtextbox(("Hint: " + _loc3_), 200, 190, 530, 0.75, 0);
      (_loc5_ = __as3_int((_loc5_ + 20)));
    }
    if ((this.bbmainState == 3))
    {
      this.bbfont3.bbdrawtext(("Time taken: " + this.bbTime(this.bbgameticks)), 260, _loc5_, 0.8, 0);
    }
    this.bbfont3.bbdrawtext(("Zombies squishified: " + String(this.bbzombieskilled)), 260, (_loc5_ + 40), 0.8, 0);
    this.bbfont3.bbdrawtext(("Kinfolk eaten: " + String(this.bbkinlost)), 260, (_loc5_ + 80), 0.8, 0);
    (_loc5_ = __as3_int((_loc5_ + 150)));
    if ((this.bbmainState == 3))
    {
      if (((this.bbDrawMenuItem("Post Score", _loc4_, _loc5_, _loc6_, _loc7_, 1) != 0) && (this.bbmousehit != 0)))
      {
        this.bbSubmitScore(((1 + this.bbdifficulty) + (((((this.bbgameticks * 1000) / 120) | 0)) * 16)));
        return __as3_int(0);
      }
      bb_mojo_graphics_DrawImage(this.bbsubmit, (_loc4_ + 30), (_loc5_ + 40), 0);
    }
    (_loc4_ = __as3_int((_loc4_ + 180)));
    if (((this.bbDrawMenuItem("OK", _loc4_, _loc5_, _loc6_, _loc7_, 1) != 0) && (this.bbmousehit != 0)))
    {
      this.bbQuitGame();
    }
    if (((this.bbDrawMenuItem("More Games", 580, 520, 200, 60, 1) != 0) && (this.bbmousehit != 0)))
    {
      Redirect("http://www.ninjakiwi.com/");
      this.bbQuitGame();
      return __as3_int(0);
    }
    return __as3_int(0);
  }
  bbContinueGame() {
    (this.bbmainState = __as3_int(2));
    return __as3_int(0);
  }
  bbRenderPause() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = __as3_int(0);
    var _loc3_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    bb_mojo_graphics_DrawImage2(this.bbalpharect, 0, 0, 0, 1024, 1024, 0);
    this.bbblitrect(this.bbtip1box, 200, 150, 400, 300);
    this.bbfont3.bbdrawtextbox("Are you sure you want to quit game?", 220, 180, 360, 0.5, 0);
    (_loc1_ = __as3_int(220));
    (_loc2_ = __as3_int(380));
    (_loc3_ = __as3_int(160));
    (_loc4_ = __as3_int(64));
    if (((this.bbDrawMenuItem("OK", _loc1_, _loc2_, _loc3_, _loc4_, 1) != 0) && (this.bbmousehit != 0)))
    {
      this.bbQuitGame();
    }
    (_loc1_ = __as3_int((_loc1_ + 200)));
    if (((this.bbDrawMenuItem("Cancel", _loc1_, _loc2_, _loc3_, _loc4_, 1) != 0) && (this.bbmousehit != 0)))
    {
      this.bbContinueGame();
    }
    return __as3_int(0);
  }
  bbRenderScores() {
    this.bbRenderSky();
    if ((((MochiState() & 1)) == 0))
    {
      (this.bbmainState = __as3_int(1));
      HideMochiScores();
      return __as3_int(0);
    }
    return __as3_int(0);
  }
  bbOnRender() {
    var _loc1_ = __as3_int(0);
    (this.bbzoom = Number((bb_mojo_graphics_DeviceWidth() / 800)));
    (this.bbplaywidth = __as3_int(800));
    (this.bbplayheight = __as3_int(((bb_mojo_graphics_DeviceHeight() / this.bbzoom) | 0)));
    bb_mojo_graphics_Scale(this.bbzoom, this.bbzoom);
    (this.bbframecount = __as3_int((this.bbframecount + 1)));
    (_loc1_ = __as3_int(__as3_int(this.bbmainState)));
    if ((_loc1_ != 0))
    {
      if ((_loc1_ == 7))
      {
        this.bbRenderAttract();
      }
      else
      if ((_loc1_ == 1))
      {
        this.bbRenderMenu();
      }
      else
      if ((_loc1_ != 2))
      {
        if (((_loc1_ == 3) || (_loc1_ == 4)))
        {
          this.bbRenderSky();
          this.bbRenderGame();
          this.bbRenderStats();
        }
        else
        if ((_loc1_ != 6))
        {
          if ((_loc1_ == 5))
          {
            this.bbRenderScores();
          }
        }
        else
        {
          this.bbRenderSky();
          this.bbRenderGame();
          this.bbRenderPause();
        }
      }
      else
      {
        this.bbRenderSky();
        this.bbRenderGame();
        this.bbRenderGameUI();
      }
      (this.bbmousehit = __as3_int(0));
      return __as3_int(0);
    }
    return __as3_int(0);
  }
}

class bb_mojo_app_AppDevice extends gxtkApp {
  bbapp = null;
  constructor() {
    super();
  }
  bbAppDevice_new(param1) {
    (this.bbapp = param1);
    bb_mojo_graphics_SetGraphicsContext(new bb_mojo_graphics_GraphicsContext().bbGraphicsContext_new(this.GraphicsDevice()));
    bb_mojo_input_SetInputDevice(this.InputDevice());
    bb_mojo_audio_SetAudioDevice(this.AudioDevice());
    return this;
  }
  OnCreate() {
    return __as3_int(this.bbapp.bbOnCreate());
  }
  OnUpdate() {
    return __as3_int(this.bbapp.bbOnUpdate());
  }
  OnRender() {
    bb_mojo_graphics_BeginRender();
    var _loc1_ = __as3_int(__as3_int(this.bbapp.bbOnRender()));
    bb_mojo_graphics_EndRender();
    return __as3_int(0);
  }
  OnLoading() {
    bb_mojo_graphics_BeginRender();
    var _loc1_ = __as3_int(__as3_int(this.bbapp.bbOnLoading()));
    bb_mojo_graphics_EndRender();
    return __as3_int(0);
  }
}

class bb_mojo_graphics_GraphicsContext {
  bbdevice = null;
  bbix = Number(1);
  bbjx = Number(0);
  bbiy = Number(0);
  bbjy = Number(1);
  bbtx = Number(0);
  bbty = Number(0);
  bbtformed = __as3_int(0);
  bbmatDirty = __as3_int(0);
  bbr = Number(255);
  bbg = Number(255);
  bbb = Number(255);
  bbmatrixSp = __as3_int(0);
  bbmatrixStack = new_number_array(192);
  constructor() {
  }
  bbGraphicsContext_new(param1) {
    (this.bbdevice = param1);
    return this;
  }
}

class bb_Sounds {
  bbmusic = bb_mojo_audio_LoadSound("music.mp3");
  bbyeehaw = bb_mojo_audio_LoadSound("yeehawmp3.mp3");
  bbsoundmap = new bb_std_map_Map().bbMap_new();
  bbdisabled = Boolean(false);
  bbexplosion1 = bb_mojo_audio_LoadSound("moonshine_explosion_1.mp3");
  bbexplosion2 = bb_mojo_audio_LoadSound("moonshine_explosion_2.mp3");
  bbpriestspawn = bb_mojo_audio_LoadSound("preacher_spawn.mp3");
  bbfastspawn = bb_mojo_audio_LoadSound("fastzombie_spawn.mp3");
  bbfatspawn = bb_mojo_audio_LoadSound("fatzombie_spawn.mp3");
  bbcatspawn = bb_mojo_audio_LoadSound("catapult_spawn.mp3");
  bbgroan1 = bb_mojo_audio_LoadSound("zombie_groan_1.mp3");
  bbgroan2 = bb_mojo_audio_LoadSound("zombie_groan_2.mp3");
  bbgroan3 = bb_mojo_audio_LoadSound("zombie_groan_3.mp3");
  bbgroan4 = bb_mojo_audio_LoadSound("zombie_groan_4.mp3");
  bbangrymob = bb_mojo_audio_LoadSound("angry_mob.mp3");
  bbairstrike = bb_mojo_audio_LoadSound("airstrike.mp3");
  bbshovelattack1 = bb_mojo_audio_LoadSound("shovelman_attack_1.mp3");
  bbshovelattack2 = bb_mojo_audio_LoadSound("shovelman_attack_2.mp3");
  bbshovelattack3 = bb_mojo_audio_LoadSound("shovelman_attack_3.mp3");
  bbshotgunattack = bb_mojo_audio_LoadSound("angry_farmer_attack.mp3");
  bbtruckattack1 = bb_mojo_audio_LoadSound("survivalist_attack.mp3");
  bbshoveldie = bb_mojo_audio_LoadSound("death_shovelman.mp3");
  bbshotgundie = bb_mojo_audio_LoadSound("death_angryfarmer.mp3");
  bbtruckdie = bb_mojo_audio_LoadSound("death_survivalist.mp3");
  bbbomberdie = bb_mojo_audio_LoadSound("death_moonshine.mp3");
  bbpriestdie = bb_mojo_audio_LoadSound("death_preacher.mp3");
  bbpriestconvert = bb_mojo_audio_LoadSound("preacher_convert.mp3");
  bbharvestkill = bb_mojo_audio_LoadSound("harvester_kill.mp3");
  bbzombieattack = bb_mojo_audio_LoadSound("zombie_attack.mp3");
  bbzombieattack1 = bb_mojo_audio_LoadSound("fastzombie_jumperzombie_attack.mp3");
  bbfatattack = bb_mojo_audio_LoadSound("fatzombie_attack.mp3");
  bbcatattack = bb_mojo_audio_LoadSound("catapult_attack.mp3");
  constructor() {
  }
  bbSounds_new() {
    return this;
  }
  bbPlayAudio(param1, param2) {
    param2 = __as3_int(param2);
    var _loc3_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    var _loc5_ = null;
    (_loc3_ = __as3_int(0));
    (_loc4_ = __as3_int(0));
    (_loc5_ = null);
    if ((param1 != this.bbyeehaw))
    {
      (_loc3_ = __as3_int(__as3_int(bb_Game.bbgametime)));
      (_loc5_ = __as3_as(this.bbsoundmap.bbValueForKey(param1), bb_std_boxes_IntObject));
      if ((_loc5_ != null))
      {
        (_loc4_ = __as3_int(_loc5_.bbToInt()));
        if (((_loc3_ - _loc4_) < 50))
        {
          return null;
        }
      }
      this.bbsoundmap.bbInsert(param1, new bb_std_boxes_IntObject().bbIntObject_new(_loc3_));
    }
    if ((! this.bbdisabled))
    {
      return bb_mojo_audio_PlaySound(param1, param2);
    }
    return null;
  }
  bbPlay(param1) {
    if ((bb_Game.bbmainState == 2))
    {
      return this.bbPlayAudio(param1, 0);
    }
    return null;
  }
}

class bb_mojo_graphics_Image extends gxtkSurfaceListener {
  static bbDefaultFlags = __as3_int(0);
  bbsurface = null;
  bbwidth = __as3_int(0);
  bbheight = __as3_int(0);
  bbflags = __as3_int(0);
  bbframes = [];
  bbtx = Number(0);
  bbty = Number(0);
  constructor() {
    super();
  }
  bbSetHandle(param1, param2) {
    param1 = Number(param1);
    param2 = Number(param2);
    (this.bbtx = Number(param1));
    (this.bbty = Number(param2));
    (this.bbflags = __as3_int((this.bbflags & (- 2))));
    return __as3_int(0);
  }
  bbImage_new(param1, param2, param3) {
    param1 = __as3_nullableString(param1);
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    var _loc4_ = __as3_int(0);
    (this.bbsurface = bb_mojo_graphics_context.bbdevice.LoadSurface(param1, null));
    if ((this.bbsurface != null))
    {
      (this.bbwidth = __as3_int(((this.bbsurface.Width() / param2) | 0)));
      (this.bbheight = __as3_int(this.bbsurface.Height()));
      (this.bbflags = __as3_int(param3));
      (this.bbframes = new_object_array(param2));
      (_loc4_ = __as3_int(0));
      while ((_loc4_ < param2))
      {
        (this.bbframes[_loc4_] = new bb_mojo_graphics_Frame().bbFrame_new((_loc4_ * this.bbwidth), 0));
        (_loc4_ = __as3_int((_loc4_ + 1)));
      }
      if ((param2 == 1))
      {
        (this.bbflags = __as3_int((this.bbflags | 65536)));
      }
      if ((((this.bbflags & 1)) != 0))
      {
        this.bbSetHandle((this.bbwidth / 2), (this.bbheight / 2));
      }
      return this;
    }
    return this;
  }
  bbImage_new2(param1, param2, param3, param4, param5, param6, param7) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    param5 = __as3_int(param5);
    param6 = __as3_int(param6);
    var _loc8_ = __as3_int(0);
    var _loc9_ = __as3_int(0);
    var _loc10_ = __as3_int(0);
    (this.bbsurface = param7.bbsurface);
    (this.bbwidth = __as3_int(param3));
    (this.bbheight = __as3_int(param4));
    (this.bbflags = __as3_int(param6));
    (this.bbframes = new_object_array(param5));
    (_loc8_ = __as3_int((param1 + param7.bbframes[0].bbx)));
    (_loc9_ = __as3_int((param2 + param7.bbframes[0].bby)));
    (_loc10_ = __as3_int(0));
    while ((_loc10_ < param5))
    {
      if (((_loc8_ + this.bbwidth) > param7.bbwidth))
      {
        (_loc8_ = __as3_int(__as3_int(param7.bbframes[0].bbx)));
        (_loc9_ = __as3_int((_loc9_ + this.bbheight)));
      }
      (this.bbframes[_loc10_] = new bb_mojo_graphics_Frame().bbFrame_new(_loc8_, _loc9_));
      (_loc8_ = __as3_int((_loc8_ + this.bbwidth)));
      (_loc10_ = __as3_int((_loc10_ + 1)));
    }
    if ((((((param5 == 1) && (param1 == 0)) && (param2 == 0)) && (this.bbwidth == this.bbsurface.Width())) && (this.bbheight == this.bbsurface.Height())))
    {
      (this.bbflags = __as3_int((this.bbflags | 65536)));
    }
    if ((((this.bbflags & 1)) != 0))
    {
      this.bbSetHandle((this.bbwidth / 2), (this.bbheight / 2));
    }
    return this;
  }
  bbGrabImage(param1, param2, param3, param4, param5, param6) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    param5 = __as3_int(param5);
    param6 = __as3_int(param6);
    if ((this.bbframes.length == 1))
    {
      return new bb_mojo_graphics_Image().bbImage_new2(param1, param2, param3, param4, param5, param6, this);
    }
    return null;
  }
  bbHandleY() {
    return Number(this.bbty);
  }
  bbHeight() {
    return __as3_int(this.bbheight);
  }
  bbHandleX() {
    return Number(this.bbtx);
  }
  OnSurfaceLoaded(param1) {
    return __as3_int(0);
  }
}

class bb_mojo_graphics_Frame {
  bbx = __as3_int(0);
  bby = __as3_int(0);
  constructor() {
  }
  bbFrame_new(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    (this.bbx = __as3_int(param1));
    (this.bby = __as3_int(param2));
    return this;
  }
}

class bb_mojo_audio_Sound {
  bbsample = null;
  constructor() {
  }
  bbSound_new(param1) {
    (this.bbsample = param1);
    return this;
  }
}

class bb_std_boxes_IntObject {
  bbvalue = __as3_int(0);
  constructor() {
  }
  bbToInt() {
    return __as3_int(this.bbvalue);
  }
  bbIntObject_new(param1) {
    param1 = __as3_int(param1);
    (this.bbvalue = __as3_int(param1));
    return this;
  }
}

class bb_std_map_Map {
  bbroot = null;
  constructor() {
  }
  bbMap_new() {
    return this;
  }
  bbCompare(param1, param2) {
    return __as3_int(0);
  }
  bbFindNode(param1) {
    var _loc2_ = null;
    var _loc3_ = __as3_int(0);
    (_loc2_ = this.bbroot);
    while ((_loc2_ != null))
    {
      (_loc3_ = __as3_int(__as3_int(this.bbCompare(param1, _loc2_.bbkey))));
      if ((_loc3_ <= 0))
      {
        if ((_loc3_ >= 0))
        {
          return _loc2_;
        }
        (_loc2_ = _loc2_.bbleft);
      }
      else
      {
        (_loc2_ = _loc2_.bbright);
      }
    }
    return _loc2_;
  }
  bbValueForKey(param1) {
    var _loc2_ = null;
    (_loc2_ = this.bbFindNode(param1));
    if ((_loc2_ == null))
    {
      return null;
    }
    return _loc2_.bbvalue;
  }
  bbRotateLeft(param1) {
    var _loc2_ = null;
    (_loc2_ = param1.bbright);
    (param1.bbright = _loc2_.bbleft);
    if ((_loc2_.bbleft != null))
    {
      (_loc2_.bbleft.bbparent = param1);
    }
    (_loc2_.bbparent = param1.bbparent);
    if ((param1.bbparent != null))
    {
      if ((param1 == param1.bbparent.bbleft))
      {
        (param1.bbparent.bbleft = _loc2_);
      }
      else
      {
        (param1.bbparent.bbright = _loc2_);
      }
    }
    else
    {
      (this.bbroot = _loc2_);
    }
    (_loc2_.bbleft = param1);
    (param1.bbparent = _loc2_);
    return __as3_int(0);
  }
  bbRotateRight(param1) {
    var _loc2_ = null;
    (_loc2_ = param1.bbleft);
    (param1.bbleft = _loc2_.bbright);
    if ((_loc2_.bbright != null))
    {
      (_loc2_.bbright.bbparent = param1);
    }
    (_loc2_.bbparent = param1.bbparent);
    if ((param1.bbparent != null))
    {
      if ((param1 == param1.bbparent.bbright))
      {
        (param1.bbparent.bbright = _loc2_);
      }
      else
      {
        (param1.bbparent.bbleft = _loc2_);
      }
    }
    else
    {
      (this.bbroot = _loc2_);
    }
    (_loc2_.bbright = param1);
    (param1.bbparent = _loc2_);
    return __as3_int(0);
  }
  bbInsertFixup(param1) {
    var _loc2_ = null;
    var _loc3_ = null;
    while ((((param1.bbparent != null) && (param1.bbparent.bbcolor == (- 1))) && (param1.bbparent.bbparent != null)))
    {
      if ((param1.bbparent != param1.bbparent.bbparent.bbleft))
      {
        (_loc3_ = param1.bbparent.bbparent.bbleft);
        if (((_loc3_ != null) && (_loc3_.bbcolor == (- 1))))
        {
          (param1.bbparent.bbcolor = __as3_int(1));
          (_loc3_.bbcolor = __as3_int(1));
          (_loc3_.bbparent.bbcolor = __as3_int((- 1)));
          (param1 = _loc3_.bbparent);
        }
        else
        {
          if ((param1 == param1.bbparent.bbleft))
          {
            (param1 = param1.bbparent);
            this.bbRotateRight(param1);
          }
          (param1.bbparent.bbcolor = __as3_int(1));
          (param1.bbparent.bbparent.bbcolor = __as3_int((- 1)));
          this.bbRotateLeft(param1.bbparent.bbparent);
        }
      }
      else
      {
        (_loc2_ = param1.bbparent.bbparent.bbright);
        if (((_loc2_ != null) && (_loc2_.bbcolor == (- 1))))
        {
          (param1.bbparent.bbcolor = __as3_int(1));
          (_loc2_.bbcolor = __as3_int(1));
          (_loc2_.bbparent.bbcolor = __as3_int((- 1)));
          (param1 = _loc2_.bbparent);
        }
        else
        {
          if ((param1 == param1.bbparent.bbright))
          {
            (param1 = param1.bbparent);
            this.bbRotateLeft(param1);
          }
          (param1.bbparent.bbcolor = __as3_int(1));
          (param1.bbparent.bbparent.bbcolor = __as3_int((- 1)));
          this.bbRotateRight(param1.bbparent.bbparent);
        }
      }
    }
    (this.bbroot.bbcolor = __as3_int(1));
    return __as3_int(0);
  }
  bbInsert(param1, param2) {
    var _loc3_ = null;
    var _loc4_ = null;
    var _loc5_ = __as3_int(0);
    (_loc3_ = this.bbroot);
    (_loc4_ = null);
    (_loc5_ = __as3_int(0));
    while ((_loc3_ != null))
    {
      (_loc4_ = _loc3_);
      (_loc5_ = __as3_int(__as3_int(this.bbCompare(param1, _loc3_.bbkey))));
      if ((_loc5_ > 0))
      {
        (_loc3_ = _loc3_.bbright);
      }
      else
      {
        if ((_loc5_ >= 0))
        {
          (_loc3_.bbvalue = param2);
          return __as3_int(0);
        }
        (_loc3_ = _loc3_.bbleft);
      }
    }
    (_loc3_ = new bb_std_map_Node().bbNode_new(param1, param2, (- 1), _loc4_));
    if ((_loc4_ != null))
    {
      if ((_loc5_ > 0))
      {
        (_loc4_.bbright = _loc3_);
      }
      else
      {
        (_loc4_.bbleft = _loc3_);
      }
      this.bbInsertFixup(_loc3_);
      return __as3_int(0);
    }
    (this.bbroot = _loc3_);
    return __as3_int(0);
  }
}

class bb_std_map_Node {
  bbkey = null;
  bbright = null;
  bbleft = null;
  bbvalue = null;
  bbcolor = __as3_int(0);
  bbparent = null;
  constructor() {
  }
  bbNode_new(param1, param2, param3, param4) {
    param3 = __as3_int(param3);
    (this.bbkey = param1);
    (this.bbvalue = param2);
    (this.bbcolor = __as3_int(param3));
    (this.bbparent = param4);
    return this;
  }
}

class bb_imagefont_ImageFont {
  bbimage = null;
  bbglyphs = new_object_array(256);
  bbheight = __as3_int(0);
  constructor() {
  }
  bbImageFont_new(param1, param2, param3) {
    param1 = __as3_nullableString(param1);
    param2 = __as3_int(param2);
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    (this.bbimage = bb_mojo_graphics_LoadImage((param1 + ".png"), 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (_loc4_ = __as3_int(0));
    (_loc5_ = __as3_int(__as3_int(param3.length)));
    while ((_loc4_ < (_loc5_ - 8)))
    {
      (this.bbglyphs[param3[_loc4_]] = new bb_imagefont_Glyph().bbGlyph_new(this.bbimage, param3[(_loc4_ + 0)], param3[(_loc4_ + 1)], param3[(_loc4_ + 2)], param3[(_loc4_ + 3)], param3[(_loc4_ + 4)], param3[(_loc4_ + 5)], param3[(_loc4_ + 6)], param3[(_loc4_ + 7)]));
      (_loc4_ = __as3_int((_loc4_ + 8)));
    }
    (this.bbheight = __as3_int(param2));
    return this;
  }
  bbtextwidth(param1) {
    param1 = __as3_nullableString(param1);
    var _loc2_ = __as3_int(0);
    var _loc3_ = null;
    var _loc4_ = __as3_int(0);
    var _loc5_ = __as3_int(0);
    var _loc6_ = __as3_int(0);
    (_loc2_ = __as3_int(0));
    (_loc3_ = null);
    (_loc4_ = __as3_int(0));
    (_loc5_ = __as3_int(0));
    (_loc2_ = __as3_int(0));
    (_loc5_ = __as3_int(param1.length));
    (_loc6_ = __as3_int(0));
    while ((_loc6_ < _loc5_))
    {
      (_loc4_ = __as3_int(param1.charCodeAt(_loc6_)));
      (_loc3_ = this.bbglyphs[_loc4_]);
      if ((_loc3_ == null))
      {
        if (((_loc4_ >= 65) && (_loc4_ <= 91)))
        {
          (_loc4_ = __as3_int((_loc4_ + 32)));
        }
        else
        if (((_loc4_ >= 97) && (_loc4_ <= 123)))
        {
          (_loc4_ = __as3_int((_loc4_ - 32)));
        }
        (_loc3_ = this.bbglyphs[_loc4_]);
      }
      if ((_loc3_ != null))
      {
        (_loc2_ = __as3_int(((_loc2_ + _loc3_.bbadvance) + 1)));
      }
      (_loc6_ = __as3_int((_loc6_ + 1)));
    }
    return __as3_int(_loc2_);
  }
  bbdrawtext(param1, param2, param3, param4, param5) {
    param1 = __as3_nullableString(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = Number(param4);
    param5 = __as3_int(param5);
    var _loc6_ = null;
    var _loc7_ = __as3_int(0);
    var _loc8_ = __as3_int(0);
    var _loc9_ = __as3_int(0);
    var _loc10_ = __as3_int(0);
    (_loc6_ = null);
    (_loc7_ = __as3_int(0));
    (_loc8_ = __as3_int(0));
    (_loc9_ = __as3_int(0));
    bb_mojo_graphics_PushMatrix();
    (param2 = Number((param2 / param4)));
    (param3 = Number((param3 / param4)));
    bb_mojo_graphics_Scale(param4, param4);
    if ((param5 != 0))
    {
      (_loc9_ = __as3_int(__as3_int(this.bbtextwidth(param1))));
      (param2 = Number((param2 - (((_loc9_ * param5) / 2) | 0))));
    }
    (_loc8_ = __as3_int(param1.length));
    (_loc10_ = __as3_int(0));
    while ((_loc10_ < _loc8_))
    {
      (_loc7_ = __as3_int(param1.charCodeAt(_loc10_)));
      (_loc6_ = this.bbglyphs[_loc7_]);
      if ((_loc6_ == null))
      {
        if ((! (((_loc7_ >= 65) && (_loc7_ <= 91)))))
        {
          if (((_loc7_ >= 97) && (_loc7_ <= 123)))
          {
            (_loc7_ = __as3_int((_loc7_ - 32)));
          }
        }
        else
        {
          (_loc7_ = __as3_int((_loc7_ + 32)));
        }
        (_loc6_ = this.bbglyphs[_loc7_]);
      }
      if ((_loc6_ != null))
      {
        _loc6_.bbblit(param2, param3);
        (param2 = Number(((param2 + _loc6_.bbadvance) + 1)));
      }
      (_loc10_ = __as3_int((_loc10_ + 1)));
    }
    bb_mojo_graphics_PopMatrix();
    return __as3_int(0);
  }
  bbtextheight(param1, param2, param3) {
    param1 = __as3_nullableString(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    var _loc4_ = __as3_int(0);
    var _loc5_ = null;
    var _loc7_ = Number(NaN);
    var _loc8_ = __as3_int(0);
    var _loc9_ = __as3_int(0);
    var _loc10_ = __as3_int(0);
    var _loc11_ = __as3_nullableString(null);
    var _loc12_ = __as3_int(0);
    var _loc13_ = __as3_int(0);
    var _loc14_ = __as3_int(0);
    var _loc15_ = __as3_nullableString(null);
    var _loc16_ = __as3_int(0);
    (_loc4_ = __as3_int(0));
    (_loc5_ = null);
    (_loc7_ = Number(0));
    while ((_loc4_ < param1.length))
    {
      (_loc8_ = __as3_int(0));
      (_loc9_ = __as3_int(_loc4_));
      (_loc10_ = __as3_int(_loc4_));
      ((__as3_stringValue0) => (_loc11_ = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))("");
      (_loc12_ = __as3_int(0));
      (_loc13_ = __as3_int(_loc4_));
      while ((_loc13_ <= param1.length))
      {
        (_loc10_ = __as3_int(_loc13_));
        (_loc12_ = __as3_int(param1.charCodeAt(_loc13_)));
        if ((_loc12_ == 32))
        {
          (_loc9_ = __as3_int(_loc13_));
        }
        if (((_loc12_ == 10) || (_loc12_ == 13)))
        {
          break;
        }
        (_loc5_ = this.bbglyphs[_loc12_]);
        if ((_loc5_ != null))
        {
          (_loc8_ = __as3_int((_loc8_ + ((((_loc5_.bbadvance + 1)) * param3) | 0))));
          if ((_loc8_ > param2))
          {
            (_loc10_ = __as3_int(_loc9_));
            break;
          }
        }
        (_loc13_ = __as3_int((_loc13_ + 1)));
      }
      (_loc14_ = __as3_int((_loc10_ - _loc4_)));
      if ((_loc14_ > 0))
      {
        ((__as3_stringValue1) => (_loc15_ = __as3_nullableString(__as3_stringValue1), __as3_stringValue1))("");
        (_loc16_ = __as3_int(_loc4_));
        while ((_loc16_ <= _loc10_))
        {
          ((__as3_stringValue2) => (_loc15_ = __as3_nullableString(__as3_stringValue2), __as3_stringValue2))((_loc15_ + String.fromCharCode(param1.charCodeAt(_loc16_))));
          (_loc16_ = __as3_int((_loc16_ + 1)));
        }
      }
      (_loc7_ = Number((_loc7_ + (param3 * this.bbheight))));
      (_loc4_ = __as3_int((_loc4_ + (_loc14_ + 1))));
    }
    return __as3_int((_loc7_ | 0));
  }
  bbdrawtextbox(param1, param2, param3, param4, param5, param6) {
    param1 = __as3_nullableString(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = Number(param4);
    param5 = Number(param5);
    param6 = __as3_int(param6);
    var _loc7_ = __as3_int(0);
    var _loc8_ = null;
    var _loc9_ = __as3_int(0);
    var _loc10_ = __as3_int(0);
    var _loc11_ = __as3_int(0);
    var _loc12_ = __as3_nullableString(null);
    var _loc13_ = __as3_int(0);
    var _loc14_ = __as3_int(0);
    var _loc15_ = __as3_int(0);
    var _loc16_ = __as3_nullableString(null);
    var _loc17_ = __as3_int(0);
    (_loc7_ = __as3_int(0));
    (_loc8_ = null);
    (_loc7_ = __as3_int(0));
    while ((_loc7_ < param1.length))
    {
      (_loc9_ = __as3_int(0));
      (_loc10_ = __as3_int(_loc7_));
      (_loc11_ = __as3_int(_loc7_));
      ((__as3_stringValue0) => (_loc12_ = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))("");
      (_loc13_ = __as3_int(0));
      (_loc14_ = __as3_int(_loc7_));
      while ((_loc14_ <= param1.length))
      {
        (_loc11_ = __as3_int(_loc14_));
        (_loc13_ = __as3_int(param1.charCodeAt(_loc14_)));
        if ((_loc13_ == 32))
        {
          (_loc10_ = __as3_int(_loc14_));
        }
        if (((_loc13_ == 10) || (_loc13_ == 13)))
        {
          break;
        }
        (_loc8_ = this.bbglyphs[_loc13_]);
        if ((_loc8_ != null))
        {
          (_loc9_ = __as3_int((_loc9_ + ((((_loc8_.bbadvance + 1)) * param5) | 0))));
          if ((_loc9_ > param4))
          {
            (_loc11_ = __as3_int(_loc10_));
            break;
          }
        }
        (_loc14_ = __as3_int((_loc14_ + 1)));
      }
      (_loc15_ = __as3_int((_loc11_ - _loc7_)));
      if ((_loc15_ > 0))
      {
        ((__as3_stringValue1) => (_loc16_ = __as3_nullableString(__as3_stringValue1), __as3_stringValue1))("");
        (_loc17_ = __as3_int(_loc7_));
        while ((_loc17_ <= _loc11_))
        {
          ((__as3_stringValue2) => (_loc16_ = __as3_nullableString(__as3_stringValue2), __as3_stringValue2))((_loc16_ + String.fromCharCode(param1.charCodeAt(_loc17_))));
          (_loc17_ = __as3_int((_loc17_ + 1)));
        }
        this.bbdrawtext(_loc16_, param2, param3, param5, param6);
      }
      (param3 = Number((param3 + (param5 * this.bbheight))));
      (_loc7_ = __as3_int((_loc7_ + (_loc15_ + 1))));
    }
    return __as3_int(0);
  }
}

class bb_imagefont_Glyph {
  bbcharcode = __as3_int(0);
  bbadvance = __as3_int(0);
  bbimage = null;
  constructor() {
  }
  bbGlyph_new(param1, param2, param3, param4, param5, param6, param7, param8, param9) {
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    param5 = __as3_int(param5);
    param6 = __as3_int(param6);
    param7 = __as3_int(param7);
    param8 = __as3_int(param8);
    param9 = __as3_int(param9);
    (this.bbcharcode = __as3_int(param2));
    (this.bbadvance = __as3_int(param3));
    if ((((param1 != null) && (param4 != 0)) && (param5 != 0)))
    {
      (this.bbimage = param1.bbGrabImage(param6, param7, param4, param5, 1, bb_mojo_graphics_Image.bbDefaultFlags));
      this.bbimage.bbSetHandle((- param8), (- param9));
    }
    return this;
  }
  bbblit(param1, param2) {
    param1 = Number(param1);
    param2 = Number(param2);
    if ((this.bbimage != null))
    {
      bb_mojo_graphics_DrawImage(this.bbimage, param1, param2, 0);
    }
    return __as3_int(0);
  }
}

class bb_spritesheet_SpriteSheet {
  bbimage = null;
  bbsprites = new_object_array(256);
  bblastframe = __as3_int(0);
  constructor() {
  }
  bbSpriteSheet_new(param1, param2, param3, param4, param5) {
    param1 = __as3_nullableString(param1);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    param5 = __as3_int(param5);
    var _loc6_ = __as3_int(0);
    var _loc7_ = __as3_int(0);
    var _loc8_ = __as3_int(0);
    var _loc9_ = __as3_int(0);
    (this.bbimage = bb_mojo_graphics_LoadImage((param1 + ".png"), 1, bb_mojo_graphics_Image.bbDefaultFlags));
    (_loc6_ = __as3_int(0));
    (_loc7_ = __as3_int(__as3_int(param2.length)));
    while ((_loc6_ < (_loc7_ - 6)))
    {
      (_loc8_ = __as3_int(__as3_int(param2[(_loc6_ + 0)])));
      (_loc9_ = __as3_int(__as3_int(param2[(_loc6_ + 5)])));
      if ((param3 != 0))
      {
        (_loc9_ = __as3_int((- _loc9_)));
      }
      (this.bbsprites[_loc8_] = new bb_spritesheet_Sprite().bbSprite_new(this.bbimage, param2[(_loc6_ + 0)], param2[(_loc6_ + 1)], param2[(_loc6_ + 2)], param2[(_loc6_ + 3)], param2[(_loc6_ + 4)], (param2[(_loc6_ + 5)] + param4), (param2[(_loc6_ + 6)] + param5)));
      if ((_loc8_ > this.bblastframe))
      {
        (this.bblastframe = __as3_int(_loc8_));
      }
      (_loc6_ = __as3_int((_loc6_ + 7)));
    }
    return this;
  }
  bbSpriteSheet_new2() {
    return this;
  }
  bbbottom(param1) {
    param1 = __as3_int(param1);
    var _loc2_ = null;
    var _loc3_ = Number(NaN);
    (_loc2_ = null);
    (_loc2_ = this.bbsprites[param1].bbimage);
    (_loc3_ = Number(_loc2_.bbHandleY()));
    (_loc3_ = Number((_loc3_ - _loc2_.bbHeight())));
    return __as3_int((_loc3_ | 0));
  }
  bbblit(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = Number(param4);
    var _loc5_ = null;
    (_loc5_ = null);
    (_loc5_ = this.bbsprites[param1]);
    if ((_loc5_.bbimage != null))
    {
      if ((param4 == 1))
      {
        bb_mojo_graphics_DrawImage(_loc5_.bbimage, param2, param3, 0);
      }
      else
      {
        bb_mojo_graphics_DrawImage2(_loc5_.bbimage, param2, param3, 0, param4, param4, 0);
      }
    }
    return __as3_int(0);
  }
  bbblit2(param1, param2, param3, param4, param5) {
    param1 = __as3_int(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = Number(param4);
    param5 = Number(param5);
    var _loc6_ = null;
    var _loc7_ = null;
    var _loc8_ = Number(NaN);
    var _loc9_ = Number(NaN);
    (_loc6_ = null);
    (_loc6_ = this.bbsprites[param1]);
    if ((_loc6_.bbimage != null))
    {
      (_loc7_ = _loc6_.bbimage);
      (_loc8_ = Number(_loc7_.bbHandleX()));
      (_loc9_ = Number(_loc7_.bbHandleY()));
      _loc7_.bbSetHandle(param4, param4);
      bb_mojo_graphics_DrawImage2(_loc7_, ((param2 - _loc8_) + param4), ((param3 - _loc9_) + param4), param5, 1, 1, 0);
      _loc7_.bbSetHandle(_loc8_, _loc9_);
    }
    return __as3_int(0);
  }
  bbflipblit(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = Number(param4);
    var _loc5_ = null;
    (_loc5_ = null);
    (_loc5_ = this.bbsprites[param1]);
    if ((_loc5_.bbimage != null))
    {
      bb_mojo_graphics_DrawImage2(_loc5_.bbimage, param2, param3, 0, (- param4), param4, 0);
    }
    return __as3_int(0);
  }
}

class bb_spritesheet_Sprite {
  bbsprite = __as3_int(0);
  bbimage = null;
  constructor() {
  }
  bbSprite_new(param1, param2, param3, param4, param5, param6, param7, param8) {
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    param5 = __as3_int(param5);
    param6 = __as3_int(param6);
    param7 = __as3_int(param7);
    param8 = __as3_int(param8);
    (this.bbsprite = __as3_int(param2));
    if (((param1 != null) && (param3 != 0)))
    {
      (this.bbimage = param1.bbGrabImage(param5, param6, param3, param4, 1, bb_mojo_graphics_Image.bbDefaultFlags));
      this.bbimage.bbSetHandle(param7, param8);
    }
    return this;
  }
}

class bb_Unit {
  bbtype = __as3_int(0);
  bbname = __as3_nullableString("");
  bbcost = __as3_int(0);
  bbbuildtime = __as3_int(0);
  bbspeed = __as3_int(0);
  bbhealth = __as3_int(0);
  bbdamage = __as3_int(0);
  bbtargets = __as3_int(0);
  bbdependency = __as3_int(0);
  bbpeople = __as3_int(0);
  bbhitradius = __as3_int(0);
  bbhitoffset = __as3_int(0);
  bbhint = __as3_nullableString("");
  bbbusy = __as3_int(0);
  bborders = __as3_int(0);
  bbenabled = __as3_int(0);
  constructor() {
  }
  bbUnit_new(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param2 = __as3_nullableString(param2);
    param4 = __as3_int(param4);
    (this.bbtype = __as3_int(param1));
    __as3_storeString(this, "bbname", param2);
    (this.bbcost = __as3_int(param3[(param4 + 0)]));
    (this.bbbuildtime = __as3_int((50 * param3[(param4 + 1)])));
    (this.bbspeed = __as3_int(param3[(param4 + 2)]));
    (this.bbhealth = __as3_int(param3[(param4 + 3)]));
    (this.bbdamage = __as3_int(param3[(param4 + 4)]));
    (this.bbtargets = __as3_int(param3[(param4 + 5)]));
    (this.bbdependency = __as3_int(param3[(param4 + 6)]));
    (this.bbpeople = __as3_int(param3[(param4 + 7)]));
    (this.bbhitradius = __as3_int(param3[(param4 + 8)]));
    (this.bbhitoffset = __as3_int(param3[(param4 + 9)]));
    __as3_storeString(this, "bbhint", "");
    return this;
  }
  bbReset() {
    (this.bbbusy = __as3_int(0));
    (this.bborders = __as3_int(0));
    return __as3_int(0);
  }
  bbInstance(param1, param2) {
    param1 = __as3_int(param1);
    var _loc3_ = null;
    (_loc3_ = null);
    return new bb_Person().bbPerson_new(param1, this, param2);
  }
  bbUpdate(param1) {
    var _loc2_ = __as3_nullableString(null);
    (this.bbenabled = __as3_int(1));
    __as3_storeString(this, "bbhint", "");
    if ((param1.bbbuildingcount[this.bbdependency] == 0))
    {
      (this.bbenabled = __as3_int(0));
      ((__as3_stringValue0) => (_loc2_ = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))(("a " + bb_data_buildingname[this.bbdependency]));
      if ((this.bbhint == ""))
      {
        __as3_storeString(this, "bbhint", ("You need to build " + _loc2_));
      }
      else
      {
        ((__as3_stringValue1) => (this.bbhint = __as3_nullableString(__as3_stringValue1), __as3_stringValue1))((this.bbhint + (" and " + _loc2_)));
      }
    }
    if ((this.bbcost > param1.bbcash))
    {
      (this.bbenabled = __as3_int(0));
      if ((this.bbhint != ""))
      {
        ((__as3_stringValue2) => (this.bbhint = __as3_nullableString(__as3_stringValue2), __as3_stringValue2))((this.bbhint + " and more cash"));
      }
      else
      {
        __as3_storeString(this, "bbhint", "You need more cash");
      }
    }
    if (((param1.bbmaxforce - param1.bbforce) < this.bbpeople))
    {
      (this.bbenabled = __as3_int(0));
      if ((this.bbhint != ""))
      {
        ((__as3_stringValue3) => (this.bbhint = __as3_nullableString(__as3_stringValue3), __as3_stringValue3))((this.bbhint + " and more trailers"));
      }
      else
      {
        __as3_storeString(this, "bbhint", "Build more trailers");
      }
    }
    if ((this.bbhint == ""))
    {
      __as3_storeString(this, "bbhint", bb_data_unitabout[this.bbtype]);
    }
    else
    {
      __as3_storeString(this, "bbhint", (((((bb_data_unitabout[this.bbtype] + "[") + this.bbhint) + " before adding a ") + this.bbname) + "]"));
    }
    return __as3_int(0);
  }
}

class bb_Building {
  bbtype = __as3_int(0);
  bbname = __as3_nullableString("");
  bbnname = __as3_nullableString("");
  bbcost = __as3_int(0);
  bbbuildtime = __as3_int(0);
  bbdependency = __as3_int(0);
  bbmaximum = __as3_int(0);
  bbbusy = __as3_int(0);
  bborders = __as3_int(0);
  bbenabled = __as3_int(0);
  bbhint = __as3_nullableString("");
  bbcapacity = __as3_int(0);
  constructor() {
  }
  bbBuilding_new(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param2 = __as3_nullableString(param2);
    param4 = __as3_int(param4);
    (this.bbtype = __as3_int(param1));
    __as3_storeString(this, "bbname", param2);
    __as3_storeString(this, "bbnname", param2.replace(/ /g, "__DemoStr_0A"));
    (this.bbcost = __as3_int(param3[(param4 + 0)]));
    (this.bbbuildtime = __as3_int((100 * param3[(param4 + 1)])));
    (this.bbdependency = __as3_int(param3[(param4 + 2)]));
    (this.bbmaximum = __as3_int(param3[(param4 + 3)]));
    return this;
  }
  bbReset() {
    (this.bbbusy = __as3_int(0));
    (this.bborders = __as3_int(0));
    return __as3_int(0);
  }
  bbUpdate(param1) {
    var _loc2_ = __as3_nullableString(null);
    (this.bbenabled = __as3_int(1));
    __as3_storeString(this, "bbhint", "");
    if ((this.bbcost > param1.bbcash))
    {
      (this.bbenabled = __as3_int(0));
      __as3_storeString(this, "bbhint", "you need more cash");
    }
    if (((this.bbdependency != 0) && (param1.bbbuildingcount[this.bbdependency] == 0)))
    {
      (this.bbenabled = __as3_int(0));
      ((__as3_stringValue0) => (_loc2_ = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))((((" a " + bb_data_buildingname[this.bbdependency]) + " before adding a ") + this.bbname));
      if ((this.bbhint != ""))
      {
        __as3_storeString(this, "bbhint", ((this.bbhint + " and ") + _loc2_));
      }
      else
      {
        __as3_storeString(this, "bbhint", ("Build " + _loc2_));
      }
    }
    if (((param1.bbbuildingcount[this.bbtype] + this.bborders) == this.bbmaximum))
    {
      (this.bbenabled = __as3_int(0));
      __as3_storeString(this, "bbhint", (("You already have the maximum number of " + bb_data_buildingname[this.bbtype]) + "s under construction"));
    }
    (this.bbcapacity = __as3_int(0));
    if ((param1.bbbuildingcount[this.bbtype] == this.bbmaximum))
    {
      (this.bbenabled = __as3_int(0));
      __as3_storeString(this, "bbhint", (("You already have the maximum number of " + bb_data_buildingname[this.bbtype]) + "s"));
      (this.bbcapacity = __as3_int(1));
    }
    if ((this.bbhint == ""))
    {
      __as3_storeString(this, "bbhint", bb_data_buildingabout[this.bbtype]);
    }
    else
    {
      __as3_storeString(this, "bbhint", (((bb_data_buildingabout[this.bbtype] + "[") + this.bbhint) + "]"));
    }
    return __as3_int(0);
  }
}

class bb_Power {
  bbtype = __as3_int(0);
  bbbuildtime = __as3_int(0);
  bbxp = __as3_int(0);
  bbcooltime = __as3_int(0);
  bbbusy = __as3_int(0);
  bbcooldown = __as3_int(0);
  bblocked = __as3_int(0);
  bbenabled = __as3_int(0);
  bbhint = __as3_nullableString("");
  constructor() {
  }
  bbPower_new(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    param4 = __as3_int(param4);
    (this.bbtype = __as3_int(param1));
    (this.bbbuildtime = __as3_int(param2));
    (this.bbxp = __as3_int(param3));
    (this.bbcooltime = __as3_int(param4));
    return this;
  }
  bbReset() {
    (this.bbbusy = __as3_int(0));
    (this.bbcooldown = __as3_int(0));
    return __as3_int(0);
  }
  bbUpdate(param1) {
    (this.bbenabled = __as3_int(1));
    if ((((this.bbbusy != 0) || (this.bbcooldown != 0)) || (this.bblocked != 0)))
    {
      (this.bbenabled = __as3_int(0));
    }
    if ((this.bbxp > param1.bbxp))
    {
      (this.bbenabled = __as3_int(0));
    }
    __as3_storeString(this, "bbhint", "");
    if ((this.bblocked != 0))
    {
      __as3_storeString(this, "bbhint", "Not available on this level.");
    }
    else
    if ((this.bbxp > param1.bbxp))
    {
      __as3_storeString(this, "bbhint", (("You need " + String(this.bbxp)) + " Yee-Haws to use this Super Weapon"));
    }
    if ((this.bbhint != ""))
    {
      __as3_storeString(this, "bbhint", (((bb_data_wmdabout[this.bbtype] + "[") + this.bbhint) + "]"));
    }
    else
    {
      __as3_storeString(this, "bbhint", bb_data_wmdabout[this.bbtype]);
    }
    return __as3_int(0);
  }
}

class bb_Body {
  bblayer = __as3_int(0);
  bbxpos = Number(0);
  bbypos = Number(0);
  bbhit = __as3_int(0);
  constructor() {
  }
  bbBody_new() {
    return this;
  }
  bbHitKey() {
    var _loc1_ = __as3_int(0);
    (_loc1_ = __as3_int(__as3_int(this.bbhit)));
    (this.bbhit = __as3_int(0));
    return __as3_int(_loc1_);
  }
}

class bb_Gore extends bb_Body {
  static bbsprites1 = null;
  static bbsprites2 = null;
  static bbsprites3 = null;
  static bbgore = null;
  static bbrecyclegore = null;
  static bbfreegore = null;
  bbage = __as3_int(0);
  bbstyle = __as3_int(0);
  bbrate = __as3_int(0);
  bbcount = __as3_int(0);
  bbrecycle = __as3_int(0);
  bboffset = __as3_int(0);
  bbskin = null;
  constructor() {
    super();
  }
  static bbReset(param1, param2, param3) {
    (bb_Gore.bbsprites1 = param1);
    (bb_Gore.bbsprites2 = param2);
    (bb_Gore.bbsprites3 = param3);
    bb_Gore.bbgore.bbClear();
    return __as3_int(0);
  }
  static bbUpdateAll() {
    var _loc1_ = null;
    var _loc2_ = null;
    var _loc3_ = null;
    var _loc4_ = null;
    (_loc1_ = bb_Gore.bbgore.bbObjectEnumerator());
    while (_loc1_.bbHasNext())
    {
      (_loc3_ = __as3_as(_loc1_.bbNextObject(), bb_Gore));
      _loc3_.bbUpdate();
    }
    (_loc2_ = bb_Gore.bbrecyclegore.bbObjectEnumerator());
    while (_loc2_.bbHasNext())
    {
      (_loc4_ = __as3_as(_loc2_.bbNextObject(), bb_Gore));
      bb_Gore.bbgore.bbRemove(_loc4_);
      bb_Gore.bbfreegore.bbAddLast(_loc4_);
    }
    bb_Gore.bbrecyclegore.bbClear();
    return __as3_int(0);
  }
  static bbCreate(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = __as3_int(param4);
    var _loc5_ = null;
    (_loc5_ = new bb_Gore().bbGore_new());
    if (bb_Gore.bbfreegore.bbIsEmpty())
    {
      (_loc5_ = new bb_Gore().bbGore_new());
    }
    else
    {
      (_loc5_ = __as3_as(bb_Gore.bbfreegore.bbLast(), bb_Gore));
      bb_Gore.bbfreegore.bbRemoveLast();
    }
    (_loc5_.bbstyle = __as3_int(0));
    (_loc5_.bbrate = __as3_int(8));
    if ((param1 == 35))
    {
      (_loc5_.bbskin = bb_Cell.bbcells(bb_Gore.bbsprites2));
      (_loc5_.bboffset = __as3_int(1));
      (_loc5_.bbcount = __as3_int(_loc5_.bbskin.bbsheet.bblastframe));
    }
    else
    if ((bb_std_random_Rnd() > 0.33))
    {
      (_loc5_.bbskin = bb_Cell.bbcells(bb_Gore.bbsprites1));
      if ((bb_std_random_Rnd() >= 0.33))
      {
        if ((bb_std_random_Rnd() > 0.5))
        {
          (_loc5_.bboffset = __as3_int(7));
          (_loc5_.bbcount = __as3_int(4));
        }
        else
        {
          (_loc5_.bboffset = __as3_int(11));
          (_loc5_.bbcount = __as3_int(6));
        }
      }
      else
      {
        (_loc5_.bboffset = __as3_int(1));
        (_loc5_.bbcount = __as3_int(6));
      }
    }
    else
    {
      (_loc5_.bbskin = bb_Cell.bbcells(bb_Gore.bbsprites3));
      (_loc5_.bboffset = __as3_int(1));
      (_loc5_.bbcount = __as3_int(_loc5_.bbskin.bbsheet.bblastframe));
    }
    (_loc5_.bbxpos = Number(param2));
    (_loc5_.bbypos = Number(param3));
    (_loc5_.bbage = __as3_int(0));
    (_loc5_.bbrecycle = __as3_int(0));
    (_loc5_.bblayer = __as3_int(param4));
    bb_Gore.bbgore.bbAddLast(_loc5_);
    return _loc5_;
  }
  static bbRenderAll(param1, param2, param3) {
    param1 = Number(param1);
    param2 = Number(param2);
    param3 = __as3_int(param3);
    var _loc4_ = null;
    var _loc5_ = null;
    (_loc4_ = bb_Gore.bbgore.bbObjectEnumerator());
    while (_loc4_.bbHasNext())
    {
      (_loc5_ = __as3_as(_loc4_.bbNextObject(), bb_Gore));
      if ((_loc5_.bbrecycle == 0))
      {
        if ((_loc5_.bblayer == param3))
        {
          _loc5_.bbskin.bbsheet.bbblit(_loc5_.bbskin.bbframe, (_loc5_.bbxpos + param1), (_loc5_.bbypos + param2), 1);
        }
      }
    }
    return __as3_int(0);
  }
  bbUpdate() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = __as3_int(0);
    (this.bbage = __as3_int((this.bbage + 1)));
    (_loc1_ = __as3_int(__as3_int(this.bbstyle)));
    if ((_loc1_ == 0))
    {
      (_loc2_ = __as3_int(((this.bbage / this.bbrate) | 0)));
      if ((_loc2_ == this.bbcount))
      {
        (this.bbrecycle = __as3_int(1));
        bb_Gore.bbrecyclegore.bbAddLast(this);
        return __as3_int(0);
      }
      (this.bbskin.bbframe = __as3_int((this.bboffset + _loc2_)));
    }
    return __as3_int(0);
  }
  bbGore_new() {
    super.bbBody_new();
    return this;
  }
}

class bb_std_list_List {
  bb_head = new bb_std_list_Node().bbNode_new();
  constructor() {
  }
  bbList_new() {
    return this;
  }
  bbClear() {
    (this.bb_head = new bb_std_list_Node().bbNode_new());
    return __as3_int(0);
  }
  bbAddLast(param1) {
    return new bb_std_list_Node().bbNode_new2(this.bb_head, this.bb_head.bb_pred, param1);
  }
  bbObjectEnumerator() {
    return new bb_std_list_Enumerator().bbEnumerator_new(this);
  }
  bbEquals(param1, param2) {
    return __as3_int(((param1 == param2) ? 1 : 0));
  }
  bbRemove(param1) {
    var _loc2_ = null;
    (_loc2_ = this.bb_head.bb_succ);
    while ((_loc2_ != this.bb_head))
    {
      (_loc2_ = _loc2_.bb_succ);
      if ((this.bbEquals(_loc2_.bb_pred.bb_data, param1) != 0))
      {
        _loc2_.bb_pred.bbRemove();
      }
    }
    return __as3_int(0);
  }
  bbFirst() {
    return this.bb_head.bb_succ.bb_data;
  }
  bbRemoveFirst() {
    var _loc1_ = null;
    (_loc1_ = this.bb_head.bb_succ.bb_data);
    this.bb_head.bb_succ.bbRemove();
    return _loc1_;
  }
  bbAddFirst(param1) {
    return new bb_std_list_Node().bbNode_new2(this.bb_head.bb_succ, this.bb_head, param1);
  }
  bbIsEmpty() {
    return Boolean((this.bb_head.bb_succ == this.bb_head));
  }
  bbLast() {
    return this.bb_head.bb_pred.bb_data;
  }
  bbRemoveLast() {
    var _loc1_ = null;
    (_loc1_ = this.bb_head.bb_pred.bb_data);
    this.bb_head.bb_pred.bbRemove();
    return _loc1_;
  }
}

class bb_std_list_Node {
  bb_succ = null;
  bb_pred = null;
  bb_data = null;
  constructor() {
  }
  bbNode_new() {
    (this.bb_succ = this);
    (this.bb_pred = this);
    return this;
  }
  bbNode_new2(param1, param2, param3) {
    (this.bb_succ = param1);
    (this.bb_pred = param2);
    (this.bb_succ.bb_pred = this);
    (this.bb_pred.bb_succ = this);
    (this.bb_data = param3);
    return this;
  }
  bbRemove() {
    (this.bb_succ.bb_pred = this.bb_pred);
    (this.bb_pred.bb_succ = this.bb_succ);
    return __as3_int(0);
  }
}

class bb_Blood {
  bbcount = __as3_int(0);
  bbxy = new_number_array(2048);
  constructor() {
  }
  bbBlood_new() {
    return this;
  }
  bbReset() {
    (this.bbcount = __as3_int(0));
    return __as3_int(0);
  }
  bbUpdate() {
    var _loc1_ = __as3_int(0);
    (_loc1_ = __as3_int(0));
    while ((_loc1_ < this.bbcount))
    {
      (this.bbxy[((_loc1_ * 4) + 3)] = (this.bbxy[((_loc1_ * 4) + 3)] + 0.02));
      (this.bbxy[((_loc1_ * 4) + 0)] = (this.bbxy[((_loc1_ * 4) + 0)] + this.bbxy[((_loc1_ * 4) + 2)]));
      (this.bbxy[((_loc1_ * 4) + 1)] = (this.bbxy[((_loc1_ * 4) + 1)] + this.bbxy[((_loc1_ * 4) + 3)]));
      if ((this.bbxy[((_loc1_ * 4) + 1)] > 0))
      {
        __as3_updateSlot(this, "bbcount", -1, false, false);
        (this.bbxy[((_loc1_ * 4) + 0)] = this.bbxy[((this.bbcount * 4) + 0)]);
        (this.bbxy[((_loc1_ * 4) + 1)] = this.bbxy[((this.bbcount * 4) + 1)]);
        (this.bbxy[((_loc1_ * 4) + 2)] = this.bbxy[((this.bbcount * 4) + 2)]);
        (this.bbxy[((_loc1_ * 4) + 3)] = this.bbxy[((this.bbcount * 4) + 3)]);
      }
      (_loc1_ = __as3_int((_loc1_ + 1)));
    }
    return __as3_int(0);
  }
  bbDraw(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    var _loc3_ = __as3_int(0);
    bb_mojo_graphics_SetColor(200, 30, 10);
    (_loc3_ = __as3_int(0));
    while ((_loc3_ < this.bbcount))
    {
      bb_mojo_graphics_DrawPoint((param1 + this.bbxy[((_loc3_ * 4) + 0)]), (param2 + this.bbxy[((_loc3_ * 4) + 1)]));
      (_loc3_ = __as3_int((_loc3_ + 1)));
    }
    return __as3_int(0);
  }
  bbAdd(param1, param2, param3, param4) {
    param1 = Number(param1);
    param2 = Number(param2);
    param3 = Number(param3);
    param4 = Number(param4);
    if ((this.bbcount < 512))
    {
      (this.bbxy[((this.bbcount * 4) + 0)] = param1);
      (this.bbxy[((this.bbcount * 4) + 1)] = param2);
      (this.bbxy[((this.bbcount * 4) + 2)] = param3);
      (this.bbxy[((this.bbcount * 4) + 3)] = param4);
      (this.bbcount = __as3_int((this.bbcount + 1)));
    }
    return __as3_int(0);
  }
}

class bb_Fling extends bb_Body {
  bbskin = null;
  bbanimrate = __as3_int(0);
  bbdamage = __as3_int(0);
  bbfling = __as3_int(0);
  bbrecycle = __as3_int(0);
  constructor() {
    super();
  }
  bbFling_new(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param3 = Number(param3);
    param4 = Number(param4);
    super.bbBody_new();
    (this.bblayer = __as3_int(param1));
    (this.bbskin = param2);
    (this.bbxpos = Number(param3));
    (this.bbypos = Number(param4));
    (this.bbanimrate = __as3_int(8));
    (this.bbdamage = __as3_int(500));
    return this;
  }
  bbUpdate() {
    (this.bbfling = __as3_int((this.bbfling + 1)));
    (this.bbxpos = Number((this.bbxpos - 7.5)));
    if ((this.bbfling < (13 * this.bbanimrate)))
    {
      (this.bbskin.bbframe = __as3_int((1 + (((this.bbfling / this.bbanimrate) | 0)))));
    }
    else
    {
      (this.bbrecycle = __as3_int(1));
    }
    return __as3_int(0);
  }
  bbDraw(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    this.bbskin.bbsheet.bbblit(this.bbskin.bbframe, (this.bbxpos + param1), ((this.bbypos + param2) - (this.bblayer * 4)), 1);
    return __as3_int(0);
  }
}

class bb_Cell {
  bbsheet = null;
  bbframe = __as3_int(0);
  constructor() {
  }
  static bbcells(param1) {
    var _loc2_ = null;
    (_loc2_ = null);
    (_loc2_ = new bb_Cell().bbCell_new());
    (_loc2_.bbsheet = param1);
    (_loc2_.bbframe = __as3_int(1));
    return _loc2_;
  }
  bbCell_new() {
    return this;
  }
}

class bb_std_list_Enumerator {
  bb_list = null;
  bb_curr = null;
  constructor() {
  }
  bbEnumerator_new(param1) {
    (this.bb_list = param1);
    (this.bb_curr = param1.bb_head.bb_succ);
    return this;
  }
  bbHasNext() {
    return Boolean((this.bb_curr != this.bb_list.bb_head));
  }
  bbNextObject() {
    var _loc1_ = null;
    (_loc1_ = this.bb_curr.bb_data);
    (this.bb_curr = this.bb_curr.bb_succ);
    return _loc1_;
  }
}

class bb_Bottle extends bb_Body {
  bbvelx = Number(0);
  bbvely = Number(0);
  bbexplode = __as3_int(0);
  bbdamage = __as3_int(0);
  bbimage = null;
  constructor() {
    super();
  }
  bbUpdate() {
    (this.bbxpos = Number((this.bbxpos + this.bbvelx)));
    (this.bbypos = Number((this.bbypos + this.bbvely)));
    (this.bbvely = Number((this.bbvely + 0.1)));
    if ((this.bbypos > 0))
    {
      (this.bbexplode = __as3_int(1));
    }
    return __as3_int(0);
  }
  bbBottle_new(param1, param2, param3, param4, param5, param6, param7) {
    param1 = __as3_int(param1);
    param3 = Number(param3);
    param4 = Number(param4);
    param5 = Number(param5);
    param6 = Number(param6);
    param7 = __as3_int(param7);
    super.bbBody_new();
    (this.bblayer = __as3_int(param1));
    (this.bbimage = param2);
    (this.bbxpos = Number(param3));
    (this.bbypos = Number(param4));
    (this.bbvelx = Number(param5));
    (this.bbvely = Number(param6));
    if ((param7 == 0))
    {
      (this.bbdamage = __as3_int(100));
    }
    else
    {
      (this.bbdamage = __as3_int(500));
    }
    return this;
  }
  bbDraw(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    bb_mojo_graphics_DrawImage(this.bbimage, (this.bbxpos + param1), ((this.bbypos + param2) - (this.bblayer * 4)), 0);
    return __as3_int(0);
  }
}

class bb_Explosion extends bb_Body {
  bbskin = null;
  bbzoom = Number(0);
  bbanimrate = __as3_int(0);
  bbcloud = __as3_int(0);
  bbrecycle = __as3_int(0);
  constructor() {
    super();
  }
  bbExplosion_new(param1, param2, param3, param4, param5) {
    param1 = __as3_int(param1);
    param3 = Number(param3);
    param4 = Number(param4);
    param5 = Number(param5);
    super.bbBody_new();
    (this.bblayer = __as3_int(param1));
    (this.bbskin = param2);
    (this.bbxpos = Number(param3));
    (this.bbypos = Number(param4));
    (this.bbzoom = Number(param5));
    if ((param5 <= 1))
    {
      (this.bbanimrate = __as3_int(5));
    }
    else
    {
      (this.bbanimrate = __as3_int(12));
    }
    return this;
  }
  bbExplosion_new2() {
    super.bbBody_new();
    return this;
  }
  bbUpdate() {
    (this.bbcloud = __as3_int((this.bbcloud + 1)));
    if ((this.bbcloud >= (11 * this.bbanimrate)))
    {
      (this.bbrecycle = __as3_int(1));
    }
    else
    {
      (this.bbskin.bbframe = __as3_int((1 + (((this.bbcloud / this.bbanimrate) | 0)))));
    }
    return __as3_int(0);
  }
  bbDraw(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    this.bbskin.bbsheet.bbblit(this.bbskin.bbframe, (this.bbxpos + param1), ((this.bbypos + param2) - (this.bblayer * 4)), this.bbzoom);
    return __as3_int(0);
  }
}

class bb_Zombie extends bb_Body {
  bbunit = null;
  bbsmackstyle = __as3_int(0);
  bbshake = __as3_int(0);
  bbanimrate = __as3_int(0);
  bbhealth = __as3_int(0);
  bbmode = __as3_int(0);
  bbsmack = __as3_int(0);
  bbskin = null;
  bbwalkspeed = Number(0);
  bbscale = Number(0);
  bbdirection = __as3_int(0);
  bbwalkcycle = __as3_int(0);
  bbwail = __as3_int(0);
  bbscratch = __as3_int(0);
  bbpound = __as3_int(0);
  bbjump = __as3_int(0);
  bblaunch = __as3_int(0);
  bbwalk = __as3_int(0);
  constructor() {
    super();
  }
  bbSmack(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    var _loc3_ = __as3_int(0);
    (_loc3_ = __as3_int(0));
    (this.bbsmackstyle = __as3_int(param2));
    if ((this.bbunit.bbtype == 37))
    {
      if ((this.bbshake < (100 * this.bbanimrate)))
      {
        (this.bbshake = __as3_int((this.bbshake + (11 * this.bbanimrate))));
      }
      bb_Game.bbDamageBase(param1, 1480);
    }
    if ((param1 > this.bbhealth))
    {
      (_loc3_ = __as3_int((param1 - this.bbhealth)));
      (param1 = __as3_int(__as3_int(this.bbhealth)));
    }
    (this.bbhealth = __as3_int((this.bbhealth - param1)));
    if ((this.bbhealth <= 0))
    {
      (this.bbmode = __as3_int(14));
    }
    else
    {
      (this.bbsmack = __as3_int(1));
    }
    return __as3_int(_loc3_);
  }
  bbZombie_new(param1, param2, param3) {
    param1 = __as3_int(param1);
    var _loc4_ = __as3_int(0);
    super.bbBody_new();
    (this.bbxpos = Number(1600));
    (this.bbunit = param2);
    (this.bbhealth = __as3_int(this.bbunit.bbhealth));
    if ((this.bbunit.bbtype != 37))
    {
      (this.bbhealth = __as3_int((this.bbhealth * (bb_Game.bbZombieHealthMultiplier | 0))));
    }
    (this.bblayer = __as3_int(param1));
    if ((param3 != null))
    {
      (this.bbskin = bb_Cell.bbcells(param3));
    }
    (this.bbanimrate = __as3_int(4));
    (this.bbwalkspeed = Number(0.2));
    (this.bbscale = Number(1));
    (this.bbdirection = __as3_int(1));
    (this.bbmode = __as3_int(0));
    (_loc4_ = __as3_int(__as3_int(this.bbunit.bbtype)));
    if ((_loc4_ != 32))
    {
      if ((_loc4_ == 33))
      {
        (this.bbwalkcycle = __as3_int(21));
        (this.bbwalkspeed = Number(0.5));
        (this.bbanimrate = __as3_int(4));
      }
      else
      if ((_loc4_ != 34))
      {
        if ((_loc4_ == 35))
        {
          (this.bbwalkcycle = __as3_int(39));
          (this.bbwalkspeed = Number(0.4));
          bb_Audio.bbPlay(bb_Audio.bbfatspawn);
        }
        else
        if ((_loc4_ != 36))
        {
          if ((_loc4_ == 37))
          {
            (this.bbmode = __as3_int(16));
          }
        }
        else
        {
          (this.bbwalkcycle = __as3_int(42));
          (this.bbwalkspeed = Number(0.0625));
          (this.bbanimrate = __as3_int(10));
          (this.bbscale = Number(2.3));
          bb_Audio.bbPlay(bb_Audio.bbcatspawn);
        }
      }
      else
      {
        (this.bbwalkcycle = __as3_int(13));
        (this.bbwalkspeed = Number(1.5));
        bb_Audio.bbPlay(bb_Audio.bbfastspawn);
      }
    }
    else
    {
      (this.bbwalkcycle = __as3_int(42));
      (this.bbwalkspeed = Number(0.25));
    }
    return this;
  }
  bbZombie_new2() {
    super.bbBody_new();
    return this;
  }
  bbTurn() {
    (this.bbdirection = __as3_int((- 1)));
    (this.bbmode = __as3_int(0));
    return __as3_int(0);
  }
  bbUpdate() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = __as3_int(0);
    (_loc1_ = __as3_int(__as3_int(this.bbmode)));
    if ((_loc1_ != 0))
    {
      if ((_loc1_ != 2))
      {
        if ((_loc1_ == 7))
        {
          (this.bbjump = __as3_int((this.bbjump + 1)));
          if ((this.bbjump < (32 * this.bbanimrate)))
          {
            (_loc2_ = __as3_int((39 + (((this.bbjump / this.bbanimrate) | 0)))));
            if ((_loc2_ > 49))
            {
              (_loc2_ = __as3_int((_loc2_ - 10)));
              if ((_loc2_ < 49))
              {
                (this.bbypos = Number((this.bbypos - (5 * Math.sin(((((((_loc2_ + 10) - 49)) * 360) / 10) * 0.0174532925))))));
                (_loc2_ = __as3_int(49));
                (this.bbxpos = Number((this.bbxpos - ((this.bbwalkspeed * 10) * this.bbdirection))));
              }
            }
            (this.bbskin.bbframe = __as3_int(_loc2_));
          }
          else
          {
            (this.bbmode = __as3_int(0));
            (this.bbxpos = Number((this.bbxpos - ((this.bbwalkspeed * 240) * this.bbdirection))));
            (this.bbwalk = __as3_int(0));
            (this.bbanimrate = __as3_int(4));
            (this.bbskin.bbframe = __as3_int((1 + (((this.bbwalk / this.bbanimrate) | 0)))));
          }
        }
        else
        if ((_loc1_ != 8))
        {
          if ((_loc1_ == 9))
          {
            (this.bbwail = __as3_int((this.bbwail + 1)));
            if ((this.bbwail == (4 * this.bbanimrate)))
            {
              (this.bbhit = __as3_int(1));
            }
            if ((this.bbwail >= (24 * this.bbanimrate)))
            {
              (this.bbmode = __as3_int(0));
            }
            else
            {
              (this.bbskin.bbframe = __as3_int((44 + (((this.bbwail / this.bbanimrate) | 0)))));
            }
          }
          else
          if ((_loc1_ != 12))
          {
            if ((_loc1_ != 10))
            {
              if ((_loc1_ == 11))
              {
                (this.bblaunch = __as3_int((this.bblaunch + 1)));
                if ((this.bblaunch == (39 * this.bbanimrate)))
                {
                  bb_Audio.bbPlay(bb_Audio.bbcatattack);
                  (this.bbhit = __as3_int(1));
                }
                if ((this.bblaunch > (51 * this.bbanimrate)))
                {
                  (this.bbmode = __as3_int(0));
                }
                else
                {
                  (this.bbskin.bbframe = __as3_int((43 + (((this.bblaunch / this.bbanimrate) | 0)))));
                }
              }
              else
              if ((_loc1_ == 14))
              {
              }
            }
            else
            {
              (this.bbpound = __as3_int((this.bbpound + 1)));
              if ((this.bbpound == (14 * this.bbanimrate)))
              {
                (this.bbhit = __as3_int(1));
              }
              if ((this.bbpound >= (29 * this.bbanimrate)))
              {
                (this.bbmode = __as3_int(0));
              }
              else
              {
                (this.bbskin.bbframe = __as3_int((40 + (((this.bbpound / this.bbanimrate) | 0)))));
              }
            }
          }
          else
          {
            (this.bbscratch = __as3_int((this.bbscratch + 1)));
            if ((this.bbscratch == (4 * this.bbanimrate)))
            {
              (this.bbhit = __as3_int(1));
            }
            if ((this.bbscratch < (10 * this.bbanimrate)))
            {
              (this.bbskin.bbframe = __as3_int((14 + (((this.bbscratch / this.bbanimrate) | 0)))));
            }
            else
            {
              (this.bbmode = __as3_int(0));
            }
          }
        }
        else
        {
          (this.bbjump = __as3_int((this.bbjump + 1)));
          if ((this.bbjump >= (16 * this.bbanimrate)))
          {
            (this.bbmode = __as3_int(0));
            (this.bbhit = __as3_int(1));
          }
          else
          {
            (this.bbskin.bbframe = __as3_int((22 + (((this.bbjump / this.bbanimrate) | 0)))));
          }
        }
      }
      else
      {
        (this.bbxpos = Number((this.bbxpos + ((this.bbwalkspeed * this.bbsmack) * this.bbdirection))));
        (this.bbwalk = __as3_int((this.bbwalk - this.bbsmack)));
        if ((this.bbwalk < 0))
        {
          (this.bbwalk = __as3_int((this.bbwalk + (this.bbwalkcycle * this.bbanimrate))));
        }
        (this.bbskin.bbframe = __as3_int((1 + (((this.bbwalk / this.bbanimrate) | 0)))));
        __as3_updateSlot(this, "bbsmack", -1, false, false);
        if ((this.bbsmack <= 0))
        {
          (this.bbmode = __as3_int(0));
        }
      }
    }
    else
    {
      (this.bbxpos = Number((this.bbxpos - (this.bbwalkspeed * this.bbdirection))));
      (this.bbwalk = __as3_int((this.bbwalk + 1)));
      if ((this.bbwalk >= (this.bbwalkcycle * this.bbanimrate)))
      {
        (this.bbwalk = __as3_int((this.bbwalk - (this.bbwalkcycle * this.bbanimrate))));
      }
      (this.bbskin.bbframe = __as3_int((1 + (((this.bbwalk / this.bbanimrate) | 0)))));
    }
    if (((this.bbxpos < 0) && (this.bbmode != 15)))
    {
      (this.bbmode = __as3_int(15));
    }
    if ((this.bbxpos > 1600))
    {
      (this.bbmode = __as3_int(15));
    }
    return __as3_int(0);
  }
  bbDraw(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    if ((this.bbunit.bbtype == 36))
    {
      bb_Game.bbDrawCatapult(this.bbskin.bbframe, (param1 + this.bbxpos), ((param2 + this.bbypos) - (this.bblayer * 4)));
    }
    else
    if ((this.bbskin != null))
    {
      if ((this.bbdirection < 0))
      {
        this.bbskin.bbsheet.bbflipblit(this.bbskin.bbframe, (param1 + this.bbxpos), ((this.bbypos + param2) - (this.bblayer * 4)), this.bbscale);
      }
      else
      {
        this.bbskin.bbsheet.bbblit(this.bbskin.bbframe, (param1 + this.bbxpos), ((this.bbypos + param2) - (this.bblayer * 4)), this.bbscale);
      }
    }
    return __as3_int(0);
  }
}

class bb_BodyPart extends bb_Body {
  bbsheet = null;
  bbframe = __as3_int(0);
  bbvelx = Number(0);
  bbvely = Number(0);
  bbbounce = __as3_int(0);
  bbrecycle = __as3_int(0);
  constructor() {
    super();
  }
  bbBodyPart_new(param1, param2, param3, param4, param5, param6, param7) {
    param1 = __as3_int(param1);
    param3 = __as3_int(param3);
    param4 = Number(param4);
    param5 = Number(param5);
    param6 = Number(param6);
    param7 = Number(param7);
    super.bbBody_new();
    (this.bblayer = __as3_int(param1));
    (this.bbsheet = param2);
    (this.bbframe = __as3_int(param3));
    (this.bbxpos = Number(param4));
    (this.bbypos = Number(param5));
    (this.bbvelx = Number(param6));
    (this.bbvely = Number(param7));
    return this;
  }
  bbBodyPart_new2() {
    super.bbBody_new();
    return this;
  }
  bbUpdate() {
    (this.bbxpos = Number((this.bbxpos + this.bbvelx)));
    (this.bbypos = Number((this.bbypos + this.bbvely)));
    (this.bbvely = Number((this.bbvely + 0.1)));
    if ((this.bbypos > this.bbsheet.bbbottom(this.bbframe)))
    {
      if ((this.bbbounce > 2))
      {
        (this.bbrecycle = __as3_int(1));
      }
      else
      {
        (this.bbypos = Number((this.bbypos - this.bbvely)));
        (this.bbvely = Number(((- this.bbvely) * 0.5)));
        (this.bbvelx = Number((this.bbvelx * 0.5)));
        (this.bbypos = Number((this.bbypos + this.bbvely)));
        (this.bbbounce = __as3_int((this.bbbounce + 1)));
      }
    }
    return __as3_int(0);
  }
  bbDraw(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    this.bbsheet.bbblit(this.bbframe, (this.bbxpos + param1), ((this.bbypos + param2) - (this.bblayer * 4)), 1);
    return __as3_int(0);
  }
}

class bb_ZTPGame {
  bbcash = __as3_int(0);
  bbforce = __as3_int(0);
  bbmaxforce = __as3_int(0);
  bbxp = __as3_int(0);
  bbbuildingcount = new_number_array(6);
  constructor() {
  }
  bbZTPGame_new() {
    return this;
  }
}

class bb_Person extends bb_Body {
  bbunit = null;
  bbskin = null;
  bbhealth = __as3_int(0);
  bbanimrate = __as3_int(0);
  bbmode = __as3_int(0);
  bbwalkcycle = __as3_int(0);
  bbwalkspeed = Number(0);
  bbshake = __as3_int(0);
  bbsmack = __as3_int(0);
  bbisangry = __as3_int(0);
  bbswing = __as3_int(0);
  bbshoot = __as3_int(0);
  bbthrow = __as3_int(0);
  bbspell = __as3_int(0);
  bbwaszombie = __as3_int(0);
  bbwalk = __as3_int(0);
  constructor() {
    super();
  }
  bbPerson_new(param1, param2, param3) {
    param1 = __as3_int(param1);
    var _loc4_ = __as3_int(0);
    super.bbBody_new();
    (this.bbunit = param2);
    (this.bbskin = param3);
    (this.bblayer = __as3_int(param1));
    (this.bbhealth = __as3_int(param2.bbhealth));
    (this.bbanimrate = __as3_int(4));
    (this.bbmode = __as3_int(0));
    (_loc4_ = __as3_int(__as3_int(this.bbunit.bbtype)));
    if ((_loc4_ == 0))
    {
      (this.bbwalkcycle = __as3_int(21));
      (this.bbwalkspeed = Number(0.5));
    }
    else
    if ((_loc4_ != 1))
    {
      if ((_loc4_ == 2))
      {
        (this.bbwalkcycle = __as3_int(1));
        (this.bbwalkspeed = Number(1.2));
      }
      else
      if ((_loc4_ != 3))
      {
        if ((_loc4_ == 4))
        {
          (this.bbwalkcycle = __as3_int(26));
          (this.bbwalkspeed = Number(0.4));
          bb_Audio.bbPlay(bb_Audio.bbpriestspawn);
        }
        else
        if ((_loc4_ == 5))
        {
          (this.bbmode = __as3_int(16));
        }
      }
      else
      {
        (this.bbwalkcycle = __as3_int(28));
        (this.bbwalkspeed = Number(0.25));
      }
    }
    else
    {
      (this.bbwalkcycle = __as3_int(30));
      (this.bbwalkspeed = Number(0.328125));
    }
    return this;
  }
  bbInfect(param1) {
    param1 = __as3_int(param1);
    var _loc2_ = __as3_int(0);
    (_loc2_ = __as3_int(0));
    if ((this.bbunit.bbtype == 5))
    {
      if ((this.bbshake < (100 * this.bbanimrate)))
      {
        (this.bbshake = __as3_int((this.bbshake + (11 * this.bbanimrate))));
      }
      bb_Game.bbDamageBase(param1, 20);
    }
    if ((param1 > this.bbhealth))
    {
      (_loc2_ = __as3_int((param1 - this.bbhealth)));
      (param1 = __as3_int(__as3_int(this.bbhealth)));
    }
    (this.bbhealth = __as3_int((this.bbhealth - param1)));
    if ((this.bbhealth <= 0))
    {
      (this.bbmode = __as3_int(14));
    }
    else
    if ((this.bbunit.bbtype == 3))
    {
      (this.bbmode = __as3_int(2));
      (this.bbsmack = __as3_int(3));
    }
    return __as3_int(_loc2_);
  }
  bbAnger() {
    (this.bbisangry = __as3_int(1));
    (this.bbwalkspeed = Number((this.bbwalkspeed * 1.5)));
    (this.bbanimrate = __as3_int((this.bbanimrate / 1)));
    return __as3_int(0);
  }
  bbUpdate() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = __as3_int(0);
    var _loc3_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    (_loc1_ = __as3_int(__as3_int(this.bbmode)));
    if ((_loc1_ != 0))
    {
      if ((_loc1_ == 2))
      {
        (this.bbxpos = Number((this.bbxpos - (this.bbwalkspeed * this.bbsmack))));
        (this.bbwalk = __as3_int((this.bbwalk - this.bbsmack)));
        if ((this.bbwalk < 0))
        {
          (this.bbwalk = __as3_int((this.bbwalk + (this.bbwalkcycle * this.bbanimrate))));
        }
        (this.bbskin.bbframe = __as3_int((1 + (((this.bbwalk / this.bbanimrate) | 0)))));
        __as3_updateSlot(this, "bbsmack", -1, false, false);
        if ((this.bbsmack <= 0))
        {
          (this.bbmode = __as3_int(0));
        }
      }
      else
      if ((_loc1_ == 1))
      {
        (this.bbswing = __as3_int((this.bbswing + 1)));
        if ((((this.bbswing - 1) < (6 * this.bbanimrate)) && (this.bbswing >= (6 * this.bbanimrate))))
        {
          (this.bbhit = __as3_int(1));
        }
        if ((this.bbswing >= (13 * this.bbanimrate)))
        {
          (this.bbmode = __as3_int(0));
        }
        else
        {
          (this.bbskin.bbframe = __as3_int((22 + (((this.bbswing / this.bbanimrate) | 0)))));
        }
      }
      else
      if ((_loc1_ != 3))
      {
        if ((_loc1_ == 4))
        {
          (this.bbthrow = __as3_int((this.bbthrow + 1)));
          if ((((this.bbthrow - 1) < (11 * this.bbanimrate)) && (this.bbthrow >= (11 * this.bbanimrate))))
          {
            (this.bbhit = __as3_int(1));
          }
          if ((this.bbthrow < (50 * this.bbanimrate)))
          {
            (_loc3_ = __as3_int(((this.bbthrow / this.bbanimrate) | 0)));
            if ((_loc3_ > 29))
            {
              (_loc3_ = __as3_int(29));
            }
            (this.bbskin.bbframe = __as3_int((30 + _loc3_)));
          }
          else
          {
            (this.bbmode = __as3_int(0));
          }
        }
        else
        if ((_loc1_ == 5))
        {
          (this.bbshoot = __as3_int((this.bbshoot + 1)));
          if ((((this.bbshoot & 7)) == 0))
          {
            (this.bbhit = __as3_int(1));
          }
          if ((this.bbshoot > (14 * this.bbanimrate)))
          {
            (this.bbmode = __as3_int(0));
          }
          else
          {
            (this.bbskin.bbframe = __as3_int((2 + (((this.bbshoot / this.bbanimrate) | 0)))));
          }
        }
        else
        if ((_loc1_ != 6))
        {
          if ((_loc1_ == 16))
          {
            if ((this.bbshake != 0))
            {
              __as3_updateSlot(this, "bbshake", -1, false, false);
              (this.bbskin.bbframe = __as3_int((1 + ((((this.bbshake / this.bbanimrate) | 0)) % 11))));
            }
            else
            {
              (this.bbskin.bbframe = __as3_int(1));
            }
          }
        }
        else
        {
          (this.bbspell = __as3_int((this.bbspell + 1)));
          if ((this.bbspell == this.bbanimrate))
          {
            bb_Audio.bbPlay(bb_Audio.bbpriestconvert);
          }
          if ((this.bbspell == (50 * this.bbanimrate)))
          {
            (this.bbhit = __as3_int(1));
          }
          if ((this.bbspell >= (84 * this.bbanimrate)))
          {
            (this.bbmode = __as3_int(0));
            (this.bbxpos = Number((this.bbxpos + (this.bbwalkspeed * 60))));
          }
          else
          {
            (_loc4_ = __as3_int(((this.bbspell / this.bbanimrate) | 0)));
            if ((_loc4_ > 52))
            {
              (_loc4_ = __as3_int(52));
            }
            (this.bbskin.bbframe = __as3_int((26 + _loc4_)));
          }
        }
      }
      else
      {
        (this.bbshoot = __as3_int((this.bbshoot + 1)));
        if ((((this.bbshoot - 1) < (4 * this.bbanimrate)) && (this.bbshoot >= (4 * this.bbanimrate))))
        {
          (this.bbhit = __as3_int(1));
        }
        if ((this.bbshoot > (35 * this.bbanimrate)))
        {
          (this.bbmode = __as3_int(0));
        }
        else
        {
          (_loc2_ = __as3_int(((this.bbshoot / this.bbanimrate) | 0)));
          if ((_loc2_ > 15))
          {
            (_loc2_ = __as3_int(15));
          }
          (this.bbskin.bbframe = __as3_int((32 + _loc2_)));
        }
      }
    }
    else
    if ((this.bbwalkspeed != 0))
    {
      (this.bbxpos = Number((this.bbxpos + this.bbwalkspeed)));
      (this.bbwalk = __as3_int((this.bbwalk + 1)));
      if ((this.bbwalk >= (this.bbwalkcycle * this.bbanimrate)))
      {
        (this.bbwalk = __as3_int((this.bbwalk - (this.bbwalkcycle * this.bbanimrate))));
      }
      (this.bbskin.bbframe = __as3_int((1 + (((this.bbwalk / this.bbanimrate) | 0)))));
    }
    else
    {
      (this.bbskin.bbframe = __as3_int(1));
    }
    if (((this.bbxpos > 1600) && (this.bbmode != 14)))
    {
      (this.bbmode = __as3_int(14));
    }
    return __as3_int(0);
  }
  bbDraw(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    if ((this.bbskin != null))
    {
      this.bbskin.bbsheet.bbblit(this.bbskin.bbframe, (this.bbxpos + param1), ((this.bbypos + param2) - (this.bblayer * 4)), 1);
    }
    return __as3_int(0);
  }
}

class bb_PowerUp extends bb_Body {
  bbtype = __as3_int(0);
  bbskin = null;
  bbblood = null;
  bbanimrate = __as3_int(0);
  bbwalkspeed = Number(0);
  bbmode = __as3_int(0);
  bbyvel = Number(0);
  bbwalkcycle = __as3_int(0);
  bbwalk = __as3_int(0);
  bbharvest = __as3_int(0);
  bbpeak = __as3_int(0);
  constructor() {
    super();
  }
  bbPowerUp_new(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    var _loc5_ = __as3_int(0);
    super.bbBody_new();
    (this.bblayer = __as3_int(param1));
    (this.bbtype = __as3_int(param2));
    (this.bbskin = bb_Cell.bbcells(param3));
    (this.bbblood = bb_Cell.bbcells(param4));
    (this.bbanimrate = __as3_int(5));
    (this.bbwalkspeed = Number(2.5));
    (this.bbmode = __as3_int(0));
    (this.bbxpos = Number((- 100)));
    (this.bbyvel = Number(0));
    (_loc5_ = __as3_int(__as3_int(this.bbtype)));
    if ((_loc5_ != 1))
    {
      if ((_loc5_ == 2))
      {
        (this.bbypos = Number((- 520)));
        (this.bbwalkspeed = Number(6));
        (this.bbwalkcycle = __as3_int(36));
      }
    }
    else
    {
      (this.bbypos = Number(0));
      (this.bbwalkspeed = Number(0.6));
      (this.bbwalkcycle = __as3_int(4));
    }
    return this;
  }
  bbPowerUp_new2() {
    super.bbBody_new();
    return this;
  }
  bbUpdate() {
    var _loc1_ = __as3_int(0);
    var _loc2_ = Number(NaN);
    var _loc3_ = Number(NaN);
    (this.bbxpos = Number((this.bbxpos + this.bbwalkspeed)));
    (_loc1_ = __as3_int(__as3_int(this.bbtype)));
    if ((_loc1_ != 1))
    {
      if ((_loc1_ == 2))
      {
        (this.bbwalk = __as3_int((this.bbwalk + 1)));
        if ((this.bbwalk >= (this.bbwalkcycle * this.bbanimrate)))
        {
          (this.bbwalk = __as3_int((this.bbwalk - (this.bbwalkcycle * this.bbanimrate))));
        }
        if ((bb_std_random_Rnd() > 0.65))
        {
          (_loc2_ = Number((this.bbxpos - 32)));
          (_loc3_ = Number((this.bbypos - 40)));
          bb_Game.bbAddSmoke(1, _loc2_, _loc3_);
        }
        if ((bb_std_random_Rnd() > 0.85))
        {
          bb_Game.bbAddBottle(0, this.bbxpos, this.bbypos, 0, 0, 1);
        }
      }
    }
    else
    {
      (this.bbwalk = __as3_int((this.bbwalk + 1)));
      if ((this.bbwalk >= (this.bbwalkcycle * this.bbanimrate)))
      {
        (this.bbwalk = __as3_int((this.bbwalk - (this.bbwalkcycle * this.bbanimrate))));
      }
      (this.bbskin.bbframe = __as3_int((1 + (((this.bbwalk / this.bbanimrate) | 0)))));
      if ((this.bbharvest > 0))
      {
        __as3_updateSlot(this, "bbharvest", -1, false, false);
      }
      else
      {
        (this.bbpeak = __as3_int(0));
      }
    }
    if ((this.bbxpos > 1700))
    {
      (this.bbmode = __as3_int(15));
    }
    return __as3_int(0);
  }
  bbHarvest(param1) {
    bb_Audio.bbPlay(bb_Audio.bbharvestkill);
    (this.bbharvest = __as3_int((this.bbharvest + 100)));
    if ((this.bbharvest > this.bbpeak))
    {
      (this.bbpeak = __as3_int(this.bbharvest));
    }
    return __as3_int(0);
  }
  bbDraw(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    var _loc3_ = __as3_int(0);
    var _loc4_ = __as3_int(0);
    var _loc5_ = Number(NaN);
    var _loc6_ = Number(NaN);
    var _loc7_ = Number(NaN);
    var _loc8_ = __as3_int(0);
    var _loc9_ = __as3_int(0);
    var _loc10_ = __as3_int(0);
    var _loc11_ = Number(NaN);
    var _loc12_ = Number(NaN);
    var _loc13_ = Number(NaN);
    var _loc14_ = Number(NaN);
    var _loc15_ = __as3_int(0);
    var _loc16_ = Number(NaN);
    var _loc17_ = Number(NaN);
    (_loc3_ = __as3_int(__as3_int(this.bbtype)));
    if ((_loc3_ == 1))
    {
      (_loc4_ = __as3_int(__as3_int(this.bbskin.bbframe)));
      (_loc5_ = Number((param1 + this.bbxpos)));
      (_loc6_ = Number(((param2 + this.bbypos) - (this.bblayer * 4))));
      (_loc7_ = Number(((- bb_mojo_app_Millisecs()) * 0.12)));
      if ((this.bbharvest > 0))
      {
        (_loc8_ = __as3_int(0));
        if ((this.bbharvest < 40))
        {
          (_loc8_ = __as3_int((40 - this.bbharvest)));
        }
        if ((this.bbharvest > (this.bbpeak - 40)))
        {
          (_loc8_ = __as3_int(((this.bbharvest + 40) - this.bbpeak)));
        }
        (_loc9_ = __as3_int((1 + bb_Rand(6))));
        this.bbblood.bbsheet.bbblit(_loc9_, ((_loc5_ - 184) + _loc8_), ((_loc6_ - 40) - _loc8_), 1);
        (_loc10_ = __as3_int(0));
        while ((_loc10_ <= 50))
        {
          (_loc11_ = Number(((this.bbxpos - 130) - ((_loc10_ & 7)))));
          (_loc12_ = Number((((this.bbypos - (this.bblayer * 4)) - 100) - (((((_loc10_ / 8) | 0)) & 7)))));
          (_loc13_ = Number((0.1 + bb_std_random_Rnd2(0.4))));
          (_loc14_ = Number((0.1 + bb_std_random_Rnd2(0.4))));
          bb_Game.bbAddBlood(_loc11_, _loc12_, (- _loc13_), (- _loc14_));
          (_loc10_ = __as3_int((_loc10_ + 1)));
        }
      }
      this.bbskin.bbsheet.bbblit(_loc4_, _loc5_, _loc6_, 1);
      this.bbskin.bbsheet.bbblit2(5, _loc5_, _loc6_, 40, ((_loc7_ * 3) / 4));
      this.bbskin.bbsheet.bbblit2(6, _loc5_, _loc6_, 30, _loc7_);
    }
    else
    if ((_loc3_ == 2))
    {
      (_loc15_ = __as3_int(__as3_int(this.bbskin.bbframe)));
      (_loc16_ = Number((param1 + this.bbxpos)));
      (_loc17_ = Number((param2 + this.bbypos)));
      this.bbskin.bbsheet.bbblit(1, _loc16_, _loc17_, 1);
      this.bbskin.bbsheet.bbblit((2 + (((this.bbwalk / ((this.bbanimrate * 12))) | 0))), _loc16_, _loc17_, 1);
    }
    return __as3_int(0);
  }
}

class bb_Smoke extends bb_Body {
  bbframe = __as3_int(0);
  bbanimrate = __as3_int(0);
  bbrecycle = __as3_int(0);
  bbskin = null;
  constructor() {
    super();
  }
  bbUpdate() {
    (this.bbframe = __as3_int((this.bbframe + 1)));
    if ((this.bbframe < (13 * this.bbanimrate)))
    {
      (this.bbskin.bbframe = __as3_int((5 + (((this.bbframe / this.bbanimrate) | 0)))));
    }
    else
    {
      (this.bbrecycle = __as3_int(1));
    }
    return __as3_int(0);
  }
  bbSmoke_new(param1, param2, param3, param4) {
    param1 = __as3_int(param1);
    param3 = Number(param3);
    param4 = Number(param4);
    super.bbBody_new();
    (this.bblayer = __as3_int(param1));
    (this.bbskin = param2);
    (this.bbxpos = Number(param3));
    (this.bbypos = Number(param4));
    (this.bbanimrate = __as3_int(10));
    (this.bbskin.bbframe = __as3_int(5));
    return this;
  }
  bbDraw(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    this.bbskin.bbsheet.bbblit(this.bbskin.bbframe, (this.bbxpos + param1), ((this.bbypos + param2) - (this.bblayer * 4)), 1);
    return __as3_int(0);
  }
}

class bb_Death extends bb_Body {
  bbthrow = __as3_int(0);
  bbsheet = null;
  bbanimrate = __as3_int(0);
  bbrecycle = __as3_int(0);
  bbframe = __as3_int(0);
  constructor() {
    super();
  }
  bbUpdate() {
    (this.bbthrow = __as3_int((this.bbthrow + 1)));
    if ((this.bbthrow < (this.bbsheet.bblastframe * this.bbanimrate)))
    {
      (this.bbframe = __as3_int((1 + (((this.bbthrow / this.bbanimrate) | 0)))));
    }
    else
    if ((this.bbthrow >= (((this.bbsheet.bblastframe + 10)) * this.bbanimrate)))
    {
      (this.bbrecycle = __as3_int(1));
    }
    return __as3_int(0);
  }
  bbDeath_new(param1, param2, param3, param4) {
    param2 = __as3_int(param2);
    param3 = Number(param3);
    param4 = Number(param4);
    super.bbBody_new();
    (this.bbsheet = param1);
    (this.bblayer = __as3_int(param2));
    (this.bbxpos = Number(param3));
    (this.bbypos = Number(param4));
    (this.bbanimrate = __as3_int(10));
    (this.bbframe = __as3_int(1));
    return this;
  }
  bbDraw(param1, param2) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    this.bbsheet.bbblit(this.bbframe, (this.bbxpos + param1), ((this.bbypos + param2) - (this.bblayer * 4)), 1);
    return __as3_int(0);
  }
}

class bb_ZombieMob {
  static bbqueue = null;
  static bbticks = __as3_int(0);
  bbtype = __as3_int(0);
  bbcount = __as3_int(0);
  bbdelay = Number(0);
  bbtime = Number(0);
  constructor() {
  }
  static bbInit(param1) {
    var _loc2_ = __as3_int(0);
    (_loc2_ = __as3_int(0));
    bb_ZombieMob.bbqueue.bbClear();
    while ((_loc2_ < param1.length))
    {
      bb_ZombieMob.bbqueue.bbAddLast(new bb_ZombieMob().bbZombieMob_new((param1[(_loc2_ + 0)] | 0), (param1[(_loc2_ + 1)] | 0), (param1[(_loc2_ + 2)] | 0)));
      (_loc2_ = __as3_int((_loc2_ + 3)));
    }
    return __as3_int(0);
  }
  static bbUpdate() {
    var _loc1_ = null;
    (_loc1_ = null);
    (_loc1_ = __as3_as(bb_ZombieMob.bbqueue.bbFirst(), bb_ZombieMob));
    if ((_loc1_ != null))
    {
      (bb_ZombieMob.bbticks = __as3_int((bb_ZombieMob.bbticks + 1)));
      if ((bb_ZombieMob.bbticks > 60))
      {
        (bb_ZombieMob.bbticks = __as3_int((bb_ZombieMob.bbticks - 60)));
        (_loc1_.bbtime = Number((_loc1_.bbtime + 0.5)));
        if ((_loc1_.bbtime > _loc1_.bbdelay))
        {
          if ((_loc1_.bbtype != 0))
          {
            bb_Game.bbAddZombie(bb_Game.bbzunits[(_loc1_.bbtype - 1)]);
          }
          __as3_updateSlot(_loc1_, "bbcount", -1, false, false);
          if ((_loc1_.bbcount > 0))
          {
            (_loc1_.bbtime = Number((_loc1_.bbtime - _loc1_.bbdelay)));
          }
          else
          {
            bb_ZombieMob.bbqueue.bbRemoveFirst();
          }
        }
      }
      return __as3_int(0);
    }
    return __as3_int(0);
  }
  static bbSpawn(param1, param2, param3) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    param3 = Number(param3);
    bb_ZombieMob.bbqueue.bbAddFirst(new bb_ZombieMob().bbZombieMob_new(param1, param2, (param3 | 0)));
    return __as3_int(0);
  }
  bbZombieMob_new(param1, param2, param3) {
    param1 = __as3_int(param1);
    param2 = __as3_int(param2);
    param3 = __as3_int(param3);
    (this.bbtype = __as3_int(param1));
    (this.bbcount = __as3_int(param2));
    (this.bbdelay = Number(param3));
    return this;
  }
  bbZombieMob_new2() {
    return this;
  }
}

function new_bool_array(param1) {
  param1 = __as3_int(param1);
  var _loc2_ = new Array(param1);
  var _loc3_ = __as3_int(0);
  while ((_loc3_ < param1))
  {
    (_loc2_[_loc3_] = false);
    false;
    ((__as3_previous) => (_loc3_ = __as3_int(__as3_previous + 1), __as3_previous))(_loc3_);
  }
  return _loc2_;
}

function new_number_array(param1) {
  param1 = __as3_int(param1);
  var _loc2_ = new Array(param1);
  var _loc3_ = __as3_int(0);
  while ((_loc3_ < param1))
  {
    (_loc2_[_loc3_] = 0);
    0;
    ((__as3_previous) => (_loc3_ = __as3_int(__as3_previous + 1), __as3_previous))(_loc3_);
  }
  return _loc2_;
}

function new_string_array(param1) {
  param1 = __as3_int(param1);
  var _loc2_ = new Array(param1);
  var _loc3_ = __as3_int(0);
  while ((_loc3_ < param1))
  {
    (_loc2_[_loc3_] = "");
    "";
    ((__as3_previous) => (_loc3_ = __as3_int(__as3_previous + 1), __as3_previous))(_loc3_);
  }
  return _loc2_;
}

function new_object_array(param1) {
  param1 = __as3_int(param1);
  var _loc2_ = new Array(param1);
  var _loc3_ = __as3_int(0);
  while ((_loc3_ < param1))
  {
    (_loc2_[_loc3_] = null);
    null;
    ((__as3_previous) => (_loc3_ = __as3_int(__as3_previous + 1), __as3_previous))(_loc3_);
  }
  return _loc2_;
}

function resize_number_array(param1, param2) {
  param2 = __as3_int(param2);
  var _loc3_ = new Array(param2);
  var _loc4_ = __as3_int(Math.min(param1.length, param2));
  var _loc5_ = __as3_int(0);
  while ((_loc5_ < _loc4_))
  {
    (_loc3_[_loc5_] = param1[_loc5_]);
    ((__as3_previous) => (_loc5_ = __as3_int(__as3_previous + 1), __as3_previous))(_loc5_);
  }
  var _loc6_ = __as3_int(_loc4_);
  while ((_loc6_ < param2))
  {
    (_loc3_[_loc6_] = 0);
    ((__as3_previous) => (_loc6_ = __as3_int(__as3_previous + 1), __as3_previous))(_loc6_);
  }
  return _loc3_;
}

function resize_string_array(param1, param2) {
  param2 = __as3_int(param2);
  var _loc3_ = new Array(param2);
  var _loc4_ = __as3_int(Math.min(param1.length, param2));
  var _loc5_ = __as3_int(0);
  while ((_loc5_ < _loc4_))
  {
    (_loc3_[_loc5_] = param1[_loc5_]);
    ((__as3_previous) => (_loc5_ = __as3_int(__as3_previous + 1), __as3_previous))(_loc5_);
  }
  var _loc6_ = __as3_int(_loc4_);
  while ((_loc6_ < param2))
  {
    (_loc3_[_loc6_] = "");
    ((__as3_previous) => (_loc6_ = __as3_int(__as3_previous + 1), __as3_previous))(_loc6_);
  }
  return _loc3_;
}

function resize_object_array(param1, param2) {
  param2 = __as3_int(param2);
  var _loc3_ = new Array(param2);
  var _loc4_ = __as3_int(Math.min(param1.length, param2));
  var _loc5_ = __as3_int(0);
  while ((_loc5_ < _loc4_))
  {
    (_loc3_[_loc5_] = param1[_loc5_]);
    ((__as3_previous) => (_loc5_ = __as3_int(__as3_previous + 1), __as3_previous))(_loc5_);
  }
  var _loc6_ = __as3_int(_loc4_);
  while ((_loc6_ < param2))
  {
    (_loc3_[_loc6_] = null);
    ((__as3_previous) => (_loc6_ = __as3_int(__as3_previous + 1), __as3_previous))(_loc6_);
  }
  return _loc3_;
}

function string_join(param1, param2) {
  param1 = __as3_nullableString(param1);
  if ((param2.length == 0))
  {
    return __as3_nullableString("");
  }
  var _loc3_ = __as3_nullableString(param2[0]);
  var _loc4_ = __as3_int(1);
  while ((_loc4_ < param2.length))
  {
    ((__as3_stringValue0) => (_loc3_ = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))((_loc3_ + ((param1 + param2[_loc4_]))));
    ((__as3_previous) => (_loc4_ = __as3_int(__as3_previous + 1), __as3_previous))(_loc4_);
  }
  return __as3_nullableString(_loc3_);
}

function string_trim(param1) {
  param1 = __as3_nullableString(param1);
  var _loc2_ = __as3_int(0);
  var _loc3_ = __as3_int(param1.length);
  while (((_loc2_ < _loc3_) && (param1.charCodeAt(_loc2_) <= 32)))
  {
    (_loc2_ = __as3_int((_loc2_ + 1)));
  }
  while (((_loc3_ > _loc2_) && (param1.charCodeAt((_loc3_ - 1)) <= 32)))
  {
    (_loc3_ = __as3_int((_loc3_ - 1)));
  }
  return __as3_nullableString(param1.slice(_loc2_, _loc3_));
}

function string_starts_with(param1, param2) {
  param1 = __as3_nullableString(param1);
  param2 = __as3_nullableString(param2);
  return Boolean(((param2.length <= param1.length) && (param1.slice(0, param2.length) == param2)));
}

function string_ends_with(param1, param2) {
  param1 = __as3_nullableString(param1);
  param2 = __as3_nullableString(param2);
  return Boolean(((param2.length <= param1.length) && (param1.slice((param1.length - param2.length), param1.length) == param2)));
}

function bb_Print(param1) {
  param1 = __as3_nullableString(param1);
}

function bb_mojo_graphics_SetGraphicsContext(param1) {
  (bb_mojo_graphics_context = param1);
  return __as3_int(0);
}

function bb_mojo_input_SetInputDevice(param1) {
  (bb_mojo_input_device = param1);
  return __as3_int(0);
}

function bb_mojo_audio_SetAudioDevice(param1) {
  (bb_mojo_audio_device = param1);
  return __as3_int(0);
}

function bb_Main() {
  (bb_Game = new bb_Zomba().bbZomba_new());
  return __as3_int(0);
}

function bb_mojo_graphics_LoadImage(param1, param2, param3) {
  param1 = __as3_nullableString(param1);
  param2 = __as3_int(param2);
  param3 = __as3_int(param3);
  return new bb_mojo_graphics_Image().bbImage_new(param1, param2, param3);
}

function bb_mojo_graphics_LoadImage2(param1, param2, param3, param4, param5) {
  param1 = __as3_nullableString(param1);
  param2 = __as3_int(param2);
  param3 = __as3_int(param3);
  param4 = __as3_int(param4);
  param5 = __as3_int(param5);
  var _loc6_ = new bb_mojo_graphics_Image().bbImage_new(param1, 1, 0);
  if ((_loc6_ != null))
  {
    return _loc6_.bbGrabImage(0, 0, param2, param3, param4, param5);
  }
  return null;
}

function bb_mojo_audio_LoadSound(param1) {
  param1 = __as3_nullableString(param1);
  var _loc2_ = bb_mojo_audio_device.LoadSample(param1);
  if ((_loc2_ != null))
  {
    return new bb_mojo_audio_Sound().bbSound_new(_loc2_);
  }
  return null;
}

function bb_mojo_audio_PlaySound(param1, param2) {
  param2 = __as3_int(param2);
  return bb_mojo_audio_device.PlaySample(param1.bbsample, param2);
}

function bb_mojo_app_SetUpdateRate(param1) {
  param1 = __as3_int(param1);
  return __as3_int(bb_mojo_app_device.SetUpdateRate(param1));
}

function bb_mojo_input_KeyHit(param1) {
  param1 = __as3_int(param1);
  return __as3_int(bb_mojo_input_device.KeyHit(param1));
}

function bb_mojo_app_Millisecs() {
  return __as3_int(bb_mojo_app_device.MilliSecs());
}

function bb_std_random_Rnd() {
  (bb_std_random_Seed = __as3_int((((bb_std_random_Seed * 1664525) + 1013904223) | 0)));
  return Number(((((((bb_std_random_Seed / 4) | 0)) & 0x3FFFFFFF)) / 1073741824));
}

function bb_std_math_Abs(param1) {
  param1 = __as3_int(param1);
  if ((param1 >= 0))
  {
    return __as3_int(param1);
  }
  return __as3_int((- param1));
}

function bb_std_math_Abs2(param1) {
  param1 = Number(param1);
  if ((param1 >= 0))
  {
    return Number(param1);
  }
  return Number((- param1));
}

function bb_std_random_Rnd2(param1) {
  param1 = Number(param1);
  return Number((bb_std_random_Rnd() * param1));
}

function bb_std_random_Rnd3(param1, param2) {
  param1 = Number(param1);
  param2 = Number(param2);
  return Number((bb_std_random_Rnd2((param2 - param1)) + param1));
}

function bb_Rand(param1) {
  param1 = __as3_int(param1);
  var _loc2_ = __as3_int(0);
  (_loc2_ = __as3_int(((bb_std_random_Rnd() * param1) | 0)));
  if ((_loc2_ == param1))
  {
    (_loc2_ = __as3_int(0));
  }
  return __as3_int(_loc2_);
}

function bb_reversebits(param1, param2) {
  param1 = __as3_int(param1);
  param2 = __as3_int(param2);
  var _loc3_ = __as3_int(0);
  while ((param2 != 0))
  {
    (_loc3_ = __as3_int(((_loc3_ * 2) | (param1 & 1))));
    (param1 = __as3_int((param1 / 2)));
    (param2 = __as3_int((param2 - 1)));
  }
  return __as3_int(_loc3_);
}

function bb_mojo_graphics_DeviceWidth() {
  return __as3_int(bb_mojo_graphics_context.bbdevice.Width());
}

function bb_mojo_graphics_DeviceHeight() {
  return __as3_int(bb_mojo_graphics_context.bbdevice.Height());
}

function bb_mojo_graphics_SetMatrix(param1, param2, param3, param4, param5, param6) {
  param1 = Number(param1);
  param2 = Number(param2);
  param3 = Number(param3);
  param4 = Number(param4);
  param5 = Number(param5);
  param6 = Number(param6);
  (bb_mojo_graphics_context.bbix = Number(param1));
  (bb_mojo_graphics_context.bbiy = Number(param2));
  (bb_mojo_graphics_context.bbjx = Number(param3));
  (bb_mojo_graphics_context.bbjy = Number(param4));
  (bb_mojo_graphics_context.bbtx = Number(param5));
  (bb_mojo_graphics_context.bbty = Number(param6));
  (bb_mojo_graphics_context.bbtformed = __as3_int(((! (((((((param1 != 1) || (param2 != 0)) || (param3 != 0)) || (param4 != 1)) || (param5 != 0)) || (param6 != 0)))) ? 0 : 1)));
  (bb_mojo_graphics_context.bbmatDirty = __as3_int(1));
  return __as3_int(0);
}

function bb_mojo_graphics_Transform(param1, param2, param3, param4, param5, param6) {
  param1 = Number(param1);
  param2 = Number(param2);
  param3 = Number(param3);
  param4 = Number(param4);
  param5 = Number(param5);
  param6 = Number(param6);
  var _loc7_ = Number(((param1 * bb_mojo_graphics_context.bbix) + (param2 * bb_mojo_graphics_context.bbjx)));
  var _loc8_ = Number(((param1 * bb_mojo_graphics_context.bbiy) + (param2 * bb_mojo_graphics_context.bbjy)));
  var _loc9_ = Number(((param3 * bb_mojo_graphics_context.bbix) + (param4 * bb_mojo_graphics_context.bbjx)));
  var _loc10_ = Number(((param3 * bb_mojo_graphics_context.bbiy) + (param4 * bb_mojo_graphics_context.bbjy)));
  var _loc11_ = Number((((param5 * bb_mojo_graphics_context.bbix) + (param6 * bb_mojo_graphics_context.bbjx)) + bb_mojo_graphics_context.bbtx));
  var _loc12_ = Number((((param5 * bb_mojo_graphics_context.bbiy) + (param6 * bb_mojo_graphics_context.bbjy)) + bb_mojo_graphics_context.bbty));
  bb_mojo_graphics_SetMatrix(_loc7_, _loc8_, _loc9_, _loc10_, _loc11_, _loc12_);
  return __as3_int(0);
}

function bb_mojo_graphics_Scale(param1, param2) {
  param1 = Number(param1);
  param2 = Number(param2);
  bb_mojo_graphics_Transform(param1, 0, 0, param2, 0, 0);
  return __as3_int(0);
}

function bb_mojo_graphics_SetColor(param1, param2, param3) {
  param1 = Number(param1);
  param2 = Number(param2);
  param3 = Number(param3);
  (bb_mojo_graphics_context.bbr = Number(param1));
  (bb_mojo_graphics_context.bbg = Number(param2));
  (bb_mojo_graphics_context.bbb = Number(param3));
  bb_mojo_graphics_context.bbdevice.SetColor(param1, param2, param3);
  return __as3_int(0);
}

function bb_mojo_graphics_ValidateMatrix() {
  if ((bb_mojo_graphics_context.bbmatDirty != 0))
  {
    bb_mojo_graphics_context.bbdevice.SetMatrix(bb_mojo_graphics_context.bbix, bb_mojo_graphics_context.bbiy, bb_mojo_graphics_context.bbjx, bb_mojo_graphics_context.bbjy, bb_mojo_graphics_context.bbtx, bb_mojo_graphics_context.bbty);
    (bb_mojo_graphics_context.bbmatDirty = __as3_int(0));
    0;
  }
  return __as3_int(0);
}

function bb_mojo_graphics_DrawRect(param1, param2, param3, param4) {
  param1 = Number(param1);
  param2 = Number(param2);
  param3 = Number(param3);
  param4 = Number(param4);
  bb_mojo_graphics_ValidateMatrix();
  bb_mojo_graphics_context.bbdevice.DrawRect(param1, param2, param3, param4);
  return __as3_int(0);
}

function bb_mojo_graphics_PushMatrix() {
  var _loc1_ = __as3_int(__as3_int(bb_mojo_graphics_context.bbmatrixSp));
  (bb_mojo_graphics_context.bbmatrixStack[(_loc1_ + 0)] = bb_mojo_graphics_context.bbix);
  (bb_mojo_graphics_context.bbmatrixStack[(_loc1_ + 1)] = bb_mojo_graphics_context.bbiy);
  (bb_mojo_graphics_context.bbmatrixStack[(_loc1_ + 2)] = bb_mojo_graphics_context.bbjx);
  (bb_mojo_graphics_context.bbmatrixStack[(_loc1_ + 3)] = bb_mojo_graphics_context.bbjy);
  (bb_mojo_graphics_context.bbmatrixStack[(_loc1_ + 4)] = bb_mojo_graphics_context.bbtx);
  (bb_mojo_graphics_context.bbmatrixStack[(_loc1_ + 5)] = bb_mojo_graphics_context.bbty);
  (bb_mojo_graphics_context.bbmatrixSp = __as3_int((_loc1_ + 6)));
  return __as3_int(0);
}

function bb_mojo_graphics_Translate(param1, param2) {
  param1 = Number(param1);
  param2 = Number(param2);
  bb_mojo_graphics_Transform(1, 0, 0, 1, param1, param2);
  return __as3_int(0);
}

function bb_mojo_graphics_PopMatrix() {
  var _loc1_ = __as3_int((bb_mojo_graphics_context.bbmatrixSp - 6));
  bb_mojo_graphics_SetMatrix(bb_mojo_graphics_context.bbmatrixStack[(_loc1_ + 0)], bb_mojo_graphics_context.bbmatrixStack[(_loc1_ + 1)], bb_mojo_graphics_context.bbmatrixStack[(_loc1_ + 2)], bb_mojo_graphics_context.bbmatrixStack[(_loc1_ + 3)], bb_mojo_graphics_context.bbmatrixStack[(_loc1_ + 4)], bb_mojo_graphics_context.bbmatrixStack[(_loc1_ + 5)]);
  (bb_mojo_graphics_context.bbmatrixSp = __as3_int(_loc1_));
  return __as3_int(0);
}

function bb_mojo_graphics_DrawImage(param1, param2, param3, param4) {
  param2 = Number(param2);
  param3 = Number(param3);
  param4 = __as3_int(param4);
  var _loc5_ = param1.bbframes[param4];
  if ((bb_mojo_graphics_context.bbtformed != 0))
  {
    bb_mojo_graphics_PushMatrix();
    bb_mojo_graphics_Translate((param2 - param1.bbtx), (param3 - param1.bbty));
    bb_mojo_graphics_ValidateMatrix();
    if ((((param1.bbflags & 0x010000)) != 0))
    {
      bb_mojo_graphics_context.bbdevice.DrawSurface(param1.bbsurface, 0, 0);
    }
    else
    {
      bb_mojo_graphics_context.bbdevice.DrawSurface2(param1.bbsurface, 0, 0, _loc5_.bbx, _loc5_.bby, param1.bbwidth, param1.bbheight);
    }
    bb_mojo_graphics_PopMatrix();
  }
  else
  {
    bb_mojo_graphics_ValidateMatrix();
    if ((((param1.bbflags & 0x010000)) == 0))
    {
      bb_mojo_graphics_context.bbdevice.DrawSurface2(param1.bbsurface, (param2 - param1.bbtx), (param3 - param1.bbty), _loc5_.bbx, _loc5_.bby, param1.bbwidth, param1.bbheight);
    }
    else
    {
      bb_mojo_graphics_context.bbdevice.DrawSurface(param1.bbsurface, (param2 - param1.bbtx), (param3 - param1.bbty));
    }
  }
  return __as3_int(0);
}

function bb_mojo_graphics_Rotate(param1) {
  param1 = Number(param1);
  bb_mojo_graphics_Transform(Math.cos((param1 * 0.0174532925)), (- Math.sin((param1 * 0.0174532925))), Math.sin((param1 * 0.0174532925)), Math.cos((param1 * 0.0174532925)), 0, 0);
  return __as3_int(0);
}

function bb_mojo_graphics_DrawImage2(param1, param2, param3, param4, param5, param6, param7) {
  param2 = Number(param2);
  param3 = Number(param3);
  param4 = Number(param4);
  param5 = Number(param5);
  param6 = Number(param6);
  param7 = __as3_int(param7);
  var _loc8_ = param1.bbframes[param7];
  bb_mojo_graphics_PushMatrix();
  bb_mojo_graphics_Translate(param2, param3);
  bb_mojo_graphics_Rotate(param4);
  bb_mojo_graphics_Scale(param5, param6);
  bb_mojo_graphics_Translate((- param1.bbtx), (- param1.bbty));
  bb_mojo_graphics_ValidateMatrix();
  if ((((param1.bbflags & 0x010000)) == 0))
  {
    bb_mojo_graphics_context.bbdevice.DrawSurface2(param1.bbsurface, 0, 0, _loc8_.bbx, _loc8_.bby, param1.bbwidth, param1.bbheight);
  }
  else
  {
    bb_mojo_graphics_context.bbdevice.DrawSurface(param1.bbsurface, 0, 0);
  }
  bb_mojo_graphics_PopMatrix();
  return __as3_int(0);
}

function bb_mojo_graphics_Cls(param1, param2, param3) {
  param1 = Number(param1);
  param2 = Number(param2);
  param3 = Number(param3);
  bb_mojo_graphics_context.bbdevice.Cls(param1, param2, param3);
  return __as3_int(0);
}

function bb_mojo_input_MouseX() {
  return Number(bb_mojo_input_device.MouseX());
}

function bb_mojo_input_MouseY() {
  return Number(bb_mojo_input_device.MouseY());
}

function bb_mojo_input_KeyDown(param1) {
  param1 = __as3_int(param1);
  return __as3_int(bb_mojo_input_device.KeyDown(param1));
}

function bb_mojo_audio_StopChannel(param1) {
  bb_mojo_audio_device.StopChannel(param1);
  return __as3_int(0);
}

function bb_mojo_graphics_DrawPoint(param1, param2) {
  param1 = Number(param1);
  param2 = Number(param2);
  bb_mojo_graphics_ValidateMatrix();
  bb_mojo_graphics_context.bbdevice.DrawPoint(param1, param2);
  return __as3_int(0);
}

function bb_mojo_graphics_DrawImageRect(param1, param2, param3, param4, param5, param6, param7, param8) {
  param2 = Number(param2);
  param3 = Number(param3);
  param4 = __as3_int(param4);
  param5 = __as3_int(param5);
  param6 = __as3_int(param6);
  param7 = __as3_int(param7);
  param8 = __as3_int(param8);
  var _loc9_ = param1.bbframes[param8];
  if ((bb_mojo_graphics_context.bbtformed != 0))
  {
    bb_mojo_graphics_PushMatrix();
    bb_mojo_graphics_Translate(((- param1.bbtx) + param2), ((- param1.bbty) + param3));
    bb_mojo_graphics_ValidateMatrix();
    bb_mojo_graphics_context.bbdevice.DrawSurface2(param1.bbsurface, 0, 0, (param4 + _loc9_.bbx), (param5 + _loc9_.bby), param6, param7);
    bb_mojo_graphics_PopMatrix();
  }
  else
  {
    bb_mojo_graphics_ValidateMatrix();
    bb_mojo_graphics_context.bbdevice.DrawSurface2(param1.bbsurface, ((- param1.bbtx) + param2), ((- param1.bbty) + param3), (param4 + _loc9_.bbx), (param5 + _loc9_.bby), param6, param7);
  }
  return __as3_int(0);
}

function bb_mojo_graphics_DrawImageRect2(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11) {
  param2 = Number(param2);
  param3 = Number(param3);
  param4 = __as3_int(param4);
  param5 = __as3_int(param5);
  param6 = __as3_int(param6);
  param7 = __as3_int(param7);
  param8 = Number(param8);
  param9 = Number(param9);
  param10 = Number(param10);
  param11 = __as3_int(param11);
  var _loc12_ = param1.bbframes[param11];
  bb_mojo_graphics_PushMatrix();
  bb_mojo_graphics_Translate(param2, param3);
  bb_mojo_graphics_Rotate(param8);
  bb_mojo_graphics_Scale(param9, param10);
  bb_mojo_graphics_Translate((- param1.bbtx), (- param1.bbty));
  bb_mojo_graphics_ValidateMatrix();
  bb_mojo_graphics_context.bbdevice.DrawSurface2(param1.bbsurface, 0, 0, (param4 + _loc12_.bbx), (param5 + _loc12_.bby), param6, param7);
  bb_mojo_graphics_PopMatrix();
  return __as3_int(0);
}

function bb_mojo_graphics_BeginRender() {
  (bb_mojo_graphics_context.bbmatrixSp = __as3_int(0));
  0;
  bb_mojo_graphics_SetMatrix(1, 0, 0, 1, 0, 0);
  bb_mojo_graphics_SetColor(255, 255, 255);
  return __as3_int(0);
}

function bb_mojo_graphics_EndRender() {
  return __as3_int(0);
}

function bb_Init() {
  (bb_mojo_graphics_context = null);
  (bb_mojo_input_device = null);
  (bb_mojo_audio_device = null);
  (bb_mojo_app_device = null);
  (bb_Game = null);
  (bb_Audio = null);
  (bb_mojo_graphics_Image.bbDefaultFlags = __as3_int(0));
  (bb_data_Hoedown = [32, 11, 0, 0, 8, 8, 0, 33, 33, 3, 6, 28, 16, 8, 0, 6, 34, 10, 14, 14, 32, 8, (- 1), 4, 35, 17, 22, 28, 56, 8, (- 1), 6, 36, 17, 21, 30, 88, 8, 0, 5, 37, 18, 22, 28, 120, 8, (- 1), 7, 38, 18, 25, 30, 152, 8, (- 2), 7, 39, 4, 8, 14, 192, 8, (- 1), 6, 40, 11, 17, 45, 208, 8, (- 1), (- 2), 41, 12, 17, 44, 240, 8, (- 1), (- 1), 42, 9, 14, 14, 272, 8, (- 1), 1, 43, 16, 21, 24, 296, 8, (- 1), 10, 44, 6, 8, 14, 328, 8, 0, 25, 45, 9, 14, 14, 344, 8, (- 1), 11, 46, 7, 9, 10, 368, 8, 0, 24, 47, 19, 27, 36, 392, 8, (- 3), 0, 48, 18, 23, 32, 432, 8, (- 1), 5, 49, 12, 17, 31, 464, 8, (- 2), 4, 50, 20, 27, 35, 8, 64, (- 2), 4, 51, 20, 26, 33, 48, 64, (- 2), 4, 52, 20, 28, 33, 88, 64, (- 3), 4, 53, 21, 29, 32, 128, 64, (- 5), 4, 54, 19, 24, 32, 168, 64, (- 1), 4, 55, 19, 26, 33, 200, 64, (- 2), 4, 56, 20, 24, 32, 240, 64, 0, 4, 57, 20, 26, 34, 272, 64, (- 2), 5, 58, 7, 9, 20, 312, 64, 0, 14, 59, 6, 10, 24, 336, 64, (- 1), 15, 60, 27, 27, 31, 360, 64, 0, 3, 61, 27, 27, 31, 400, 64, 0, 3, 62, 27, 27, 31, 440, 64, 0, 3, 63, 27, 27, 31, 8, 112, 0, 3, 64, 27, 27, 31, 48, 112, 0, 3, 65, 20, 30, 36, 88, 112, (- 5), 3, 66, 20, 28, 33, 128, 112, (- 4), 4, 67, 20, 27, 31, 168, 112, (- 1), 5, 68, 19, 26, 33, 208, 112, (- 3), 4, 69, 18, 26, 32, 248, 112, (- 4), 4, 70, 13, 25, 31, 288, 112, (- 3), 5, 71, 22, 28, 32, 328, 112, (- 1), 5, 72, 20, 26, 33, 368, 112, (- 2), 4, 73, 9, 14, 31, 408, 112, (- 2), 5, 74, 16, 23, 32, 432, 112, (- 4), 6, 75, 20, 29, 35, 464, 112, (- 4), 4, 76, 18, 26, 33, 8, 160, (- 3), 4, 77, 25, 35, 32, 48, 160, (- 5), 5, 78, 21, 28, 32, 96, 160, (- 3), 5, 79, 19, 23, 32, 136, 160, 0, 5, 80, 18, 25, 33, 168, 160, (- 3), 4, 81, 21, 27, 35, 208, 160, (- 1), 5, 82, 20, 29, 35, 248, 160, (- 4), 3, 83, 22, 28, 29, 288, 160, (- 2), 7, 84, 20, 26, 31, 328, 160, (- 1), 6, 85, 19, 26, 32, 368, 160, (- 3), 4, 86, 19, 28, 34, 408, 160, (- 4), 4, 87, 21, 30, 34, 448, 160, (- 5), 4, 88, 20, 29, 34, 8, 208, (- 4), 4, 89, 20, 28, 35, 48, 208, (- 3), 4, 90, 20, 25, 33, 88, 208, (- 2), 5, 91, 27, 27, 31, 128, 208, 0, 3, 92, 27, 27, 31, 168, 208, 0, 3, 93, 27, 27, 31, 208, 208, 0, 3, 94, 27, 27, 31, 248, 208, 0, 3, 95, 27, 27, 31, 288, 208, 0, 3, 96, 27, 27, 31, 328, 208, 0, 3, 97, 15, 23, 26, 368, 208, (- 3), 7, 98, 13, 21, 24, 400, 208, (- 3), 8, 99, 15, 21, 23, 432, 208, (- 1), 9, 100, 15, 21, 25, 464, 208, (- 2), 8, 101, 13, 20, 24, 8, 256, (- 2), 8, 102, 13, 19, 23, 40, 256, (- 1), 9, 103, 15, 21, 24, 72, 256, (- 1), 9, 104, 15, 20, 25, 104, 256, (- 1), 8, 105, 5, 11, 24, 136, 256, (- 2), 8, 106, 11, 17, 24, 160, 256, (- 2), 10, 107, 14, 22, 26, 192, 256, (- 3), 8, 108, 13, 20, 25, 224, 256, (- 2), 8, 109, 19, 25, 25, 256, 256, (- 2), 8, 110, 15, 21, 24, 296, 256, (- 2), 9, 111, 13, 18, 23, 328, 256, (- 1), 9, 112, 13, 20, 25, 360, 256, (- 3), 8, 113, 15, 21, 26, 392, 256, (- 1), 10, 114, 15, 22, 26, 424, 256, (- 2), 8, 115, 16, 22, 22, 456, 256, (- 1), 10, 116, 14, 20, 24, 8, 296, (- 1), 10, 117, 13, 21, 24, 40, 296, (- 3), 8, 118, 14, 21, 26, 72, 296, (- 2), 8, 119, 17, 24, 26, 104, 296, (- 2), 8, 120, 16, 23, 26, 136, 296, (- 2), 8, 121, 15, 22, 27, 168, 296, (- 2), 8, 122, 14, 19, 24, 200, 296, (- 1), 9, 123, 27, 27, 31, 232, 296, 0, 3, 124, 27, 27, 31, 272, 296, 0, 3, 125, 27, 27, 31, 312, 296, 0, 3, 126, 27, 27, 31, 352, 296, 0, 3, 0]);
  (bb_data_Hoedownfat = [32, 11, 12, 0, 2, 2, (- 6), 27, 33, 3, 18, 40, 26, 2, (- 6), 0, 34, 10, 26, 26, 58, 2, (- 7), (- 2), 35, 17, 34, 40, 98, 2, (- 7), 0, 36, 17, 33, 42, 146, 2, (- 6), (- 1), 37, 18, 34, 40, 194, 2, (- 7), 1, 38, 18, 37, 42, 242, 2, (- 8), 1, 39, 4, 20, 26, 290, 2, (- 7), 0, 40, 11, 29, 57, 322, 2, (- 7), (- 8), 41, 12, 29, 56, 362, 2, (- 7), (- 7), 42, 9, 26, 26, 402, 2, (- 7), (- 5), 43, 16, 33, 36, 442, 2, (- 7), 4, 44, 6, 20, 26, 2, 74, (- 6), 19, 45, 9, 26, 26, 34, 74, (- 7), 5, 46, 7, 21, 22, 74, 74, (- 6), 18, 47, 19, 39, 48, 106, 74, (- 9), (- 6), 48, 18, 35, 44, 154, 74, (- 7), (- 1), 49, 12, 29, 43, 202, 74, (- 8), (- 2), 50, 20, 39, 47, 242, 74, (- 8), (- 2), 51, 20, 38, 45, 290, 74, (- 8), (- 2), 52, 20, 40, 45, 338, 74, (- 9), (- 2), 53, 21, 41, 44, 386, 74, (- 11), (- 2), 54, 19, 36, 44, 442, 74, (- 7), (- 2), 55, 19, 38, 45, 2, 130, (- 8), (- 2), 56, 20, 36, 44, 50, 130, (- 6), (- 2), 57, 20, 38, 46, 98, 130, (- 8), (- 1), 58, 7, 21, 32, 146, 130, (- 6), 8, 59, 6, 22, 36, 178, 130, (- 7), 9, 60, 27, 39, 43, 210, 130, (- 6), (- 3), 61, 27, 39, 43, 258, 130, (- 6), (- 3), 62, 27, 39, 43, 306, 130, (- 6), (- 3), 63, 27, 39, 43, 354, 130, (- 6), (- 3), 64, 27, 39, 43, 402, 130, (- 6), (- 3), 65, 20, 42, 48, 450, 130, (- 11), (- 3), 66, 20, 40, 45, 2, 186, (- 10), (- 2), 67, 20, 39, 43, 50, 186, (- 7), (- 1), 68, 19, 38, 45, 98, 186, (- 9), (- 2), 69, 18, 38, 44, 146, 186, (- 10), (- 2), 70, 13, 37, 43, 194, 186, (- 9), (- 1), 71, 22, 40, 44, 242, 186, (- 7), (- 1), 72, 20, 38, 45, 290, 186, (- 8), (- 2), 73, 9, 26, 43, 338, 186, (- 8), (- 1), 74, 16, 35, 44, 378, 186, (- 10), 0, 75, 20, 41, 47, 426, 186, (- 10), (- 2), 76, 18, 38, 45, 2, 242, (- 9), (- 2), 77, 25, 47, 44, 50, 242, (- 11), (- 1), 78, 21, 40, 44, 106, 242, (- 9), (- 1), 79, 19, 35, 44, 154, 242, (- 6), (- 1), 80, 18, 37, 45, 202, 242, (- 9), (- 2), 81, 21, 39, 47, 250, 242, (- 7), (- 1), 82, 20, 41, 47, 298, 242, (- 10), (- 3), 83, 22, 40, 41, 354, 242, (- 8), 1, 84, 20, 38, 43, 402, 242, (- 7), 0, 85, 19, 38, 44, 450, 242, (- 9), (- 2), 86, 19, 40, 46, 2, 298, (- 10), (- 2), 87, 21, 42, 46, 50, 298, (- 11), (- 2), 88, 20, 41, 46, 106, 298, (- 10), (- 2), 89, 20, 40, 47, 162, 298, (- 9), (- 2), 90, 20, 37, 45, 210, 298, (- 8), (- 1), 91, 27, 39, 43, 258, 298, (- 6), (- 3), 92, 27, 39, 43, 306, 298, (- 6), (- 3), 93, 27, 39, 43, 354, 298, (- 6), (- 3), 94, 27, 39, 43, 402, 298, (- 6), (- 3), 95, 27, 39, 43, 450, 298, (- 6), (- 3), 96, 27, 39, 43, 2, 354, (- 6), (- 3), 97, 15, 35, 38, 50, 354, (- 9), 1, 98, 13, 33, 36, 98, 354, (- 9), 2, 99, 15, 33, 35, 146, 354, (- 7), 3, 100, 15, 33, 37, 194, 354, (- 8), 2, 101, 13, 32, 36, 242, 354, (- 8), 2, 102, 13, 31, 35, 282, 354, (- 7), 3, 103, 15, 33, 36, 322, 354, (- 7), 3, 104, 15, 32, 37, 370, 354, (- 7), 2, 105, 5, 23, 36, 410, 354, (- 8), 2, 106, 11, 29, 36, 442, 354, (- 8), 4, 107, 14, 34, 38, 2, 410, (- 9), 2, 108, 13, 32, 37, 50, 410, (- 8), 2, 109, 19, 37, 37, 90, 410, (- 8), 2, 110, 15, 33, 36, 138, 410, (- 8), 3, 111, 13, 30, 35, 186, 410, (- 7), 3, 112, 13, 32, 37, 226, 410, (- 9), 2, 113, 15, 33, 38, 266, 410, (- 7), 4, 114, 15, 34, 38, 314, 410, (- 8), 2, 115, 16, 34, 34, 362, 410, (- 7), 4, 116, 14, 32, 36, 410, 410, (- 7), 4, 117, 13, 33, 36, 450, 410, (- 9), 2, 118, 14, 33, 38, 2, 458, (- 8), 2, 119, 17, 36, 38, 50, 458, (- 8), 2, 120, 16, 35, 38, 98, 458, (- 8), 2, 121, 15, 34, 39, 146, 458, (- 8), 2, 122, 14, 31, 36, 194, 458, (- 7), 3, 123, 27, 39, 43, 234, 458, (- 6), (- 3), 124, 27, 39, 43, 282, 458, (- 6), (- 3), 125, 27, 39, 43, 330, 458, (- 6), (- 3), 126, 27, 39, 43, 378, 458, (- 6), (- 3), 0]);
  (bb_data_goose = [32, 19, 0, 0, 8, 8, 0, 43, 33, 5, 7, 36, 16, 8, 0, 10, 34, 14, 18, 16, 32, 8, (- 1), 9, 36, 23, 26, 36, 64, 8, (- 1), 9, 39, 7, 10, 16, 104, 8, (- 1), 9, 43, 21, 19, 19, 128, 8, 1, 22, 44, 7, 10, 16, 160, 8, (- 1), 35, 45, 21, 19, 6, 184, 8, 1, 28, 46, 7, 9, 9, 216, 8, 0, 35, 47, 23, 27, 34, 240, 8, (- 1), 9, 48, 24, 27, 35, 280, 8, 0, 9, 49, 11, 14, 34, 320, 8, (- 1), 10, 50, 19, 22, 34, 344, 8, 0, 10, 51, 20, 22, 34, 376, 8, 0, 10, 52, 23, 27, 32, 408, 8, (- 1), 11, 53, 20, 23, 34, 448, 8, 0, 9, 54, 21, 23, 32, 480, 8, 0, 12, 55, 21, 24, 31, 8, 56, (- 1), 13, 56, 24, 26, 36, 40, 56, 0, 9, 57, 21, 24, 33, 80, 56, 0, 12, 58, 7, 9, 21, 112, 56, 0, 18, 59, 8, 10, 32, 136, 56, 0, 19, 61, 21, 19, 11, 160, 56, 1, 23, 63, 20, 23, 34, 192, 56, (- 1), 10, 64, 29, 32, 33, 224, 56, 0, 11, 65, 23, 27, 35, 264, 56, (- 1), 9, 66, 18, 21, 36, 304, 56, 0, 8, 67, 24, 27, 34, 336, 56, 0, 10, 68, 24, 27, 34, 376, 56, (- 1), 10, 69, 24, 26, 34, 416, 56, 0, 10, 70, 23, 26, 36, 456, 56, (- 1), 10, 71, 25, 27, 35, 8, 104, 0, 10, 72, 21, 24, 36, 48, 104, 0, 9, 73, 12, 14, 34, 80, 104, 0, 10, 74, 21, 23, 35, 104, 104, 0, 9, 75, 27, 30, 36, 136, 104, 0, 9, 76, 21, 25, 34, 176, 104, (- 1), 9, 77, 36, 38, 36, 216, 104, 0, 10, 78, 29, 32, 35, 264, 104, (- 1), 10, 79, 24, 27, 35, 304, 104, 0, 9, 80, 20, 22, 34, 344, 104, 0, 10, 81, 26, 28, 43, 376, 104, 0, 9, 82, 23, 25, 34, 416, 104, 0, 10, 83, 22, 26, 34, 456, 104, (- 1), 10, 84, 23, 26, 36, 8, 160, 0, 9, 85, 26, 29, 34, 48, 160, (- 1), 10, 86, 28, 32, 35, 88, 160, (- 1), 9, 87, 36, 40, 35, 128, 160, (- 1), 10, 88, 26, 30, 36, 176, 160, (- 1), 9, 89, 21, 25, 36, 216, 160, (- 1), 8, 90, 24, 28, 37, 256, 160, (- 1), 7, 92, 23, 27, 36, 296, 160, (- 1), 9, 95, 29, 29, 6, 336, 160, 1, 41, 96, 7, 10, 16, 376, 160, (- 1), 9, 97, 28, 31, 24, 400, 160, 0, 21, 98, 26, 28, 36, 440, 160, 0, 9, 99, 21, 24, 26, 480, 160, 0, 18, 100, 26, 29, 39, 8, 208, 0, 8, 101, 25, 28, 28, 48, 208, 0, 17, 102, 20, 23, 35, 88, 208, 0, 8, 103, 27, 30, 40, 120, 208, 0, 21, 104, 24, 26, 35, 160, 208, 0, 9, 105, 7, 9, 33, 200, 208, 0, 11, 106, 16, 19, 45, 224, 208, 0, 16, 107, 23, 27, 37, 256, 208, (- 1), 8, 108, 5, 7, 34, 296, 208, 0, 10, 109, 30, 33, 26, 312, 208, 0, 18, 110, 22, 25, 28, 360, 208, 0, 18, 111, 25, 27, 25, 400, 208, 0, 21, 112, 28, 31, 38, 440, 208, (- 1), 20, 113, 28, 31, 41, 8, 264, 0, 20, 114, 22, 26, 28, 48, 264, (- 1), 18, 115, 23, 26, 30, 88, 264, (- 1), 17, 116, 18, 22, 35, 128, 264, (- 1), 10, 117, 23, 26, 27, 160, 264, 0, 17, 118, 28, 31, 26, 200, 264, (- 1), 18, 119, 27, 30, 26, 240, 264, 0, 18, 120, 24, 28, 26, 280, 264, (- 1), 19, 121, 22, 24, 42, 320, 264, 0, 18, 122, 24, 28, 32, 352, 264, (- 1), 16, 124, 4, 7, 42, 392, 264, 0, 8, 0]);
  (bb_data_goosefat = [32, 19, 12, 0, 2, 2, (- 6), 37, 33, 5, 19, 48, 26, 2, (- 6), 4, 34, 14, 30, 28, 58, 2, (- 7), 3, 36, 23, 38, 48, 98, 2, (- 7), 3, 39, 7, 22, 28, 146, 2, (- 7), 3, 43, 21, 31, 31, 178, 2, (- 5), 16, 44, 7, 22, 28, 218, 2, (- 7), 29, 45, 21, 31, 18, 250, 2, (- 5), 22, 46, 7, 21, 21, 290, 2, (- 6), 29, 47, 23, 39, 46, 322, 2, (- 7), 3, 48, 24, 39, 47, 370, 2, (- 6), 3, 49, 11, 26, 46, 418, 2, (- 7), 4, 50, 19, 34, 46, 458, 2, (- 6), 4, 51, 20, 34, 46, 2, 58, (- 6), 4, 52, 23, 39, 44, 50, 58, (- 7), 5, 53, 20, 35, 46, 98, 58, (- 6), 3, 54, 21, 35, 44, 146, 58, (- 6), 6, 55, 21, 36, 43, 194, 58, (- 7), 7, 56, 24, 38, 48, 242, 58, (- 6), 3, 57, 21, 36, 45, 290, 58, (- 6), 6, 58, 7, 21, 33, 338, 58, (- 6), 12, 59, 8, 22, 44, 370, 58, (- 6), 13, 61, 21, 31, 23, 402, 58, (- 5), 17, 63, 20, 35, 46, 442, 58, (- 7), 4, 64, 29, 44, 45, 2, 114, (- 6), 5, 65, 23, 39, 47, 58, 114, (- 7), 3, 66, 18, 33, 48, 106, 114, (- 6), 2, 67, 24, 39, 46, 154, 114, (- 6), 4, 68, 24, 39, 46, 202, 114, (- 7), 4, 69, 24, 38, 46, 250, 114, (- 6), 4, 70, 23, 38, 48, 298, 114, (- 7), 4, 71, 25, 39, 47, 346, 114, (- 6), 4, 72, 21, 36, 48, 394, 114, (- 6), 3, 73, 12, 26, 46, 442, 114, (- 6), 4, 74, 21, 35, 47, 2, 170, (- 6), 3, 75, 27, 42, 48, 50, 170, (- 6), 3, 76, 21, 37, 46, 106, 170, (- 7), 3, 77, 36, 50, 48, 154, 170, (- 6), 4, 78, 29, 44, 47, 218, 170, (- 7), 4, 79, 24, 39, 47, 274, 170, (- 6), 3, 80, 20, 34, 46, 322, 170, (- 6), 4, 81, 26, 40, 55, 370, 170, (- 6), 3, 82, 23, 37, 46, 418, 170, (- 6), 4, 83, 22, 38, 46, 2, 234, (- 7), 4, 84, 23, 38, 48, 50, 234, (- 6), 3, 85, 26, 41, 46, 98, 234, (- 7), 4, 86, 28, 44, 47, 154, 234, (- 7), 3, 87, 36, 52, 47, 210, 234, (- 7), 4, 88, 26, 42, 48, 274, 234, (- 7), 3, 89, 21, 37, 48, 330, 234, (- 7), 2, 90, 24, 40, 49, 378, 234, (- 7), 1, 92, 23, 39, 48, 426, 234, (- 7), 3, 95, 29, 41, 18, 2, 298, (- 5), 35, 96, 7, 22, 28, 58, 298, (- 7), 3, 97, 28, 43, 36, 90, 298, (- 6), 15, 98, 26, 40, 48, 146, 298, (- 6), 3, 99, 21, 36, 38, 194, 298, (- 6), 12, 100, 26, 41, 51, 242, 298, (- 6), 2, 101, 25, 40, 40, 298, 298, (- 6), 11, 102, 20, 35, 47, 346, 298, (- 6), 2, 103, 27, 42, 52, 394, 298, (- 6), 15, 104, 24, 38, 47, 450, 298, (- 6), 3, 105, 7, 21, 45, 2, 362, (- 6), 5, 106, 16, 31, 57, 34, 362, (- 6), 10, 107, 23, 39, 49, 74, 362, (- 7), 2, 108, 5, 19, 46, 122, 362, (- 6), 4, 109, 30, 45, 38, 154, 362, (- 6), 12, 110, 22, 37, 40, 210, 362, (- 6), 12, 111, 25, 39, 37, 258, 362, (- 6), 15, 112, 28, 43, 50, 306, 362, (- 7), 14, 113, 28, 43, 53, 362, 362, (- 6), 14, 114, 22, 38, 40, 418, 362, (- 7), 12, 115, 23, 38, 42, 2, 434, (- 7), 11, 116, 18, 34, 47, 50, 434, (- 7), 4, 117, 23, 38, 39, 98, 434, (- 6), 11, 118, 28, 43, 38, 146, 434, (- 7), 12, 119, 27, 42, 38, 202, 434, (- 6), 12, 120, 24, 40, 38, 258, 434, (- 7), 13, 121, 22, 36, 54, 306, 434, (- 6), 12, 122, 24, 40, 44, 354, 434, (- 7), 10, 124, 4, 19, 54, 402, 434, (- 6), 2, 0]);
  (bb_data_shovelsprites = [30, 50, 79, 0, 0, 16, 60, 32, 52, 78, 50, 0, 16, 60, 31, 54, 78, 102, 0, 16, 59, 3, 55, 79, 156, 0, 29, 61, 9, 55, 79, 211, 0, 29, 61, 33, 55, 78, 266, 0, 25, 60, 4, 56, 79, 321, 0, 30, 61, 5, 56, 79, 377, 0, 30, 61, 6, 56, 80, 433, 0, 30, 62, 7, 56, 79, 489, 0, 30, 61, 8, 56, 79, 545, 0, 30, 61, 10, 56, 79, 601, 0, 29, 61, 11, 56, 79, 657, 0, 29, 61, 13, 56, 79, 713, 0, 29, 61, 14, 56, 79, 769, 0, 29, 61, 15, 56, 79, 825, 0, 29, 61, 16, 56, 79, 881, 0, 29, 61, 17, 56, 80, 937, 0, 29, 62, 18, 56, 79, 0, 80, 29, 61, 19, 56, 79, 56, 80, 29, 61, 20, 56, 79, 112, 80, 29, 61, 21, 56, 79, 168, 80, 29, 61, 34, 56, 79, 224, 80, 31, 61, 12, 57, 79, 280, 80, 29, 61, 2, 58, 79, 337, 80, 29, 61, 1, 59, 79, 395, 80, 29, 61, 29, 66, 76, 454, 80, 19, 58, 22, 71, 81, 520, 80, 46, 63, 23, 75, 80, 591, 80, 49, 62, 24, 77, 80, 666, 80, 51, 62, 25, 78, 79, 743, 80, 52, 61, 26, 78, 78, 821, 80, 52, 61, 28, 92, 73, 899, 80, 23, 56, 27, 123, 69, 0, 161, 45, 53]);
  (bb_data_preachersprites = [37, 67, 67, 0, 0, 14, 52, 38, 70, 67, 67, 0, 14, 52, 39, 70, 67, 137, 0, 14, 52, 40, 74, 67, 207, 0, 14, 52, 41, 88, 67, 281, 0, 14, 52, 42, 96, 67, 369, 0, 14, 52, 43, 106, 67, 465, 0, 14, 52, 44, 119, 67, 571, 0, 14, 52, 45, 135, 67, 690, 0, 14, 52, 46, 154, 67, 825, 0, 14, 52, 47, 153, 67, 0, 67, 14, 52, 48, 152, 67, 153, 67, 14, 52, 49, 151, 67, 305, 67, 14, 52, 50, 150, 67, 456, 67, 14, 52, 51, 149, 67, 606, 67, 14, 52, 52, 148, 67, 755, 67, 14, 52, 53, 147, 67, 0, 134, 14, 52, 54, 148, 67, 147, 134, 14, 52, 55, 150, 67, 295, 134, 14, 52, 56, 151, 67, 445, 134, 14, 52, 57, 153, 67, 596, 134, 14, 52, 58, 153, 67, 749, 134, 14, 52, 59, 152, 67, 0, 201, 14, 52, 60, 151, 67, 152, 201, 14, 52, 61, 150, 67, 303, 201, 14, 52, 62, 149, 67, 453, 201, 14, 52, 63, 148, 67, 602, 201, 14, 52, 64, 147, 67, 750, 201, 14, 52, 65, 148, 67, 0, 268, 14, 52, 66, 140, 67, 148, 268, 14, 52, 67, 121, 67, 288, 268, 14, 52, 68, 102, 67, 409, 268, 14, 52, 69, 70, 67, 511, 268, 14, 52, 70, 70, 67, 581, 268, 14, 52, 71, 66, 67, 651, 268, 14, 52, 35, 67, 68, 717, 268, 14, 53, 36, 67, 68, 784, 268, 14, 53, 72, 67, 68, 851, 268, 14, 53, 73, 59, 71, 918, 268, 8, 55, 74, 50, 73, 0, 339, 2, 57, 34, 58, 75, 50, 339, 13, 59, 75, 43, 75, 108, 339, (- 4), 59, 76, 41, 77, 151, 339, (- 10), 61, 77, 41, 78, 192, 339, (- 13), 62, 5, 39, 79, 233, 339, 10, 64, 6, 39, 79, 272, 339, 10, 64, 7, 39, 79, 311, 339, 10, 64, 14, 45, 79, 350, 339, 16, 63, 23, 40, 79, 395, 339, 11, 64, 24, 43, 79, 435, 339, 14, 64, 25, 44, 79, 478, 339, 15, 64, 29, 43, 79, 522, 339, 8, 64, 30, 44, 79, 565, 339, 8, 64, 78, 42, 79, 609, 339, (- 15), 63, 1, 44, 80, 651, 339, 15, 64, 2, 43, 80, 695, 339, 14, 64, 3, 42, 80, 738, 339, 13, 64, 4, 41, 80, 780, 339, 12, 64, 8, 39, 80, 821, 339, 10, 64, 9, 39, 80, 860, 339, 10, 64, 10, 40, 80, 899, 339, 11, 64, 11, 42, 80, 939, 339, 13, 64, 12, 43, 80, 981, 339, 14, 64, 13, 44, 80, 0, 419, 15, 64, 15, 43, 80, 44, 419, 14, 64, 16, 42, 80, 87, 419, 13, 64, 17, 41, 80, 129, 419, 12, 64, 18, 40, 80, 170, 419, 11, 64, 19, 39, 80, 210, 419, 10, 64, 20, 39, 80, 249, 419, 10, 64, 21, 39, 80, 288, 419, 10, 64, 22, 39, 80, 327, 419, 10, 64, 26, 44, 80, 366, 419, 15, 64, 27, 44, 80, 410, 419, 12, 64, 28, 43, 80, 454, 419, 9, 64, 31, 46, 80, 497, 419, 9, 64, 32, 48, 80, 543, 419, 11, 64, 33, 50, 80, 591, 419, 11, 64]);
  (bb_data_shotgunsprites = [3, 65, 75, 0, 0, 18, 58, 4, 64, 75, 65, 0, 17, 58, 14, 65, 75, 129, 0, 18, 58, 15, 67, 75, 194, 0, 20, 58, 16, 66, 75, 261, 0, 19, 58, 17, 66, 75, 327, 0, 19, 58, 18, 65, 75, 393, 0, 18, 58, 32, 63, 75, 458, 0, 16, 57, 33, 64, 75, 521, 0, 16, 57, 34, 64, 75, 585, 0, 16, 57, 35, 96, 75, 649, 0, 19, 58, 37, 76, 75, 745, 0, 20, 58, 38, 74, 75, 821, 0, 18, 58, 1, 67, 76, 895, 0, 20, 58, 2, 66, 76, 0, 76, 19, 58, 5, 63, 76, 66, 76, 16, 59, 6, 62, 76, 129, 76, 15, 59, 12, 62, 76, 191, 76, 15, 58, 13, 64, 76, 253, 76, 17, 58, 19, 64, 76, 317, 76, 17, 59, 20, 64, 76, 381, 76, 17, 59, 28, 64, 76, 445, 76, 17, 58, 29, 65, 76, 509, 76, 18, 58, 30, 67, 76, 574, 76, 20, 58, 31, 63, 76, 641, 76, 16, 58, 36, 122, 76, 704, 76, 22, 59, 39, 73, 76, 826, 76, 17, 58, 40, 72, 76, 899, 76, 16, 58, 45, 62, 76, 0, 152, 16, 58, 46, 63, 76, 62, 152, 16, 58, 47, 63, 76, 125, 152, 16, 58, 7, 61, 77, 188, 152, 14, 59, 9, 58, 77, 249, 152, 11, 59, 10, 58, 77, 307, 152, 11, 59, 11, 60, 77, 365, 152, 13, 59, 21, 63, 77, 425, 152, 16, 59, 27, 63, 77, 488, 152, 16, 59, 41, 71, 77, 551, 152, 16, 59, 42, 71, 77, 622, 152, 16, 59, 8, 60, 78, 693, 152, 13, 60, 22, 62, 78, 753, 152, 15, 60, 23, 62, 78, 815, 152, 15, 60, 25, 61, 78, 877, 152, 14, 59, 26, 62, 78, 938, 152, 15, 59, 24, 60, 79, 0, 230, 13, 60, 43, 70, 79, 60, 230, 16, 61, 44, 70, 79, 130, 230, 16, 61]);
  (bb_data_trucksprites = [1, 201, 113, 0, 0, 171, 94, 2, 201, 113, 201, 0, 171, 94, 3, 201, 113, 402, 0, 171, 94, 4, 201, 113, 603, 0, 171, 94, 5, 201, 113, 804, 0, 171, 94, 6, 201, 113, 0, 113, 171, 94, 7, 201, 113, 201, 113, 171, 94, 8, 201, 113, 402, 113, 171, 94, 9, 201, 113, 603, 113, 171, 94, 10, 201, 113, 804, 113, 171, 94, 11, 201, 113, 0, 226, 171, 94, 12, 201, 113, 201, 226, 171, 94, 13, 201, 113, 402, 226, 171, 94, 14, 201, 113, 603, 226, 171, 94, 15, 201, 113, 804, 226, 171, 94, 16, 201, 113, 0, 339, 171, 94]);
  (bb_data_bombersprites = [43, 94, 61, 0, 0, 49, 44, 44, 94, 61, 94, 0, 49, 44, 45, 94, 61, 188, 0, 49, 44, 46, 94, 61, 282, 0, 49, 44, 42, 93, 62, 376, 0, 49, 45, 41, 92, 64, 469, 0, 49, 47, 47, 90, 64, 561, 0, 49, 47, 36, 78, 66, 651, 0, 49, 49, 37, 77, 66, 729, 0, 49, 49, 40, 98, 67, 806, 0, 49, 50, 48, 88, 67, 904, 0, 49, 50, 52, 66, 69, 0, 67, 49, 52, 53, 66, 69, 66, 67, 49, 52, 49, 86, 70, 132, 67, 49, 53, 50, 83, 70, 218, 67, 49, 53, 51, 75, 70, 301, 67, 49, 53, 29, 78, 71, 376, 67, 49, 54, 54, 66, 71, 454, 67, 49, 54, 55, 66, 71, 520, 67, 49, 54, 56, 70, 71, 586, 67, 49, 54, 57, 73, 71, 656, 67, 49, 54, 58, 76, 71, 729, 67, 49, 54, 59, 76, 71, 805, 67, 49, 54, 60, 78, 71, 881, 67, 49, 54, 35, 79, 72, 0, 138, 49, 55, 30, 90, 73, 79, 138, 49, 56, 34, 79, 74, 169, 138, 49, 57, 31, 82, 77, 248, 138, 49, 60, 33, 81, 77, 330, 138, 49, 60, 32, 82, 79, 411, 138, 49, 62, 1, 88, 80, 493, 138, 50, 63, 28, 88, 80, 581, 138, 50, 63, 2, 88, 81, 669, 138, 50, 64, 3, 88, 81, 757, 138, 51, 64, 4, 88, 81, 845, 138, 51, 64, 5, 88, 81, 933, 138, 51, 64, 9, 90, 81, 0, 219, 53, 64, 10, 90, 81, 90, 219, 53, 64, 11, 90, 81, 180, 219, 53, 64, 12, 91, 81, 270, 219, 54, 64, 14, 92, 81, 361, 219, 54, 63, 16, 92, 81, 453, 219, 55, 64, 17, 92, 81, 545, 219, 55, 64, 18, 92, 81, 637, 219, 55, 64, 19, 92, 81, 729, 219, 55, 64, 20, 93, 81, 821, 219, 56, 64, 21, 90, 81, 914, 219, 53, 64, 22, 88, 81, 0, 300, 51, 64, 23, 86, 81, 88, 300, 49, 64, 24, 84, 81, 174, 300, 47, 64, 25, 85, 81, 258, 300, 48, 64, 26, 85, 81, 343, 300, 48, 64, 27, 87, 81, 428, 300, 49, 64, 6, 89, 82, 515, 300, 52, 65, 7, 89, 82, 604, 300, 52, 65, 8, 90, 82, 693, 300, 53, 65, 13, 92, 82, 783, 300, 54, 64, 15, 93, 82, 875, 300, 55, 64, 39, 92, 82, 0, 382, 49, 65, 38, 79, 86, 92, 382, 49, 69]);
  (bb_data_zombiesprites = [58, 58, 62, 0, 0, 12, 42, 59, 58, 62, 58, 0, 12, 42, 54, 68, 64, 116, 0, 21, 45, 56, 56, 64, 184, 0, 10, 44, 57, 57, 64, 240, 0, 11, 44, 60, 55, 64, 297, 0, 9, 44, 55, 60, 65, 352, 0, 14, 45, 53, 67, 66, 412, 0, 21, 46, 61, 50, 66, 479, 0, 4, 47, 62, 47, 67, 529, 0, 1, 48, 63, 52, 69, 576, 0, 5, 50, 64, 53, 69, 628, 0, 7, 50, 65, 55, 70, 681, 0, 8, 51, 66, 55, 70, 736, 0, 8, 51, 1, 54, 71, 791, 0, 7, 52, 2, 53, 71, 845, 0, 7, 52, 3, 53, 71, 898, 0, 7, 52, 4, 53, 71, 951, 0, 7, 52, 9, 51, 71, 0, 71, 7, 52, 16, 51, 71, 51, 71, 7, 52, 18, 52, 71, 102, 71, 7, 52, 19, 53, 71, 154, 71, 7, 52, 20, 53, 71, 207, 71, 7, 52, 21, 54, 71, 260, 71, 7, 52, 22, 54, 71, 314, 71, 7, 52, 23, 55, 71, 368, 71, 7, 52, 24, 55, 71, 423, 71, 7, 52, 25, 54, 71, 478, 71, 7, 52, 26, 53, 71, 532, 71, 7, 52, 28, 52, 71, 585, 71, 7, 52, 38, 50, 71, 637, 71, 7, 52, 44, 52, 71, 687, 71, 7, 52, 45, 52, 71, 739, 71, 7, 52, 46, 52, 71, 791, 71, 7, 52, 47, 53, 71, 843, 71, 7, 52, 48, 53, 71, 896, 71, 7, 52, 67, 55, 71, 949, 71, 8, 52, 68, 54, 71, 0, 142, 7, 52, 5, 52, 72, 54, 142, 7, 53, 6, 52, 72, 106, 142, 7, 53, 7, 51, 72, 158, 142, 7, 53, 8, 51, 72, 209, 142, 7, 53, 10, 50, 72, 260, 142, 7, 53, 11, 50, 72, 310, 142, 7, 53, 12, 49, 72, 360, 142, 7, 53, 13, 49, 72, 409, 142, 7, 53, 14, 50, 72, 458, 142, 7, 53, 15, 50, 72, 508, 142, 7, 53, 17, 52, 72, 558, 142, 7, 53, 27, 53, 72, 610, 142, 7, 52, 32, 50, 72, 663, 142, 7, 53, 34, 49, 72, 713, 142, 7, 53, 35, 49, 72, 762, 142, 7, 53, 36, 49, 72, 811, 142, 7, 53, 37, 49, 72, 860, 142, 7, 53, 39, 50, 72, 909, 142, 7, 53, 40, 51, 72, 959, 142, 7, 53, 41, 52, 72, 0, 214, 7, 52, 42, 52, 72, 52, 214, 7, 52, 43, 53, 72, 104, 214, 7, 52, 29, 52, 73, 157, 214, 7, 53, 30, 51, 73, 209, 214, 7, 53, 31, 51, 73, 260, 214, 7, 53, 33, 50, 73, 311, 214, 7, 53, 49, 52, 73, 361, 214, 6, 54, 50, 48, 77, 413, 214, 2, 58, 52, 49, 77, 461, 214, 3, 58, 51, 43, 79, 510, 214, (- 3), 60]);
  (bb_data_ghoulsprites = [17, 50, 60, 0, 0, 46, 47, 43, 50, 52, 50, 0, 39, 39, 18, 51, 59, 100, 0, 46, 46, 42, 51, 53, 151, 0, 40, 40, 16, 52, 59, 202, 0, 47, 46, 19, 52, 59, 254, 0, 46, 46, 40, 52, 57, 306, 0, 41, 44, 41, 52, 55, 358, 0, 41, 42, 44, 52, 52, 410, 0, 39, 39, 45, 52, 51, 462, 0, 39, 38, 46, 52, 55, 514, 0, 45, 42, 8, 53, 59, 566, 0, 49, 46, 9, 54, 59, 619, 0, 49, 46, 15, 54, 59, 673, 0, 48, 46, 20, 54, 59, 727, 0, 46, 46, 21, 54, 59, 781, 0, 45, 46, 36, 54, 58, 835, 0, 44, 45, 10, 55, 59, 889, 0, 49, 46, 14, 55, 59, 944, 0, 48, 46, 37, 55, 59, 0, 60, 45, 46, 1, 56, 59, 55, 60, 45, 46, 2, 56, 59, 111, 60, 46, 46, 3, 56, 59, 167, 60, 46, 46, 4, 56, 59, 223, 60, 47, 46, 6, 56, 59, 279, 60, 48, 46, 7, 56, 59, 335, 60, 49, 46, 11, 56, 59, 391, 60, 49, 46, 13, 56, 59, 447, 60, 48, 46, 22, 56, 59, 503, 60, 45, 46, 27, 56, 74, 559, 60, 45, 61, 38, 56, 59, 615, 60, 45, 46, 39, 56, 59, 671, 60, 45, 46, 60, 56, 59, 727, 60, 168, 46, 5, 57, 59, 783, 60, 48, 46, 35, 57, 58, 840, 60, 46, 45, 59, 57, 59, 897, 60, 168, 46, 12, 58, 59, 954, 60, 49, 46, 23, 58, 59, 0, 134, 47, 46, 58, 58, 57, 58, 134, 168, 44, 34, 59, 58, 116, 134, 49, 45, 47, 60, 64, 175, 134, 64, 51, 24, 61, 60, 235, 134, 50, 47, 56, 61, 53, 296, 134, 169, 40, 57, 61, 56, 357, 134, 169, 43, 33, 62, 57, 418, 134, 52, 44, 55, 63, 50, 480, 134, 170, 37, 26, 65, 66, 543, 134, 54, 53, 52, 65, 73, 608, 134, 176, 65, 25, 66, 62, 673, 134, 55, 49, 54, 66, 46, 739, 134, 172, 33, 32, 67, 56, 805, 134, 57, 43, 31, 68, 55, 872, 134, 59, 42, 48, 69, 63, 940, 134, 90, 71, 51, 70, 62, 0, 207, 174, 66, 53, 70, 43, 70, 207, 173, 29, 30, 72, 55, 140, 207, 63, 42, 28, 74, 63, 212, 207, 65, 50, 50, 77, 57, 286, 207, 149, 75, 29, 83, 54, 363, 207, 75, 41, 49, 86, 52, 446, 207, 124, 85]);
  (bb_data_fastzombiesprites = [19, 52, 59, 0, 0, 16, 42, 16, 60, 58, 52, 0, 20, 41, 9, 61, 67, 112, 0, 38, 50, 18, 61, 58, 173, 0, 23, 41, 24, 61, 57, 234, 0, 28, 40, 3, 63, 65, 295, 0, 37, 50, 4, 63, 65, 358, 0, 37, 50, 17, 63, 58, 421, 0, 17, 41, 10, 64, 67, 484, 0, 38, 50, 15, 64, 61, 548, 0, 24, 43, 8, 67, 68, 612, 0, 38, 51, 23, 67, 57, 679, 0, 34, 40, 14, 68, 62, 746, 0, 29, 45, 2, 69, 66, 814, 0, 38, 50, 20, 69, 60, 883, 0, 34, 43, 5, 71, 64, 952, 0, 37, 50, 1, 72, 67, 0, 68, 37, 51, 11, 72, 66, 72, 68, 38, 51, 13, 72, 67, 144, 68, 37, 51, 6, 73, 67, 216, 68, 37, 51, 7, 74, 68, 289, 68, 38, 51, 12, 74, 65, 363, 68, 38, 51, 22, 78, 59, 437, 68, 45, 42, 21, 79, 59, 515, 68, 45, 42]);
  (bb_data_fatzombiesprites = [60, 139, 105, 0, 0, 78, 88, 61, 119, 106, 139, 0, 58, 89, 62, 108, 106, 258, 0, 47, 89, 20, 119, 107, 366, 0, 45, 91, 43, 122, 107, 485, 0, 50, 90, 54, 159, 107, 607, 0, 97, 86, 55, 156, 107, 766, 0, 94, 87, 63, 103, 107, 922, 0, 43, 90, 19, 116, 108, 1025, 0, 43, 91, 21, 122, 108, 1141, 0, 46, 91, 22, 122, 108, 1263, 0, 44, 91, 41, 109, 108, 1385, 0, 39, 91, 42, 114, 108, 1494, 0, 43, 91, 64, 101, 108, 1608, 0, 40, 91, 65, 100, 108, 1709, 0, 37, 91, 1, 100, 109, 1809, 0, 32, 92, 15, 104, 109, 1909, 0, 35, 92, 16, 107, 109, 0, 109, 37, 92, 17, 110, 109, 107, 109, 39, 92, 18, 113, 109, 217, 109, 41, 92, 23, 121, 109, 330, 109, 42, 92, 24, 116, 109, 451, 109, 40, 92, 35, 100, 109, 567, 109, 31, 92, 36, 100, 109, 667, 109, 31, 92, 37, 100, 109, 767, 109, 31, 92, 38, 100, 109, 867, 109, 32, 92, 39, 100, 109, 967, 109, 32, 92, 40, 104, 109, 1067, 109, 35, 92, 56, 205, 109, 1171, 109, 143, 87, 57, 216, 109, 1376, 109, 154, 87, 66, 100, 109, 1592, 109, 35, 92, 67, 100, 109, 1692, 109, 33, 92, 68, 100, 109, 1792, 109, 33, 92, 2, 100, 110, 1892, 109, 32, 93, 3, 100, 110, 0, 219, 32, 93, 12, 101, 110, 100, 219, 32, 93, 13, 100, 110, 201, 219, 32, 93, 14, 102, 110, 301, 219, 33, 93, 25, 111, 110, 403, 219, 38, 93, 33, 100, 110, 514, 219, 31, 93, 34, 100, 110, 614, 219, 31, 93, 4, 100, 111, 714, 219, 32, 94, 5, 100, 111, 814, 219, 32, 94, 11, 100, 111, 914, 219, 32, 94, 26, 106, 111, 1014, 219, 35, 94, 27, 102, 111, 1120, 219, 33, 94, 30, 100, 111, 1222, 219, 32, 94, 31, 99, 111, 1322, 219, 31, 94, 32, 99, 111, 1421, 219, 31, 94, 44, 123, 111, 1520, 219, 52, 94, 6, 100, 112, 1643, 219, 32, 95, 7, 99, 112, 1743, 219, 31, 95, 9, 99, 112, 1842, 219, 31, 95, 10, 100, 112, 1941, 219, 32, 95, 28, 100, 112, 0, 331, 32, 95, 29, 100, 112, 100, 331, 32, 95, 8, 99, 113, 200, 331, 31, 96, 45, 123, 122, 299, 331, 53, 105, 58, 228, 129, 422, 331, 166, 107, 46, 124, 131, 650, 331, 54, 114, 47, 124, 141, 774, 331, 54, 124, 59, 205, 145, 898, 331, 144, 128, 48, 116, 147, 1103, 331, 47, 130, 49, 111, 151, 1219, 331, 42, 134, 50, 110, 153, 1330, 331, 41, 136, 51, 104, 154, 1440, 331, 41, 137, 53, 151, 157, 1544, 331, 89, 140, 52, 106, 159, 1695, 331, 44, 142]);
  (bb_data_catapultsprites = [61, 129, 65, 0, 0, 42, 49, 62, 129, 65, 129, 0, 42, 49, 63, 129, 65, 258, 0, 42, 49, 64, 129, 65, 387, 0, 42, 49, 65, 129, 65, 516, 0, 42, 49, 66, 129, 65, 645, 0, 42, 49, 67, 129, 65, 774, 0, 42, 49, 68, 129, 65, 903, 0, 42, 49, 69, 129, 65, 1032, 0, 42, 49, 70, 129, 65, 1161, 0, 42, 49, 71, 129, 65, 1290, 0, 42, 49, 77, 129, 65, 1419, 0, 42, 49, 78, 129, 65, 1548, 0, 42, 49, 79, 129, 65, 1677, 0, 42, 49, 80, 129, 65, 1806, 0, 42, 49, 60, 129, 66, 0, 65, 42, 50, 76, 129, 66, 129, 65, 42, 50, 57, 129, 67, 258, 65, 42, 51, 58, 129, 67, 387, 65, 42, 51, 59, 129, 67, 516, 65, 42, 51, 56, 129, 68, 645, 65, 42, 52, 55, 129, 69, 774, 65, 43, 53, 72, 129, 69, 903, 65, 42, 53, 54, 128, 70, 1032, 65, 42, 54, 74, 129, 71, 1160, 65, 42, 55, 73, 129, 72, 1289, 65, 42, 56, 75, 129, 72, 1418, 65, 42, 56, 53, 126, 73, 1547, 65, 42, 57, 52, 125, 76, 1673, 65, 42, 60, 51, 124, 79, 1798, 65, 42, 63, 50, 122, 83, 1922, 65, 42, 67, 49, 120, 86, 0, 148, 42, 70, 48, 119, 89, 120, 148, 42, 73, 47, 117, 93, 239, 148, 42, 77, 46, 117, 95, 356, 148, 42, 79, 45, 116, 99, 473, 148, 42, 83, 81, 114, 102, 589, 148, 43, 86, 44, 115, 103, 703, 148, 42, 87, 43, 114, 106, 818, 148, 42, 90, 7, 113, 108, 932, 148, 42, 93, 12, 113, 108, 1045, 148, 42, 93, 20, 113, 108, 1158, 148, 42, 93, 21, 113, 108, 1271, 148, 42, 93, 22, 113, 108, 1384, 148, 42, 93, 1, 113, 109, 1497, 148, 42, 93, 2, 113, 109, 1610, 148, 42, 93, 3, 113, 109, 1723, 148, 42, 93, 4, 113, 109, 1836, 148, 42, 93, 5, 113, 109, 0, 257, 42, 93, 6, 113, 109, 113, 257, 42, 93, 8, 113, 109, 226, 257, 42, 93, 9, 113, 109, 339, 257, 42, 93, 10, 113, 109, 452, 257, 42, 93, 11, 113, 109, 565, 257, 42, 93, 13, 113, 109, 678, 257, 42, 93, 14, 113, 109, 791, 257, 42, 93, 15, 113, 109, 904, 257, 42, 93, 16, 113, 109, 1017, 257, 42, 93, 17, 113, 109, 1130, 257, 42, 93, 18, 113, 109, 1243, 257, 42, 93, 19, 113, 109, 1356, 257, 42, 93, 23, 113, 109, 1469, 257, 42, 93, 24, 113, 109, 1582, 257, 42, 93, 25, 113, 109, 1695, 257, 42, 93, 26, 113, 109, 1808, 257, 42, 93, 27, 113, 109, 1921, 257, 42, 93, 28, 113, 109, 0, 366, 42, 93, 29, 113, 109, 113, 366, 42, 93, 30, 113, 109, 226, 366, 42, 93, 31, 113, 109, 339, 366, 42, 93, 32, 113, 109, 452, 366, 42, 93, 33, 113, 109, 565, 366, 42, 93, 34, 113, 109, 678, 366, 42, 93, 35, 113, 109, 791, 366, 42, 93, 36, 113, 109, 904, 366, 42, 93, 37, 113, 109, 1017, 366, 42, 93, 38, 113, 109, 1130, 366, 42, 93, 39, 113, 109, 1243, 366, 42, 93, 40, 113, 109, 1356, 366, 42, 93, 41, 113, 109, 1469, 366, 42, 93, 42, 113, 109, 1582, 366, 42, 93, 88, 113, 109, 1695, 366, 42, 93, 89, 112, 111, 1808, 366, 42, 95, 94, 112, 111, 1920, 366, 42, 95, 93, 111, 112, 0, 477, 42, 96, 90, 112, 113, 111, 477, 43, 97, 92, 111, 113, 223, 477, 43, 97, 91, 110, 115, 334, 477, 43, 99, 87, 106, 116, 444, 477, 43, 100, 86, 103, 122, 550, 477, 43, 106, 85, 103, 128, 653, 477, 43, 112, 84, 103, 134, 756, 477, 43, 118, 83, 103, 139, 859, 477, 43, 123, 82, 103, 144, 962, 477, 43, 128]);
  (bb_data_flingsprites = [5, 82, 37, 0, 0, 34, 258, 6, 81, 39, 82, 0, 34, 255, 4, 80, 42, 163, 0, 32, 268, 7, 80, 46, 0, 42, 34, 239, 3, 78, 51, 80, 42, 30, 278, 8, 77, 54, 158, 42, 33, 222, 2, 74, 59, 0, 96, 26, 274, 9, 73, 60, 74, 96, 32, 205, 1, 68, 66, 147, 96, 22, 268, 10, 67, 68, 0, 162, 30, 171, 11, 61, 73, 67, 162, 29, 135, 12, 53, 76, 128, 162, 25, 99, 13, 45, 80, 181, 162, 23, 66]);
  (bb_data_zombieparts = [4, 45, 23, 0, 0, 9, 50, 6, 42, 28, 45, 0, 7, 49, 1, 30, 31, 87, 0, (- 6), 63, 5, 28, 38, 117, 0, (- 9), 52, 2, 31, 43, 145, 0, (- 4), 35, 3, 34, 43, 176, 0, (- 14), 36]);
  (bb_data_ghoulparts = [3, 34, 25, 0, 0, (- 58), 26, 1, 25, 29, 34, 0, (- 68), 26, 2, 33, 29, 59, 0, (- 68), 16, 8, 34, 29, 92, 0, (- 48), 46, 4, 30, 33, 126, 0, (- 56), 20, 7, 35, 33, 156, 0, (- 58), 39, 5, 34, 36, 191, 0, (- 46), 39, 6, 35, 38, 0, 36, (- 45), 38]);
  (bb_data_fastzombieparts = [5, 44, 25, 0, 0, (- 2), 33, 8, 43, 25, 44, 0, (- 3), 33, 3, 39, 27, 87, 0, 17, 36, 7, 32, 30, 126, 0, 1, 29, 4, 32, 32, 158, 0, 1, 31, 1, 32, 35, 190, 0, (- 8), 18, 2, 48, 36, 0, 35, 15, 20, 9, 33, 41, 48, 35, 7, 41, 6, 33, 42, 81, 35, 7, 42]);
  (bb_data_fatzombieparts = [6, 38, 34, 0, 0, 7, 74, 5, 60, 46, 38, 0, 5, 108, 2, 59, 48, 98, 0, 12, 45, 3, 62, 56, 157, 0, 11, 34, 7, 83, 58, 0, 56, 15, 82, 8, 81, 61, 83, 56, 41, 77, 1, 68, 70, 164, 56, 34, 61, 4, 67, 73, 0, 126, 3, 57]);
  (bb_data_jetsprites = [3, 57, 33, 0, 0, 140, 18, 2, 62, 34, 57, 0, 139, 19, 4, 62, 34, 119, 0, 139, 18, 5, 43, 35, 181, 0, 103, (- 19), 6, 43, 35, 224, 0, 103, (- 19), 7, 45, 37, 267, 0, 104, (- 17), 8, 46, 39, 312, 0, 104, (- 15), 9, 47, 41, 358, 0, 105, (- 12), 10, 50, 44, 405, 0, 106, (- 8), 11, 52, 47, 455, 0, 107, (- 3), 12, 57, 51, 0, 47, 110, 3, 13, 62, 55, 57, 47, 113, 9, 14, 69, 59, 119, 47, 116, 16, 15, 79, 61, 188, 47, 121, 23, 16, 89, 63, 267, 47, 126, 31, 17, 99, 68, 356, 47, 131, 40, 1, 192, 71, 0, 115, 109, 49]);
  (bb_data_harvestsprites = [6, 61, 61, 0, 0, 91, 46, 5, 79, 79, 61, 0, (- 9), 63, 1, 399, 180, 140, 0, 180, 166, 2, 402, 180, 539, 0, 180, 166, 3, 406, 180, 0, 180, 180, 166, 4, 405, 180, 406, 180, 180, 166]);
  (bb_data_clocksprites = [25, 32, 32, 0, 0, 0, 0, 26, 32, 32, 32, 0, 0, 0, 27, 32, 32, 64, 0, 0, 0, 28, 31, 32, 96, 0, (- 1), 0, 29, 27, 32, 127, 0, (- 5), 0, 30, 23, 32, 154, 0, (- 9), 0, 31, 20, 32, 177, 0, (- 12), 0, 24, 32, 33, 197, 0, 0, 0, 23, 32, 36, 0, 33, 0, 0, 22, 32, 40, 32, 33, 0, 0, 21, 32, 44, 64, 33, 0, 0, 1, 48, 48, 96, 33, 0, 0, 2, 48, 48, 144, 33, 0, 0, 3, 48, 48, 192, 33, 0, 0, 4, 48, 48, 0, 81, 0, 0, 5, 48, 48, 48, 81, 0, 0, 6, 48, 48, 96, 81, 0, 0, 7, 48, 48, 144, 81, 0, 0, 8, 48, 48, 192, 81, 0, 0, 9, 48, 48, 0, 129, 0, 0, 10, 48, 48, 48, 129, 0, 0, 11, 48, 48, 96, 129, 0, 0, 12, 48, 48, 144, 129, 0, 0, 13, 46, 48, 192, 129, 0, 0, 14, 41, 48, 0, 177, 0, 0, 15, 37, 48, 41, 177, 0, 0, 16, 34, 48, 78, 177, 0, 0, 17, 32, 48, 112, 177, 0, 0, 18, 32, 48, 144, 177, 0, 0, 19, 32, 48, 176, 177, 0, 0, 20, 32, 48, 208, 177, 0, 0]);
  (bb_data_basesprites = [1, 253, 169, 0, 0, 116, 154, 2, 254, 169, 253, 0, 117, 154, 3, 255, 169, 507, 0, 118, 154, 4, 256, 169, 762, 0, 119, 154, 5, 254, 169, 0, 169, 117, 154, 6, 253, 169, 254, 169, 116, 154, 7, 253, 169, 507, 169, 116, 154, 8, 253, 169, 760, 169, 116, 154, 9, 253, 169, 0, 338, 116, 154, 10, 254, 169, 253, 338, 117, 154, 11, 253, 169, 507, 338, 116, 154]);
  (bb_data_bitsprites = [1, 27, 23, 0, 0, 9, 9, 3, 22, 23, 27, 0, 4, 6, 4, 28, 25, 49, 0, 9, 9, 2, 29, 28, 77, 0, 9, 8]);
  (bb_data_bloodsprites = [11, 27, 30, 0, 0, (- 2), 53, 7, 32, 36, 27, 0, (- 1), 57, 1, 33, 46, 59, 0, (- 1), 63, 12, 33, 31, 92, 0, (- 7), 48, 13, 35, 41, 125, 0, (- 12), 46, 2, 42, 54, 160, 0, (- 4), 62, 8, 42, 41, 202, 0, (- 5), 53, 14, 44, 39, 244, 0, (- 19), 27, 15, 50, 25, 288, 0, (- 20), 12, 9, 53, 43, 338, 0, (- 12), 33, 3, 55, 59, 391, 0, (- 10), 51, 16, 55, 24, 446, 0, (- 20), 10, 4, 56, 53, 501, 0, (- 17), 41, 10, 56, 24, 557, 0, (- 19), 11, 5, 62, 33, 613, 0, (- 19), 21, 6, 71, 24, 675, 0, (- 17), 12]);
  (bb_data_bigbloodsprites = [8, 133, 24, 0, 0, 44, 11, 7, 133, 37, 0, 24, 44, 24, 6, 124, 49, 0, 61, 44, 36, 1, 82, 52, 124, 61, 35, 46, 5, 113, 57, 0, 113, 43, 44, 4, 104, 60, 113, 113, 41, 48, 3, 92, 64, 0, 173, 38, 53, 2, 127, 73, 92, 173, 57, 62]);
  (bb_data_explosionsprites = [1, 65, 54, 0, 0, 29, 39, 2, 65, 54, 65, 0, 29, 39, 12, 71, 21, 130, 0, 26, 104, 3, 140, 86, 201, 0, 57, 71, 4, 158, 88, 341, 0, 66, 71, 5, 177, 106, 499, 0, 76, 88, 6, 199, 119, 676, 0, 86, 100, 7, 199, 115, 0, 119, 86, 100, 8, 221, 120, 199, 119, 98, 103, 9, 221, 120, 420, 119, 98, 103, 10, 239, 124, 641, 119, 104, 109, 11, 239, 124, 0, 243, 104, 109]);
  (bb_data_ignitionsprites = [12, 71, 21, 0, 0, 33, 110, 1, 65, 54, 71, 0, 36, 45, 2, 65, 54, 136, 0, 36, 45, 3, 140, 86, 201, 0, 64, 77, 4, 158, 88, 341, 0, 73, 77, 5, 177, 106, 499, 0, 83, 94, 7, 199, 115, 676, 0, 93, 106, 6, 199, 119, 0, 115, 93, 106, 8, 221, 120, 199, 115, 105, 109, 9, 221, 120, 420, 115, 105, 109, 10, 239, 124, 641, 115, 111, 115, 11, 239, 124, 0, 239, 111, 115]);
  (bb_data_shoveldeath = [5, 87, 43, 0, 0, 75, 15, 4, 82, 47, 87, 0, 70, 28, 3, 77, 72, 169, 0, 65, 55, 1, 70, 84, 0, 72, 39, 66, 2, 73, 85, 70, 72, 49, 66]);
  (bb_data_shotgundeath = [6, 91, 43, 0, 0, 59, 13, 5, 86, 48, 91, 0, 54, 18, 4, 80, 70, 0, 48, 46, 43, 1, 77, 86, 80, 48, 21, 61, 3, 77, 87, 157, 48, 34, 61, 2, 78, 89, 0, 135, 29, 63]);
  (bb_data_bomberhead = [0, 30, 29, 0, 0, 59, 62]);
  (bb_data_preacherdeath = [18, 93, 31, 0, 0, 15, 15, 7, 79, 55, 93, 0, 4, 44, 8, 84, 58, 172, 0, 7, 45, 9, 87, 59, 256, 0, 10, 46, 10, 91, 62, 343, 0, 13, 47, 11, 93, 64, 0, 62, 15, 48, 6, 75, 65, 93, 62, 1, 54, 12, 93, 66, 168, 62, 15, 50, 13, 93, 69, 261, 62, 15, 53, 14, 93, 71, 354, 62, 15, 55, 5, 73, 73, 0, 133, (- 3), 62, 15, 93, 74, 73, 133, 15, 58, 3, 57, 76, 166, 133, (- 24), 62, 2, 46, 77, 223, 133, (- 35), 63, 4, 66, 77, 269, 133, (- 13), 64, 16, 93, 77, 335, 133, 15, 61, 1, 45, 79, 428, 133, (- 39), 64, 17, 93, 79, 0, 212, 15, 63]);
  (bb_data_extrablood = [14, 63, 21, 0, 0, (- 9), 12, 8, 72, 23, 63, 0, 3, 13, 7, 68, 30, 135, 0, 3, 20, 13, 63, 36, 0, 30, (- 4), 27, 6, 63, 40, 63, 30, 3, 30, 9, 67, 40, 126, 30, 60, 52, 10, 68, 43, 0, 70, 42, 52, 11, 72, 46, 68, 70, 28, 50, 1, 44, 47, 140, 70, 46, 49, 12, 65, 48, 184, 70, 7, 40, 2, 40, 50, 0, 118, 26, 54, 5, 56, 51, 40, 118, 3, 41, 4, 53, 53, 96, 118, 8, 43, 3, 45, 54, 149, 118, 18, 52]);
  (bb_data_harvestblood = [2, 82, 76, 0, 0, 18, 96, 4, 90, 88, 82, 0, 27, 96, 5, 81, 89, 172, 0, 17, 99, 1, 98, 92, 253, 0, 34, 96, 6, 88, 93, 351, 0, 22, 99, 3, 84, 98, 0, 93, 22, 94]);
  (bb_data_unitname = ["Shovel Man", "Angry Farmer", "Survivalist", "Moonshine Bomber", "Preacher Man", "Base"]);
  (bb_data_unitdata = [50, 1, 5, 50, 10, 3, 0, 1, 10, 0, 200, 6, 4, 100, 15, 4, 2, 2, 20, 12, 900, 10, 15, 400, 5, 2, 3, 5, 90, (- 65), 350, 6, 4, 80, 60, 10, 4, 2, 10, 0, 1500, 30, 5, 100, 0, 1, 5, 3, 12, 4, 0, 0, 0, 4000, 0, 0, 0, 0, 80, 0]);
  (bb_data_zombiename = ["Zombie", "Jumping Ghoul", "Fast Zombie", "Big Fat Zombie", "Corpse Thrower", "Base"]);
  (bb_data_zombiedata = [20, 1, 3, 25, 10, 1, 0, 0, 16, 16, 100, 2, 6, 60, 16, 1, 0, 0, 16, (- 20), 400, 2, 15, 150, 20, 1, 0, 0, 14, 0, 500, 4, 3, 1000, 60, 2, 0, 0, 50, 10, 1000, 5, 2, 1500, 100, 1, 0, 0, 120, 0, 0, 0, 0, 16000, 0, 0, 0, 0, 80, 20]);
  (bb_data_buildingname = ["Trailer", "Salvage Yard", "Farm House", "Garage", "Still", "Chapel"]);
  (bb_data_buildingdata = [250, 3, 0, 15, 500, 3, 0, 5, 1000, 5, 0, 1, 1500, 5, 2, 1, 1200, 10, 2, 1, 1500, 20, 3, 1]);
  (bb_data_wmdxp = [3000, 4000, 5000]);
  (bb_data_wmdcooldown = [5000, 10000, 10000]);
  (bb_Gore.bbsprites1 = null);
  (bb_Gore.bbsprites2 = null);
  (bb_Gore.bbsprites3 = null);
  (bb_Gore.bbgore = new bb_std_list_List().bbList_new());
  (bb_Gore.bbrecyclegore = new bb_std_list_List().bbList_new());
  (bb_Gore.bbfreegore = new bb_std_list_List().bbList_new());
  (bb_std_random_Seed = __as3_int(1234));
  (bb_leveldata_level1 = [1, 5, 3, 0, 1, 4, 1, 10, 2, 0, 1, 4, 1, 20, 2, 2, 2, 3, 1, 20, 1, 0, 1, 5, 1, 20, 2, 0, 1, 3, 2, 2, 2, 1, 15, 1, 2, 1, 4, 1, 30, 1.5, 2, 5, 2, 1, 30, 0.5, 0, 1, 5, 3, 1, 1, 0, 1, 4, 1, 50, 0.8, 3, 2, 2, 1, 8, 1, 4, 1, 3, 1, 8, 1, 1, 8, 1, 4, 1, 3, 2, 5, 2, 3, 2, 4, 1, 20, 1, 2, 10, 1, 3, 3, 2, 4, 1, 3, 1, 10, 1, 2, 10, 2, 1, 20, 0.6, 0, 1, 3, 4, 2, 4, 0, 1, 5, 3, 1, 2, 1, 50, 0.7, 0, 1, 5, 2, 5, 2, 3, 2, 2, 4, 1, 2, 1, 10, 0.5, 5, 1, 1, 3, 3, 2, 1, 20, 0.5, 2, 15, 1.5, 3, 4, 2.5, 4, 2, 2, 0, 1, 6, 4, 5, 5, 1, 100, 0.5, 5, 2, 5, 3, 5, 2.5, 4, 3, 3.5, 5, 3, 5, 4, 5, 3, 3, 10, 2.5, 5, 2, 3, 4, 20, 2, 1, 100, 0.5, 5, 3, 3, 3, 20, 1.5, 4, 50, 2]);
  (bb_ZombieMob.bbqueue = new bb_std_list_List().bbList_new());
  (bb_leveldata_level2 = [1, 5, 3, 0, 1, 4, 1, 10, 2, 0, 1, 4, 2, 1, 1, 1, 20, 1.5, 2, 4, 3, 1, 20, 1, 0, 1, 5, 1, 20, 1.5, 0, 1, 3, 3, 1, 2, 1, 15, 1, 2, 1, 4, 1, 30, 1, 2, 10, 2, 1, 25, 0.5, 0, 1, 5, 4, 1, 1, 0, 1, 4, 1, 50, 0.5, 3, 2, 2, 1, 8, 1, 4, 1, 3, 1, 8, 1, 4, 1, 2, 1, 8, 1, 4, 1, 3, 2, 5, 1, 3, 1, 2, 1, 20, 0.7, 2, 10, 1, 3, 3, 2, 4, 1, 2, 1, 10, 1, 2, 10, 2, 1, 20, 0.6, 0, 1, 3, 4, 2, 4, 0, 1, 5, 5, 1, 2, 1, 50, 0.5, 0, 1, 5, 2, 5, 2, 3, 4, 2, 4, 1, 2, 1, 10, 0.5, 5, 1, 1, 3, 4, 2, 1, 20, 0.5, 2, 30, 1.5, 3, 4, 2.5, 4, 2, 2, 0, 1, 6, 4, 4, 5, 1, 100, 0.5, 5, 2, 5, 3, 10, 2.5, 4, 4, 3.5, 5, 3, 5, 4, 10, 3, 3, 10, 2.5, 5, 2, 3, 4, 20, 2, 1, 100, 0.5, 5, 3, 3, 3, 20, 1.5, 4, 50, 2]);
  (bb_leveldata_level3 = [1, 5, 3, 0, 1, 4, 1, 10, 2, 0, 1, 4, 2, 1, 1, 1, 20, 1.5, 2, 4, 3, 1, 20, 1, 0, 1, 5, 1, 20, 1.5, 0, 1, 3, 3, 1, 2, 1, 15, 1, 3, 2, 4, 1, 30, 1, 2, 10, 2, 1, 30, 0.5, 0, 1, 5, 4, 1, 1, 0, 1, 4, 1, 50, 0.5, 3, 3, 2, 1, 8, 1, 4, 2, 3, 1, 8, 1, 4, 1, 2, 1, 8, 1, 4, 1, 3, 2, 5, 1, 3, 2, 2, 1, 20, 0.7, 2, 10, 1, 3, 4, 2, 4, 1, 2, 1, 10, 1, 2, 15, 2, 1, 20, 0.6, 0, 1, 3, 4, 2, 4, 0, 1, 5, 5, 1, 2, 1, 50, 0.5, 0, 1, 5, 2, 5, 2, 3, 6, 2, 4, 1, 2, 1, 10, 0.5, 5, 1, 1, 3, 5, 2, 1, 20, 0.5, 2, 30, 1.5, 3, 5, 2.5, 4, 2, 2, 0, 1, 6, 4, 5, 5, 1, 100, 0.5, 5, 2, 5, 3, 10, 2.5, 4, 6, 3.5, 5, 3, 5, 4, 10, 3, 3, 10, 2.5, 5, 2, 3, 4, 20, 2, 1, 100, 0.5, 5, 3, 3, 3, 20, 1.5, 4, 50, 2]);
  (bb_leveldata_level4 = [1, 10, 2, 0, 1, 4, 1, 10, 2, 0, 1, 4, 2, 1, 1, 1, 20, 1.5, 2, 4, 3, 1, 20, 1, 0, 1, 5, 1, 20, 1, 0, 1, 3, 3, 1, 2, 1, 15, 1, 3, 3, 4, 1, 30, 1, 2, 10, 1.5, 1, 30, 0.5, 0, 1, 5, 4, 1, 1, 0, 1, 4, 1, 50, 0.5, 3, 4, 2, 1, 8, 1, 4, 2, 2, 1, 8, 1, 4, 1, 2, 1, 8, 1, 4, 1, 3, 2, 6, 1, 3, 3, 2, 1, 20, 0.7, 2, 10, 1, 3, 4, 2, 4, 3, 2, 1, 10, 1, 2, 15, 2, 1, 20, 0.6, 0, 1, 3, 4, 3, 4, 0, 1, 5, 5, 1, 2, 1, 50, 0.5, 0, 1, 5, 2, 5, 2, 3, 7, 2, 4, 1, 2, 1, 10, 0.5, 5, 1, 1, 3, 5, 2, 1, 20, 0.5, 2, 30, 1.5, 3, 5, 2.5, 4, 2, 2, 0, 1, 6, 4, 6, 5, 1, 100, 0.5, 5, 2, 5, 3, 10, 2.5, 4, 6, 3.5, 5, 3, 4, 4, 10, 3, 3, 15, 2.5, 5, 2, 3, 4, 20, 2, 1, 100, 0.5, 5, 3, 3, 3, 20, 1.5, 4, 50, 1.5]);
  (bb_ZombieMob.bbticks = __as3_int(0));
  (bb_data_difficultyname = ["Early to Dead, Early to Rise", "A kick in the Dead", "Nothing Ventured, Nothing Brained", "Trash Talks, Dead Walks"]);
  (bb_data_difficultytitle = ["Stage 1:", "Stage 2:", "Stage 3:", "Stage 4:"]);
  (bb_data_junkpos = [(- 140), 250, 1, (- 60), 245, 0.8, 30, 240, 0.6, (- 170), 245, 0.9, (- 80), 235, 0.7]);
  (bb_data_trailerpos = [190, 312, 1, 100, 314, 1, 230, 304, 0.8, 170, 300, 0.8, 100, 302, 0.8, 250, 294, 0.7, 197, 294, 0.7, 140, 295, 0.7, 85, 294, 0.7, 250, 284, 0.56, 215, 284, 0.56, 180, 280, 0.56, 145, 284, 0.56, 110, 284, 0.56, 75, 284, 0.56]);
  (bb_data_unitabout = ["Uses a shovel to smash zombies good.", "Armed with a shotgun and an attitude, this man shoots zombies with extreme prejudice.", "A .50cal machine gun mounted on a fast pickup truck. \'Nuff said.", "These guys can lob their vile cocktails to explosive effect.", "Through the power of faith the Preacher converts the damned into friendly units."]);
  (bb_data_buildingabout = ["Each Trailer increases your maximum people limit by 5.", "Each Salvage Yard generates $50 every 5 seconds.", "Enables you to make Angry Farmers", "Enables you to make Survivalists", "Enables you to make Moonshine Bombers", "Allows you to make Preachers"]);
  (bb_data_wmdabout = ["A charging mob with a bone to pick with the zombies.", "Strap a brick onto the gas pedal and off she goes!", "Cousin Earl made it into the air force. He gets paid a lot more than you."]);
  (bb_data_wmdname = ["Angry Mob", "Harvester", "Air Strike"]);
  ((__as3_stringValue0) => (bb_data_WinMessage = __as3_nullableString(__as3_stringValue0), __as3_stringValue0))("Yee-haw - you win! You stomped them there zombies!\n\nPost Score to share news of your Trailer Park survival.");
  ((__as3_stringValue1) => (bb_data_LoseMessage = __as3_nullableString(__as3_stringValue1), __as3_stringValue1))("Game Over... Whatever you had in your trailer, the zombies are eatin\' it. Sorry, Rover.");
}

// Expose the port for browser integration and deterministic test tooling.
globalThis.ZTPGamePort = {
  bb_mojo_app_App,
  bb_NativeApp,
  bb_Zomba,
  bb_mojo_app_AppDevice,
  bb_mojo_graphics_GraphicsContext,
  bb_Sounds,
  bb_mojo_graphics_Image,
  bb_mojo_graphics_Frame,
  bb_mojo_audio_Sound,
  bb_std_boxes_IntObject,
  bb_std_map_Map,
  bb_std_map_Node,
  bb_imagefont_ImageFont,
  bb_imagefont_Glyph,
  bb_spritesheet_SpriteSheet,
  bb_spritesheet_Sprite,
  bb_Unit,
  bb_Building,
  bb_Power,
  bb_Body,
  bb_Gore,
  bb_std_list_List,
  bb_std_list_Node,
  bb_Blood,
  bb_Fling,
  bb_Cell,
  bb_std_list_Enumerator,
  bb_Bottle,
  bb_Explosion,
  bb_Zombie,
  bb_BodyPart,
  bb_ZTPGame,
  bb_Person,
  bb_PowerUp,
  bb_Smoke,
  bb_Death,
  bb_ZombieMob,
  new_bool_array,
  new_number_array,
  new_string_array,
  new_object_array,
  resize_number_array,
  resize_string_array,
  resize_object_array,
  string_join,
  string_trim,
  string_starts_with,
  string_ends_with,
  bb_Print,
  bb_mojo_graphics_SetGraphicsContext,
  bb_mojo_input_SetInputDevice,
  bb_mojo_audio_SetAudioDevice,
  bb_Main,
  bb_mojo_graphics_LoadImage,
  bb_mojo_graphics_LoadImage2,
  bb_mojo_audio_LoadSound,
  bb_mojo_audio_PlaySound,
  bb_mojo_app_SetUpdateRate,
  bb_mojo_input_KeyHit,
  bb_mojo_app_Millisecs,
  bb_std_random_Rnd,
  bb_std_math_Abs,
  bb_std_math_Abs2,
  bb_std_random_Rnd2,
  bb_std_random_Rnd3,
  bb_Rand,
  bb_reversebits,
  bb_mojo_graphics_DeviceWidth,
  bb_mojo_graphics_DeviceHeight,
  bb_mojo_graphics_SetMatrix,
  bb_mojo_graphics_Transform,
  bb_mojo_graphics_Scale,
  bb_mojo_graphics_SetColor,
  bb_mojo_graphics_ValidateMatrix,
  bb_mojo_graphics_DrawRect,
  bb_mojo_graphics_PushMatrix,
  bb_mojo_graphics_Translate,
  bb_mojo_graphics_PopMatrix,
  bb_mojo_graphics_DrawImage,
  bb_mojo_graphics_Rotate,
  bb_mojo_graphics_DrawImage2,
  bb_mojo_graphics_Cls,
  bb_mojo_input_MouseX,
  bb_mojo_input_MouseY,
  bb_mojo_input_KeyDown,
  bb_mojo_audio_StopChannel,
  bb_mojo_graphics_DrawPoint,
  bb_mojo_graphics_DrawImageRect,
  bb_mojo_graphics_DrawImageRect2,
  bb_mojo_graphics_BeginRender,
  bb_mojo_graphics_EndRender,
  bb_Init,
  get state() { return { bb_Game, bb_Audio, bb_mojo_app_device, bb_mojo_graphics_context, bb_std_random_Seed }; },
  setRandomSeed(value) { bb_std_random_Seed = __as3_int(value); }
};
Object.assign(globalThis, globalThis.ZTPGamePort);
