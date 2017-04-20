const mod = {};
module.exports = mod;
mod.analyzeRoom = function(room, needMemoryResync) {
    if (needMemoryResync) {
        room.processConstructionFlags();
    }
    room.roadConstruction();
};
mod.extend = function() {
    Object.defineProperties(Room.prototype, {
        'constructionSites': {
            configurable: true,
            get: function() {
                if( _.isUndefined(this._constructionSites) ) {
                    this._constructionSites = this.find(FIND_CONSTRUCTION_SITES);
                }
                return this._constructionSites;
            }
        },
        'myConstructionSites': {
            configurable: true,
            get: function() {
                if( _.isUndefined(this._myConstructionSites) ) {
                    this._myConstructionSites = this.find(FIND_MY_CONSTRUCTION_SITES);
                }
                return this._myConstructionSites;
            }
        },
        'roadConstructionTrace': {
            configurable: true,
            get: function () {
                if (_.isUndefined(this.memory.roadConstructionTrace) ) {
                    this.memory.roadConstructionTrace = {};
                }
                return this.memory.roadConstructionTrace;
            }
        },
    });

    Room.prototype.getBestConstructionSiteFor = function(pos, filter = null) {
        let sites;
        if( filter ) sites = this.constructionSites.filter(filter);
        else sites = this.constructionSites;
        if( sites.length == 0 ) return null;
        let siteOrder = Util.fieldOrFunction(CONSTRUCTION_PRIORITY, this);
        let rangeOrder = site => {
            let order = siteOrder.indexOf(site.structureType);
            return pos.getRangeTo(site) + ( order < 0 ? 100000 : (order * 100) );
            //if( order < 0 ) return 100000 + pos.getRangeTo(site);
            //return ((order - (site.progress / site.progressTotal)) * 100) + pos.getRangeTo(site);
        };
        return _.min(sites, rangeOrder);
    };

    Room.prototype.roadConstruction = function( minDeviation = ROAD_CONSTRUCTION_MIN_DEVIATION ) {
        if( !ROAD_CONSTRUCTION_ENABLE || Game.time % ROAD_CONSTRUCTION_INTERVAL != 0 ) return;
        if( _.isNumber(ROAD_CONSTRUCTION_ENABLE) && (!this.my || ROAD_CONSTRUCTION_ENABLE > this.controller.level)) return;

        let data = Object.keys(this.roadConstructionTrace)
            .map( k => {
                return { // convert to [{key,n,x,y}]
                    'n': this.roadConstructionTrace[k], // count of steps on x,y cordinates
                    'x': k.charCodeAt(0)-32, // extract x from key
                    'y': k.charCodeAt(1)-32 // extraxt y from key
                };
            });

        let min = Math.max(ROAD_CONSTRUCTION_ABS_MIN, (data.reduce( (_sum, b) => _sum + b.n, 0 ) / data.length) * minDeviation);
        data = data.filter( e => {
            if (e.n >= min) {
                let structures = this.lookForAt(LOOK_STRUCTURES,e.x,e.y);
                return (structures.length === 0 || structures[0].structureType === STRUCTURE_RAMPART)
                    && this.lookForAt(LOOK_CONSTRUCTION_SITES,e.x,e.y).length === 0;
            } else {
                return false;
            }
        });

        // build roads on all most frequent used fields
        let setSite = pos => {
            if( global.DEBUG ) logSystem(this.name, `Constructing new road at ${pos.x}'${pos.y} (${pos.n} traces)`);
            this.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
        };
        _.forEach(data, setSite);

        // clear old data
        this.roadConstructionTrace = {};
    };

    Room.prototype.processConstructionFlags = function() {
        if (!this.my || !Util.fieldOrFunction(SEMI_AUTOMATIC_CONSTRUCTION, this)) return;
        let sitesSize = _.size(Game.constructionSites);
        if (sitesSize >= 100) return;
        const LEVEL = this.controller.level;
        const POS = new RoomPosition(25, 25, this.name);
        const ARGS = [POS, true];
        const CONSTRUCT = (flag, type) => {
            if (sitesSize >= 100) return;
            if (!flag) return;
            const POS = new RoomPosition(flag.x, flag.y, flag.roomName);
            if (!POS) return;
            const sites = POS.lookFor(LOOK_CONSTRUCTION_SITES);
            if (sites && sites.length) return; // already a construction site
            const structures = POS.lookFor(LOOK_STRUCTURES).filter(s => !(s instanceof StructureRoad || s instanceof StructureRampart));
            if (structures && structures.length) return; // pre-existing structure here
            const r = POS.createConstructionSite(type);
            if (Util.fieldOrFunction(REMOVE_CONSTRUCTION_FLAG, this, type) && r === OK) {
                if (flag.name) {
                    flag = Game.flags[flag.name];
                    if (flag instanceof Flag) flag.remove();
                }
                sitesSize++;
            }
        };
        
        // Extensions
        let shortAmount = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][LEVEL] - (this.structures.extensions.length + _.filter(this.constructionSites, s => s.structureType === STRUCTURE_EXTENSION).length);
        if (shortAmount > 0) {
            FlagDir.filter(FLAG_COLOR.construct, ...ARGS).splice(0, shortAmount).forEach(flag => {
                CONSTRUCT(flag, STRUCTURE_EXTENSION);
            });
        }
        
        // Spawns
        shortAmount = CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][LEVEL] - (this.structures.spawns.length + _.filter(this.constructionSites, s => s.structureType === STRUCTURE_SPAWN).length);
        if (shortAmount > 0) {
            FlagDir.filter(FLAG_COLOR.construct.spawn, ...ARGS).splice(0, shortAmount).forEach(flag => {
                CONSTRUCT(flag, STRUCTURE_SPAWN);
            });
        }
        
        // Towers
        shortAmount = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][LEVEL] - (this.structures.towers.length + _.filter(this.constructionSites, s => s.structureType === STRUCTURE_TOWER).length);
        if (shortAmount > 0) {
            FlagDir.filter(FLAG_COLOR.construct.tower, ...ARGS).splice(0, shortAmount).forEach(flag => {
                CONSTRUCT(flag, STRUCTURE_TOWER);
            });
        }
        
        // Links
        shortAmount = CONTROLLER_STRUCTURES[STRUCTURE_LINK][LEVEL] - (this.structures.links.all.length + _.filter(this.constructionSites, s => s.structureType === STRUCTURE_LINK).length);
        if (shortAmount > 0) {
            FlagDir.filter(FLAG_COLOR.construct.link, ...ARGS).splice(0, shortAmount).forEach(flag => {
                CONSTRUCT(flag, STRUCTURE_LINK);
            });
        }
        
        // Labs
        shortAmount = CONTROLLER_STRUCTURES[STRUCTURE_LAB][LEVEL] - (this.structures.labs.all.length + _.filter(this.constructionSites, s => s.structureType === STRUCTURE_LAB).length);
        if (shortAmount > 0) {
            FlagDir.filter(FLAG_COLOR.construct.lab, ...ARGS).splice(0, shortAmount).forEach(flag => {
                CONSTRUCT(flag, STRUCTURE_LAB);
            });
        }
        
        // Storage
        if (!this.storage && CONTROLLER_STRUCTURES[STRUCTURE_STORAGE][LEVEL] > 0) {
            FlagDir.filter(FLAG_COLOR.construct.storage, ...ARGS).splice(0, 1).forEach(flag => {
                CONSTRUCT(flag, STRUCTURE_STORAGE);
            });
        }
        
        // Terminal
        if (!this.terminal && CONTROLLER_STRUCTURES[STRUCTURE_TERMINAL][LEVEL] > 0) {
            FlagDir.filter(FLAG_COLOR.construct.terminal, ...ARGS).splice(0, 1).forEach(flag => {
                CONSTRUCT(flag, STRUCTURE_TERMINAL);
            });
        }
        
        // Observer
        if (!this.structures.observer && CONTROLLER_STRUCTURES[STRUCTURE_OBSERVER][LEVEL] > 0) {
            FlagDir.filter(FLAG_COLOR.construct.observer, ...ARGS).splice(0, 1).forEach(flag => {
                CONSTRUCT(flag, STRUCTURE_OBSERVER);
            });
        }
        
        // Nuker
        if (!this.structures.nuker && CONTROLLER_STRUCTURES[STRUCTURE_NUKER][LEVEL] > 0) {
            FlagDir.filter(FLAG_COLOR.construct.nuker, ...ARGS).splice(0, 1).forEach(flag => {
                CONSTRUCT(flag, STRUCTURE_NUKER);
            });
        }
        
        // Power Spawn
        if (!this.structures.powerSpawn && CONTROLLER_STRUCTURES[STRUCTURE_POWER_SPAWN][LEVEL] > 0) {
            FlagDir.filter(FLAG_COLOR.construct.powerSpawn, ...ARGS).splice(0, 1).forEach(flag => {
                CONSTRUCT(flag, STRUCTURE_POWER_SPAWN);
            });
        }
        
        // Extractor
        if (CONTROLLER_STRUCTURES[STRUCTURE_EXTRACTOR][LEVEL] > 0) {
            const [mineral] = this.find(FIND_MINERALS);
            const extractor = mineral.pos.lookFor(LOOK_STRUCTURES);
            if (extractor.length && extractor[0] instanceof StructureExtractor) return;
            CONSTRUCT(mineral.pos, STRUCTURE_EXTRACTOR);
        }
    };
};