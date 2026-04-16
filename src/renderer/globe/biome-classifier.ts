import { BiomeType } from '../../types';
import { isLand } from './land-mask';

const B = BiomeType;

export function isRiverOrLake(lat: number, lon: number): boolean {
    if(lat>-4&&lat<6&&lon>-72&&lon<-50&&Math.abs(lat-(-2+lon*.05))<1.5) return true;
    if(lat>5&&lat<32&&lon>29&&lon<32&&Math.abs(lon-30.5)<1) return true;
    if(lat>29&&lat<48&&lon>-92&&lon<-88) return true;
    if(lat>22&&lat<31&&lon>78&&lon<90&&Math.abs(lat-26)<2) return true;
    if(lat>-5&&lat<5&&lon>17&&lon<30) return true;
    if(lat>48&&lat<62&&lon>68&&lon<90&&Math.abs(lat-55)<2) return true;
    if(lat>28&&lat<33&&lon>90&&lon<122&&Math.abs(lat-30)<1.5) return true;
    if(lat>41&&lat<48&&lon>-89&&lon<-76) return true;
    if(lat>-3&&lat<1&&lon>29&&lon<35) return true;
    if(lat>37&&lat<47&&lon>48&&lon<54) return true;
    if(lat>51&&lat<56&&lon>104&&lon<110) return true;
    if(lat>-15&&lat<-8&&lon>29&&lon<32) return true;
    if(lat>-17&&lat<-15&&lon>-70.5&&lon<-69) return true;
    if(lat>44&&lat<47&&lon>58&&lon<62) return true;
    return false;
}

export function isIceCap(lat: number, lon: number): boolean {
    if(lat<-60) return true;
    if(lat>65&&lat<84&&lon>-52&&lon<-20) return true;
    if(lat>80) return true;
    return false;
}

export function isSnowGlacier(lat: number, lon: number): boolean {
    if(isIceCap(lat,lon)) return false;
    if(lat>-52&&lat<-46&&lon>-75&&lon<-72) return true;
    if(lat>-55&&lat<-53&&lon>-72&&lon<-68) return true;
    if(lat>30&&lat<36&&lon>76&&lon<95) return true;
    if(lat>35&&lat<37&&lon>74&&lon<78) return true;
    if(lat>45&&lat<47&&lon>7&&lon<13) return true;
    if(lat>64&&lat<66&&lon>-20&&lon<-15) return true;
    if(lat>76&&lat<80&&lon>10&&lon<28) return true;
    if(lat>-45&&lat<-42&&lon>168&&lon<172) return true;
    if(lat>-3.5&&lat<-2.5&&lon>37&&lon<37.8) return true;
    if(lat>60&&lat<65&&lon>-55&&lon<-42) return true;
    return false;
}

export function isVolcanic(lat: number, lon: number): boolean {
    if(lat>63&&lat<67&&lon>-24&&lon<-13) return true;
    if(lat>19&&lat<20.5&&lon>-156.5&&lon<-154.5) return true;
    if(lat>27.5&&lat<29.5&&lon>-18.5&&lon<-13.5) return true;
    if(lat>-1.5&&lat<1&&lon>-92&&lon<-89) return true;
    if(lat>18.5&&lat<20&&lon>-104&&lon<-96) return true;
    if(lat>40&&lat<49&&lon>-122.5&&lon<-121) return true;
    if(lat>-25&&lat<-15&&lon>-70&&lon<-67) return true;
    if(lat>-42&&lat<-38&&lon>-72&&lon<-71) return true;
    if(lat>-2&&lat<1&&lon>-79&&lon<-77) return true;
    if(lat>50&&lat<60&&lon>155&&lon<163) return true;
    if(lat>37&&lat<41&&lon>14&&lon<16) return true;
    if(lat>-4&&lat<2&&lon>29&&lon<37) return true;
    if(lat>-8&&lat<-6&&lon>105&&lon<115) return true;
    if(lat>-39&&lat<-37&&lon>175&&lon<177) return true;
    return false;
}

export function isSaltFlat(lat: number, lon: number): boolean {
    if(lat>-21&&lat<-19&&lon>-68&&lon<-66) return true;
    if(lat>-24&&lat<-22&&lon>-69&&lon<-67) return true;
    if(lat>-24&&lat<-23&&lon>-66&&lon<-65) return true;
    if(lat>-19&&lat<-18&&lon>15&&lon<17) return true;
    if(lat>39&&lat<42&&lon>-114&&lon<-112) return true;
    return false;
}

export function isCenote(lat: number, lon: number): boolean {
    if(lat>19&&lat<21.5&&lon>-91&&lon<-87) return true;
    return false;
}

