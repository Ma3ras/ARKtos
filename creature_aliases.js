// Creature aliases/nicknames mapping
// Common ARK community nicknames for creatures

export const CREATURE_ALIASES = {
    // Giganotosaurus
    "giga": "giganotosaurus",
    "gigas": "giganotosaurus",
    "giger": "giganotosaurus",       // Voice transcription
    "gika": "giganotosaurus",        // Voice transcription

    // Carcharodontosaurus
    "carchar": "carcharodontosaurus",
    "carcharo": "carcharodontosaurus",
    "carcha": "carcharodontosaurus",
    "karcher": "carcharodontosaurus",  // Voice transcription

    // Tyrannosaurus Rex
    "t-rex": "rex",
    "trex": "rex",
    "rex": "rex",
    "reks": "rex",                   // Voice transcription
    "tyrannosaurus": "rex",
    "tyrannosaurus rex": "rex",

    // Argentavis
    "argy": "argentavis",
    "argi": "argentavis",           // Voice transcription
    "argent": "argentavis",
    "argentavis": "argentavis",

    // Anglerfish
    "anglerfisch": "anglerfish",     // German name

    // Archaeopteryx
    "archäopteryx": "archaeopteryx",  // German spelling
    "archopteryx": "archaeopteryx",   // Voice transcription
    "arch opteryx": "archaeopteryx",  // Normalization issue

    // Arthropluera
    "artopleura": "arthropluera",     // Voice transcription

    // Pteranodon
    "ptera": "pteranodon",
    "pt": "pteranodon",

    // Triceratops
    "trike": "triceratops",

    // Brontosaurus
    "bronto": "brontosaurus",

    // Carnotaurus
    "carno": "carnotaurus",
    "karno": "carnotaurus",          // Voice transcription

    // Allosaurus
    "allo": "allosaurus",
    "alo": "allosaurus",
    "alu": "allosaurus",             // Voice transcription
    "allu": "allosaurus",            // Voice transcription
    "alut": "allosaurus",            // Voice transcription

    // Spinosaurus
    "spino": "spinosaurus",

    // Stegosaurus
    "stego": "stegosaurus",

    // Ankylosaurus
    "anky": "ankylosaurus",
    "anki": "ankylosaurus",          // Voice transcription

    // Doedicurus
    "doedi": "doedicurus",

    // Parasaur
    "para": "parasaur",

    // Quetzalcoatlus
    "quetz": "quetzalcoatlus",
    "quetzal": "quetzalcoatlus",

    // Mosasaurus
    "mosa": "mosasaurus",

    // Plesiosaur
    "plesi": "plesiosaur",

    // Ichthyosaurus
    "ichthy": "ichthyosaurus",

    // Basilosaurus
    "basilo": "basilosaurus",

    // Sarcosuchus
    "sarco": "sarcosuchus",
    "sarko": "sarcosuchus",          // Voice transcription

    // Beelzebufo
    "belzebufo": "beelzebufo",       // Common misspelling (one 'e')

    // Managarmr
    "mana": "managarmr",
    "manna": "managarmr",            // Voice transcription

    // Thylacoleo
    "thylo": "thylacoleo",

    // Therizinosaurus
    "therizino": "therizinosaur",
    "theri": "therizinosaur",
    "thery": "therizinosaur",        // Voice typo
    "teeri": "therizinosaur",        // Voice transcription
    "teri": "therizinosaur",         // Voice transcription
    "terry": "therizinosaur",        // Voice transcription
    "therizinosaurus": "therizinosaur", // DB has "Therizinosaur"
    "theory": "therizinosaur",       // Voice typo

    // Wyvern
    "wyvern": "wyvern",
    "wyv": "wyvern",

    // Rock Drake
    "drake": "rock drake",

    // Reaper
    "reaper": "reaper",

    // Mek
    "mek": "mek",
    "meck": "mek",
    "mac": "mek",                    // Voice transcription

    // Velonasaur
    "velo": "velonasaur",

    // Gacha
    "gacha": "gacha",

    // Magmasaur
    "magma": "magmasaur",

    // Astrocetus
    "astro": "astrocetus",

    // Bloodstalker
    "blood": "bloodstalker",

    // Shadowmane
    "shadow": "shadowmane",

    // Maewing
    "mae": "maewing"
};

export function resolveAlias(userInput) {
    if (!userInput) return null;
    const normalized = String(userInput).toLowerCase().trim();
    return CREATURE_ALIASES[normalized] || null;
}
