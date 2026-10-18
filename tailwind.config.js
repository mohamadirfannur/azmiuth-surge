/* Design tokens copied from surge-main/web/tailwind.config.ts */
module.exports = {
  content: ['./index.html','./app.js'],

  theme: {
    borderRadius: { none:"0", xxs:"4px", xs:"8px", sm:"12px", md:"16px", lg:"20px", xl:"24px", xxl:"32px", full:"9999px" },
    colors: {
      transparent:"transparent", current:"currentColor", white:"#FFFFFF", black:"#000000",
      brand:{50:"#F5F5F9",100:"#C4C7D9",200:"#9399B7",300:"#626D92",400:"#31416B",500:"#011641",600:"#00113C",700:"#000C34",800:"#00082A",900:"#00041E",950:"#000211"},
      grey:{50:"#FEFEFE",100:"#EFEFEF",200:"#E4E3E4",300:"#AFAEAF",400:"#949495",500:"#79797B",600:"#626264",700:"#4C4B4C",800:"#353435",900:"#1E1D1E",950:"#060606"},
      green:{50:"#E6FAF2",100:"#B8F2D9",200:"#8AE9C0",300:"#5CE1A7",400:"#2ED88E",500:"#00D075",600:"#00A05B",700:"#007041",800:"#004027",900:"#021A12"},
      blue:{50:"#FEFEFE",100:"#E3ECFF",200:"#7CABFF",300:"#538CFF",400:"#3672F9",500:"#205CD9",600:"#0F47B3",700:"#03348C",800:"#002466",900:"#011641",950:"#00081A"},
      red:{50:"#FAEDEE",100:"#EDBEC1",200:"#DF8F94",300:"#D06169",400:"#C0353E",500:"#AF0914",600:"#98060F",700:"#81030B"},
      yellow:{50:"#FFFBEB",100:"#FEF3C7",200:"#FDE68A",300:"#FCD34D",400:"#FBBF24",500:"#F59E0B",600:"#D97706",700:"#B45309"},
      cyan:{500:"#06B6D4"},
    },
    extend: {
      fontSize: { "2xs": ["10px","16px"] },
      fontFamily: { raleway:["Raleway","sans-serif"], inter:["Inter","sans-serif"] },
    },
  },
};
