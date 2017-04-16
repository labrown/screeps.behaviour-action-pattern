let mod = {};
module.exports = mod;
mod.name = 'remoteWorker';
mod.run = function(creep) {
    const flag = creep.data.destiny && Game.flags[creep.data.destiny.targetName];
    if (!flag && (!creep.action || creep.action.name !== 'recycling')) {
        //TODO: in the future, look for another nearby room we can support
        return Creep.action.recycling.assign(creep);
    }

    if (Creep.action.avoiding.run(creep)) {
        return;
    }

    // Assign next Action
    let oldTargetId = creep.data.targetId;
    if( creep.action == null || creep.action.name == 'idle' ) {
        this.nextAction(creep);
    }
    
    // Do some work
    if( creep.action && creep.target ) {
        creep.action.step(creep);
    } else {
        logError('Creep without action/activity!\nCreep: ' + creep.name + '\ndata: ' + JSON.stringify(creep.data));
    }
};
mod.nextAction = function(creep){
    // at target room
    if( creep.data.destiny.room == creep.pos.roomName ){
        let priority;
        // get some energy
        if( creep.sum < creep.carryCapacity * 0.8 ) {
            priority = [
                Creep.action.picking,
                Creep.action.uncharging,
                Creep.action.withdrawing,
                Creep.action.harvesting,
                Creep.action.idle];
        } else {
            priority = [
                Creep.action.repairing,
                Creep.action.building,
                Creep.action.recycling
            ];
        }

        for(var iAction = 0; iAction < priority.length; iAction++) {
            var action = priority[iAction];
            if(action.isValidAction(creep) &&
                action.isAddableAction(creep) &&
                action.assign(creep)) {
                return;
            }
        }
    }
    // not at target room
    else {
        this.gotoTargetRoom(creep);
        return;
    }
    // fallback
    // recycle self
    let mother = Game.spawns[creep.data.motherSpawn];
    if( mother ) {
        Creep.action.recycling.assign(creep, mother);
    }
};
mod.gotoTargetRoom = function(creep){
    const targetFlag = creep.data.destiny ? Game.flags[creep.data.destiny.targetName] : null;
    if (targetFlag) return Creep.action.travelling.assignRoom(creep, targetFlag.pos.roomName);
};
mod.goHome = function(creep){
    return Creep.action.travelling.assignRoom(creep, creep.data.homeRoom);
};
