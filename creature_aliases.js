// Creature aliases/nicknames mapping
// Common ARK community nicknames for creatures

export const CREATURE_ALIASES = {
    // Giganotosaurus
    "giga": "giganotosaurus",
    "gigas": "giganotosaurus",

    // Carcharodontosaurus
    "carchar": "carcharodontosaurus",
    "carcharo": "carcharodontosaurus",

    // Tyrannosaurus Rex
    "t-rex": "rex",
    "trex": "rex",
    "tyrannosaurus": "rex",
    "tyrannosaurus rex": "rex",

    // Argentavis
    "argy": "argentavis",
    "argent": "argentavis",
    "argentavis": "argentavis", // Self-map to be safe

    // Pteranodon
    "ptera": "pteranodon",
    "pt": "pteranodon",

    // Triceratops
    "trike": "triceratops",

    // Brontosaurus
    "bronto": "brontosaurus",

    // Carnotaurus
    "carno": "carnotaurus",

    // Allosaurus
    "allo": "allosaurus",

    // Spinosaurus
    "spino": "spinosaurus",

    // Megalosaurus
    "megalo": "megalosaurus",

    // Thylacoleo
    "thylo": "thylacoleo",

    // Therizinosaurus
    "therizino": "therizinosaur",
    "theri": "therizinosaur",
    "thery": "therizinosaur", // Voice typo
    "therizinosaurus": "therizinosaur", // DB has "Therizinosaur"

    // Ankylosaurus
    "anky": "ankylosaurus",

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

    // Managarmr
    "mana": "managarmr",

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