export function isWetland(lat: number, lon: number): boolean {
    if(lat>-22&&lat<-16&&lon>-58&&lon<-55) return true;
    if(lat>-29&&lat<-27&&lon>-58&&lon<-56) return true;
    if(lat>-3&&lat<0&&lon>-67&&lon<-60) return true;
    if(lat>8&&lat<10&&lon>-63&&lon<-60) return true;
    if(lat>25&&lat<27&&lon>-81.5&&lon<-80) return true;
    if(lat>29&&lat<30.5&&lon>-91&&lon<-89) return true;
    if(lat>-20&&lat<-18&&lon>22&&lon<24) return true;
    if(lat>6&&lat<10&&lon>29&&lon<33) return true;
    if(lat>4&&lat<6&&lon>5&&lon<8) return true;
    if(lat>21&&lat<23&&lon>88&&lon<90) return true;
    if(lat>9&&lat<11&&lon>105&&lon<107) return true;
    return false;
}

export function isBlackSand(lat: number, lon: number): boolean {
    if(lat>19&&lat<20.5&&lon>-156.5&&lon<-154.5) return true;
    if(lat>63&&lat<64.5&&lon>-20&&lon<-16) return true;
    if(lat>27.5&&lat<29&&lon>-18&&lon<-14) return true;
    if(lat>-39&&lat<-37&&lon>174&&lon<176) return true;
    return false;
}

export function isWhiteSand(lat: number, lon: number): boolean {
    if(lat>18&&lat<22&&lon>-90&&lon<-86) return true;
    if(lat>10&&lat<12.5&&lon>-76&&lon<-62) return true;
    if(lat>26&&lat<30&&lon>-87&&lon<-82) return true;
    if(lat>-2.7&&lat<-2.3&&lon>-43.5&&lon<-42.5) return true;
    if(lat>36&&lat<40&&lon>-6&&lon<4) return true;
    if(lat>37&&lat<41&&lon>23&&lon<28) return true;
    if(lat>4&&lat<6&&lon>-78&&lon<-76) return true;
    return false;
}

export function isTropCoast(lat: number, lon: number): boolean {
    if(lat>-24&&lat<-14&&lon>146&&lon<153) return true;
    if(lat>-13&&lat<-5&&lon>-39&&lon<-35) return true;
    if(lat>8&&lat<13&&lon>-80&&lon<-60) return true;
    return false;
}

export function isMountain(lat: number, lon: number): boolean {
    if(lat>27&&lat<36&&lon>73&&lon<100) return true;
    if(lat>35&&lat<37&&lon>74&&lon<78) return true;
    if(lat>34&&lat<38&&lon>68&&lon<74) return true;
    if(lat>40&&lat<44&&lon>70&&lon<85) return true;
    if(lat>47&&lat<52&&lon>85&&lon<100) return true;
    if(lat>-55&&lat<-18&&lon>-72&&lon<-68) return true;
    if(lat>-18&&lat<5&&lon>-78&&lon<-65) return true;
    if(lat>5&&lat<10&&lon>-79&&lon<-72) return true;
    if(lat>35&&lat<49&&lon>-118&&lon<-105) return true;
    if(lat>49&&lat<60&&lon>-125&&lon<-113) return true;
    if(lat>23&&lat<31&&lon>-108&&lon<-104) return true;
    if(lat>20&&lat<27&&lon>-101&&lon<-98) return true;
    if(lat>16&&lat<19&&lon>-101&&lon<-96) return true;
    if(lat>34&&lat<44&&lon>-84&&lon<-77) return true;
    if(lat>44&&lat<48&&lon>5&&lon<17) return true;
    if(lat>42&&lat<43.5&&lon>-2&&lon<3) return true;
    if(lat>44&&lat<49&&lon>17&&lon<27) return true;
    if(lat>59&&lat<70&&lon>5&&lon<15) return true;
    if(lat>56&&lat<58.5&&lon>-6&&lon<-3) return true;
    if(lat>50&&lat<68&&lon>56&&lon<62) return true;
    if(lat>41&&lat<44&&lon>42&&lon<50) return true;
    if(lat>30&&lat<36&&lon>-5&&lon<10) return true;
    if(lat>6&&lat<15&&lon>35&&lon<45) return true;
    if(lat>-4&&lat<2&&lon>29&&lon<38) return true;
    if(lat>-32&&lat<-28&&lon>28&&lon<31) return true;
    if(lat>35&&lat<37&&lon>137&&lon<139) return true;
    return false;
}

