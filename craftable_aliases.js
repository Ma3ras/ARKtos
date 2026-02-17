// Craftable item aliases/abbreviations mapping
// Common ARK community abbreviations for craftable items

export const CRAFTABLE_ALIASES = {
    // Weapons
    "fab": "fabricator",
    "fab rifle": "fabricated sniper rifle",
    "fab pistol": "fabricated pistol",
    "assault": "assault rifle",
    "pump": "pump-action shotgun",
    "longneck": "longneck rifle",
    "compound": "compound bow",
    "xbow": "crossbow",
    "c4": "c4 charge",

    // Tools
    "metal pick": "metal pickaxe",
    "metal axe": "metal hatchet",
    "stone pick": "stone pickaxe",
    "stone axe": "stone hatchet",
    "pike": "metal pike",
    "spyglass": "spyglass",
    "whip": "whip",

    // Armor
    "flak": "flak leggings", // Most common default
    "flak armor": "flak leggings", // Or generic
    "flag legends": "flak leggings", // Phonetic error
    "flag leggings": "flak leggings",
    "black leggings": "flak leggings", // Phonetic error
    "riot": "riot armor",
    "ghillie": "ghillie armor",
    "scuba": "scuba gear",
    "hazard": "hazard suit",
    "tek armor": "tek armor",

    // Structures
    "smithy": "smithy",
    "forge": "refining forge",
    "industrial forge": "industrial forge",
    "chem bench": "chemistry bench",
    "fab": "fabricator",
    "tek rep": "tek replicator",
    "replicator": "tek replicator",
    "tek gen": "tek generator",
    "generator": "electrical generator",
    "ac": "air conditioner",
    "fridge": "refrigerator",
    "vault": "vault",
    "turret": "auto turret",
    "plant x": "plant species x",
    "plant z": "plant species z",

    // Saddles
    "rex saddle": "rex saddle",
    "giga saddle": "giganotosaurus saddle",
    "argy saddle": "argentavis saddle",
    "quetz saddle": "quetzal saddle",
    "platform saddle": "platform saddle",

    // Tek Creatures/Items
    "mek": "mek",
    "mac": "mek",           // Voice transcription error
    "meck": "mek",         // Phonetic variation
    "enforcer": "enforcer",
    "tek rex": "tek rex",
    "tek raptor": "tek raptor",

    // Consumables
    "stim": "stimulant",
    "med brew": "medical brew",
    "energy brew": "energy brew",
    "focal": "focal chili",
    "lazarus": "lazarus chowder",
    "calien": "calien soup",
    "shadow steak": "shadow steak saute",
    "mindwipe": "mindwipe tonic",
    "mindwarp": "mindwipe tonic",    // Voice transcription error
    "mind wipe": "mindwipe tonic",
    "mind warp": "mindwipe tonic",

    // Ammo
    "adv bullet": "advanced bullet",
    "adv rifle bullet": "advanced rifle bullet",
    "adv sniper bullet": "advanced sniper bullet",
    "tranq arrow": "tranquilizer arrow",
    "tranq dart": "tranquilizer dart",
    "shocking dart": "shocking tranquilizer dart",

    // Resources (processed)
    "gunpowder": "gunpowder",
    "sparkpowder": "sparkpowder",
    "narcotic": "narcotic",
    "bio toxin": "bio toxin",
    "polymer": "polymer",
    "cp": "cementing paste",
    "paste": "cementing paste",
};

/**
 * Resolve a craftable alias to its full name
 * @param {string} alias - Alias or name to resolve
 * @returns {string|null} Full craftable name or null if not found
 */
export function resolveAlias(alias) {
    if (!alias) return null;

    const normalized = alias.toLowerCase().trim();

    // Check if it's an alias
    if (CRAFTABLE_ALIASES[normalized]) {
        return CRAFTABLE_ALIASES[normalized];
    }

    // Not an alias, return null (will use original name)
    return null;
}
