const action = class extends Creep.Action {

    constructor(...args) {
        super(...args);
        
        this.maxPerAction = 1;
        this.targetRange = 2;
    }
    
    /**
     * Check to see if the mineralType has a boost
     */
    isValidMineralType(mineralType) {
        for (const category in BOOSTS) {
            for (const compound in BOOSTS[category]) {
                if (mineralType === compound) return true;
            }
        }
        return false;
    }
    
    /**
     * Gets the part type matching the compound's boost
     */
    getBoostPartType(mineralType) {
        for (const category in BOOSTS) {
            for (const compound in BOOSTS[category]) {
                if (mineralType === compound) return category;
            }
        }
    }
    
    canBoostType(creep, type) {
        return !_(creep.body).filter({type}).every(part => part.boost);
    }
    
    isValidAction(creep) {
        // only valid if not every part is boosted
        return !_.every(creep.body, part => part.boost);
    }
    
    isValidTarget(target, creep) {
        // target is lab
        return target instanceof StructureLab &&
            // target has the minimum energy and mineral
            target.energy >= LAB_BOOST_ENERGY && target.mineralAmount >= LAB_BOOST_MINERAL;
    }
    
    isAddableTarget(target, creep) {
        // mineralType is a boosting compound
        return super.isAddableTarget(target, creep) && this.isValidMineralType(target.mineralType) &&
            // creep has active body parts matching the mineralType's boost
            creep.hasActiveBodyparts(this.getBoostPartType(target.mineralType)) &&
            // can further boost parts of the mineralType's boost
            this.canBoostType(creep, this.getBoostPartType(target.mineralType));
    }
    
    newTarget(creep) {
        return _(creep.room.structures.all)
            .filter(this.isValidTarget)
            .min(lab => creep.pos.getRangeTo(lab));
    }
    
    work(creep) {
        return creep.target.boostCreep(creep);
    }
    
    onAssignment(creep) {
        if (SAY_ASSIGNMENT) creep.say(ACTION_SAY.BOOSTING, SAY_PUBLIC);
    }

};
module.exports = new action('boosting');