export function isHotDesert(lat: number, lon: number): boolean {
    if(lat>18&&lat<32&&lon>-17&&lon<0) return true;
    if(lat>18&&lat<32&&lon>0&&lon<12) return true;
    if(lat>20&&lat<32&&lon>12&&lon<35) return true;
    if(lat>10&&lat<15&&lon>40&&lon<50) return true;
    if(lat>0&&lat<12&&lon>43&&lon<51) return true;
    if(lat>15&&lat<30&&lon>35&&lon<55) return true;   // Arabian Peninsula core
    if(lat>30&&lat<35&&lon>40&&lon<50) return true;   // Iraqi/Jordanian desert (narrower)
    if(lat>35&&lat<40&&lon>55&&lon<62) return true;   // Eastern Iran desert (Dasht-e Kavir/Lut)
    if(lat>38&&lat<44&&lon>60&&lon<68) return true;   // Karakum/Turkmenistan
    if(lat>24&&lat<30&&lon>68&&lon<75) return true;
    if(lat>-27&&lat<-18&&lon>-71&&lon<-68) return true;
    if(lat>-8&&lat<-4&&lon>-81&&lon<-79) return true;
    if(lat>28&&lat<35&&lon>-118&&lon<-108) return true;
    if(lat>25&&lat<32&&lon>-108&&lon<-100) return true;
    if(lat>23&&lat<30&&lon>-115&&lon<-109) return true;
    if(lat>-26&&lat<-17&&lon>12&&lon<17) return true;
    if(lat>-26&&lat<-18&&lon>17&&lon<26) return true;
    if(lat>-30&&lat<-20&&lon>118&&lon<135) return true;
    if(lat>-28&&lat<-20&&lon>135&&lon<145) return true;
    return false;
}

export function isColdDesert(lat: number, lon: number): boolean {
    if(lat>38&&lat<48&&lon>90&&lon<115) return true;
    if(lat>36&&lat<42&&lon>76&&lon<90) return true;
    if(lat>28&&lat<36&&lon>78&&lon<100) {
        if(!isMountain(lat,lon)) return true;
    }
    if(lat>-52&&lat<-40&&lon>-71&&lon<-65) return true;
    return false;
}

export function isTundra(lat: number, lon: number): boolean {
    if(isIceCap(lat,lon)||isSnowGlacier(lat,lon)) return false;
    if(lat>66&&lat<72&&lon>-168&&lon<-140&&isLand(lat,lon)) return true;
    if(lat>60&&lat<78&&lon>-140&&lon<-60&&isLand(lat,lon)) return true;
    if(lat>68&&lat<78&&lon>60&&lon<180&&isLand(lat,lon)) return true;
    if(lat>50&&lat<55&&lon>155&&lon<165) return true;
    if(lat>60&&lat<65&&lon>-55&&lon<-42) return true;
    return false;
}

export function isBorealFor(lat: number, lon: number): boolean {
    // Boreal/taiga: 55-68°N (scientific standard), with extensions for
    // continental interiors where boreal extends slightly south (~52°N in Russia Far East)
    // Sources: Olson et al. (2001) Terrestrial Ecoregions, WWF biome classification
    if(lat>55&&lat<65&&lon>-140&&lon<-60&&isLand(lat,lon)){
        return true;
    }
    if(lat>60&&lat<68&&lon>-165&&lon<-140&&isLand(lat,lon)) return true;
    if(lat>60&&lat<68&&lon>10&&lon<30) return true;  // Scandinavia boreal
    if(lat>60&&lat<68&&lon>22&&lon<30) return true;
    if(lat>55&&lat<68&&lon>30&&lon<55) return true;  // Northern Russia
    if(lat>55&&lat<68&&lon>60&&lon<170) return true;  // Siberian taiga
    if(lat>52&&lat<60&&lon>130&&lon<160) return true; // Russian Far East (continental, extends to 52°N)
    return false;
}

