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
    "spinu": "spinosaurus",          // Voice transcription

    // Megalosaurus
    "megalo": "megalosaurus",

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

    // Managarmr
    "mana": "managarmr",
    "manna": "managarmr",            // Voice transcription

    // Velonasaur
    "velo": "velonasaur",

    // Gacha
    "gacha": "gacha",

    // Griffin
    "griff": "griffin",

    // Wyvern variants
    "wyvern": "wyvern",

    // Rock Drake
    "drake": "rock drake",
};

/**
 * Resolve a creature alias to its full name
 * @param {string} alias - Alias or name to resolve
 * @returns {string|null} Full creature name or null if not found
 */
export function resolveAlias(alias) {
    if (!alias) return null;

    const normalized = alias.toLowerCase().trim();

    // Check if it's an alias
    if (CREATURE_ALIASES[normalized]) {
        return CREATURE_ALIASES[normalized];
    }

    // Not an alias, return null (will use original name)
    return null;
}
