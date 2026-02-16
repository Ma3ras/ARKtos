// tts_corrections.js
/**
 * Map of English terms to German phonetic approximations
 * Used to improve pronunciation of the German TTS model
 */
export const PHONETIC_REPLACEMENTS = {
    // --- Maps ---
    "The Island": "Die Eilend",
    "The Center": "Sö Zenter",
    "Scorched Earth": "Skortscht Örs",
    "Ragnarok": "Ragnarock",
    "Aberration": "Aber-räischn",
    "Extinction": "Ex-tink-schn",
    "Valguero": "Wal-guero",
    "Genesis": "Dschen-e-sis",
    "Crystal Isles": "Kristall Eils",
    "Lost Island": "Lost Eilend",
    "Fjordur": "Fjour-dur",
    "Ark": "Aark",

    // --- Biomes ---
    "Mountains": "Maun-tains",
    "Mountain": "Maun-tain",
    "Snow": "Sno",
    "Swamp": "Swomp",
    "Beach": "Bietsch",
    "Jungle": "Dschangel",
    "Redwood": "Red-wud",
    "Volcano": "Vol-keino",
    "Ocean": "Oh-schen",
    "Deep Ocean": "Diep Oh-schen",
    "Grassland": "Gräss-länd",
    "Deep Island": "Diep Eilend",
    "Cave": "Keiv",
    "Dunes": "Djuns",
    "Oasis": "O-a-sis",
    "Canyon": "Kän-jen",
    "Ruins": "Ru-ins",
    "Sanctuary": "Sänk-tchu-eri",
    "Wasteland": "Weist-länd",
    "Forest": "For-rest",
    "River": "Riv-er",
    "Lake": "Leik",
    "Surface": "Sör-feis",
    "Fertile Lake": "Förteil Leik",
    "Bio-Luminescent": "Bio-Lumnisent",
    "Element Region": "Element Ried-schn",

    // --- Resources & Items ---
    "Rare Flower": "Rär Flauer",
    "Rare Mushroom": "Rär Masch-rum",
    "Giant Bee Honey": "Dschai-ent Bie Hanni",
    "Honey": "Hanni",
    "Longrass": "Lon-gräss",
    "Rockarrot": "Rock-arrot",
    "Savoroot": "Sävo-rut",
    "Citronal": "Zitro-nal",
    "Narcoberry": "Narko-berri",
    "Stimberry": "Stim-berri",
    "Mejoberry": "Me-dscho-berri",
    "Tintoberry": "Tinto-berri",
    "Azulberry": "Azul-berri",
    "Amarberry": "Amar-berri",
    "Sweet Vegetable Cake": "Swiet Ved-sche-tabel Keik",
    "Wyvern Milk": "Wei-wern Milk",
    "Nameless Venom": "Neim-less Venom",
    "Reaper Pheromone": "Rieper Fero-mon",
    "Deathworm Horn": "Des-wurm Horn",
    "Ammonite Bile": "Ammoniet Beil",
    "Leech Blood": "Lietsch Blad",
    "Organic Polymer": "Or-gänik Poliemer",
    "Corrupted Nodule": "Kor-rapted Modjul",
    "Fragmented Green Gem": "Frägmented Griin Dschem",
    "Green Gem": "Griin Dschem",
    "Blue Gem": "Blu Dschem",
    "Red Gem": "Red Dschem",
    "Congealed Gas Ball": "Kon-dschield Gäs Boll",
    "Crystallized Blue Sap": "Kristall-eisd Blu Säp",
    "Crystallized Red Sap": "Kristall-eisd Red Säp",
    "Element Dust": "Element Dast",
    "Element Shard": "Element Schard",
    "Element Ore": "Element Ohr",
    "Unstable Element": "An-steibel Element",
    "Scrap Metal": "Skräp Mettl",

    // Standard Resources
    "Crystal": "Kristall",
    "Obsidian": "Obsid-ian",
    "Polymer": "Poliemer",
    "Electronics": "Elektroniks",
    "Element": "Element",
    "Fiber": "Feiber",
    "Thatch": "Sätsch",
    "Hide": "Heid",
    "Pelt": "Pelt",
    "Chitin": "Kietin",
    "Keratin": "Keratin",
    "Flint": "Flint",
    "Stone": "Stoun",
    "Wood": "Wud",
    "Metal": "Mettl",
    "Oil": "Oil",
    "Silica Pearls": "Silika Pörls",
    "Black Pearls": "Bläck Pörls",
    "Cementing Paste": "Zementing Peist",
    "Sparkpowder": "Spark-Pauder",
    "Gunpowder": "Gan-Pauder",
    "AnglerGel": "Ängler-Dschel",
    "Bio Toxin": "Baio-Toxin",
    "Sap": "Säp",
    "Charcoal": "Tschar-koul",
    "Clay": "Klei",
    "Preserving Salt": "Prisör-wing Solt",
    "Raw Salt": "Roh Solt",
    "Sulfur": "Sal-fur",
    "Silk": "Silk",
    "Cactus Sap": "Kaktus Säp",
    "Propellant": "Pro-pellant",
    "Wyvern Talon": "Wei-wern Talon",

    // Artifacts & Trophies
    "Artifact": "Arti-fakt",
    "Trophy": "Tro-fi",
    "Alpha": "Alfa",
    "Beta": "Beta",
    "Gamma": "Gamma",

    // Consumables
    "Medical Brew": "Medikäl Bru",
    "Energy Brew": "Enerschi Bru",
    "Lazarus Chowder": "Laza-rus Tschauder",
    "Enduro Stew": "Enduro Stju",
    "Focal Chili": "Fokal Tschili",
    "Friara Curry": "Friara Körri",
    "Calien Soup": "Kalien Sup",
    "Shadow Steak Saute": "Schädo Steik Sotee",
    "Battle Tartare": "Bättl Tar-tar",
    "Mindwipe Tonic": "Meind-weip Tonik",

    // Structures
    "Foundation": "Faun-deischn",
    "Wall": "Woll",
    "Ceiling": "Siling",
    "Door": "Dor",
    "Gateway": "Geit-wei",
    "Behemoth": "Behe-mos",
    "Fabricator": "Fabri-kator",
    "Generator": "Dschene-rator",
    "Refrigerator": "Refri-dscherator",
    "Air Conditioner": "Är Kondischioner",
    "Chem Bench": "Kem Bentsch",
    "Chemistry Bench": "Kemistri Bentsch",
    "Industrial Forge": "Indastriel Fortsch",
    "Industrial Grill": "Indastriel Grill",
    "Industrial Cooker": "Indastriel Kuker",
    "Grinder": "Greinder",
    "Tek Replicator": "Teck Repli-kator",
    "Transmitter": "Trans-mitter",
    "Teleporter": "Tele-porter",
    "Cloning Chamber": "Kloning Tschember",
    "Forcefield": "Fors-fies",
    "Dedicated Storage": "Dedikeited Storesch",

    // --- Creatures ---
    // (A)
    "Achatina": "A-cha-tina",
    "Allosaurus": "Allo-saurus",
    "Amargasaurus": "Amarga-saurus",
    "Andrewsarchus": "Ändru-sar-chus",
    "Anglerfish": "Ängler-Fisch",
    "Ankylosaurus": "Ankylo-saurus",
    "Araneo": "A-ra-neo",
    "Archaeopteryx": "Ar-chä-opte-ryx",
    "Argentavis": "Argen-tavis",
    "Arthropluera": "Ar-thro-plura",
    "Astrocetus": "Astro-zetus",
    "Astrodelphis": "Astro-delfis",

    // (B) 
    "Baryonyx": "Bary-onyx",
    "Basilisk": "Ba-si-lis-k",
    "Basilosaurus": "Basilo-saurus",
    "Beelzebufo": "Belze-bufo",
    "Bloodstalker": "Blad-storker",
    "Brontosaurus": "Bronto-saurus",
    "Bulbdog": "Balb-dog",

    // (C)
    "Carbonemys": "Karbo-nemo-s",
    "Carcharodontosaurus": "Karcharo-donto-saurus",
    "Carnotaurus": "Karno-taurus",
    "Castoroides": "Kasto-roides",
    "Chalicotherium": "Chaliko-theri-um",
    "Cnidaria": "Kni-daria",
    "Coelacanth": "Zö-la-kant",
    "Compy": "Kom-pi",
    "Compsognathus": "Kompso-gnathus",

    // (D)
    "Daeodon": "Dä-o-don",
    "Deinonychus": "Deino-nykus",
    "Desmodus": "Des-modus",
    "Dilophosaur": "Dilo-fo-saurus",
    "Dimetrodon": "Dime-tro-don",
    "Dimorphodon": "Dimor-pho-don",
    "Diplodocus": "Diplo-dokus",
    "Dire Bear": "Dayer Bär",
    "Direwolf": "Dayer-wulf",
    "Dodo": "Do-do",
    "Doedicurus": "Dö-di-kurus",
    "Dung Beetle": "Dang Bie-tl",
    "Dunkleosteus": "Dunkle-os-teus",

    // (E)
    "Electrophorus": "Elektro-phorus",
    "Equus": "E-kus",
    "Eurypterid": "Eury-pteri-d",

    // (F)
    "Fjordhawk": "Fjour-hork",
    "Featherlight": "Feser-leit",
    "Fenrir": "Fen-rir",
    "Ferox": "Fä-rox",

    // (G)
    "Gacha": "Ga-tscha",
    "Gallimimus": "Galli-mimus",
    "Gasbags": "Gäs-bägs",
    "Giant Bee": "Dschai-ent Bie",
    "Giganotosaurus": "Giga-noto-saurus",
    "Gigantopithecus": "Giganto-pithekus",
    "Glowtail": "Glo-teil",
    "Griffin": "Griffin",

    // (H)
    "Hyaenodon": "Hy-ä-no-don",

    // (I)
    "Ichthyornis": "Ich-thy-ornis",
    "Ichthyosaurus": "Ich-thyo-saurus",
    "Iguanodon": "I-gua-no-don",

    // (J)
    "Jerboa": "Dschör-bo-a",

    // (K)
    "Kairuku": "Kai-ruku",
    "Kaprosuchus": "Kapro-suchus",
    "Karkinos": "Kar-kinos",
    "Kentrosaurus": "Kentro-saurus",

    // (L)
    "Lamprey": "Läm-pri",
    "Leedsichthys": "Lied-sich-thys",
    "Liopleurodon": "Lio-pleuro-don",
    "Lymantria": "Ly-mantria",
    "Lystrosaurus": "Lystro-saurus",

    // (M)
    "Maewing": "Mäh-wing",
    "Magmasaur": "Magma-saur",
    "Mammoth": "Mä-mos",
    "Managarmr": "Mana-gar-mer",
    "Manta": "Man-ta",
    "Mantis": "Man-tis",
    "Megachelon": "Mega-chelon",
    "Megalania": "Mega-lania",
    "Megaloceros": "Megalo-zeros",
    "Megalodon": "Megalo-don",
    "Megalosaurus": "Megalo-saurus",
    "Meganeura": "Mega-neura",
    "Megatherium": "Mega-therium",
    "Mesopithecus": "Meso-pithekus",
    "Microraptor": "Mikro-raptor",
    "Morellatops": "Morella-tops",
    "Mosasaurus": "Mosa-saurus",
    "Moschops": "Mos-chops",

    // (N)
    "Nameless": "Neim-less",
    "Noglin": "Nog-lin",

    // (O)
    "Onyc": "O-nyk",
    "Otter": "Otter",
    "Oviraptor": "Ovi-raptor",
    "Ovis": "O-vis",

    // (P)
    "Pachy": "Pa-chy",
    "Pachyrhinosaurus": "Pachy-rhino-saurus",
    "Paraceratherium": "Parazer-atherium",
    "Parasaur": "Para-saurus",
    "Pegomastax": "Pego-mastax",
    "Pelagornis": "Pelag-ornis",
    "Phiomia": "Fio-mia",
    "Phoenix": "Fönix",
    "Piranha": "Pira-nha",
    "Plesiosaur": "Plesio-saur",
    "Procoptodon": "Pro-kopto-don",
    "Pteranodon": "Ptera-no-don",
    "Pulmonoscorpius": "Pulmono-skorpius",
    "Purlovia": "Pur-lovia",

    // (Q)
    "Quetzal": "Kwet-zal",

    // (R)
    "Raptor": "Räp-tor",
    "Ravager": "Rä-vä-dscher",
    "Reaper": "Rieper",
    "Rex": "Rex",
    "Rhyniognatha": "Rynio-gnatha",
    "Rock Drake": "Rock Dreik",
    "Rock Elemental": "Rock Elementäl",
    "Roll Rat": "Roll Rät",

    // (S)
    "Sabertooth": "Sä-ber-tus",
    "Sarco": "Sar-ko",
    "Sarcosuchus": "Sarko-suchus",
    "Scout": "Skaut",
    "Seeker": "Sie-ker",
    "Shadowmane": "Schädo-mäin",
    "Shinehorn": "Schein-horn",
    "Sinomacrops": "Sino-makrops",
    "Snow Owl": "Sno Aul",
    "Spino": "Spi-no",
    "Spinosaurus": "Spino-saurus",
    "Stegosaurus": "Stego-saurus",

    // (T)
    "Tapejara": "Tape-dschara",
    "Tek": "Teck",
    "Terror Bird": "Terror Bör-d",
    "Therizinosaurus": "Therizino-saurus",
    "Thylacoleo": "Thylako-leo",
    "Titanoboa": "Titano-boa",
    "Titanosaur": "Titano-saur",
    "Triceratops": "Tri-zera-tops",
    "Troodon": "Tru-don",
    "Tropeognathus": "Tropeo-gnathu-s",
    "Tusoteuthis": "Tuso-teuthis",
    "Tyrannosaurus": "Tyranno-saurus",

    // (U)
    "Unicorn": "Juni-korn",

    // (V)
    "Velonasaur": "Velona-saur",
    "Voidwyrm": "Void-würm",
    "Vulture": "Val-tscher",

    // (W)
    "Woolly Rhino": "Wuli Rei-no",
    "Wyvern": "Wei-wern",

    // (Y)
    "Yutyrannus": "Ju-ty-rannus",

    // --- Common Terms ---
    "Lat": "Latt",
    "Lon": "Lonn",
    "Map": "Mäpp",
    "spawnt": "sponnt",
    "Spawn": "Spon",
    "Spawns": "Spons",
    "Taming": "Teiming",
    "Tame": "Teim",
    "Breeding": "Brie-ding",
    "Baby": "Beibi",
    "Torpor": "Tor-por",
    "Knockout": "Nock-aut",
    "Passive": "Päss-iv",
    "Kibble": "Kib-bl",
    "Saddle": "Säddl",
    "Engram": "En-gramm",
    "Blueprint": "Blu-print",
    "Rarity": "Räri-ti",
    "Damage": "Dä-mätsch",
    "Health": "Hels",
    "Stamina": "Stämina",
    "Weight": "Weit",
    "Melee": "Mieli",
    "Movement Speed": "Muvment Spied",
    "Crafting Skill": "Kräfting Skill"
};

/**
 * Optimizes text for German TTS by replacing English terms with phonetic approximations
 * @param {string} text - Original text
 * @returns {string} - Optimized text for TTS
 */
export function optimizeForTTS(text) {
    if (!text) return text;

    let optimizedText = text;

    // Sort keys by length (descending) to replace longer phrases first
    const sortedKeys = Object.keys(PHONETIC_REPLACEMENTS).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        // Use word boundary regex to avoid partial replacements where inappropriate
        // but allow partials for compound words if needed
        const replacement = PHONETIC_REPLACEMENTS[key];
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        optimizedText = optimizedText.replace(regex, replacement);
    }

    return optimizedText;
}