export function isTropRain(lat: number, lon: number): boolean {
    if(lat>-16&&lat<5&&lon>-78&&lon<-44) {
        if(lat>0) return lon>-72&&lon<-50;
        if(lat>-5) return lon>-72&&lon<-48;
        return lon>-68&&lon<-44;
    }
    if(lat>-25&&lat<-8&&lon>-48&&lon<-35) return true;
    if(lat>-2&&lat<8&&lon>-80&&lon<-76) return true;
    if(lat>7&&lat<9&&lon>-78&&lon<-76) return true;
    if(lat>10&&lat<18&&lon>-92&&lon<-83) return true;
    if(lat>14&&lat<20&&lon>-96&&lon<-90) return true;
    // Veracruz tropical lowlands
    if(lat>17&&lat<22&&lon>-97&&lon<-94) return true;
    if(lat>-5&&lat<5&&lon>15&&lon<30) return true;
    if(lat>4&&lat<10&&lon>-15&&lon<-5) return true;
    if(lat>-22&&lat<-12&&lon>47&&lon<50) return true;
    if(lat>-6&&lat<6&&lon>95&&lon<120) return true;
    if(lat>-3&&lat<7&&lon>108&&lon<119) return true;
    if(lat>8&&lat<20&&lon>73&&lon<78) return true;
    if(lat>10&&lat<22&&lon>92&&lon<110) return true;   // Myanmar, Thailand, Laos, Vietnam, Cambodia
    if(lat>6&&lat<12&&lon>104&&lon<110) return true;   // Southern Vietnam + Mekong Delta forest
    if(lat>10&&lat<15&&lon>103&&lon<108) return true;  // Cambodia Cardamom/Central Highlands
    if(lat>-18&&lat<-14&&lon>145&&lon<147) return true;
    if(lat>-8&&lat<-2&&lon>140&&lon<152) return true;
    // NZ Fiordland excluded: it's temperate rainforest, not tropical (38-46°S)
    return false;
}

export function isSavanna(lat: number, lon: number): boolean {
    if(lat>-23&&lat<-5&&lon>-56&&lon<-41) return true;
    if(lat>3&&lat<9&&lon>-75&&lon<-63) return true;
    if(lat>-27&&lat<-19&&lon>-64&&lon<-58) return true;
    if(lat>6&&lat<15&&lon>-15&&lon<15) return true;
    if(lat>-8&&lat<4&&lon>29&&lon<40) return true;
    if(lat>-18&&lat<-10&&lon>22&&lon<36) return true;
    if(lat>-22&&lat<-12&&lon>43&&lon<47) return true;
    if(lat>-20&&lat<-12&&lon>126&&lon<145) return true;
    if(lat>-22&&lat<-15&&lon>140&&lon<150) return true;
    if(lat>10&&lat<22&&lon>73&&lon<83) return true;
    // Mexico Pacific coast: Guerrero, Oaxaca, Michoacán (tropical dry forest)
    if(lat>15&&lat<20&&lon>-104&&lon<-96) return true;
    return false;
}

export function isGrassland(lat: number, lon: number): boolean {
    if(lat>-39&&lat<-30&&lon>-65&&lon<-57) return true;
    if(lat>-35&&lat<-30&&lon>-58&&lon<-53) return true;
    if(lat>-32&&lat<-28&&lon>-55&&lon<-49) return true;
    if(lat>33&&lat<49&&lon>-104&&lon<-95) return true;
    if(lat>49&&lat<55&&lon>-115&&lon<-95) return true;
    return false;
}

export function isSteppe(lat: number, lon: number): boolean {
    if(lat>-52&&lat<-38&&lon>-72&&lon<-65) return true;
    if(lat>-38&&lat<-30&&lon>-70&&lon<-65) return true;
    if(lat>-15&&lat<-3&&lon>-42&&lon<-36) return true;
    if(lat>46&&lat<52&&lon>32&&lon<55) return true;
    if(lat>44&&lat<55&&lon>55&&lon<85) return true;
    if(lat>44&&lat<50&&lon>90&&lon<120) return true;
    return false;
}

export function getBiome(lat: number, lon: number): number {
    if(isRiverOrLake(lat,lon)) return B.RIVER_LAKE;
    if(isIceCap(lat,lon)) return B.ICE_CAP;
    if(isSnowGlacier(lat,lon)) return B.SNOW_GLACIER;
    if(!isLand(lat,lon)) return B.OCEAN;
    if(isSaltFlat(lat,lon)) return B.SALT_FLAT;
    if(isVolcanic(lat,lon)) return B.VOLCANIC;
    if(isCenote(lat,lon)) return B.CENOTE;
    if(isWetland(lat,lon)) return B.WETLAND;
    if(isBlackSand(lat,lon)) return B.BLACK_SAND;
    if(isWhiteSand(lat,lon)) return B.WHITE_SAND;
    if(isTropCoast(lat,lon)) return B.TROP_COAST;
    if(isMountain(lat,lon)) return B.MOUNTAIN;
    if(isHotDesert(lat,lon)) return B.HOT_DESERT;
    if(isColdDesert(lat,lon)) return B.COLD_DESERT;
    if(isTundra(lat,lon)) return B.TUNDRA;
    if(isBorealFor(lat,lon)) return B.BOREAL_FOR;
    if(isTropRain(lat,lon)) return B.TROPICAL_RAIN;
    if(isSavanna(lat,lon)) return B.SAVANNA;
    if(isGrassland(lat,lon)) return B.GRASSLAND;
    if(isSteppe(lat,lon)) return B.STEPPE;
    return B.TEMPERATE_FOR;
}
